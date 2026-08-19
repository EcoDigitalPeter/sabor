package com.ottimizo.loja;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ottimizo.common.audit.AuditService;
import com.ottimizo.common.error.ErrorCode;
import com.ottimizo.common.error.ServiceException;
import com.ottimizo.common.security.CurrentUser;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/**
 * Import/export do catalogo da loja em Excel (BE-L03, F3-LOJ-02).
 *
 * <p>Fluxo: {@link #template()}/{@link #export} geram {@code .xlsx};
 * {@link #validate} le um upload, valida linha a linha e grava tudo (linhas
 * validas + erros) num {@link ImportJob} sem tocar em {@link Product} —
 * {@link #confirm} e o unico ponto que escreve no catalogo, sempre a partir
 * do {@code payload} ja validado, nunca reparseando o ficheiro.
 *
 * <p>Tal como {@link LojaProductService}, o {@code storeId} usado em todos os
 * metodos vem sempre de {@link CurrentUser#requireOwnStoreId}, nunca de um
 * valor recebido no pedido.
 */
@Service
public class LojaImportService {

    private static final List<String> TEMPLATE_HEADERS = List.of("produto", "categoria", "unidade", "preco_mt");
    private static final int MAX_ROWS = 2000;
    private static final long MAX_FILE_SIZE_BYTES = 5L * 1024 * 1024;
    private static final String XLSX_CONTENT_TYPE =
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    private final ProductRepository products;
    private final ImportJobRepository importJobs;
    private final AuditService audit;
    private final ObjectMapper objectMapper;

    public LojaImportService(
        ProductRepository products,
        ImportJobRepository importJobs,
        AuditService audit,
        ObjectMapper objectMapper
    ) {
        this.products = products;
        this.importJobs = importJobs;
        this.audit = audit;
        this.objectMapper = objectMapper;
    }

    /** Gera o template `.xlsx` (so cabecalho) para o lojista preencher. */
    public byte[] template() {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("produtos");
            writeHeaderRow(sheet);
            for (int i = 0; i < TEMPLATE_HEADERS.size(); i++) {
                sheet.autoSizeColumn(i);
            }
            return toBytes(workbook);
        } catch (IOException ex) {
            throw new UncheckedIOException(ex);
        }
    }

    /** Exporta o catalogo actual da loja em `.xlsx`, no mesmo formato do template. */
    @Transactional(readOnly = true)
    public byte[] export(CurrentUser actor) {
        Long storeId = ownStoreId(actor);
        List<Product> catalog = products.findByStoreIdOrderByNameAsc(storeId);
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("produtos");
            writeHeaderRow(sheet);
            int rowIndex = 1;
            for (Product product : catalog) {
                Row row = sheet.createRow(rowIndex++);
                row.createCell(0).setCellValue(product.name());
                row.createCell(1).setCellValue(product.category().name());
                row.createCell(2).setCellValue(product.unitLabel());
                row.createCell(3).setCellValue(product.priceMt().doubleValue());
            }
            for (int i = 0; i < TEMPLATE_HEADERS.size(); i++) {
                sheet.autoSizeColumn(i);
            }
            return toBytes(workbook);
        } catch (IOException ex) {
            throw new UncheckedIOException(ex);
        }
    }

    /**
     * Le e valida o ficheiro `.xlsx` enviado, linha a linha, e grava o
     * resultado (linhas validas + erros) num novo {@link ImportJob} —
     * nada e escrito em {@link Product} nesta fase.
     */
    @Transactional
    public ImportPreviewResponse validate(CurrentUser actor, MultipartFile file) {
        Long storeId = ownStoreId(actor);
        validateUpload(file);

        List<ProductImportRow> validRows = new ArrayList<>();
        List<ImportRowError> errors = new ArrayList<>();
        int totalRows = parseRows(file, validRows, errors);

        ImportJob job = new ImportJob(
            storeId,
            actor.id(),
            file.getOriginalFilename(),
            totalRows,
            validRows.size(),
            errors.size(),
            objectMapper.valueToTree(errors),
            objectMapper.valueToTree(validRows)
        );
        importJobs.save(job);
        return ImportPreviewResponse.from(job, errors);
    }

    /**
     * Aplica um job ja validado ao catalogo da loja (upsert por nome). Por
     * omissao e tudo-ou-nada: se o job tiver linhas invalidas, e preciso
     * {@code applyValidOnly=true} para aplicar so as linhas validas.
     */
    @Transactional
    public ImportResultResponse confirm(CurrentUser actor, Long jobId, boolean applyValidOnly) {
        Long storeId = ownStoreId(actor);
        ImportJob job = importJobs.findByIdAndStoreId(jobId, storeId)
            .orElseThrow(() -> new ServiceException(ErrorCode.LSA005_NOT_FOUND));
        if (job.status() != ImportJobStatus.VALIDATED) {
            throw new ServiceException(ErrorCode.LSA031_IMPORT_ALREADY_PROCESSED);
        }
        if (!applyValidOnly && job.errorRows() > 0) {
            throw new ServiceException(
                ErrorCode.LSA020_IMPORT_INVALID_FILE,
                "Este ficheiro tem linhas invalidas. Corrige-as e reimporta, ou confirma so as linhas validas."
            );
        }

        List<ProductImportRow> rows = readPayload(job);
        int created = 0;
        int updated = 0;
        for (ProductImportRow row : rows) {
            Optional<Product> existing = products.findByStoreIdAndNameIgnoreCase(storeId, row.name());
            if (existing.isPresent()) {
                existing.get().applyUpdate(row.name(), row.category(), row.unitLabel(), row.priceMt(), existing.get().ingredientId());
                updated++;
            } else {
                products.save(new Product(storeId, row.name(), row.category(), row.unitLabel(), row.priceMt(), null));
                created++;
            }
        }

        job.markApplied(created, updated);
        audit.record(actor, "PRODUCT_IMPORT_CONFIRMED", "import_job", jobId,
            Map.of("createdCount", created, "updatedCount", updated, "errorRows", job.errorRows()));
        return ImportResultResponse.from(job);
    }

    // --- parsing ---------------------------------------------------------

    private int parseRows(MultipartFile file, List<ProductImportRow> validRows, List<ImportRowError> errors) {
        Workbook workbook = openWorkbook(file);
        try {
            Sheet sheet = workbook.getSheetAt(0);
            Map<String, Integer> columns = readHeader(sheet);
            DataFormatter formatter = new DataFormatter();

            int totalRows = 0;
            int lastRowNum = sheet.getLastRowNum();
            for (int r = 1; r <= lastRowNum; r++) {
                Row row = sheet.getRow(r);
                if (row == null || isBlankRow(row)) {
                    continue;
                }
                totalRows++;
                if (totalRows > MAX_ROWS) {
                    throw new ServiceException(ErrorCode.LSA020_IMPORT_INVALID_FILE,
                        "Ficheiro excede o limite de " + MAX_ROWS + " linhas.");
                }
                int excelRowNumber = r + 1; // 1-based, linha 1 e o cabecalho
                parseRow(row, columns, formatter, excelRowNumber, validRows, errors);
            }
            return totalRows;
        } finally {
            try {
                workbook.close();
            } catch (IOException ignored) {
                // leitura ja terminou; falha a fechar o workbook nao afecta o resultado
            }
        }
    }

    private void parseRow(
        Row row,
        Map<String, Integer> columns,
        DataFormatter formatter,
        int excelRowNumber,
        List<ProductImportRow> validRows,
        List<ImportRowError> errors
    ) {
        String name = cellText(row, columns.get("produto"), formatter);
        String categoryRaw = cellText(row, columns.get("categoria"), formatter);
        String unitLabel = cellText(row, columns.get("unidade"), formatter);

        List<String> rowErrors = new ArrayList<>();

        if (name == null || name.isBlank()) {
            rowErrors.add("produto e obrigatorio.");
        } else if (name.trim().length() > 160) {
            rowErrors.add("produto excede 160 caracteres.");
        }

        ProductCategory category = null;
        if (categoryRaw == null || categoryRaw.isBlank()) {
            rowErrors.add("categoria e obrigatoria.");
        } else {
            category = parseCategory(categoryRaw.trim());
            if (category == null) {
                rowErrors.add("categoria invalida: '" + categoryRaw.trim() + "'.");
            }
        }

        if (unitLabel == null || unitLabel.isBlank()) {
            rowErrors.add("unidade e obrigatoria.");
        } else if (unitLabel.trim().length() > 40) {
            rowErrors.add("unidade excede 40 caracteres.");
        }

        BigDecimal priceMt = parsePrice(row, columns.get("preco_mt"), formatter);
        if (priceMt == null) {
            rowErrors.add("preco_mt e obrigatorio e tem de ser um numero.");
        } else if (priceMt.signum() <= 0) {
            rowErrors.add("preco_mt tem de ser maior que zero.");
        }

        if (!rowErrors.isEmpty()) {
            errors.add(new ImportRowError(excelRowNumber, String.join(" ", rowErrors)));
            return;
        }

        validRows.add(new ProductImportRow(
            name.trim(),
            category,
            unitLabel.trim(),
            priceMt.setScale(2, RoundingMode.HALF_UP)
        ));
    }

    private ProductCategory parseCategory(String raw) {
        for (ProductCategory candidate : ProductCategory.values()) {
            if (candidate.name().equalsIgnoreCase(raw)) {
                return candidate;
            }
        }
        return null;
    }

    private BigDecimal parsePrice(Row row, Integer columnIndex, DataFormatter formatter) {
        if (columnIndex == null) {
            return null;
        }
        Cell cell = row.getCell(columnIndex);
        if (cell == null) {
            return null;
        }
        try {
            if (cell.getCellType() == CellType.NUMERIC
                || (cell.getCellType() == CellType.FORMULA && cell.getCachedFormulaResultType() == CellType.NUMERIC)) {
                return BigDecimal.valueOf(cell.getNumericCellValue());
            }
            String text = formatter.formatCellValue(cell).trim();
            if (text.isEmpty()) {
                return null;
            }
            text = text.replace(",", ".");
            return new BigDecimal(text);
        } catch (Exception ex) {
            return null;
        }
    }

    private String cellText(Row row, Integer columnIndex, DataFormatter formatter) {
        if (columnIndex == null) {
            return null;
        }
        Cell cell = row.getCell(columnIndex);
        if (cell == null) {
            return null;
        }
        return formatter.formatCellValue(cell);
    }

    private boolean isBlankRow(Row row) {
        for (Cell cell : row) {
            if (cell.getCellType() != CellType.BLANK) {
                String text = new DataFormatter().formatCellValue(cell);
                if (text != null && !text.isBlank()) {
                    return false;
                }
            }
        }
        return true;
    }

    private Map<String, Integer> readHeader(Sheet sheet) {
        Row header = sheet.getRow(0);
        if (header == null) {
            throw new ServiceException(ErrorCode.LSA020_IMPORT_INVALID_FILE,
                "Ficheiro sem cabecalho. Colunas esperadas: " + String.join(", ", TEMPLATE_HEADERS) + ".");
        }
        DataFormatter formatter = new DataFormatter();
        Map<String, Integer> columns = new HashMap<>();
        for (Cell cell : header) {
            String value = formatter.formatCellValue(cell).trim().toLowerCase(Locale.ROOT);
            if (!value.isEmpty()) {
                columns.put(value, cell.getColumnIndex());
            }
        }
        for (String expected : TEMPLATE_HEADERS) {
            if (!columns.containsKey(expected)) {
                throw new ServiceException(ErrorCode.LSA020_IMPORT_INVALID_FILE,
                    "Cabecalho invalido. Colunas esperadas: " + String.join(", ", TEMPLATE_HEADERS) + ".");
            }
        }
        return columns;
    }

    private Workbook openWorkbook(MultipartFile file) {
        try {
            return new XSSFWorkbook(new ByteArrayInputStream(file.getBytes()));
        } catch (Exception ex) {
            throw new ServiceException(ErrorCode.LSA020_IMPORT_INVALID_FILE, "Nao foi possivel ler o ficheiro. Confirma que e um .xlsx valido.");
        }
    }

    private void validateUpload(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ServiceException(ErrorCode.LSA020_IMPORT_INVALID_FILE, "Ficheiro em falta.");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new ServiceException(ErrorCode.LSA020_IMPORT_INVALID_FILE, "Ficheiro excede o limite de 5 MB.");
        }
        String filename = file.getOriginalFilename();
        if (filename == null || !filename.toLowerCase(Locale.ROOT).endsWith(".xlsx")) {
            throw new ServiceException(ErrorCode.LSA020_IMPORT_INVALID_FILE, "So sao aceites ficheiros .xlsx.");
        }
    }

    @SuppressWarnings("unchecked")
    private List<ProductImportRow> readPayload(ImportJob job) {
        JsonNode payload = job.payload();
        if (payload == null || payload.isNull()) {
            return List.of();
        }
        return objectMapper.convertValue(payload, new TypeReference<List<ProductImportRow>>() {
        });
    }

    // --- helpers -----------------------------------------------------------

    private Long ownStoreId(CurrentUser actor) {
        return actor.requireOwnStoreId(actor.storeId());
    }

    private void writeHeaderRow(Sheet sheet) {
        Row header = sheet.createRow(0);
        for (int i = 0; i < TEMPLATE_HEADERS.size(); i++) {
            header.createCell(i).setCellValue(TEMPLATE_HEADERS.get(i));
        }
    }

    private byte[] toBytes(Workbook workbook) throws IOException {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            workbook.write(out);
            return out.toByteArray();
        }
    }

    public static String contentType() {
        return XLSX_CONTENT_TYPE;
    }
}

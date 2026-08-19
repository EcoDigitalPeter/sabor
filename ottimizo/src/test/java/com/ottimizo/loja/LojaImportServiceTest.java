package com.ottimizo.loja;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ottimizo.common.audit.AuditService;
import com.ottimizo.common.error.ErrorCode;
import com.ottimizo.common.error.ServiceException;
import com.ottimizo.common.security.CurrentUser;
import com.ottimizo.common.security.Role;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.BeanUtils;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class LojaImportServiceTest {

    private static final Long OWN_STORE_ID = 10L;
    private static final CurrentUser LOJISTA =
        new CurrentUser(1L, UUID.randomUUID(), "loja@example.com", Role.LOJISTA, OWN_STORE_ID);
    private static final String XLSX_CONTENT_TYPE =
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    @Mock
    private ProductRepository products;
    @Mock
    private ImportJobRepository importJobs;
    @Mock
    private AuditService audit;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private LojaImportService service;

    @BeforeEach
    void setUp() {
        service = new LojaImportService(products, importJobs, audit, objectMapper);
    }

    // --- validate: parsing de ficheiro valido -------------------------------

    @Test
    void validate_parsesValidFile_andSavesJobWithNoErrors() throws IOException {
        MockMultipartFile file = workbook("produtos.xlsx", List.of(
            row("Arroz", "CEREAIS", "kg", 120.5),
            row("Feijao", "LEGUMINOSAS", "kg", 80)
        ));
        when(importJobs.save(any(ImportJob.class))).thenAnswer(invocation -> {
            ImportJob job = invocation.getArgument(0);
            ReflectionTestUtils.setField(job, "id", 500L);
            return job;
        });

        ImportPreviewResponse response = service.validate(LOJISTA, file);

        assertThat(response.jobId()).isEqualTo(500L);
        assertThat(response.filename()).isEqualTo("produtos.xlsx");
        assertThat(response.status()).isEqualTo(ImportJobStatus.VALIDATED);
        assertThat(response.totalRows()).isEqualTo(2);
        assertThat(response.validRows()).isEqualTo(2);
        assertThat(response.errorRows()).isEqualTo(0);
        assertThat(response.errors()).isEmpty();

        ArgumentCaptor<ImportJob> captor = ArgumentCaptor.forClass(ImportJob.class);
        verify(importJobs).save(captor.capture());
        List<ProductImportRow> savedRows = readRows(captor.getValue().payload());
        assertThat(savedRows).extracting(ProductImportRow::name).containsExactly("Arroz", "Feijao");
        assertThat(savedRows).extracting(ProductImportRow::category)
            .containsExactly(ProductCategory.CEREAIS, ProductCategory.LEGUMINOSAS);
    }

    // --- validate: linhas invalidas -----------------------------------------

    @Test
    void validate_reportsRowErrors_forInvalidRows() throws IOException {
        MockMultipartFile file = workbook("produtos.xlsx", List.of(
            row(null, "INVALIDA", "", "abc"),
            row("Feijao", "LEGUMINOSAS", "kg", -5)
        ));
        when(importJobs.save(any(ImportJob.class))).thenAnswer(invocation -> {
            ImportJob job = invocation.getArgument(0);
            ReflectionTestUtils.setField(job, "id", 501L);
            return job;
        });

        ImportPreviewResponse response = service.validate(LOJISTA, file);

        assertThat(response.totalRows()).isEqualTo(2);
        assertThat(response.validRows()).isEqualTo(0);
        assertThat(response.errorRows()).isEqualTo(2);
        assertThat(response.errors()).hasSize(2);

        ImportRowError first = response.errors().get(0);
        assertThat(first.row()).isEqualTo(2);
        assertThat(first.message()).contains("produto e obrigatorio.");
        assertThat(first.message()).contains("categoria invalida: 'INVALIDA'.");
        assertThat(first.message()).contains("unidade e obrigatoria.");
        assertThat(first.message()).contains("preco_mt e obrigatorio e tem de ser um numero.");

        ImportRowError second = response.errors().get(1);
        assertThat(second.row()).isEqualTo(3);
        assertThat(second.message()).contains("preco_mt tem de ser maior que zero.");
    }

    // --- validate: ficheiro vazio / corrompido / extensao errada -----------

    @Test
    void validate_throwsInvalidFile_whenFileIsEmpty() {
        MockMultipartFile file = new MockMultipartFile("file", "vazio.xlsx", XLSX_CONTENT_TYPE, new byte[0]);

        assertThatThrownBy(() -> service.validate(LOJISTA, file))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA020_IMPORT_INVALID_FILE);

        verify(importJobs, never()).save(any());
    }

    @Test
    void validate_throwsInvalidFile_whenFileIsCorrupted() {
        MockMultipartFile file = new MockMultipartFile(
            "file", "produtos.xlsx", XLSX_CONTENT_TYPE, "isto nao e um xlsx valido".getBytes());

        assertThatThrownBy(() -> service.validate(LOJISTA, file))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA020_IMPORT_INVALID_FILE);

        verify(importJobs, never()).save(any());
    }

    @Test
    void validate_throwsInvalidFile_whenExtensionIsNotXlsx() {
        MockMultipartFile file = new MockMultipartFile("file", "produtos.csv", "text/csv", "a,b,c".getBytes());

        assertThatThrownBy(() -> service.validate(LOJISTA, file))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA020_IMPORT_INVALID_FILE);

        verify(importJobs, never()).save(any());
    }

    // --- confirm: ownership / estado ----------------------------------------

    @Test
    void confirm_throwsNotFound_whenJobBelongsToAnotherStore() {
        when(importJobs.findByIdAndStoreId(7L, OWN_STORE_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.confirm(LOJISTA, 7L, false))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA005_NOT_FOUND);

        verify(products, never()).save(any());
        verify(audit, never()).record(any(CurrentUser.class), anyString(), anyString(), anyLong(), anyMap());
    }

    @Test
    void confirm_throwsAlreadyProcessed_whenJobIsNotInValidatedStatus() {
        ImportJob job = validatedJob(List.of(), 0, 0);
        job.markApplied(1, 0);
        when(importJobs.findByIdAndStoreId(7L, OWN_STORE_ID)).thenReturn(Optional.of(job));

        assertThatThrownBy(() -> service.confirm(LOJISTA, 7L, false))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA031_IMPORT_ALREADY_PROCESSED);

        verify(products, never()).save(any());
    }

    @Test
    void confirm_throwsInvalidFile_whenJobHasErrorRowsAndApplyValidOnlyIsFalse() {
        ImportJob job = validatedJob(List.of(), 2, 0);
        when(importJobs.findByIdAndStoreId(7L, OWN_STORE_ID)).thenReturn(Optional.of(job));

        assertThatThrownBy(() -> service.confirm(LOJISTA, 7L, false))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA020_IMPORT_INVALID_FILE);

        verify(products, never()).save(any());
    }

    // --- confirm: aplicacao das linhas validadas ----------------------------

    @Test
    void confirm_appliesValidRows_createsAndUpdatesProducts_andRecordsAudit() {
        List<ProductImportRow> rows = List.of(
            new ProductImportRow("Arroz Novo", ProductCategory.CEREAIS, "kg", new BigDecimal("120.00")),
            new ProductImportRow("Feijao", ProductCategory.LEGUMINOSAS, "kg", new BigDecimal("80.00"))
        );
        ImportJob job = validatedJob(rows, 0, rows.size());
        when(importJobs.findByIdAndStoreId(7L, OWN_STORE_ID)).thenReturn(Optional.of(job));
        when(products.findByStoreIdAndNameIgnoreCase(OWN_STORE_ID, "Arroz Novo")).thenReturn(Optional.empty());
        Product existingFeijao = product(3L, OWN_STORE_ID, "Feijao", new BigDecimal("50.00"));
        when(products.findByStoreIdAndNameIgnoreCase(OWN_STORE_ID, "Feijao")).thenReturn(Optional.of(existingFeijao));

        ImportResultResponse response = service.confirm(LOJISTA, 7L, false);

        assertThat(response.status()).isEqualTo(ImportJobStatus.APPLIED);
        assertThat(response.createdCount()).isEqualTo(1);
        assertThat(response.updatedCount()).isEqualTo(1);

        ArgumentCaptor<Product> createdCaptor = ArgumentCaptor.forClass(Product.class);
        verify(products).save(createdCaptor.capture());
        assertThat(createdCaptor.getValue().name()).isEqualTo("Arroz Novo");
        assertThat(createdCaptor.getValue().storeId()).isEqualTo(OWN_STORE_ID);

        assertThat(existingFeijao.priceMt()).isEqualByComparingTo("80.00");

        verify(audit).record(eq(LOJISTA), eq("PRODUCT_IMPORT_CONFIRMED"), eq("import_job"), eq(7L), anyMap());
    }

    @Test
    void confirm_appliesOnlyValidRows_whenApplyValidOnlyIsTrue() {
        List<ProductImportRow> rows = List.of(
            new ProductImportRow("Arroz Novo", ProductCategory.CEREAIS, "kg", new BigDecimal("120.00"))
        );
        ImportJob job = validatedJob(rows, 2, rows.size());
        when(importJobs.findByIdAndStoreId(7L, OWN_STORE_ID)).thenReturn(Optional.of(job));
        when(products.findByStoreIdAndNameIgnoreCase(OWN_STORE_ID, "Arroz Novo")).thenReturn(Optional.empty());

        ImportResultResponse response = service.confirm(LOJISTA, 7L, true);

        assertThat(response.createdCount()).isEqualTo(1);
        assertThat(response.errorRows()).isEqualTo(2);
        verify(products).save(any(Product.class));
        verify(audit).record(eq(LOJISTA), eq("PRODUCT_IMPORT_CONFIRMED"), eq("import_job"), eq(7L), anyMap());
    }

    // --- helpers -------------------------------------------------------------

    private ImportJob validatedJob(List<ProductImportRow> rows, int errorRows, int validRows) {
        JsonNode payload = objectMapper.valueToTree(rows);
        JsonNode errors = objectMapper.valueToTree(List.of());
        ImportJob job = new ImportJob(OWN_STORE_ID, LOJISTA.id(), "produtos.xlsx", validRows + errorRows, validRows, errorRows, errors, payload);
        ReflectionTestUtils.setField(job, "id", 7L);
        return job;
    }

    private Product product(Long id, Long storeId, String name, BigDecimal priceMt) {
        Product product = BeanUtils.instantiateClass(Product.class);
        ReflectionTestUtils.setField(product, "id", id);
        ReflectionTestUtils.setField(product, "storeId", storeId);
        ReflectionTestUtils.setField(product, "name", name);
        ReflectionTestUtils.setField(product, "category", ProductCategory.LEGUMINOSAS);
        ReflectionTestUtils.setField(product, "unitLabel", "kg");
        ReflectionTestUtils.setField(product, "priceMt", priceMt);
        ReflectionTestUtils.setField(product, "status", ProductStatus.ACTIVE);
        return product;
    }

    private List<ProductImportRow> readRows(JsonNode payload) {
        return objectMapper.convertValue(payload, objectMapper.getTypeFactory()
            .constructCollectionType(List.class, ProductImportRow.class));
    }

    private Object[] row(Object name, Object category, Object unitLabel, Object priceMt) {
        return new Object[] {name, category, unitLabel, priceMt};
    }

    private MockMultipartFile workbook(String filename, List<Object[]> rows) throws IOException {
        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("produtos");
            Row header = sheet.createRow(0);
            header.createCell(0).setCellValue("produto");
            header.createCell(1).setCellValue("categoria");
            header.createCell(2).setCellValue("unidade");
            header.createCell(3).setCellValue("preco_mt");

            int r = 1;
            for (Object[] values : rows) {
                Row dataRow = sheet.createRow(r++);
                for (int c = 0; c < values.length; c++) {
                    Object value = values[c];
                    if (value == null) {
                        continue;
                    }
                    Cell cell = dataRow.createCell(c);
                    if (value instanceof Number number) {
                        cell.setCellValue(number.doubleValue());
                    } else {
                        cell.setCellValue(value.toString());
                    }
                }
            }
            wb.write(out);
            return new MockMultipartFile("file", filename, XLSX_CONTENT_TYPE, out.toByteArray());
        }
    }
}

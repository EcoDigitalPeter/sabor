package com.ottimizo.loja;

import com.ottimizo.common.api.ApiResponse;
import com.ottimizo.common.security.UserContextService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * Template/export/import do catalogo da loja em Excel (BE-L03, F3-LOJ-02).
 * Protegido por {@code /api/v1/loja/**} -> ROLE_LOJISTA em
 * {@link com.ottimizo.common.security.SecurityConfig}. O storeId nunca vem
 * do pedido — {@link LojaImportService} extrai-o sempre do
 * {@code CurrentUser}, tal como {@link LojaProductController}.
 */
@RestController
@RequestMapping("/api/v1/loja/products")
public class LojaProductImportController {

    private final LojaImportService service;
    private final UserContextService userContext;

    public LojaProductImportController(LojaImportService service, UserContextService userContext) {
        this.service = service;
        this.userContext = userContext;
    }

    @GetMapping("/import-template")
    public ResponseEntity<byte[]> template() {
        return asFile(service.template(), "modelo-produtos.xlsx");
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> export(@AuthenticationPrincipal Jwt jwt) {
        return asFile(service.export(userContext.currentUser(jwt)), "produtos.xlsx");
    }

    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<ImportPreviewResponse> validateImport(
        @RequestPart("file") MultipartFile file,
        @AuthenticationPrincipal Jwt jwt
    ) {
        return ApiResponse.success(service.validate(userContext.currentUser(jwt), file));
    }

    @PostMapping("/import/{jobId}/confirm")
    public ApiResponse<ImportResultResponse> confirm(
        @PathVariable Long jobId,
        @RequestParam(name = "applyValidOnly", defaultValue = "false") boolean applyValidOnly,
        @AuthenticationPrincipal Jwt jwt
    ) {
        return ApiResponse.success(service.confirm(userContext.currentUser(jwt), jobId, applyValidOnly));
    }

    private ResponseEntity<byte[]> asFile(byte[] content, String filename) {
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
            .contentType(MediaType.parseMediaType(LojaImportService.contentType()))
            .body(content);
    }
}

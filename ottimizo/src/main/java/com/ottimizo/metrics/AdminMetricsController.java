package com.ottimizo.metrics;

import com.ottimizo.common.api.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Dashboard de métricas do admin (BE-E01, F2-ADM-06). Protegido por
 * {@code /api/v1/admin/**} -> ROLE_ADMIN em
 * {@link com.ottimizo.common.security.SecurityConfig}, nao precisa de
 * anotacoes de autorizacao adicionais aqui (mesmo padrao de
 * {@code AdminStoreController}).
 */
@RestController
@RequestMapping("/api/v1/admin/metrics")
public class AdminMetricsController {

    private final AdminMetricsService adminMetricsService;

    public AdminMetricsController(AdminMetricsService adminMetricsService) {
        this.adminMetricsService = adminMetricsService;
    }

    /** {@code period}: 7, 30 ou 90 dias (qualquer outro valor, incluindo omisso, cai em 30 — mesmo contrato de {@code operations.getMetricsSummary} em api.d.ts). */
    @GetMapping("/summary")
    public ApiResponse<MetricsSummaryResponse> summary(@RequestParam(required = false) Integer period) {
        return ApiResponse.success(adminMetricsService.summary(period));
    }
}

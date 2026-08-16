package com.ottimizo.health;

import com.ottimizo.common.api.ApiResponse;
import java.time.OffsetDateTime;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/health")
public class HealthController {

    @GetMapping
    public ApiResponse<HealthPayload> health() {
        return ApiResponse.success(new HealthPayload("ok", OffsetDateTime.now()));
    }

    public record HealthPayload(String status, OffsetDateTime at) {
    }
}

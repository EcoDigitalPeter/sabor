package com.ottimizo.common.api;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ApiResponseTest {

    @Test
    void success_withData_setsStatusAndData() {
        ApiResponse<String> response = ApiResponse.success("payload");

        assertThat(response.status()).isEqualTo("success");
        assertThat(response.data()).isEqualTo("payload");
        assertThat(response.code()).isNull();
        assertThat(response.message()).isNull();
    }

    @Test
    void success_withoutData_hasNullData() {
        ApiResponse<Void> response = ApiResponse.success();

        assertThat(response.status()).isEqualTo("success");
        assertThat(response.data()).isNull();
    }

    @Test
    void error_setsStatusCodeAndMessage() {
        ApiResponse<Void> response = ApiResponse.error("LSA005_NOT_FOUND", "Recurso nao encontrado.");

        assertThat(response.status()).isEqualTo("error");
        assertThat(response.code()).isEqualTo("LSA005_NOT_FOUND");
        assertThat(response.message()).isEqualTo("Recurso nao encontrado.");
        assertThat(response.data()).isNull();
    }
}

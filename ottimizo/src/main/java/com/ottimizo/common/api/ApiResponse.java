package com.ottimizo.common.api;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiResponse<T>(
    String status,
    String code,
    String message,
    T data
) {

    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>("success", null, null, data);
    }

    public static ApiResponse<Void> success() {
        return new ApiResponse<>("success", null, null, null);
    }

    public static ApiResponse<Void> error(String code, String message) {
        return new ApiResponse<>("error", code, message, null);
    }
}

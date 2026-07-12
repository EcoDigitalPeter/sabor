package mz.levesabor.api.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import mz.levesabor.api.exceptions.ErrorCodes;

/**
 * BE-A02 · Envelope único de resposta (sucesso E erro) — padrão herdado do irc-container,
 * aplicado de forma consistente (docs/plano/03-backend-plan.md §3.1).
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiResponse<T>(String status, String code, String message, T data) {

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>("success", null, null, data);
    }

    public static <T> ApiResponse<T> error(ErrorCodes code, String message) {
        return new ApiResponse<>("error", code.name(), message, null);
    }
}

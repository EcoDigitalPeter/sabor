package com.ottimizo.common.error;

import com.ottimizo.common.api.ApiResponse;
import jakarta.validation.ConstraintViolationException;
import java.util.stream.Collectors;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);


    @ExceptionHandler(ServiceException.class)
    public ResponseEntity<ApiResponse<Void>> handleService(ServiceException ex) {
        return ResponseEntity
            .status(ex.code().status())
            .body(ApiResponse.error(ex.code().name(), ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleInvalidBody(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
            .map(this::formatFieldError)
            .collect(Collectors.joining("; "));
        return validation(message);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleConstraint(ConstraintViolationException ex) {
        String message = ex.getConstraintViolations().stream()
            .map(violation -> violation.getPropertyPath() + ": " + violation.getMessage())
            .collect(Collectors.joining("; "));
        return validation(message);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Void>> handleUnreadableBody(HttpMessageNotReadableException ex) {
        return validation("Corpo do pedido invalido, mal formado ou com um valor fora do enum esperado.");
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiResponse<Void>> handleUploadTooLarge(MaxUploadSizeExceededException ex) {
        return ResponseEntity
            .status(ErrorCode.LSA020_IMPORT_INVALID_FILE.status())
            .body(ApiResponse.error(ErrorCode.LSA020_IMPORT_INVALID_FILE.name(), "Ficheiro excede o limite de 5 MB."));
    }

    @ExceptionHandler({AccessDeniedException.class, AuthenticationException.class})
    public ResponseEntity<ApiResponse<Void>> handleForbidden(Exception ex) {
        return ResponseEntity
            .status(ErrorCode.LSA004_FORBIDDEN.status())
            .body(ApiResponse.error(ErrorCode.LSA004_FORBIDDEN.name(), ErrorCode.LSA004_FORBIDDEN.defaultMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleUnknown(Exception ex) {
        log.error("Unhandled exception", ex);
        return ResponseEntity
            .status(ErrorCode.LSA099_INTERNAL.status())
            .body(ApiResponse.error(ErrorCode.LSA099_INTERNAL.name(), ErrorCode.LSA099_INTERNAL.defaultMessage()));
    }

    private ResponseEntity<ApiResponse<Void>> validation(String message) {
        String detail = message == null || message.isBlank()
            ? ErrorCode.LSA001_VALIDATION.defaultMessage()
            : message;
        return ResponseEntity
            .status(ErrorCode.LSA001_VALIDATION.status())
            .body(ApiResponse.error(ErrorCode.LSA001_VALIDATION.name(), detail));
    }

    private String formatFieldError(FieldError error) {
        return error.getField() + ": " + error.getDefaultMessage();
    }
}

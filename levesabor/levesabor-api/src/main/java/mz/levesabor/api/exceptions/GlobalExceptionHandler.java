package mz.levesabor.api.exceptions;

import lombok.extern.slf4j.Slf4j;
import mz.levesabor.api.dto.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.stream.Collectors;

/**
 * BE-A02 · Handler global — formato ÚNICO de erro (ApiResponse), tabela em docs/plano/03-backend-plan.md §3.7.
 * Controllers nunca fazem try/catch local (anti-pattern do irc-container).
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ServiceException.class)
    public ResponseEntity<ApiResponse<Void>> handleService(ServiceException ex) {
        return ResponseEntity.status(ex.getCode().getHttpStatus())
                .body(ApiResponse.error(ex.getCode(), ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException ex) {
        String fields = ex.getBindingResult().getFieldErrors().stream()
                .map(f -> f.getField() + " — " + f.getDefaultMessage())
                .collect(Collectors.joining("; "));
        return ResponseEntity.badRequest()
                .body(ApiResponse.error(ErrorCodes.LSA001_VALIDATION, ErrorCodes.LSA001_VALIDATION.getMessage(fields)));
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiResponse<Void>> handleBadCredentials(BadCredentialsException ex) {
        return ResponseEntity.status(401)
                .body(ApiResponse.error(ErrorCodes.LSA002_INVALID_CREDENTIALS, ErrorCodes.LSA002_INVALID_CREDENTIALS.getMessage()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDenied(AccessDeniedException ex) {
        return ResponseEntity.status(403)
                .body(ApiResponse.error(ErrorCodes.LSA004_FORBIDDEN, ErrorCodes.LSA004_FORBIDDEN.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleUnexpected(Exception ex) {
        log.error("Erro não tratado", ex); // stack só no log (com correlation-id via MDC), nunca na resposta
        return ResponseEntity.status(500)
                .body(ApiResponse.error(ErrorCodes.LSA099_INTERNAL, ErrorCodes.LSA099_INTERNAL.getMessage()));
    }
}

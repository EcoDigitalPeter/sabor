package com.ottimizo.common.error;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.ottimizo.common.api.ApiResponse;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.Path;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void handleService_mapsErrorCodeStatusAndMessage() {
        ServiceException ex = new ServiceException(ErrorCode.LSA016_STORE_INACTIVE, "mensagem custom");

        ResponseEntity<ApiResponse<Void>> response = handler.handleService(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody().status()).isEqualTo("error");
        assertThat(response.getBody().code()).isEqualTo("LSA016_STORE_INACTIVE");
        assertThat(response.getBody().message()).isEqualTo("mensagem custom");
    }

    @Test
    void handleForbidden_accessDenied_mapsToLsa004() {
        ResponseEntity<ApiResponse<Void>> response = handler.handleForbidden(new AccessDeniedException("nope"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody().code()).isEqualTo("LSA004_FORBIDDEN");
    }

    @Test
    void handleForbidden_authenticationException_mapsToLsa004() {
        ResponseEntity<ApiResponse<Void>> response = handler.handleForbidden(new BadCredentialsException("bad"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody().code()).isEqualTo("LSA004_FORBIDDEN");
    }

    @Test
    void handleUnknown_mapsToInternalError() {
        ResponseEntity<ApiResponse<Void>> response = handler.handleUnknown(new IllegalStateException("boom"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody().code()).isEqualTo("LSA099_INTERNAL");
    }

    @Test
    void handleInvalidBody_joinsFieldErrorsWithSemicolon() {
        MethodArgumentNotValidException ex = mock(MethodArgumentNotValidException.class);
        BindingResult bindingResult = mock(BindingResult.class);
        when(ex.getBindingResult()).thenReturn(bindingResult);
        when(bindingResult.getFieldErrors()).thenReturn(List.of(
            new FieldError("profile", "goal", "obrigatorio"),
            new FieldError("profile", "mealsPerDay", "fora do intervalo")
        ));

        ResponseEntity<ApiResponse<Void>> response = handler.handleInvalidBody(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().code()).isEqualTo("LSA001_VALIDATION");
        assertThat(response.getBody().message()).isEqualTo("goal: obrigatorio; mealsPerDay: fora do intervalo");
    }

    @Test
    void handleInvalidBody_usesDefaultMessage_whenNoFieldErrors() {
        MethodArgumentNotValidException ex = mock(MethodArgumentNotValidException.class);
        BindingResult bindingResult = mock(BindingResult.class);
        when(ex.getBindingResult()).thenReturn(bindingResult);
        when(bindingResult.getFieldErrors()).thenReturn(List.of());

        ResponseEntity<ApiResponse<Void>> response = handler.handleInvalidBody(ex);

        assertThat(response.getBody().message()).isEqualTo(ErrorCode.LSA001_VALIDATION.defaultMessage());
    }

    @Test
    void handleConstraint_joinsPropertyPathAndMessage() {
        ConstraintViolation<?> violation = mock(ConstraintViolation.class);
        Path path = mock(Path.class);
        when(path.toString()).thenReturn("email");
        when(violation.getPropertyPath()).thenReturn(path);
        when(violation.getMessage()).thenReturn("formato invalido");
        Set<ConstraintViolation<?>> violations = new LinkedHashSet<>(Set.of(violation));
        ConstraintViolationException ex = new ConstraintViolationException(violations);

        ResponseEntity<ApiResponse<Void>> response = handler.handleConstraint(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().message()).isEqualTo("email: formato invalido");
    }
}

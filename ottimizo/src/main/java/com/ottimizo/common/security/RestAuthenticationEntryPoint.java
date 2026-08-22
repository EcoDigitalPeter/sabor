package com.ottimizo.common.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ottimizo.common.api.ApiResponse;
import com.ottimizo.common.error.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

/**
 * JWT ausente/invalido/expirado (falha de AUTENTICACAO, nao de role) — corre
 * no filtro de seguranca, antes do {@code DispatcherServlet}, por isso
 * {@code GlobalExceptionHandler} (`@RestControllerAdvice`) nunca chega a ver
 * este caso. Sem isto, o Spring devolve 401 com corpo vazio/plano (nao a
 * envelope {@link ApiResponse}), o que quebra {@code request()} em
 * {@code levesabor-web/src/lib/api.ts} (tenta {@code res.json()} num corpo
 * inexistente). Ver plano de integracao INT-01, workstream 3a.
 */
@Component
public class RestAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper;

    public RestAuthenticationEntryPoint(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response, AuthenticationException authException)
        throws IOException {
        ErrorCode code = ErrorCode.LSA008_UNAUTHENTICATED;
        response.setStatus(code.status().value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write(objectMapper.writeValueAsString(ApiResponse.error(code.name(), code.defaultMessage())));
    }
}

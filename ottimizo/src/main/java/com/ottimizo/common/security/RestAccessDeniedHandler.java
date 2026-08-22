package com.ottimizo.common.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ottimizo.common.api.ApiResponse;
import com.ottimizo.common.error.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

/**
 * JWT valido mas role sem permissao para a rota (falha de AUTORIZACAO) —
 * mesma nota de {@link RestAuthenticationEntryPoint} sobre correr fora do
 * MVC dispatch; sem isto o 403 vem sem a envelope {@link ApiResponse}.
 */
@Component
public class RestAccessDeniedHandler implements AccessDeniedHandler {

    private final ObjectMapper objectMapper;

    public RestAccessDeniedHandler(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response, AccessDeniedException accessDeniedException)
        throws IOException {
        ErrorCode code = ErrorCode.LSA004_FORBIDDEN;
        response.setStatus(code.status().value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write(objectMapper.writeValueAsString(ApiResponse.error(code.name(), code.defaultMessage())));
    }
}

package com.ottimizo.users;

import jakarta.validation.constraints.Size;

/**
 * Corpo (opcional) do {@code POST /api/v1/auth/register}. O {@code name} so e
 * necessario quando o token Supabase nao traz {@code user_metadata.name}/
 * {@code full_name} — normalmente o frontend envia-o logo a seguir ao
 * {@code supabase.auth.signUp(...)}, com o nome recolhido no formulario de
 * registo.
 */
public record RegisterRequest(
    @Size(max = 120, message = "no maximo 120 caracteres")
    String name
) {
}

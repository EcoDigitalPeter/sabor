package com.ottimizo.users;

import com.ottimizo.common.security.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

/**
 * Corpo do {@code POST /api/v1/admin/users} (BE-B03). Cria o registo local
 * {@link AppUser} com role ADMIN ou LOJISTA para um utilizador Supabase que
 * ja existe — {@code authUserId} tem de corresponder a uma conta ja criada
 * do lado do Supabase Auth (esta operacao nao cria contas Supabase, so o
 * registo administrativo local; ver {@code SupabaseSessionRevoker} para a
 * decisao equivalente do lado da suspensao).
 */
public record AdminCreateUserRequest(
    @NotNull(message = "e obrigatorio")
    UUID authUserId,

    @NotBlank(message = "e obrigatorio")
    @Size(max = 120, message = "no maximo 120 caracteres")
    String name,

    @NotBlank(message = "e obrigatorio")
    @Email(message = "tem de ser um email valido")
    @Size(max = 160, message = "no maximo 160 caracteres")
    String email,

    @NotNull(message = "e obrigatorio")
    Role role,

    Long storeId
) {
}

package com.ottimizo.users;

/**
 * {@code created=true} quando este pedido criou o {@link AppUser} agora;
 * {@code created=false} quando o utilizador ja existia (pedido repetido com o
 * mesmo JWT — o bootstrap e idempotente) e o registo existente foi apenas
 * devolvido.
 */
public record RegistrationResult(AppUserResponse user, boolean created) {
}

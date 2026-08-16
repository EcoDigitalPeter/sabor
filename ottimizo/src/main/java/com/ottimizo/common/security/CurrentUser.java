package com.ottimizo.common.security;

import java.util.UUID;

public record CurrentUser(
    Long id,
    UUID authUserId,
    String email,
    Role role,
    Long storeId
) {

    public boolean isAdmin() {
        return role == Role.ADMIN;
    }

    public boolean isCliente() {
        return role == Role.CLIENTE;
    }

    public boolean isLojista() {
        return role == Role.LOJISTA;
    }
}

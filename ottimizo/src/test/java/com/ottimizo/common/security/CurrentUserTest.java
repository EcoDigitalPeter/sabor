package com.ottimizo.common.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;
import org.junit.jupiter.api.Test;

class CurrentUserTest {

    @Test
    void isAdmin_trueOnlyForAdminRole() {
        CurrentUser admin = user(Role.ADMIN);
        CurrentUser cliente = user(Role.CLIENTE);
        CurrentUser lojista = user(Role.LOJISTA);

        assertThat(admin.isAdmin()).isTrue();
        assertThat(cliente.isAdmin()).isFalse();
        assertThat(lojista.isAdmin()).isFalse();
    }

    @Test
    void isCliente_trueOnlyForClienteRole() {
        assertThat(user(Role.CLIENTE).isCliente()).isTrue();
        assertThat(user(Role.ADMIN).isCliente()).isFalse();
        assertThat(user(Role.LOJISTA).isCliente()).isFalse();
    }

    @Test
    void isLojista_trueOnlyForLojistaRole() {
        assertThat(user(Role.LOJISTA).isLojista()).isTrue();
        assertThat(user(Role.ADMIN).isLojista()).isFalse();
        assertThat(user(Role.CLIENTE).isLojista()).isFalse();
    }

    private CurrentUser user(Role role) {
        return new CurrentUser(1L, UUID.randomUUID(), "user@example.com", role, null);
    }
}

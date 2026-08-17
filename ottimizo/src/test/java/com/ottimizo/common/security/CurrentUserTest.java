package com.ottimizo.common.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.ottimizo.common.error.ErrorCode;
import com.ottimizo.common.error.ServiceException;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/**
 * BE-L01 — mecanismo de ownership por loja. Os services reais do dominio
 * loja (Product/Order) ainda nao existem (ficam para BE-L02/BE-L04); este
 * teste cobre so o helper reutilizavel {@link CurrentUser#requireOwnStoreId}
 * que esses services vao chamar.
 */
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

    @Test
    void requireOwnStoreId_returnsStoreId_whenRequestedMatchesOwnStore() {
        CurrentUser lojista = new CurrentUser(1L, UUID.randomUUID(), "loja@example.com", Role.LOJISTA, 42L);

        Long result = lojista.requireOwnStoreId(42L);

        assertThat(result).isEqualTo(42L);
    }

    @Test
    void requireOwnStoreId_throwsStoreOwnership_whenRequestedStoreIdBelongsToAnotherStore() {
        CurrentUser lojista = new CurrentUser(1L, UUID.randomUUID(), "loja@example.com", Role.LOJISTA, 42L);

        assertThatThrownBy(() -> lojista.requireOwnStoreId(99L))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA007_STORE_OWNERSHIP);
    }

    @Test
    void requireOwnStoreId_throwsStoreOwnership_whenRequestedStoreIdIsNull() {
        CurrentUser lojista = new CurrentUser(1L, UUID.randomUUID(), "loja@example.com", Role.LOJISTA, 42L);

        assertThatThrownBy(() -> lojista.requireOwnStoreId(null))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA007_STORE_OWNERSHIP);
    }

    @Test
    void requireOwnStoreId_throwsForbidden_whenActorIsNotLojista() {
        CurrentUser cliente = new CurrentUser(2L, UUID.randomUUID(), "cliente@example.com", Role.CLIENTE, null);

        assertThatThrownBy(() -> cliente.requireOwnStoreId(42L))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA004_FORBIDDEN);
    }

    @Test
    void requireOwnStoreId_throwsForbidden_whenLojistaHasNoStoreIdAssigned() {
        CurrentUser lojistaSemLoja = new CurrentUser(3L, UUID.randomUUID(), "loja@example.com", Role.LOJISTA, null);

        assertThatThrownBy(() -> lojistaSemLoja.requireOwnStoreId(42L))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA004_FORBIDDEN);
    }
}

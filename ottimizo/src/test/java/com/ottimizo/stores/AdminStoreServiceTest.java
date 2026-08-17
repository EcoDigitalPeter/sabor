package com.ottimizo.stores;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ottimizo.common.audit.AuditService;
import com.ottimizo.common.error.ErrorCode;
import com.ottimizo.common.error.ServiceException;
import com.ottimizo.common.security.CurrentUser;
import com.ottimizo.common.security.Role;
import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.BeanUtils;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class AdminStoreServiceTest {

    @Mock
    private StoreRepository stores;
    @Mock
    private AuditService audit;

    private AdminStoreService service;

    private static final CurrentUser ADMIN = new CurrentUser(1L, UUID.randomUUID(), "admin@example.com", Role.ADMIN, null);

    @BeforeEach
    void setUp() {
        service = new AdminStoreService(stores, audit);
    }

    // --- LSA006_DUPLICATE ---------------------------------------------

    @Test
    void create_throwsDuplicate_whenSameNameAndCityAlreadyExists() {
        when(stores.existsByNameIgnoreCaseAndCityIgnoreCase("Loja Central", "Maputo")).thenReturn(true);

        StoreRequest request = requestFor("Loja Central", "Maputo");

        assertThatThrownBy(() -> service.create(request, ADMIN))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA006_DUPLICATE);

        verify(stores, never()).saveAndFlush(any());
        verify(audit, never()).record(any(CurrentUser.class), anyString(), anyString(), anyLong());
    }

    @Test
    void create_succeeds_whenNoDuplicate_andRecordsAudit() {
        when(stores.existsByNameIgnoreCaseAndCityIgnoreCase("Loja Nova", "Beira")).thenReturn(false);
        when(stores.saveAndFlush(any(Store.class))).thenAnswer(invocation -> {
            Store store = invocation.getArgument(0);
            ReflectionTestUtils.setField(store, "id", 10L);
            return store;
        });

        StoreResponse response = service.create(requestFor("Loja Nova", "Beira"), ADMIN);

        assertThat(response.id()).isEqualTo(10L);
        assertThat(response.name()).isEqualTo("Loja Nova");
        assertThat(response.status()).isEqualTo(StoreStatus.ACTIVE);
        verify(audit).record(ADMIN, "STORE_CREATED", "store", 10L);
    }

    @Test
    void create_translatesRaceConditionDbConstraint_toDuplicateError() {
        when(stores.existsByNameIgnoreCaseAndCityIgnoreCase(anyString(), anyString())).thenReturn(false);
        when(stores.saveAndFlush(any(Store.class))).thenThrow(new DataIntegrityViolationException("ux_stores_name_city"));

        assertThatThrownBy(() -> service.create(requestFor("Loja Nova", "Beira"), ADMIN))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA006_DUPLICATE);

        verify(audit, never()).record(any(CurrentUser.class), anyString(), anyString(), anyLong());
    }

    @Test
    void update_throwsDuplicate_whenAnotherStoreHasSameNameAndCity() {
        Store existing = store(5L, "Loja Antiga", "Maputo");
        when(stores.findById(5L)).thenReturn(Optional.of(existing));
        when(stores.existsByNameIgnoreCaseAndCityIgnoreCaseAndIdNot("Loja Central", "Maputo", 5L)).thenReturn(true);

        assertThatThrownBy(() -> service.update(5L, requestFor("Loja Central", "Maputo"), ADMIN))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA006_DUPLICATE);

        verify(stores, never()).saveAndFlush(any());
    }

    @Test
    void update_allowsKeepingItsOwnNameAndCity() {
        Store existing = store(5L, "Loja Central", "Maputo");
        when(stores.findById(5L)).thenReturn(Optional.of(existing));
        when(stores.existsByNameIgnoreCaseAndCityIgnoreCaseAndIdNot("Loja Central", "Maputo", 5L)).thenReturn(false);
        when(stores.saveAndFlush(any(Store.class))).thenAnswer(invocation -> invocation.getArgument(0));

        StoreResponse response = service.update(5L, requestFor("Loja Central", "Maputo"), ADMIN);

        assertThat(response.id()).isEqualTo(5L);
        verify(audit).record(ADMIN, "STORE_UPDATED", "store", 5L);
    }

    @Test
    void update_throwsNotFound_whenStoreDoesNotExist() {
        when(stores.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.update(99L, requestFor("Loja X", "Maputo"), ADMIN))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA005_NOT_FOUND);
    }

    // --- transicoes de estado (PATCH status) ---------------------------

    @Test
    void setStatus_transitionsActiveToSuspended_andRecordsAudit() {
        Store existing = store(7L, "Loja Central", "Maputo");
        when(stores.findById(7L)).thenReturn(Optional.of(existing));

        StoreResponse response = service.setStatus(7L, StoreStatus.SUSPENDED, ADMIN);

        assertThat(response.status()).isEqualTo(StoreStatus.SUSPENDED);
        assertThat(existing.status()).isEqualTo(StoreStatus.SUSPENDED);
        verify(audit).record(eq(ADMIN), eq("STORE_STATUS_CHANGED"), eq("store"), eq(7L), anyMap());
    }

    @Test
    void setStatus_transitionsSuspendedBackToActive() {
        Store existing = store(7L, "Loja Central", "Maputo");
        existing.changeStatus(StoreStatus.SUSPENDED);
        when(stores.findById(7L)).thenReturn(Optional.of(existing));

        StoreResponse response = service.setStatus(7L, StoreStatus.ACTIVE, ADMIN);

        assertThat(response.status()).isEqualTo(StoreStatus.ACTIVE);
    }

    @Test
    void setStatus_throwsNotFound_whenStoreDoesNotExist() {
        when(stores.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.setStatus(99L, StoreStatus.SUSPENDED, ADMIN))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA005_NOT_FOUND);
    }

    // --- delete ----------------------------------------------------------

    @Test
    void delete_removesStore_andRecordsAudit() {
        Store existing = store(3L, "Loja Central", "Maputo");
        when(stores.findById(3L)).thenReturn(Optional.of(existing));

        service.delete(3L, ADMIN);

        verify(stores).delete(existing);
        verify(audit).record(ADMIN, "STORE_DELETED", "store", 3L);
    }

    @Test
    void delete_throwsStoreInUse_whenForeignKeyViolation() {
        Store existing = store(3L, "Loja Central", "Maputo");
        when(stores.findById(3L)).thenReturn(Optional.of(existing));
        org.mockito.Mockito.doThrow(new DataIntegrityViolationException("fk_users_store"))
            .when(stores).flush();

        assertThatThrownBy(() -> service.delete(3L, ADMIN))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA024_STORE_IN_USE);

        verify(audit, never()).record(any(CurrentUser.class), anyString(), anyString(), anyLong());
    }

    @Test
    void delete_throwsNotFound_whenStoreDoesNotExist() {
        when(stores.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.delete(99L, ADMIN))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA005_NOT_FOUND);
    }

    // --- list --------------------------------------------------------------

    @Test
    void list_withoutQuery_usesFindAll() {
        Pageable pageable = PageRequest.of(0, 20);
        Page<Store> page = new PageImpl<>(java.util.List.of(store(1L, "Loja Central", "Maputo")));
        when(stores.findAll(pageable)).thenReturn(page);

        var result = service.list(null, pageable);

        assertThat(result.items()).hasSize(1);
        assertThat(result.items().get(0).name()).isEqualTo("Loja Central");
    }

    @Test
    void list_withQuery_searchesByNameOrCity() {
        Pageable pageable = PageRequest.of(0, 20);
        Page<Store> page = new PageImpl<>(java.util.List.of(store(1L, "Loja Central", "Maputo")));
        when(stores.findByNameContainingIgnoreCaseOrCityContainingIgnoreCase("Central", "Central", pageable))
            .thenReturn(page);

        var result = service.list("Central", pageable);

        assertThat(result.items()).hasSize(1);
        verify(stores, never()).findAll(any(Pageable.class));
    }

    // --- helpers -------------------------------------------------------

    private StoreRequest requestFor(String name, String city) {
        return new StoreRequest(name, "Maputo", city, "Polana", "Rua 1", "+258840000000",
            true, new BigDecimal("4.50"), "08h-18h", StorePriceLevel.MEDIO,
            new BigDecimal("-25.966"), new BigDecimal("32.583"));
    }

    private Store store(Long id, String name, String city) {
        Store store = BeanUtils.instantiateClass(Store.class);
        ReflectionTestUtils.setField(store, "id", id);
        ReflectionTestUtils.setField(store, "name", name);
        ReflectionTestUtils.setField(store, "city", city);
        ReflectionTestUtils.setField(store, "status", StoreStatus.ACTIVE);
        return store;
    }
}

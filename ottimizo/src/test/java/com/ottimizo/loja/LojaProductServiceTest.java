package com.ottimizo.loja;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
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
class LojaProductServiceTest {

    @Mock
    private ProductRepository products;
    @Mock
    private AuditService audit;

    private LojaProductService service;

    private static final Long OWN_STORE_ID = 10L;
    private static final Long OTHER_STORE_ID = 99L;
    private static final CurrentUser LOJISTA =
        new CurrentUser(1L, UUID.randomUUID(), "loja@example.com", Role.LOJISTA, OWN_STORE_ID);

    @BeforeEach
    void setUp() {
        service = new LojaProductService(products, audit);
    }

    // --- ownership / RBAC -----------------------------------------------

    @Test
    void anyMethod_throwsForbidden_whenActorIsNotLojista() {
        CurrentUser cliente = new CurrentUser(2L, UUID.randomUUID(), "cliente@example.com", Role.CLIENTE, null);

        assertThatThrownBy(() -> service.list(cliente, null, null, PageRequest.of(0, 20)))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA004_FORBIDDEN);
    }

    @Test
    void anyMethod_throwsForbidden_whenLojistaHasNoStoreAssigned() {
        CurrentUser lojistaSemLoja = new CurrentUser(3L, UUID.randomUUID(), "sem-loja@example.com", Role.LOJISTA, null);

        assertThatThrownBy(() -> service.get(lojistaSemLoja, 1L))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA004_FORBIDDEN);
    }

    @Test
    void get_throwsNotFound_whenProductBelongsToAnotherStore() {
        // O produto existe na BD (outra loja), mas a query e sempre
        // escopada ao storeId do actor — logo o resultado e vazio, nunca
        // um 403 que revelaria a existencia do produto a outra loja.
        when(products.findByIdAndStoreId(5L, OWN_STORE_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.get(LOJISTA, 5L))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA005_NOT_FOUND);
    }

    @Test
    void update_throwsNotFound_whenProductBelongsToAnotherStore() {
        when(products.findByIdAndStoreId(5L, OWN_STORE_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.update(LOJISTA, 5L, requestFor("Arroz")))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA005_NOT_FOUND);

        verify(products, never()).saveAndFlush(any());
    }

    @Test
    void delete_throwsNotFound_whenProductBelongsToAnotherStore() {
        when(products.findByIdAndStoreId(5L, OWN_STORE_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.delete(LOJISTA, 5L))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA005_NOT_FOUND);

        verify(products, never()).delete(any());
        verify(audit, never()).record(any(CurrentUser.class), anyString(), anyString(), anyLong());
    }

    @Test
    void setStatus_throwsNotFound_whenProductBelongsToAnotherStore() {
        when(products.findByIdAndStoreId(5L, OWN_STORE_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.setStatus(LOJISTA, 5L, ProductStatus.INACTIVE))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA005_NOT_FOUND);
    }

    // --- create ------------------------------------------------------------

    @Test
    void create_throwsDuplicate_whenSameNameAlreadyExistsInStore() {
        when(products.existsByStoreIdAndNameIgnoreCase(OWN_STORE_ID, "Arroz")).thenReturn(true);

        assertThatThrownBy(() -> service.create(LOJISTA, requestFor("Arroz")))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA006_DUPLICATE);

        verify(products, never()).saveAndFlush(any());
        verify(audit, never()).record(any(CurrentUser.class), anyString(), anyString(), anyLong());
    }

    @Test
    void create_succeeds_scopedToOwnStore_andRecordsAudit() {
        when(products.existsByStoreIdAndNameIgnoreCase(OWN_STORE_ID, "Arroz")).thenReturn(false);
        when(products.saveAndFlush(any(Product.class))).thenAnswer(invocation -> {
            Product product = invocation.getArgument(0);
            ReflectionTestUtils.setField(product, "id", 100L);
            return product;
        });

        ProductResponse response = service.create(LOJISTA, requestFor("Arroz"));

        assertThat(response.id()).isEqualTo(100L);
        assertThat(response.storeId()).isEqualTo(OWN_STORE_ID);
        assertThat(response.name()).isEqualTo("Arroz");
        assertThat(response.status()).isEqualTo(ProductStatus.ACTIVE);
        verify(audit).record(LOJISTA, "PRODUCT_CREATED", "product", 100L);
    }

    @Test
    void create_translatesRaceConditionDbConstraint_toDuplicateError() {
        when(products.existsByStoreIdAndNameIgnoreCase(anyLong(), anyString())).thenReturn(false);
        when(products.saveAndFlush(any(Product.class))).thenThrow(new DataIntegrityViolationException("ux_products_store_name"));

        assertThatThrownBy(() -> service.create(LOJISTA, requestFor("Arroz")))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA006_DUPLICATE);

        verify(audit, never()).record(any(CurrentUser.class), anyString(), anyString(), anyLong());
    }

    // --- update --------------------------------------------------------------

    @Test
    void update_throwsDuplicate_whenAnotherProductInSameStoreHasSameName() {
        Product existing = product(5L, OWN_STORE_ID, "Arroz Antigo");
        when(products.findByIdAndStoreId(5L, OWN_STORE_ID)).thenReturn(Optional.of(existing));
        when(products.existsByStoreIdAndNameIgnoreCaseAndIdNot(OWN_STORE_ID, "Arroz", 5L)).thenReturn(true);

        assertThatThrownBy(() -> service.update(LOJISTA, 5L, requestFor("Arroz")))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA006_DUPLICATE);

        verify(products, never()).saveAndFlush(any());
    }

    @Test
    void update_succeeds_andRecordsAudit() {
        Product existing = product(5L, OWN_STORE_ID, "Arroz Antigo");
        when(products.findByIdAndStoreId(5L, OWN_STORE_ID)).thenReturn(Optional.of(existing));
        when(products.existsByStoreIdAndNameIgnoreCaseAndIdNot(OWN_STORE_ID, "Arroz Novo", 5L)).thenReturn(false);
        when(products.saveAndFlush(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ProductResponse response = service.update(LOJISTA, 5L, requestFor("Arroz Novo"));

        assertThat(response.name()).isEqualTo("Arroz Novo");
        verify(audit).record(LOJISTA, "PRODUCT_UPDATED", "product", 5L);
    }

    // --- delete ----------------------------------------------------------

    @Test
    void delete_removesProduct_andRecordsAudit() {
        Product existing = product(5L, OWN_STORE_ID, "Arroz");
        when(products.findByIdAndStoreId(5L, OWN_STORE_ID)).thenReturn(Optional.of(existing));

        service.delete(LOJISTA, 5L);

        verify(products).delete(existing);
        verify(audit).record(LOJISTA, "PRODUCT_DELETED", "product", 5L);
    }

    // --- status ------------------------------------------------------------

    @Test
    void setStatus_transitionsActiveToInactive_andRecordsAudit() {
        Product existing = product(5L, OWN_STORE_ID, "Arroz");
        when(products.findByIdAndStoreId(5L, OWN_STORE_ID)).thenReturn(Optional.of(existing));

        ProductResponse response = service.setStatus(LOJISTA, 5L, ProductStatus.INACTIVE);

        assertThat(response.status()).isEqualTo(ProductStatus.INACTIVE);
        assertThat(existing.status()).isEqualTo(ProductStatus.INACTIVE);
        verify(audit).record(eq(LOJISTA), eq("PRODUCT_STATUS_CHANGED"), eq("product"), eq(5L), anyMap());
    }

    // --- list --------------------------------------------------------------

    @Test
    void list_withoutFilters_usesFindByStoreId() {
        Pageable pageable = PageRequest.of(0, 20);
        Page<Product> page = new PageImpl<>(java.util.List.of(product(1L, OWN_STORE_ID, "Arroz")));
        when(products.findByStoreId(OWN_STORE_ID, pageable)).thenReturn(page);

        var result = service.list(LOJISTA, null, null, pageable);

        assertThat(result.items()).hasSize(1);
        assertThat(result.items().get(0).name()).isEqualTo("Arroz");
    }

    @Test
    void list_withQuery_searchesByNameWithinOwnStore() {
        Pageable pageable = PageRequest.of(0, 20);
        Page<Product> page = new PageImpl<>(java.util.List.of(product(1L, OWN_STORE_ID, "Arroz")));
        when(products.findByStoreIdAndNameContainingIgnoreCase(OWN_STORE_ID, "Arr", pageable)).thenReturn(page);

        var result = service.list(LOJISTA, "Arr", null, pageable);

        assertThat(result.items()).hasSize(1);
        verify(products, never()).findByStoreId(anyLong(), any(Pageable.class));
    }

    @Test
    void list_withStatusFilter_scopesToOwnStoreAndStatus() {
        Pageable pageable = PageRequest.of(0, 20);
        Page<Product> page = new PageImpl<>(java.util.List.of(product(1L, OWN_STORE_ID, "Arroz")));
        when(products.findByStoreIdAndStatus(OWN_STORE_ID, ProductStatus.INACTIVE, pageable)).thenReturn(page);

        var result = service.list(LOJISTA, null, ProductStatus.INACTIVE, pageable);

        assertThat(result.items()).hasSize(1);
    }

    @Test
    void list_withQueryAndStatus_usesCombinedFinder() {
        Pageable pageable = PageRequest.of(0, 20);
        Page<Product> page = new PageImpl<>(java.util.List.of(product(1L, OWN_STORE_ID, "Arroz")));
        when(products.findByStoreIdAndStatusAndNameContainingIgnoreCase(OWN_STORE_ID, ProductStatus.ACTIVE, "Arr", pageable))
            .thenReturn(page);

        var result = service.list(LOJISTA, "Arr", ProductStatus.ACTIVE, pageable);

        assertThat(result.items()).hasSize(1);
    }

    // --- helpers -------------------------------------------------------

    private ProductRequest requestFor(String name) {
        return new ProductRequest(name, ProductCategory.CEREAIS, "kg", new BigDecimal("120.00"), null);
    }

    private Product product(Long id, Long storeId, String name) {
        Product product = BeanUtils.instantiateClass(Product.class);
        ReflectionTestUtils.setField(product, "id", id);
        ReflectionTestUtils.setField(product, "storeId", storeId);
        ReflectionTestUtils.setField(product, "name", name);
        ReflectionTestUtils.setField(product, "category", ProductCategory.CEREAIS);
        ReflectionTestUtils.setField(product, "unitLabel", "kg");
        ReflectionTestUtils.setField(product, "priceMt", new BigDecimal("120.00"));
        ReflectionTestUtils.setField(product, "status", ProductStatus.ACTIVE);
        return product;
    }
}

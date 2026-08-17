package com.ottimizo.orders;

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
import com.ottimizo.loja.Product;
import com.ottimizo.loja.ProductRepository;
import com.ottimizo.loja.ProductStatus;
import com.ottimizo.plans.ShoppingList;
import com.ottimizo.plans.ShoppingListItem;
import com.ottimizo.plans.ShoppingListItemOrigin;
import com.ottimizo.plans.ShoppingListItemRepository;
import com.ottimizo.stores.Store;
import com.ottimizo.stores.StorePriceLevel;
import com.ottimizo.stores.StoreRepository;
import com.ottimizo.stores.StoreStatus;
import com.ottimizo.users.AppUser;
import com.ottimizo.users.AppUserRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.BeanUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * BE-C07 — encomendas do cliente. Foco: resolucao best-effort de preco via
 * {@link ProductRepository} (por ingredientId, depois por nome, depois sem
 * preco), ownership dos itens da lista de compras e da propria encomenda
 * (mesmo padrao {@code LSA005_NOT_FOUND}, nunca 403), e a maquina de estados
 * de cancelamento (so PENDENTE/ACEITE).
 */
@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock
    private OrderRepository orders;
    @Mock
    private OrderItemRepository orderItems;
    @Mock
    private ShoppingListItemRepository shoppingListItems;
    @Mock
    private StoreRepository stores;
    @Mock
    private ProductRepository products;
    @Mock
    private AppUserRepository users;
    @Mock
    private AuditService audit;

    private OrderService service;

    private static final Long STORE_ID = 10L;
    private static final Long CLIENTE_ID = 1L;
    private static final CurrentUser CLIENTE =
        new CurrentUser(CLIENTE_ID, UUID.randomUUID(), "cliente@example.com", Role.CLIENTE, null);

    @BeforeEach
    void setUp() {
        service = new OrderService(orders, orderItems, shoppingListItems, stores, products, users, audit);
    }

    // --- create --------------------------------------------------------------

    @Test
    void create_throwsNotFound_whenStoreDoesNotExist() {
        when(stores.findById(STORE_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.create(CLIENTE, orderRequest(List.of(new OrderItemRequest(1L, BigDecimal.ONE)))))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA005_NOT_FOUND);

        verify(orders, never()).save(any());
    }

    @Test
    void create_throwsStoreInactive_whenStoreIsSuspended() {
        Store store = store(STORE_ID, StoreStatus.SUSPENDED);
        when(stores.findById(STORE_ID)).thenReturn(Optional.of(store));

        assertThatThrownBy(() -> service.create(CLIENTE, orderRequest(List.of(new OrderItemRequest(1L, BigDecimal.ONE)))))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA016_STORE_INACTIVE);

        verify(orders, never()).save(any());
    }

    @Test
    void create_throwsValidation_whenNoRequestedItemResolvesFromShoppingList() {
        Store store = store(STORE_ID, StoreStatus.ACTIVE);
        when(stores.findById(STORE_ID)).thenReturn(Optional.of(store));
        when(shoppingListItems.findByIdWithList(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.create(CLIENTE, orderRequest(List.of(new OrderItemRequest(99L, BigDecimal.ONE)))))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA001_VALIDATION);

        verify(orders, never()).save(any());
    }

    @Test
    void create_skipsItem_belongingToAnotherClientsShoppingList() {
        Store store = store(STORE_ID, StoreStatus.ACTIVE);
        ShoppingListItem foreignItem = shoppingListItem(5L, 999L, 7L, "Arroz", "g", ShoppingListItemOrigin.PLANO);
        when(stores.findById(STORE_ID)).thenReturn(Optional.of(store));
        when(shoppingListItems.findByIdWithList(5L)).thenReturn(Optional.of(foreignItem));

        assertThatThrownBy(() -> service.create(CLIENTE, orderRequest(List.of(new OrderItemRequest(5L, BigDecimal.ONE)))))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA001_VALIDATION);

        verify(orders, never()).save(any());
    }

    @Test
    void create_resolvesPriceByIngredientId_whenMatchingActiveProductExists() {
        Store store = store(STORE_ID, StoreStatus.ACTIVE);
        ShoppingListItem listItem = shoppingListItem(5L, CLIENTE_ID, 7L, "Arroz", "g", ShoppingListItemOrigin.PLANO);
        Product product = product(20L, STORE_ID, 7L, "Arroz", new BigDecimal("120.00"));

        when(stores.findById(STORE_ID)).thenReturn(Optional.of(store));
        when(shoppingListItems.findByIdWithList(5L)).thenReturn(Optional.of(listItem));
        when(products.findFirstByStoreIdAndIngredientIdAndStatus(STORE_ID, 7L, ProductStatus.ACTIVE))
            .thenReturn(Optional.of(product));
        when(users.findById(CLIENTE_ID)).thenReturn(Optional.of(appUser(CLIENTE_ID, "Ana Cliente", "cliente@example.com")));
        stubSavesReturningArgument();

        OrderResponse response = service.create(
            CLIENTE,
            orderRequest(List.of(new OrderItemRequest(5L, new BigDecimal("2"))))
        );

        assertThat(response.items()).hasSize(1);
        assertThat(response.items().get(0).ingredientName()).isEqualTo("Arroz");
        assertThat(response.items().get(0).priceMt()).isEqualByComparingTo("240.00");
        assertThat(response.storeName()).isEqualTo(store.name());
        assertThat(response.customerName()).isEqualTo("Ana Cliente");
        verify(products, never()).findFirstByStoreIdAndStatusAndNameIgnoreCase(anyLong(), any(), anyString());
    }

    @Test
    void create_fallsBackToNameMatch_whenItemHasNoIngredientId() {
        Store store = store(STORE_ID, StoreStatus.ACTIVE);
        // Item MANUAL (F1-CLI-06B): sem ingredientId, so nome livre.
        ShoppingListItem listItem = shoppingListItem(6L, CLIENTE_ID, null, "Sal grosso", "kg", ShoppingListItemOrigin.MANUAL);
        Product product = product(21L, STORE_ID, null, "Sal grosso", new BigDecimal("50.00"));

        when(stores.findById(STORE_ID)).thenReturn(Optional.of(store));
        when(shoppingListItems.findByIdWithList(6L)).thenReturn(Optional.of(listItem));
        when(products.findFirstByStoreIdAndStatusAndNameIgnoreCase(STORE_ID, ProductStatus.ACTIVE, "Sal grosso"))
            .thenReturn(Optional.of(product));
        when(users.findById(CLIENTE_ID)).thenReturn(Optional.of(appUser(CLIENTE_ID, "Ana Cliente", "cliente@example.com")));
        stubSavesReturningArgument();

        OrderResponse response = service.create(
            CLIENTE,
            orderRequest(List.of(new OrderItemRequest(6L, BigDecimal.ONE)))
        );

        assertThat(response.items().get(0).priceMt()).isEqualByComparingTo("50.00");
        verify(products, never()).findFirstByStoreIdAndIngredientIdAndStatus(anyLong(), anyLong(), any());
    }

    @Test
    void create_leavesPriceNull_whenNoMatchingProductInTargetStore() {
        Store store = store(STORE_ID, StoreStatus.ACTIVE);
        ShoppingListItem listItem = shoppingListItem(5L, CLIENTE_ID, 7L, "Arroz", "g", ShoppingListItemOrigin.PLANO);

        when(stores.findById(STORE_ID)).thenReturn(Optional.of(store));
        when(shoppingListItems.findByIdWithList(5L)).thenReturn(Optional.of(listItem));
        when(products.findFirstByStoreIdAndIngredientIdAndStatus(STORE_ID, 7L, ProductStatus.ACTIVE))
            .thenReturn(Optional.empty());
        when(products.findFirstByStoreIdAndStatusAndNameIgnoreCase(STORE_ID, ProductStatus.ACTIVE, "Arroz"))
            .thenReturn(Optional.empty());
        when(users.findById(CLIENTE_ID)).thenReturn(Optional.of(appUser(CLIENTE_ID, "Ana Cliente", "cliente@example.com")));
        stubSavesReturningArgument();

        OrderResponse response = service.create(
            CLIENTE,
            orderRequest(List.of(new OrderItemRequest(5L, BigDecimal.ONE)))
        );

        assertThat(response.items().get(0).priceMt()).isNull();
    }

    @Test
    void create_persistsOrderAndItems_andRecordsAudit() {
        Store store = store(STORE_ID, StoreStatus.ACTIVE);
        ShoppingListItem listItem = shoppingListItem(5L, CLIENTE_ID, 7L, "Arroz", "g", ShoppingListItemOrigin.PLANO);

        when(stores.findById(STORE_ID)).thenReturn(Optional.of(store));
        when(shoppingListItems.findByIdWithList(5L)).thenReturn(Optional.of(listItem));
        when(products.findFirstByStoreIdAndIngredientIdAndStatus(STORE_ID, 7L, ProductStatus.ACTIVE))
            .thenReturn(Optional.empty());
        when(products.findFirstByStoreIdAndStatusAndNameIgnoreCase(STORE_ID, ProductStatus.ACTIVE, "Arroz"))
            .thenReturn(Optional.empty());
        when(users.findById(CLIENTE_ID)).thenReturn(Optional.of(appUser(CLIENTE_ID, "Ana Cliente", "cliente@example.com")));
        stubSavesReturningArgument();

        OrderResponse response = service.create(
            CLIENTE,
            orderRequest(List.of(new OrderItemRequest(5L, BigDecimal.ONE)))
        );

        assertThat(response.id()).isEqualTo(500L);
        assertThat(response.status()).isEqualTo(OrderStatus.PENDENTE);
        verify(orders).save(any(Order.class));
        verify(orderItems).saveAll(any());
        verify(audit).record(eq(CLIENTE), eq("ORDER_CREATED"), eq("order"), eq(500L), anyMap());
    }

    // --- get -------------------------------------------------------------

    @Test
    void get_throwsNotFound_whenOrderBelongsToAnotherClient() {
        when(orders.findByIdAndUserId(3L, CLIENTE_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.get(CLIENTE, 3L))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA005_NOT_FOUND);
    }

    @Test
    void get_returnsOrderWithItems_forOwner() {
        Order order = order(3L, CLIENTE_ID, STORE_ID, OrderStatus.PENDENTE);
        OrderItem item = new OrderItem(order, 5L, null, "Arroz", BigDecimal.ONE, "g", null);
        when(orders.findByIdAndUserId(3L, CLIENTE_ID)).thenReturn(Optional.of(order));
        when(orderItems.findByOrder_IdOrderByIdAsc(3L)).thenReturn(List.of(item));

        OrderResponse response = service.get(CLIENTE, 3L);

        assertThat(response.id()).isEqualTo(3L);
        assertThat(response.items()).hasSize(1);
    }

    // --- list --------------------------------------------------------------

    @Test
    void list_scopesToOwner_andAttachesItemsWithoutNPlusOne() {
        Pageable pageable = PageRequest.of(0, 20);
        Order order = order(3L, CLIENTE_ID, STORE_ID, OrderStatus.PENDENTE);
        Page<Order> page = new PageImpl<>(List.of(order));
        OrderItem item = new OrderItem(order, 5L, null, "Arroz", BigDecimal.ONE, "g", null);
        when(orders.findByUserId(CLIENTE_ID, pageable)).thenReturn(page);
        when(orderItems.findByOrder_IdInOrderByIdAsc(List.of(3L))).thenReturn(List.of(item));

        var result = service.list(CLIENTE, pageable);

        assertThat(result.items()).hasSize(1);
        assertThat(result.items().get(0).items()).hasSize(1);
    }

    // --- cancel ------------------------------------------------------------

    @Test
    void cancel_throwsNotFound_whenOrderBelongsToAnotherClient() {
        when(orders.findByIdAndUserId(3L, CLIENTE_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.cancel(CLIENTE, 3L))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA005_NOT_FOUND);
    }

    @Test
    void cancel_throwsNotCancelable_whenStatusIsConcluida() {
        Order order = order(3L, CLIENTE_ID, STORE_ID, OrderStatus.CONCLUIDA);
        when(orders.findByIdAndUserId(3L, CLIENTE_ID)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> service.cancel(CLIENTE, 3L))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA017_ORDER_NOT_CANCELABLE);

        assertThat(order.status()).isEqualTo(OrderStatus.CONCLUIDA);
        verify(audit, never()).record(any(CurrentUser.class), anyString(), anyString(), anyLong());
    }

    @Test
    void cancel_throwsNotCancelable_whenStatusIsEmPreparacao() {
        Order order = order(3L, CLIENTE_ID, STORE_ID, OrderStatus.EM_PREPARACAO);
        when(orders.findByIdAndUserId(3L, CLIENTE_ID)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> service.cancel(CLIENTE, 3L))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA017_ORDER_NOT_CANCELABLE);
    }

    @Test
    void cancel_succeeds_whenPendente_andRecordsAudit() {
        Order order = order(3L, CLIENTE_ID, STORE_ID, OrderStatus.PENDENTE);
        when(orders.findByIdAndUserId(3L, CLIENTE_ID)).thenReturn(Optional.of(order));
        when(orderItems.findByOrder_IdOrderByIdAsc(3L)).thenReturn(List.of());

        OrderResponse response = service.cancel(CLIENTE, 3L);

        assertThat(response.status()).isEqualTo(OrderStatus.CANCELADA);
        assertThat(order.status()).isEqualTo(OrderStatus.CANCELADA);
        verify(audit).record(CLIENTE, "ORDER_CANCELED", "order", 3L);
    }

    @Test
    void cancel_succeeds_whenAceite() {
        Order order = order(3L, CLIENTE_ID, STORE_ID, OrderStatus.ACEITE);
        when(orders.findByIdAndUserId(3L, CLIENTE_ID)).thenReturn(Optional.of(order));
        when(orderItems.findByOrder_IdOrderByIdAsc(3L)).thenReturn(List.of());

        OrderResponse response = service.cancel(CLIENTE, 3L);

        assertThat(response.status()).isEqualTo(OrderStatus.CANCELADA);
    }

    // --- helpers -------------------------------------------------------

    private void stubSavesReturningArgument() {
        when(orders.save(any(Order.class))).thenAnswer(invocation -> {
            Order order = invocation.getArgument(0);
            ReflectionTestUtils.setField(order, "id", 500L);
            return order;
        });
        when(orderItems.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    private OrderRequest orderRequest(List<OrderItemRequest> items) {
        return new OrderRequest(STORE_ID, "Entregar de tarde", items);
    }

    private Store store(Long id, StoreStatus status) {
        Store store = new Store(
            "Mercado Central", "Maputo", "Maputo", "Baixa", "Av. 25 de Setembro",
            "84 000 0000", true, new BigDecimal("4.50"), "08:00-18:00",
            StorePriceLevel.MEDIO, null, null
        );
        ReflectionTestUtils.setField(store, "id", id);
        if (status != StoreStatus.ACTIVE) {
            store.changeStatus(status);
        }
        return store;
    }

    private AppUser appUser(Long id, String name, String email) {
        AppUser user = new AppUser(UUID.randomUUID(), name, email, Role.CLIENTE);
        ReflectionTestUtils.setField(user, "id", id);
        return user;
    }

    private ShoppingListItem shoppingListItem(
        Long id, Long listOwnerUserId, Long ingredientId, String ingredientName, String unit, ShoppingListItemOrigin origin
    ) {
        ShoppingList list = new ShoppingList(listOwnerUserId, 1L);
        ShoppingListItem item = new ShoppingListItem(
            list, ingredientId, ingredientName, "OUTROS", new BigDecimal("2.00"), unit, null, origin
        );
        ReflectionTestUtils.setField(item, "id", id);
        return item;
    }

    private Product product(Long id, Long storeId, Long ingredientId, String name, BigDecimal priceMt) {
        Product product = BeanUtils.instantiateClass(Product.class);
        ReflectionTestUtils.setField(product, "id", id);
        ReflectionTestUtils.setField(product, "storeId", storeId);
        ReflectionTestUtils.setField(product, "name", name);
        ReflectionTestUtils.setField(product, "unitLabel", "kg");
        ReflectionTestUtils.setField(product, "priceMt", priceMt);
        ReflectionTestUtils.setField(product, "ingredientId", ingredientId);
        ReflectionTestUtils.setField(product, "status", ProductStatus.ACTIVE);
        return product;
    }

    private Order order(Long id, Long userId, Long storeId, OrderStatus status) {
        Order order = new Order(userId, storeId, "Mercado Central", "84 000 0000", "Ana Cliente", "cliente@example.com", null);
        ReflectionTestUtils.setField(order, "id", id);
        if (status != OrderStatus.PENDENTE) {
            ReflectionTestUtils.setField(order, "status", status);
        }
        return order;
    }
}

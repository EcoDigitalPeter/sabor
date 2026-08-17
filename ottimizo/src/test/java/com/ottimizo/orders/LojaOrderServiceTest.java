package com.ottimizo.orders;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ottimizo.common.audit.AuditService;
import com.ottimizo.common.api.PageResponse;
import com.ottimizo.common.error.ErrorCode;
import com.ottimizo.common.error.ServiceException;
import com.ottimizo.common.security.CurrentUser;
import com.ottimizo.common.security.Role;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * BE-L04 — gestao de encomendas do lado da loja. Foco: ownership por
 * storeId (mesmo padrao {@code LSA005_NOT_FOUND}, nunca 403, de {@code
 * LojaProductServiceTest}), delegacao correcta em {@link OrderStateMachine}
 * para validar transicoes, e {@code rejectReason} so persistido quando o
 * destino e RECUSADA.
 */
@ExtendWith(MockitoExtension.class)
class LojaOrderServiceTest {

    @Mock
    private OrderRepository orders;
    @Mock
    private OrderItemRepository orderItems;
    @Mock
    private AuditService audit;

    private LojaOrderService service;

    private static final Long OWN_STORE_ID = 10L;
    private static final Long OTHER_STORE_ID = 99L;
    private static final CurrentUser LOJISTA =
        new CurrentUser(1L, UUID.randomUUID(), "loja@example.com", Role.LOJISTA, OWN_STORE_ID);

    @BeforeEach
    void setUp() {
        service = new LojaOrderService(orders, orderItems, audit);
    }

    // --- ownership / RBAC ----------------------------------------------------

    @Test
    void anyMethod_throwsForbidden_whenActorIsNotLojista() {
        CurrentUser cliente = new CurrentUser(2L, UUID.randomUUID(), "cliente@example.com", Role.CLIENTE, null);

        assertThatThrownBy(() -> service.list(cliente, null, PageRequest.of(0, 20)))
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
    void get_throwsNotFound_whenOrderBelongsToAnotherStore() {
        // A encomenda existe na BD (outra loja), mas a query e sempre
        // escopada ao storeId do actor — resultado vazio, nunca 403 (nao
        // revela a outra loja se o id existe).
        when(orders.findByIdAndStoreId(5L, OWN_STORE_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.get(LOJISTA, 5L))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA005_NOT_FOUND);
    }

    @Test
    void updateStatus_throwsNotFound_whenOrderBelongsToAnotherStore() {
        when(orders.findByIdAndStoreId(5L, OWN_STORE_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.updateStatus(LOJISTA, 5L, new LojaOrderStatusUpdateRequest(OrderStatus.ACEITE, null)))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA005_NOT_FOUND);

        verify(audit, never()).record(any(CurrentUser.class), anyString(), anyString(), anyLong(), any());
    }

    // --- get -------------------------------------------------------------

    @Test
    void get_returnsOrderWithItems_forOwnStore() {
        Order order = order(3L, OWN_STORE_ID, OrderStatus.PENDENTE);
        OrderItem item = new OrderItem(order, 5L, null, "Arroz", java.math.BigDecimal.ONE, "g", null);
        when(orders.findByIdAndStoreId(3L, OWN_STORE_ID)).thenReturn(Optional.of(order));
        when(orderItems.findByOrder_IdOrderByIdAsc(3L)).thenReturn(List.of(item));

        OrderResponse response = service.get(LOJISTA, 3L);

        assertThat(response.id()).isEqualTo(3L);
        assertThat(response.items()).hasSize(1);
    }

    // --- list --------------------------------------------------------------

    @Test
    void list_withoutStatusFilter_usesFindByStoreId() {
        Pageable pageable = PageRequest.of(0, 20);
        Order order = order(3L, OWN_STORE_ID, OrderStatus.PENDENTE);
        Page<Order> page = new PageImpl<>(List.of(order));
        when(orders.findByStoreId(OWN_STORE_ID, pageable)).thenReturn(page);
        when(orderItems.findByOrder_IdInOrderByIdAsc(List.of(3L))).thenReturn(List.of());

        PageResponse<OrderResponse> result = service.list(LOJISTA, null, pageable);

        assertThat(result.items()).hasSize(1);
        assertThat(result.items().get(0).id()).isEqualTo(3L);
    }

    @Test
    void list_withStatusFilter_scopesToOwnStoreAndStatus() {
        Pageable pageable = PageRequest.of(0, 20);
        Order order = order(3L, OWN_STORE_ID, OrderStatus.ACEITE);
        Page<Order> page = new PageImpl<>(List.of(order));
        when(orders.findByStoreIdAndStatus(OWN_STORE_ID, OrderStatus.ACEITE, pageable)).thenReturn(page);
        when(orderItems.findByOrder_IdInOrderByIdAsc(List.of(3L))).thenReturn(List.of());

        PageResponse<OrderResponse> result = service.list(LOJISTA, OrderStatus.ACEITE, pageable);

        assertThat(result.items()).hasSize(1);
        verify(orders, never()).findByStoreId(anyLong(), any(Pageable.class));
    }

    @Test
    void list_scopedToOtherStore_neverLeaksOrders() {
        // A loja B nunca consegue listar encomendas da loja A: o repositorio
        // e sempre chamado com o storeId do actor, nunca outro.
        CurrentUser lojistaB = new CurrentUser(9L, UUID.randomUUID(), "lojaB@example.com", Role.LOJISTA, OTHER_STORE_ID);
        Pageable pageable = PageRequest.of(0, 20);
        when(orders.findByStoreId(OTHER_STORE_ID, pageable)).thenReturn(new PageImpl<>(List.of()));

        service.list(lojistaB, null, pageable);

        verify(orders).findByStoreId(OTHER_STORE_ID, pageable);
        verify(orders, never()).findByStoreId(eq(OWN_STORE_ID), any());
    }

    @Test
    void list_emptyPage_doesNotQueryItems() {
        Pageable pageable = PageRequest.of(0, 20);
        when(orders.findByStoreId(OWN_STORE_ID, pageable)).thenReturn(new PageImpl<>(List.of()));

        PageResponse<OrderResponse> result = service.list(LOJISTA, null, pageable);

        assertThat(result.items()).isEmpty();
        verify(orderItems, never()).findByOrder_IdInOrderByIdAsc(any());
    }

    // --- updateStatus: transicoes validas -----------------------------------

    @Test
    void updateStatus_pendenteParaAceite_succeeds_andRecordsAudit() {
        Order order = order(3L, OWN_STORE_ID, OrderStatus.PENDENTE);
        when(orders.findByIdAndStoreId(3L, OWN_STORE_ID)).thenReturn(Optional.of(order));
        when(orderItems.findByOrder_IdOrderByIdAsc(3L)).thenReturn(List.of());

        OrderResponse response = service.updateStatus(LOJISTA, 3L, new LojaOrderStatusUpdateRequest(OrderStatus.ACEITE, null));

        assertThat(response.status()).isEqualTo(OrderStatus.ACEITE);
        assertThat(order.status()).isEqualTo(OrderStatus.ACEITE);
        assertThat(order.rejectReason()).isNull();

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> detailCaptor = ArgumentCaptor.forClass(Map.class);
        verify(audit).record(eq(LOJISTA), eq("ORDER_STATUS_CHANGED"), eq("order"), eq(3L), detailCaptor.capture());
        assertThat(detailCaptor.getValue()).containsEntry("from", "PENDENTE").containsEntry("to", "ACEITE");
    }

    @Test
    void updateStatus_aceiteParaEmPreparacao_succeeds() {
        Order order = order(3L, OWN_STORE_ID, OrderStatus.ACEITE);
        when(orders.findByIdAndStoreId(3L, OWN_STORE_ID)).thenReturn(Optional.of(order));
        when(orderItems.findByOrder_IdOrderByIdAsc(3L)).thenReturn(List.of());

        OrderResponse response = service.updateStatus(LOJISTA, 3L, new LojaOrderStatusUpdateRequest(OrderStatus.EM_PREPARACAO, null));

        assertThat(response.status()).isEqualTo(OrderStatus.EM_PREPARACAO);
    }

    @Test
    void updateStatus_emPreparacaoParaPronta_succeeds() {
        Order order = order(3L, OWN_STORE_ID, OrderStatus.EM_PREPARACAO);
        when(orders.findByIdAndStoreId(3L, OWN_STORE_ID)).thenReturn(Optional.of(order));
        when(orderItems.findByOrder_IdOrderByIdAsc(3L)).thenReturn(List.of());

        OrderResponse response = service.updateStatus(LOJISTA, 3L, new LojaOrderStatusUpdateRequest(OrderStatus.PRONTA, null));

        assertThat(response.status()).isEqualTo(OrderStatus.PRONTA);
    }

    @Test
    void updateStatus_prontaParaConcluida_succeeds() {
        Order order = order(3L, OWN_STORE_ID, OrderStatus.PRONTA);
        when(orders.findByIdAndStoreId(3L, OWN_STORE_ID)).thenReturn(Optional.of(order));
        when(orderItems.findByOrder_IdOrderByIdAsc(3L)).thenReturn(List.of());

        OrderResponse response = service.updateStatus(LOJISTA, 3L, new LojaOrderStatusUpdateRequest(OrderStatus.CONCLUIDA, null));

        assertThat(response.status()).isEqualTo(OrderStatus.CONCLUIDA);
    }

    @Test
    void updateStatus_pendenteParaRecusada_persistsTrimmedReason() {
        Order order = order(3L, OWN_STORE_ID, OrderStatus.PENDENTE);
        when(orders.findByIdAndStoreId(3L, OWN_STORE_ID)).thenReturn(Optional.of(order));
        when(orderItems.findByOrder_IdOrderByIdAsc(3L)).thenReturn(List.of());

        service.updateStatus(LOJISTA, 3L, new LojaOrderStatusUpdateRequest(OrderStatus.RECUSADA, "  Sem stock.  "));

        assertThat(order.status()).isEqualTo(OrderStatus.RECUSADA);
        assertThat(order.rejectReason()).isEqualTo("Sem stock.");
    }

    @Test
    void updateStatus_aceiteParaRecusada_succeeds() {
        Order order = order(3L, OWN_STORE_ID, OrderStatus.ACEITE);
        when(orders.findByIdAndStoreId(3L, OWN_STORE_ID)).thenReturn(Optional.of(order));
        when(orderItems.findByOrder_IdOrderByIdAsc(3L)).thenReturn(List.of());

        OrderResponse response = service.updateStatus(LOJISTA, 3L, new LojaOrderStatusUpdateRequest(OrderStatus.RECUSADA, "Motivo"));

        assertThat(response.status()).isEqualTo(OrderStatus.RECUSADA);
        assertThat(order.rejectReason()).isEqualTo("Motivo");
    }

    @Test
    void updateStatus_blankReason_isStoredAsNull() {
        Order order = order(3L, OWN_STORE_ID, OrderStatus.PENDENTE);
        when(orders.findByIdAndStoreId(3L, OWN_STORE_ID)).thenReturn(Optional.of(order));
        when(orderItems.findByOrder_IdOrderByIdAsc(3L)).thenReturn(List.of());

        service.updateStatus(LOJISTA, 3L, new LojaOrderStatusUpdateRequest(OrderStatus.RECUSADA, "   "));

        assertThat(order.rejectReason()).isNull();
    }

    @Test
    void updateStatus_reasonIsIgnored_whenTransitionIsNotRecusada() {
        // Um "reason" enviado por engano numa transicao que nao e RECUSADA
        // nao deve ficar gravado — evita rejectReason "orfao" de uma
        // encomenda que na verdade foi aceite.
        Order order = order(3L, OWN_STORE_ID, OrderStatus.PENDENTE);
        when(orders.findByIdAndStoreId(3L, OWN_STORE_ID)).thenReturn(Optional.of(order));
        when(orderItems.findByOrder_IdOrderByIdAsc(3L)).thenReturn(List.of());

        service.updateStatus(LOJISTA, 3L, new LojaOrderStatusUpdateRequest(OrderStatus.ACEITE, "Isto devia ser ignorado"));

        assertThat(order.status()).isEqualTo(OrderStatus.ACEITE);
        assertThat(order.rejectReason()).isNull();
    }

    // --- updateStatus: transicoes invalidas ---------------------------------

    @Test
    void updateStatus_throwsInvalidTransition_whenSkippingStates() {
        Order order = order(3L, OWN_STORE_ID, OrderStatus.PENDENTE);
        when(orders.findByIdAndStoreId(3L, OWN_STORE_ID)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> service.updateStatus(LOJISTA, 3L, new LojaOrderStatusUpdateRequest(OrderStatus.CONCLUIDA, null)))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA030_INVALID_ORDER_TRANSITION);

        assertThat(order.status()).isEqualTo(OrderStatus.PENDENTE);
        verify(audit, never()).record(any(CurrentUser.class), anyString(), anyString(), anyLong(), any());
    }

    @Test
    void updateStatus_throwsInvalidTransition_whenAlreadyConcluida() {
        Order order = order(3L, OWN_STORE_ID, OrderStatus.CONCLUIDA);
        when(orders.findByIdAndStoreId(3L, OWN_STORE_ID)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> service.updateStatus(LOJISTA, 3L, new LojaOrderStatusUpdateRequest(OrderStatus.ACEITE, null)))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA030_INVALID_ORDER_TRANSITION);
    }

    @Test
    void updateStatus_throwsInvalidTransition_whenAttemptingCancelViaLojaEndpoint() {
        // CANCELADA e accao exclusiva do cliente — a loja nao a consegue
        // desencadear atraves deste endpoint.
        Order order = order(3L, OWN_STORE_ID, OrderStatus.PENDENTE);
        when(orders.findByIdAndStoreId(3L, OWN_STORE_ID)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> service.updateStatus(LOJISTA, 3L, new LojaOrderStatusUpdateRequest(OrderStatus.CANCELADA, null)))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA030_INVALID_ORDER_TRANSITION);
    }

    @Test
    void updateStatus_throwsInvalidTransition_whenAlreadyRecusada() {
        Order order = order(3L, OWN_STORE_ID, OrderStatus.RECUSADA);
        when(orders.findByIdAndStoreId(3L, OWN_STORE_ID)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> service.updateStatus(LOJISTA, 3L, new LojaOrderStatusUpdateRequest(OrderStatus.ACEITE, null)))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA030_INVALID_ORDER_TRANSITION);
    }

    // --- helpers -------------------------------------------------------

    private Order order(Long id, Long storeId, OrderStatus status) {
        Order order = new Order(1L, storeId, "Mercado Central", "84 000 0000", "Ana Cliente", "cliente@example.com", null);
        ReflectionTestUtils.setField(order, "id", id);
        if (status != OrderStatus.PENDENTE) {
            ReflectionTestUtils.setField(order, "status", status);
        }
        return order;
    }
}

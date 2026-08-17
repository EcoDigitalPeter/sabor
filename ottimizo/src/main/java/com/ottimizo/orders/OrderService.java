package com.ottimizo.orders;

import com.ottimizo.common.audit.AuditService;
import com.ottimizo.common.api.PageResponse;
import com.ottimizo.common.error.ErrorCode;
import com.ottimizo.common.error.ServiceException;
import com.ottimizo.common.security.CurrentUser;
import com.ottimizo.loja.Product;
import com.ottimizo.loja.ProductRepository;
import com.ottimizo.loja.ProductStatus;
import com.ottimizo.plans.ShoppingListItem;
import com.ottimizo.plans.ShoppingListItemRepository;
import com.ottimizo.stores.Store;
import com.ottimizo.stores.StoreRepository;
import com.ottimizo.stores.StoreStatus;
import com.ottimizo.users.AppUser;
import com.ottimizo.users.AppUserRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * BE-C07 — encomendas do cliente a partir da lista de compras actual
 * (F1-CLI-07 / F3-CLI-07). Ownership e' sempre derivada de
 * {@link CurrentUser#id()}, nunca de um {@code userId} do pedido — mesmo
 * padrao de {@code ShoppingListService}/{@code MealPlanService}: um recurso
 * de outro cliente devolve {@link ErrorCode#LSA005_NOT_FOUND}, nunca 403.
 *
 * <p>Resolucao de preco unitario e' <strong>best-effort</strong>: para cada
 * item, tenta encontrar um {@link Product} activo na loja alvo (primeiro por
 * {@code ingredientId}, depois por nome exacto) para preencher {@code
 * priceMt}; se nao encontrar, o item fica sem preco resolvido (nao bloqueia
 * a criacao da encomenda — o preco final e' sempre acertado presencialmente
 * com a loja, este valor e so uma estimativa).
 */
@Service
public class OrderService {

    private final OrderRepository orders;
    private final OrderItemRepository orderItems;
    private final ShoppingListItemRepository shoppingListItems;
    private final StoreRepository stores;
    private final ProductRepository products;
    private final AppUserRepository users;
    private final AuditService audit;

    public OrderService(
        OrderRepository orders,
        OrderItemRepository orderItems,
        ShoppingListItemRepository shoppingListItems,
        StoreRepository stores,
        ProductRepository products,
        AppUserRepository users,
        AuditService audit
    ) {
        this.orders = orders;
        this.orderItems = orderItems;
        this.shoppingListItems = shoppingListItems;
        this.stores = stores;
        this.products = products;
        this.users = users;
        this.audit = audit;
    }

    /** {@code POST /me/orders}. */
    @Transactional
    public OrderResponse create(CurrentUser actor, OrderRequest request) {
        Store store = stores.findById(request.storeId())
            .orElseThrow(() -> new ServiceException(ErrorCode.LSA005_NOT_FOUND, "Loja nao encontrada."));
        if (store.status() != StoreStatus.ACTIVE) {
            throw new ServiceException(ErrorCode.LSA016_STORE_INACTIVE);
        }

        List<PendingItem> pending = resolveRequestedItems(actor, store, request);
        if (pending.isEmpty()) {
            throw new ServiceException(ErrorCode.LSA001_VALIDATION, "Nenhum item valido da lista de compras foi encontrado.");
        }

        AppUser user = users.findById(actor.id())
            .orElseThrow(() -> new ServiceException(ErrorCode.LSA004_FORBIDDEN));

        Order order = new Order(
            actor.id(),
            store.id(),
            store.name(),
            store.contact(),
            user.name(),
            user.email(),
            trimToNull(request.note())
        );
        orders.save(order);

        List<OrderItem> toSave = new ArrayList<>(pending.size());
        for (PendingItem item : pending) {
            toSave.add(new OrderItem(
                order,
                item.shoppingListItemId(),
                item.productId(),
                item.ingredientName(),
                item.quantity(),
                item.unit(),
                item.priceMt()
            ));
        }
        orderItems.saveAll(toSave);

        audit.record(actor, "ORDER_CREATED", "order", order.id(), Map.of(
            "storeId", store.id(),
            "itemCount", toSave.size()
        ));
        return OrderResponse.from(order, toSave);
    }

    /** {@code GET /me/orders} — paginado, mais recentes primeiro por defeito. */
    @Transactional(readOnly = true)
    public PageResponse<OrderResponse> list(CurrentUser actor, Pageable pageable) {
        Page<Order> page = orders.findByUserId(actor.id(), pageable);
        List<Order> pageOrders = page.getContent();
        if (pageOrders.isEmpty()) {
            return PageResponse.from(page.map(order -> OrderResponse.from(order, List.of())));
        }

        List<Long> orderIds = pageOrders.stream().map(Order::id).toList();
        Map<Long, List<OrderItem>> itemsByOrderId = new LinkedHashMap<>();
        for (OrderItem item : orderItems.findByOrder_IdInOrderByIdAsc(orderIds)) {
            itemsByOrderId.computeIfAbsent(item.order().id(), key -> new ArrayList<>()).add(item);
        }

        return PageResponse.from(page.map(order ->
            OrderResponse.from(order, itemsByOrderId.getOrDefault(order.id(), List.of()))
        ));
    }

    /** {@code GET /me/orders/{id}} — ownership obrigatoria. */
    @Transactional(readOnly = true)
    public OrderResponse get(CurrentUser actor, Long id) {
        Order order = findOwnedOrThrow(id, actor.id());
        return OrderResponse.from(order, orderItems.findByOrder_IdOrderByIdAsc(order.id()));
    }

    /** {@code PATCH /me/orders/{id}/cancel} (F3-CLI-07) — so em PENDENTE/ACEITE. */
    @Transactional
    public OrderResponse cancel(CurrentUser actor, Long id) {
        Order order = findOwnedOrThrow(id, actor.id());
        if (!CANCELABLE_STATUSES.contains(order.status())) {
            throw new ServiceException(ErrorCode.LSA017_ORDER_NOT_CANCELABLE);
        }
        order.cancel();
        audit.record(actor, "ORDER_CANCELED", "order", order.id());
        return OrderResponse.from(order, orderItems.findByOrder_IdOrderByIdAsc(order.id()));
    }

    private static final Set<OrderStatus> CANCELABLE_STATUSES = Set.of(OrderStatus.PENDENTE, OrderStatus.ACEITE);

    private Order findOwnedOrThrow(Long id, Long userId) {
        return orders.findByIdAndUserId(id, userId)
            .orElseThrow(() -> new ServiceException(ErrorCode.LSA005_NOT_FOUND));
    }

    /**
     * Resolve cada linha do pedido contra a lista de compras do cliente
     * autenticado (ownership por {@code shoppingList.userId}) e, em seguida,
     * contra o catalogo de produtos da loja alvo. Itens cujo {@code itemId}
     * nao existe ou nao pertence ao cliente sao ignorados silenciosamente
     * (mesmo comportamento do mock MSW que este endpoint substitui) — so a
     * lista final vazia e' que e' um erro (ver {@link #create}).
     */
    private List<PendingItem> resolveRequestedItems(CurrentUser actor, Store store, OrderRequest request) {
        List<PendingItem> resolved = new ArrayList<>();
        for (OrderItemRequest requested : request.items()) {
            ShoppingListItem listItem = shoppingListItems.findByIdWithList(requested.itemId())
                .filter(item -> item.shoppingList().userId().equals(actor.id()))
                .orElse(null);
            if (listItem == null) {
                continue;
            }

            Product product = resolveProduct(store.id(), listItem);
            Long productId = product == null ? null : product.id();
            BigDecimal priceMt = product == null
                ? null
                : product.priceMt().multiply(requested.quantity()).setScale(2, RoundingMode.HALF_UP);

            resolved.add(new PendingItem(
                listItem.id(),
                productId,
                listItem.ingredientName(),
                requested.quantity(),
                listItem.unit(),
                priceMt
            ));
        }
        return resolved;
    }

    /**
     * Best-effort: primeiro por {@code ingredientId} (mais fiavel — liga ao
     * mesmo ingrediente curado), depois por nome exacto dentro da loja alvo.
     * {@code null} quando nao ha correspondencia — o item fica sem preco.
     */
    private Product resolveProduct(Long storeId, ShoppingListItem listItem) {
        if (listItem.ingredientId() != null) {
            Product byIngredient = products
                .findFirstByStoreIdAndIngredientIdAndStatus(storeId, listItem.ingredientId(), ProductStatus.ACTIVE)
                .orElse(null);
            if (byIngredient != null) {
                return byIngredient;
            }
        }
        return products
            .findFirstByStoreIdAndStatusAndNameIgnoreCase(storeId, ProductStatus.ACTIVE, listItem.ingredientName())
            .orElse(null);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    /** Linha de encomenda ja resolvida contra a lista de compras + catalogo, antes de virar {@link OrderItem}. */
    private record PendingItem(
        Long shoppingListItemId,
        Long productId,
        String ingredientName,
        BigDecimal quantity,
        String unit,
        BigDecimal priceMt
    ) {
    }
}

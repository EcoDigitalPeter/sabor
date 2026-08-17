package com.ottimizo.orders;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;

/**
 * Linha de uma encomenda (tabela {@code order_items}, V004) — snapshot de um
 * item da lista de compras no momento em que a encomenda foi criada
 * ({@code ingredientName}/{@code quantity}/{@code unit} nao seguem alteracoes
 * posteriores ao item de origem). {@code shoppingListItemId} liga de volta ao
 * {@code ShoppingListItem} que originou a linha (BE-C06); {@code productId}
 * fica preenchido quando {@link com.ottimizo.orders.OrderService} conseguiu
 * resolver um {@code Product} correspondente na loja alvo — ambos ficam nulos
 * (FK {@code on delete set null} na migracao) se o item/produto de origem for
 * apagado mais tarde, sem apagar a linha da encomenda.
 */
@Entity
@Table(name = "order_items")
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false, updatable = false)
    private Order order;

    @Column(name = "shopping_list_item_id")
    private Long shoppingListItemId;

    @Column(name = "product_id")
    private Long productId;

    @Column(name = "ingredient_name", nullable = false)
    private String ingredientName;

    @Column(nullable = false)
    private BigDecimal quantity;

    @Column(nullable = false)
    private String unit;

    @Column(name = "price_mt")
    private BigDecimal priceMt;

    protected OrderItem() {
    }

    public OrderItem(
        Order order,
        Long shoppingListItemId,
        Long productId,
        String ingredientName,
        BigDecimal quantity,
        String unit,
        BigDecimal priceMt
    ) {
        this.order = order;
        this.shoppingListItemId = shoppingListItemId;
        this.productId = productId;
        this.ingredientName = ingredientName;
        this.quantity = quantity;
        this.unit = unit;
        this.priceMt = priceMt;
    }

    public Long id() {
        return id;
    }

    public Order order() {
        return order;
    }

    public Long shoppingListItemId() {
        return shoppingListItemId;
    }

    public Long productId() {
        return productId;
    }

    public String ingredientName() {
        return ingredientName;
    }

    public BigDecimal quantity() {
        return quantity;
    }

    public String unit() {
        return unit;
    }

    public BigDecimal priceMt() {
        return priceMt;
    }
}

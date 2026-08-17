package com.ottimizo.plans;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;

/**
 * Linha da lista de compras (tabela {@code shopping_list_items}, V003).
 * {@code ingredientId} fica preenchido para itens {@code origin = PLANO}
 * (agregados pelo {@link ShoppingListService} a partir de
 * {@code RecipeIngredient}) e nulo para itens {@code MANUAL} (o cliente
 * escreve o nome livremente, F1-CLI-06B) — nao ha entidade {@code Ingredient}
 * por tras deles.
 */
@Entity
@Table(name = "shopping_list_items")
public class ShoppingListItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shopping_list_id", nullable = false)
    private ShoppingList shoppingList;

    @Column(name = "ingredient_id")
    private Long ingredientId;

    @Column(name = "ingredient_name", nullable = false)
    private String ingredientName;

    @Column(nullable = false)
    private String category;

    @Column(nullable = false)
    private BigDecimal quantity;

    @Column(nullable = false)
    private String unit;

    @Column(nullable = false)
    private boolean checked = false;

    @Column(name = "have_quantity", nullable = false)
    private BigDecimal haveQuantity = BigDecimal.ZERO;

    @Column(name = "estimated_cost_mt")
    private BigDecimal estimatedCostMt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ShoppingListItemOrigin origin;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected ShoppingListItem() {
    }

    public ShoppingListItem(
        ShoppingList shoppingList,
        Long ingredientId,
        String ingredientName,
        String category,
        BigDecimal quantity,
        String unit,
        BigDecimal estimatedCostMt,
        ShoppingListItemOrigin origin
    ) {
        this.shoppingList = shoppingList;
        this.ingredientId = ingredientId;
        this.ingredientName = ingredientName;
        this.category = category;
        this.quantity = quantity;
        this.unit = unit;
        this.checked = false;
        this.haveQuantity = BigDecimal.ZERO;
        this.estimatedCostMt = estimatedCostMt;
        this.origin = origin;
    }

    /**
     * Actualiza os campos derivados da agregacao do plano (nome/categoria/
     * quantidade/unidade/custo), preservando {@code checked}/{@code haveQuantity}/{@code id} —
     * e' assim que {@link ShoppingListService#rebuildForPlan} preserva o
     * estado do item entre regeneracoes em vez de apagar e recriar.
     */
    public void applyRebuildValues(String ingredientName, String category, BigDecimal quantity, String unit, BigDecimal estimatedCostMt) {
        this.ingredientName = ingredientName;
        this.category = category;
        this.quantity = quantity;
        this.unit = unit;
        this.estimatedCostMt = estimatedCostMt;
    }

    public void setChecked(boolean checked) {
        this.checked = checked;
    }

    public void setHaveQuantity(BigDecimal haveQuantity) {
        this.haveQuantity = haveQuantity == null ? BigDecimal.ZERO : haveQuantity.max(BigDecimal.ZERO);
    }

    /**
     * Custo estimado do que falta comprar deste item, pro-rateado pela
     * quantidade que o cliente ja diz ter ({@code haveQuantity}, FE-R01).
     * {@code null} quando nao ha preco de referencia para o ingrediente
     * (estimativa parcial, ver {@link ShoppingListResponse#costIsPartial}).
     */
    public BigDecimal remainingCost() {
        if (estimatedCostMt == null) {
            return null;
        }
        if (quantity == null || quantity.signum() <= 0) {
            return estimatedCostMt;
        }
        BigDecimal remaining = quantity.subtract(haveQuantity == null ? BigDecimal.ZERO : haveQuantity);
        if (remaining.signum() < 0) {
            remaining = BigDecimal.ZERO;
        }
        return estimatedCostMt.multiply(remaining).divide(quantity, 2, RoundingMode.HALF_UP);
    }

    @PrePersist
    void onCreate() {
        OffsetDateTime now = OffsetDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = OffsetDateTime.now();
    }

    public Long id() {
        return id;
    }

    public ShoppingList shoppingList() {
        return shoppingList;
    }

    public Long ingredientId() {
        return ingredientId;
    }

    public String ingredientName() {
        return ingredientName;
    }

    public String category() {
        return category;
    }

    public BigDecimal quantity() {
        return quantity;
    }

    public String unit() {
        return unit;
    }

    public boolean checked() {
        return checked;
    }

    public BigDecimal haveQuantity() {
        return haveQuantity;
    }

    public BigDecimal estimatedCostMt() {
        return estimatedCostMt;
    }

    public ShoppingListItemOrigin origin() {
        return origin;
    }

    public OffsetDateTime createdAt() {
        return createdAt;
    }

    public OffsetDateTime updatedAt() {
        return updatedAt;
    }
}

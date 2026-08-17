package com.ottimizo.loja;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

/**
 * Produto do catalogo de uma loja (BE-L02), mapeado sobre a tabela
 * {@code products} (V004). {@code storeId} e {@code ingredientId} ficam
 * como colunas escalares (sem relacao JPA gerida) porque este dominio nao
 * precisa de carregar {@code Store}/{@code Ingredient} completos para o
 * CRUD — apenas o id, tal como a FK na base de dados.
 */
@Entity
@Table(name = "products")
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "store_id", nullable = false, updatable = false)
    private Long storeId;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProductCategory category;

    @Column(name = "unit_label", nullable = false)
    private String unitLabel;

    @Column(name = "price_mt", nullable = false)
    private BigDecimal priceMt;

    @Column(name = "ingredient_id")
    private Long ingredientId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProductStatus status = ProductStatus.ACTIVE;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected Product() {
    }

    public Product(
        Long storeId,
        String name,
        ProductCategory category,
        String unitLabel,
        BigDecimal priceMt,
        Long ingredientId
    ) {
        this.storeId = storeId;
        this.name = name;
        this.category = category;
        this.unitLabel = unitLabel;
        this.priceMt = priceMt;
        this.ingredientId = ingredientId;
        this.status = ProductStatus.ACTIVE;
        OffsetDateTime now = OffsetDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void applyUpdate(
        String name,
        ProductCategory category,
        String unitLabel,
        BigDecimal priceMt,
        Long ingredientId
    ) {
        this.name = name;
        this.category = category;
        this.unitLabel = unitLabel;
        this.priceMt = priceMt;
        this.ingredientId = ingredientId;
        this.updatedAt = OffsetDateTime.now();
    }

    public void changeStatus(ProductStatus status) {
        this.status = status;
        this.updatedAt = OffsetDateTime.now();
    }

    public Long id() {
        return id;
    }

    public Long storeId() {
        return storeId;
    }

    public String name() {
        return name;
    }

    public ProductCategory category() {
        return category;
    }

    public String unitLabel() {
        return unitLabel;
    }

    public BigDecimal priceMt() {
        return priceMt;
    }

    public Long ingredientId() {
        return ingredientId;
    }

    public ProductStatus status() {
        return status;
    }

    public OffsetDateTime createdAt() {
        return createdAt;
    }

    public OffsetDateTime updatedAt() {
        return updatedAt;
    }
}

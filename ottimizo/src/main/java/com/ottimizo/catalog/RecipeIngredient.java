package com.ottimizo.catalog;

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
 * Linha de ingrediente de uma receita (quantidade + unidade). A coluna
 * {@code recipe_id} e' propriedade da colecao {@link Recipe#ingredients()}
 * (join column no lado "um"); aqui fica apenas de leitura para nao haver
 * dois donos a escrever na mesma coluna. {@code nameSnapshot} preserva o
 * nome do ingrediente tal como estava quando foi adicionado a` receita,
 * para o caso de o ingrediente ser renomeado mais tarde.
 */
@Entity
@Table(name = "recipe_ingredients")
public class RecipeIngredient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "recipe_id", insertable = false, updatable = false)
    private Long recipeId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ingredient_id", nullable = false)
    private Ingredient ingredient;

    @Column(name = "name_snapshot")
    private String nameSnapshot;

    @Column(nullable = false)
    private BigDecimal quantity;

    @Column(nullable = false)
    private String unit;

    protected RecipeIngredient() {
    }

    public RecipeIngredient(Ingredient ingredient, BigDecimal quantity, String unit) {
        this.ingredient = ingredient;
        this.nameSnapshot = ingredient == null ? null : ingredient.name();
        this.quantity = quantity;
        this.unit = unit;
    }

    public Long id() {
        return id;
    }

    public Long recipeId() {
        return recipeId;
    }

    public Ingredient ingredient() {
        return ingredient;
    }

    public String nameSnapshot() {
        return nameSnapshot;
    }

    public BigDecimal quantity() {
        return quantity;
    }

    public String unit() {
        return unit;
    }
}

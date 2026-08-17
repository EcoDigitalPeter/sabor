package com.ottimizo.catalog;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Passo ordenado de uma receita. A coluna {@code recipe_id} e' propriedade da
 * colecao {@link Recipe#steps()} (join column no lado "um"); aqui fica apenas
 * de leitura ({@code insertable = false, updatable = false}) para nao haver
 * dois donos a escrever na mesma coluna.
 */
@Entity
@Table(name = "recipe_steps")
public class RecipeStep {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "recipe_id", insertable = false, updatable = false)
    private Long recipeId;

    @Column(name = "step_order", nullable = false)
    private Integer stepOrder;

    @Column(nullable = false)
    private String text;

    protected RecipeStep() {
    }

    public RecipeStep(Integer stepOrder, String text) {
        this.stepOrder = stepOrder;
        this.text = text;
    }

    public Long recipeId() {
        return recipeId;
    }

    public Integer stepOrder() {
        return stepOrder;
    }

    public String text() {
        return text;
    }
}

package com.ottimizo.catalog;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.OffsetDateTime;

/**
 * Preferencia global do cliente por uma receita (tabela {@code meal_feedback},
 * V002) — {@code PUT /me/recipes/{id}/feedback} (BE-C05). Independente do
 * {@link com.ottimizo.plans.EntryFeedback} guardado em cada
 * {@code MealPlanEntry} (esse e' por ocorrencia especifica no plano; este e'
 * a preferencia da receita em si, usada por
 * {@link RecipeCatalogService#eligibleFor} para priorizar/excluir receitas
 * em geracoes e trocas futuras). A restricao {@code unique (user_id, recipe_id)}
 * em BD e' o que torna {@code setFeedback} idempotente — repetir o mesmo
 * pedido faz update, nunca insere uma segunda linha.
 */
@Entity
@Table(name = "meal_feedback", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "recipe_id"}))
public class MealFeedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "recipe_id", nullable = false)
    private Long recipeId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 8)
    private FeedbackValue value;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected MealFeedback() {
    }

    public MealFeedback(Long userId, Long recipeId, FeedbackValue value) {
        this.userId = userId;
        this.recipeId = recipeId;
        this.value = value;
    }

    /** Actualiza o valor guardado (caminho "ja existe uma linha para este user+receita"). */
    public void updateValue(FeedbackValue value) {
        this.value = value;
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

    public Long userId() {
        return userId;
    }

    public Long recipeId() {
        return recipeId;
    }

    public FeedbackValue value() {
        return value;
    }

    public OffsetDateTime createdAt() {
        return createdAt;
    }

    public OffsetDateTime updatedAt() {
        return updatedAt;
    }
}

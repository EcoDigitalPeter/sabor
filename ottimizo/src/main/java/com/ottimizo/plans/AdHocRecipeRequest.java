package com.ottimizo.plans;

import com.fasterxml.jackson.databind.JsonNode;
import com.ottimizo.profile.Goal;
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
import java.time.OffsetDateTime;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * "Pedir receita agora" (BE-C08, F1-CLI "Pedir agora"; tabela
 * {@code ad_hoc_recipe_requests}, ja definida em V003 mas sem entidade JPA
 * ate agora). Guarda o pedido avulso de uma unica receita fora do plano
 * mensal — {@code recipeSnapshot} so fica preenchido quando
 * {@link #status} chega a {@code READY} ({@link AdHocRecipeService}).
 */
@Entity
@Table(name = "ad_hoc_recipe_requests")
public class AdHocRecipeRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "meal_slot", nullable = false)
    private MealSlot mealSlot;

    @Enumerated(EnumType.STRING)
    private Goal goal;

    private String note;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MealGenerationStatus status;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "recipe_snapshot", columnDefinition = "jsonb")
    private JsonNode recipeSnapshot;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected AdHocRecipeRequest() {
    }

    public AdHocRecipeRequest(Long userId, MealSlot mealSlot, Goal goal, String note) {
        this.userId = userId;
        this.mealSlot = mealSlot;
        this.goal = goal;
        this.note = note;
        this.status = MealGenerationStatus.GENERATING;
    }

    public void markReady(JsonNode recipeSnapshot) {
        this.status = MealGenerationStatus.READY;
        this.recipeSnapshot = recipeSnapshot;
    }

    public void markFailed() {
        this.status = MealGenerationStatus.FAILED;
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

    public MealSlot mealSlot() {
        return mealSlot;
    }

    public Goal goal() {
        return goal;
    }

    public String note() {
        return note;
    }

    public MealGenerationStatus status() {
        return status;
    }

    public JsonNode recipeSnapshot() {
        return recipeSnapshot;
    }

    public OffsetDateTime createdAt() {
        return createdAt;
    }

    public OffsetDateTime updatedAt() {
        return updatedAt;
    }
}

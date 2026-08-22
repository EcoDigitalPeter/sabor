package com.ottimizo.plans;

import com.fasterxml.jackson.databind.JsonNode;
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
import java.time.OffsetDateTime;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * Uma refeicao (slot) de um dia do plano (tabela {@code meal_plan_entries},
 * V003). {@code recipeSnapshot} guarda a receita tal como estava no momento
 * da geracao — mesma forma de {@code RecipeSnapshot} em
 * {@code levesabor-web/src/types/api.d.ts} (recipeId, name, kcal,
 * prepMinutes, estimatedCostMt, macros, healthTags, healthNote, ingredients,
 * steps) — por isso e devolvida tal e qual em {@link MealPlanEntryResponse},
 * mesmo que a receita original seja depois editada ou removida do catalogo.
 * Leitura + {@link #applySwap} apenas (BE-C04 leu; BE-C05 acrescentou a
 * mutacao de troca) — a criacao das entradas continua a pertencer a BE-C03.
 */
@Entity
@Table(name = "meal_plan_entries")
public class MealPlanEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "meal_plan_day_id", nullable = false)
    private MealPlanDay day;

    @Enumerated(EnumType.STRING)
    @Column(name = "meal_slot", nullable = false)
    private MealSlot mealSlot;

    @Column(name = "recipe_id")
    private Long recipeId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "recipe_snapshot", nullable = false, columnDefinition = "jsonb")
    private JsonNode recipeSnapshot;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EntryFeedback feedback = EntryFeedback.NONE;

    @Column(nullable = false)
    private boolean completed = false;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected MealPlanEntry() {
    }

    public MealPlanEntry(MealPlanDay day, MealSlot mealSlot, Long recipeId, JsonNode recipeSnapshot) {
        this.day = day;
        this.mealSlot = mealSlot;
        this.recipeId = recipeId;
        this.recipeSnapshot = recipeSnapshot;
        this.feedback = EntryFeedback.NONE;
        this.completed = false;
    }

    /**
     * Aplica uma troca (BE-C05, {@code POST .../entries/{id}/swap} com
     * {@code confirm=true}): substitui a receita da entrada e reinicia o
     * feedback dessa entrada para {@link EntryFeedback#NONE} — o feedback
     * anterior era sobre a receita antiga, ja nao se aplica a nova (mesmo
     * comportamento do mock em {@code fixtures.ts applyRecipeToEntry}).
     * {@code completed} nao e alterado.
     */
    public void applySwap(Long recipeId, JsonNode recipeSnapshot) {
        this.recipeId = recipeId;
        this.recipeSnapshot = recipeSnapshot;
        this.feedback = EntryFeedback.NONE;
    }

    /** "Comi isto" (gamificacao discreta, FE-V01) — independente de {@link #feedback} (👍/👎). */
    public void setCompleted(boolean completed) {
        this.completed = completed;
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

    public MealPlanDay day() {
        return day;
    }

    public MealSlot mealSlot() {
        return mealSlot;
    }

    public Long recipeId() {
        return recipeId;
    }

    public JsonNode recipeSnapshot() {
        return recipeSnapshot;
    }

    public EntryFeedback feedback() {
        return feedback;
    }

    public boolean completed() {
        return completed;
    }

    public OffsetDateTime createdAt() {
        return createdAt;
    }

    public OffsetDateTime updatedAt() {
        return updatedAt;
    }
}

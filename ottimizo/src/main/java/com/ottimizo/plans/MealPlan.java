package com.ottimizo.plans;

import com.fasterxml.jackson.databind.JsonNode;
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
import java.time.LocalDate;
import java.time.OffsetDateTime;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * Plano mensal do cliente (tabela {@code meal_plans}, V003). No maximo um
 * plano {@code ACTIVE} por utilizador ({@code ux_meal_plans_one_active}) —
 * esta entidade e {@link MealPlanRepository} sao apenas de leitura (BE-C04);
 * a escrita (geracao/arquivamento) pertence a BE-C03.
 */
@Entity
@Table(name = "meal_plans")
public class MealPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "month_start", nullable = false)
    private LocalDate monthStart;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MealPlanStatus status = MealPlanStatus.ACTIVE;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "profile_snapshot", nullable = false, columnDefinition = "jsonb")
    private JsonNode profileSnapshot;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    /**
     * Quantos dias do mes (a partir de {@link #monthStart}) ja foram gerados
     * e persistidos como {@link MealPlanDay}. O plano deixou de ser gerado
     * de uma vez so' (mes inteiro, ~30 dias numa unica chamada a IA) por
     * custo -- passa a ser gerado por semanas de 7 dias, a seguinte so'
     * quando a anterior estiver toda completada (ver
     * {@link AiMealPlanService#maybeGenerateNextWeek}). V010.
     */
    @Column(name = "days_generated", nullable = false)
    private int daysGenerated;

    protected MealPlan() {
    }

    public MealPlan(Long userId, LocalDate monthStart, JsonNode profileSnapshot) {
        this.userId = userId;
        this.monthStart = monthStart;
        this.profileSnapshot = profileSnapshot;
        this.status = MealPlanStatus.ACTIVE;
        this.daysGenerated = 0;
    }

    /**
     * Arquiva este plano (BE-C03): chamado antes de activar um novo plano
     * mensal para o mesmo utilizador, para respeitar
     * {@code ux_meal_plans_one_active} (no maximo um {@code ACTIVE} por
     * utilizador).
     */
    public void archive() {
        this.status = MealPlanStatus.ARCHIVED;
    }

    /** Chamado depois de persistir mais uma semana de dias (BE-C03). */
    public void extendDaysGenerated(int additionalDays) {
        this.daysGenerated += additionalDays;
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

    public LocalDate monthStart() {
        return monthStart;
    }

    public MealPlanStatus status() {
        return status;
    }

    public JsonNode profileSnapshot() {
        return profileSnapshot;
    }

    public OffsetDateTime createdAt() {
        return createdAt;
    }

    public OffsetDateTime updatedAt() {
        return updatedAt;
    }

    public int daysGenerated() {
        return daysGenerated;
    }
}

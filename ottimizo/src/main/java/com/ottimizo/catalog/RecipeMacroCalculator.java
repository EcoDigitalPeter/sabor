package com.ottimizo.catalog;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Component;

/**
 * Calcula os macros agregados de uma receita a partir das linhas de
 * {@link RecipeIngredient} (quantidade x nutricao por 100 g/ml de cada
 * {@link Ingredient}) — o motor "anti-alucinacao" descrito em F2-ADM-05: os
 * macros da receita nunca sao inventados pela IA, sao sempre derivados de
 * dados curados pelo admin (ou de um override manual explicito, aplicado
 * fora desta classe em {@link Recipe#applyOverrideMacros}).
 *
 * <p><b>Limitacao conhecida:</b> a conversao de unidade para gramas so cobre
 * {@code g/kg/ml/l} (kg e l tratados como 1000x a unidade base; 1 l ~= 1000 g
 * para efeitos de nutricao, aproximacao aceitavel em MVP). Qualquer outra
 * unidade (ex. "un", "colher_sopa") e' tratada como equivalente a gramas 1:1
 * — a conversao de unidades completa fica para BE-C06 (lista de compras).
 */
@Component
public class RecipeMacroCalculator {

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);
    private static final BigDecimal KCAL_PER_GRAM_PROTEIN = BigDecimal.valueOf(4);
    private static final BigDecimal KCAL_PER_GRAM_CARBS = BigDecimal.valueOf(4);
    private static final BigDecimal KCAL_PER_GRAM_FAT = BigDecimal.valueOf(9);
    private static final BigDecimal KCAL_PER_GRAM_FIBER = BigDecimal.valueOf(4);

    public RecipeMacros calculate(List<RecipeIngredient> lines) {
        if (lines == null || lines.isEmpty()) {
            return RecipeMacros.zero();
        }

        BigDecimal kcalTotal = BigDecimal.ZERO;
        BigDecimal proteinGrams = BigDecimal.ZERO;
        BigDecimal carbsGrams = BigDecimal.ZERO;
        BigDecimal fatGrams = BigDecimal.ZERO;
        BigDecimal fiberGrams = BigDecimal.ZERO;

        for (RecipeIngredient line : lines) {
            Ingredient ingredient = line.ingredient();
            if (ingredient == null || line.quantity() == null) {
                continue;
            }
            BigDecimal grams = toGramsEquivalent(line.quantity(), line.unit());
            BigDecimal factor = grams.divide(HUNDRED, 6, RoundingMode.HALF_UP);

            kcalTotal = kcalTotal.add(nonNull(ingredient.kcalPer100g()).multiply(factor));
            proteinGrams = proteinGrams.add(nonNull(ingredient.proteinPer100g()).multiply(factor));
            carbsGrams = carbsGrams.add(nonNull(ingredient.carbsPer100g()).multiply(factor));
            fatGrams = fatGrams.add(nonNull(ingredient.fatPer100g()).multiply(factor));
            fiberGrams = fiberGrams.add(nonNull(ingredient.fiberPer100g()).multiply(factor));
        }

        kcalTotal = kcalTotal.setScale(2, RoundingMode.HALF_UP);

        return new RecipeMacros(
            kcalTotal,
            percentOfKcal(proteinGrams, KCAL_PER_GRAM_PROTEIN, kcalTotal),
            percentOfKcal(carbsGrams, KCAL_PER_GRAM_CARBS, kcalTotal),
            percentOfKcal(fatGrams, KCAL_PER_GRAM_FAT, kcalTotal),
            percentOfKcal(fiberGrams, KCAL_PER_GRAM_FIBER, kcalTotal)
        );
    }

    private int percentOfKcal(BigDecimal grams, BigDecimal kcalPerGram, BigDecimal kcalTotal) {
        if (kcalTotal == null || kcalTotal.signum() <= 0) {
            return 0;
        }
        BigDecimal contributionKcal = grams.multiply(kcalPerGram);
        int pct = contributionKcal
            .multiply(HUNDRED)
            .divide(kcalTotal, 0, RoundingMode.HALF_UP)
            .intValue();
        return Math.max(0, Math.min(100, pct));
    }

    private BigDecimal toGramsEquivalent(BigDecimal quantity, String unit) {
        String normalized = unit == null ? "" : unit.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "kg", "l" -> quantity.multiply(BigDecimal.valueOf(1000));
            default -> quantity;
        };
    }

    private BigDecimal nonNull(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}

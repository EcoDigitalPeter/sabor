package com.ottimizo.catalog;

import java.math.BigDecimal;

/** Resultado agregado de {@link RecipeMacroCalculator}: calorias totais (kcal) e a percentagem de calorias vinda de cada macronutriente, arredondada a inteiro e limitada a [0, 100]. */
public record RecipeMacros(
    BigDecimal kcal,
    Integer proteinPct,
    Integer carbsPct,
    Integer fatPct,
    Integer fiberPct
) {

    public static RecipeMacros zero() {
        return new RecipeMacros(BigDecimal.ZERO.setScale(2), 0, 0, 0, 0);
    }
}

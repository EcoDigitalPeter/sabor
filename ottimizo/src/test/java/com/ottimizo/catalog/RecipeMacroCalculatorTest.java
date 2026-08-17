package com.ottimizo.catalog;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;

class RecipeMacroCalculatorTest {

    private final RecipeMacroCalculator calculator = new RecipeMacroCalculator();

    @Test
    void calculate_emptyIngredientList_returnsZeroMacros() {
        RecipeMacros macros = calculator.calculate(List.of());

        assertThat(macros.kcal()).isEqualByComparingTo("0");
        assertThat(macros.proteinPct()).isZero();
        assertThat(macros.carbsPct()).isZero();
        assertThat(macros.fatPct()).isZero();
        assertThat(macros.fiberPct()).isZero();
    }

    @Test
    void calculate_nullIngredientList_returnsZeroMacros() {
        RecipeMacros macros = calculator.calculate(null);

        assertThat(macros.kcal()).isEqualByComparingTo("0");
    }

    @Test
    void calculate_singleIngredientInGrams_derivesKcalAndPercentagesFromComposition() {
        // Frango grelhado: 200 kcal/100g, 30g proteina, 0g carbs, 8g gordura, 0g fibra.
        Ingredient frango = ingredient("Frango grelhado", "200", "30", "0", "8", "0");
        RecipeIngredient line = new RecipeIngredient(frango, new BigDecimal("200"), "g");

        RecipeMacros macros = calculator.calculate(List.of(line));

        // 200g -> factor 2x: kcal = 400, proteina = 60g (240 kcal), gordura = 16g (144 kcal).
        assertThat(macros.kcal()).isEqualByComparingTo("400.00");
        assertThat(macros.proteinPct()).isEqualTo(60); // 240/400
        assertThat(macros.fatPct()).isEqualTo(36); // 144/400
        assertThat(macros.carbsPct()).isZero();
        assertThat(macros.fiberPct()).isZero();
    }

    @Test
    void calculate_sumsMultipleIngredients() {
        Ingredient arroz = ingredient("Arroz cozido", "130", "2.7", "28", "0.3", "0.4");
        Ingredient frango = ingredient("Frango grelhado", "200", "30", "0", "8", "0");
        RecipeIngredient arrozLine = new RecipeIngredient(arroz, new BigDecimal("100"), "g");
        RecipeIngredient frangoLine = new RecipeIngredient(frango, new BigDecimal("100"), "g");

        RecipeMacros macros = calculator.calculate(List.of(arrozLine, frangoLine));

        assertThat(macros.kcal()).isEqualByComparingTo("330.00");
        assertThat(macros.proteinPct()).isGreaterThan(0);
        assertThat(macros.carbsPct()).isGreaterThan(0);
        assertThat(macros.fatPct()).isGreaterThan(0);
    }

    @Test
    void calculate_convertsKilogramsAndLitresToGramsEquivalent() {
        Ingredient farinha = ingredient("Farinha", "100", "10", "20", "1", "0");
        RecipeIngredient grams = new RecipeIngredient(farinha, new BigDecimal("1000"), "g");
        RecipeIngredient kilograms = new RecipeIngredient(farinha, new BigDecimal("1"), "kg");

        RecipeMacros fromGrams = calculator.calculate(List.of(grams));
        RecipeMacros fromKilograms = calculator.calculate(List.of(kilograms));

        assertThat(fromKilograms.kcal()).isEqualByComparingTo(fromGrams.kcal());
    }

    @Test
    void calculate_ignoresLineWithNullIngredient() {
        RecipeIngredient lineWithoutIngredient = new RecipeIngredient(null, new BigDecimal("100"), "g");

        RecipeMacros macros = calculator.calculate(List.of(lineWithoutIngredient));

        assertThat(macros.kcal()).isEqualByComparingTo("0");
    }

    @Test
    void calculate_percentagesNeverExceedOneHundred() {
        // Ingrediente so' com proteina, quantidade grande: 100% deve ser o teto, nunca ultrapassar por arredondamento.
        Ingredient proteinaPura = ingredient("Isolado de proteina", "400", "100", "0", "0", "0");
        RecipeIngredient line = new RecipeIngredient(proteinaPura, new BigDecimal("50"), "g");

        RecipeMacros macros = calculator.calculate(List.of(line));

        assertThat(macros.proteinPct()).isLessThanOrEqualTo(100);
    }

    private Ingredient ingredient(String name, String kcal, String protein, String carbs, String fat, String fiber) {
        return new Ingredient(
            name,
            "geral",
            "g",
            new BigDecimal(kcal),
            new BigDecimal(protein),
            new BigDecimal(carbs),
            new BigDecimal(fat),
            new BigDecimal(fiber),
            null
        );
    }
}

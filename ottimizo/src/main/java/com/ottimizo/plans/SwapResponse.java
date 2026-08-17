package com.ottimizo.plans;

import com.fasterxml.jackson.databind.JsonNode;

/**
 * Resposta de {@code POST /me/meal-plans/entries/{id}/swap} — forma alinhada
 * com {@code components.schemas.SwapEnvelope.data} em api.d.ts.
 * {@code state} distingue os dois modos do endpoint: {@code proposed}
 * (query {@code confirm=false}, o omisso — so' calcula e devolve a
 * alternativa, nao grava nada) e {@code applied} ({@code confirm=true} — a
 * troca foi persistida na entrada).
 */
public record SwapResponse(
    String state,
    Alternative alternative
) {

    public record Alternative(JsonNode recipe) {
    }

    public static SwapResponse proposed(JsonNode recipeSnapshot) {
        return new SwapResponse("proposed", new Alternative(recipeSnapshot));
    }

    public static SwapResponse applied(JsonNode recipeSnapshot) {
        return new SwapResponse("applied", new Alternative(recipeSnapshot));
    }
}

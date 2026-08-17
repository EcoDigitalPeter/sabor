package com.ottimizo.plans;

/**
 * Origem de um item da lista de compras (coluna {@code origin},
 * {@code shopping_list_items}, V003). {@code PLANO} e' recalculado a cada
 * {@link ShoppingListService#rebuildForPlan}; {@code MANUAL} e' criado pelo
 * cliente (F1-CLI-06B) e nunca tocado pelo rebuild.
 */
public enum ShoppingListItemOrigin {
    PLANO,
    MANUAL
}

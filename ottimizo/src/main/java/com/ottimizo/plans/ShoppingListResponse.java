package com.ottimizo.plans;

import java.math.BigDecimal;
import java.util.List;

/**
 * Forma alinhada com {@code ShoppingList} em
 * levesabor-web/src/types/api.d.ts (F1-CLI-06). {@code totalItems}/
 * {@code checkedItems}/{@code estimatedCostMt}/{@code costIsPartial} sao
 * sempre derivados dos itens no momento da leitura (nunca guardados na
 * tabela {@code shopping_lists}) — mesma logica de {@code getShoppingList}/
 * {@code remainingCost} no mock ({@code src/mocks/fixtures.ts}):
 * {@code estimatedCostMt} e' a soma do que falta comprar (pro-rateado por
 * {@code haveQuantity}, FE-R01), nao o custo total da lista.
 */
public record ShoppingListResponse(
    Long id,
    int totalItems,
    int checkedItems,
    BigDecimal estimatedCostMt,
    boolean costIsPartial,
    List<ShoppingListItemResponse> items
) {

    public static ShoppingListResponse from(ShoppingList list, List<ShoppingListItem> items) {
        int checkedItems = (int) items.stream().filter(ShoppingListItem::checked).count();
        boolean costIsPartial = items.stream().anyMatch(item -> item.estimatedCostMt() == null);
        BigDecimal estimatedCostMt = items.stream()
            .map(ShoppingListItem::remainingCost)
            .filter(cost -> cost != null)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<ShoppingListItemResponse> itemResponses = items.stream()
            .map(ShoppingListItemResponse::from)
            .toList();

        return new ShoppingListResponse(
            list.id(),
            items.size(),
            checkedItems,
            estimatedCostMt,
            costIsPartial,
            itemResponses
        );
    }
}

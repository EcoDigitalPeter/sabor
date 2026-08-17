package com.ottimizo.plans;

import com.ottimizo.catalog.Ingredient;
import com.ottimizo.catalog.Recipe;
import com.ottimizo.catalog.RecipeIngredient;
import com.ottimizo.catalog.RecipeRepository;
import com.ottimizo.common.error.ErrorCode;
import com.ottimizo.common.error.ServiceException;
import com.ottimizo.common.security.CurrentUser;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * BE-C06 — lista de compras do plano activo (F1-CLI-06/06B). Ownership e'
 * sempre derivado de {@link CurrentUser#id()}, nunca de um {@code userId} do
 * pedido — mesmo padrao de {@code MealPlanService} (BE-C04): recurso de
 * outro utilizador devolve {@link ErrorCode#LSA005_NOT_FOUND}, nunca 403.
 */
@Service
public class ShoppingListService {

    private final ShoppingListRepository shoppingLists;
    private final ShoppingListItemRepository shoppingListItems;
    private final MealPlanRepository mealPlans;
    private final MealPlanDayRepository mealPlanDays;
    private final MealPlanEntryRepository mealPlanEntries;
    private final RecipeRepository recipes;

    public ShoppingListService(
        ShoppingListRepository shoppingLists,
        ShoppingListItemRepository shoppingListItems,
        MealPlanRepository mealPlans,
        MealPlanDayRepository mealPlanDays,
        MealPlanEntryRepository mealPlanEntries,
        RecipeRepository recipes
    ) {
        this.shoppingLists = shoppingLists;
        this.shoppingListItems = shoppingListItems;
        this.mealPlans = mealPlans;
        this.mealPlanDays = mealPlanDays;
        this.mealPlanEntries = mealPlanEntries;
        this.recipes = recipes;
    }

    /**
     * {@code GET /me/shopping-list}. Nao ha um trigger de escrita ainda
     * ligado a geracao/swap do plano (BE-C03/BE-C05 nao construidos nesta
     * branch) — por isso este metodo chama sempre {@link #rebuildForPlan}
     * antes de responder, para a lista nunca ficar desactualizada face as
     * entradas actuais do plano activo. {@code rebuildForPlan} e'
     * idempotente e preserva {@code checked}/{@code haveQuantity} dos itens
     * que continuam a existir, por isso chama-lo a cada GET e' seguro.
     */
    @Transactional
    public ShoppingListResponse getForActivePlan(CurrentUser actor) {
        MealPlan plan = mealPlans.findByUserIdAndStatus(actor.id(), MealPlanStatus.ACTIVE)
            .orElseThrow(() -> new ServiceException(ErrorCode.LSA005_NOT_FOUND, "Ainda nao tens um plano activo."));
        ShoppingList list = rebuildForPlan(plan.id());
        return toResponse(list);
    }

    /**
     * Regenera os itens {@code origin = PLANO} da lista de compras do plano
     * {@code planId}, agregando por {@code ingredient_id} a partir de
     * {@code MealPlanEntry -> Recipe -> RecipeIngredient} (nunca a partir do
     * {@code recipe_snapshot} jsonb — a fonte de verdade e' sempre o
     * catalogo curado, mesmo principio "anti-alucinacao" de
     * {@code RecipeMacroCalculator}, BE-D01).
     *
     * <p>Preserva {@code checked}/{@code haveQuantity}/{@code id} dos itens
     * PLANO cuja chave (ingrediente + unidade canonica) continua presente;
     * remove os que deixaram de fazer parte do plano; nunca toca em itens
     * {@code origin = MANUAL}.
     */
    @Transactional
    public ShoppingList rebuildForPlan(Long planId) {
        MealPlan plan = mealPlans.findById(planId)
            .orElseThrow(() -> new ServiceException(ErrorCode.LSA005_NOT_FOUND));

        ShoppingList list = shoppingLists.findByMealPlanId(planId)
            .orElseGet(() -> shoppingLists.save(new ShoppingList(plan.userId(), planId)));

        Map<String, Aggregate> aggregates = aggregateIngredients(planId);

        List<ShoppingListItem> existingPlano = shoppingListItems.findByShoppingList_IdAndOrigin(list.id(), ShoppingListItemOrigin.PLANO);
        Map<String, ShoppingListItem> existingByKey = new LinkedHashMap<>();
        for (ShoppingListItem item : existingPlano) {
            existingByKey.put(keyOf(item), item);
        }

        List<ShoppingListItem> toSave = new ArrayList<>();
        for (Map.Entry<String, Aggregate> entry : aggregates.entrySet()) {
            Aggregate agg = entry.getValue();
            BigDecimal quantity = agg.quantity().setScale(2, RoundingMode.HALF_UP);
            BigDecimal cost = estimateCost(agg.ingredient(), agg.unit(), quantity);

            ShoppingListItem existing = existingByKey.remove(entry.getKey());
            if (existing != null) {
                existing.applyRebuildValues(agg.ingredient().name(), agg.ingredient().category(), quantity, agg.unit(), cost);
                toSave.add(existing);
            } else {
                toSave.add(new ShoppingListItem(
                    list,
                    agg.ingredient().id(),
                    agg.ingredient().name(),
                    agg.ingredient().category(),
                    quantity,
                    agg.unit(),
                    cost,
                    ShoppingListItemOrigin.PLANO
                ));
            }
        }

        // itens PLANO que ja nao correspondem a nenhum ingrediente do plano actual (ex. receita
        // trocada/removida) deixam de fazer sentido e sao removidos — MANUAL nunca entra aqui.
        if (!existingByKey.isEmpty()) {
            shoppingListItems.deleteAll(existingByKey.values());
        }
        shoppingListItems.saveAll(toSave);

        return list;
    }

    /** {@code PATCH /me/shopping-list/items/{id}} — marcar/desmarcar e/ou actualizar "ja tenho" (FE-R01). */
    @Transactional
    public ShoppingListItemResponse setChecked(Long itemId, SetCheckedRequest request, CurrentUser actor) {
        ShoppingListItem item = shoppingListItems.findByIdWithList(itemId)
            .filter(i -> i.shoppingList().userId().equals(actor.id()))
            .orElseThrow(() -> new ServiceException(ErrorCode.LSA005_NOT_FOUND));

        if (request.checked() != null) {
            item.setChecked(request.checked());
        }
        if (request.haveQuantity() != null) {
            item.setHaveQuantity(request.haveQuantity());
        }
        return ShoppingListItemResponse.from(item);
    }

    /** {@code POST /me/shopping-list/items} — item manual (F1-CLI-06B). */
    @Transactional
    public ShoppingListItemResponse addManualItem(CreateShoppingListItemRequest request, CurrentUser actor) {
        MealPlan plan = mealPlans.findByUserIdAndStatus(actor.id(), MealPlanStatus.ACTIVE)
            .orElseThrow(() -> new ServiceException(ErrorCode.LSA005_NOT_FOUND, "Ainda nao tens um plano activo."));

        ShoppingList list = shoppingLists.findByMealPlanId(plan.id())
            .orElseGet(() -> shoppingLists.save(new ShoppingList(plan.userId(), plan.id())));

        ShoppingListItem item = new ShoppingListItem(
            list,
            null,
            request.ingredientName().trim(),
            request.category(),
            request.quantity(),
            request.unit().trim(),
            request.estimatedCostMt(),
            ShoppingListItemOrigin.MANUAL
        );
        return ShoppingListItemResponse.from(shoppingListItems.save(item));
    }

    // ---- agregacao ----------------------------------------------------

    private Map<String, Aggregate> aggregateIngredients(Long planId) {
        List<MealPlanDay> days = mealPlanDays.findByMealPlan_IdOrderByDateAsc(planId);
        List<Long> dayIds = days.stream().map(MealPlanDay::id).toList();
        List<MealPlanEntry> entries = dayIds.isEmpty() ? List.of() : mealPlanEntries.findByDay_IdInOrderByIdAsc(dayIds);

        List<Long> recipeIds = entries.stream()
            .map(MealPlanEntry::recipeId)
            .filter(Objects::nonNull)
            .distinct()
            .toList();

        Map<Long, Recipe> recipesById = new LinkedHashMap<>();
        if (!recipeIds.isEmpty()) {
            for (Recipe recipe : recipes.findByIdInWithIngredients(recipeIds)) {
                recipesById.put(recipe.id(), recipe);
            }
        }

        Map<String, Aggregate> aggregates = new LinkedHashMap<>();
        for (MealPlanEntry entry : entries) {
            if (entry.recipeId() == null) {
                continue;
            }
            Recipe recipe = recipesById.get(entry.recipeId());
            if (recipe == null) {
                continue;
            }
            for (RecipeIngredient line : recipe.ingredients()) {
                Ingredient ingredient = line.ingredient();
                if (ingredient == null || line.quantity() == null) {
                    continue;
                }
                String unit = canonicalUnit(line.unit());
                BigDecimal amount = line.quantity().multiply(unitFactor(line.unit()));
                String key = ingredient.id() + "|" + unit;

                Aggregate existing = aggregates.get(key);
                if (existing == null) {
                    aggregates.put(key, new Aggregate(ingredient, unit, amount));
                } else {
                    aggregates.put(key, new Aggregate(ingredient, unit, existing.quantity().add(amount)));
                }
            }
        }
        return aggregates;
    }

    private String keyOf(ShoppingListItem item) {
        return item.ingredientId() + "|" + (item.unit() == null ? "" : item.unit());
    }

    /**
     * Custo estimado da quantidade agregada (na unidade canonica {@code unit}),
     * a partir de {@link Ingredient#referencePriceMt()} (preco por
     * {@link Ingredient#baseUnit()}). {@code null} quando nao ha preco de
     * referencia ou quando a unidade da linha e a {@code baseUnit} do
     * ingrediente nao sao da mesma familia (g/kg vs ml/l vs "outra") — nesse
     * caso o item fica sem custo, e a lista marca {@code costIsPartial}.
     */
    private BigDecimal estimateCost(Ingredient ingredient, String unit, BigDecimal quantity) {
        BigDecimal price = ingredient.referencePriceMt();
        if (price == null) {
            return null;
        }
        String baseCanonical = canonicalUnit(ingredient.baseUnit());
        if (!baseCanonical.equals(unit)) {
            return null;
        }
        BigDecimal baseFactor = unitFactor(ingredient.baseUnit());
        BigDecimal quantityInBaseUnits = quantity.divide(baseFactor, 6, RoundingMode.HALF_UP);
        return price.multiply(quantityInBaseUnits).setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Unidade canonica de agregacao: {@code kg}/{@code g} colapsam em
     * {@code g}, {@code l}/{@code ml} colapsam em {@code ml} — mesma
     * limitacao documentada em {@code RecipeMacroCalculator} (BE-D01), so
     * estas duas conversoes. Qualquer outra unidade (ex. "unidade",
     * "colher_sopa") fica tal e qual (normalizada em minusculas), sem
     * conversao.
     */
    private String canonicalUnit(String rawUnit) {
        String normalized = rawUnit == null ? "" : rawUnit.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "kg", "g" -> "g";
            case "l", "ml" -> "ml";
            default -> normalized;
        };
    }

    /** Factor de conversao de {@code rawUnit} para a sua {@link #canonicalUnit}. */
    private BigDecimal unitFactor(String rawUnit) {
        String normalized = rawUnit == null ? "" : rawUnit.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "kg", "l" -> BigDecimal.valueOf(1000);
            default -> BigDecimal.ONE;
        };
    }

    private ShoppingListResponse toResponse(ShoppingList list) {
        List<ShoppingListItem> items = shoppingListItems.findByShoppingList_IdOrderByIdAsc(list.id());
        return ShoppingListResponse.from(list, items);
    }

    /** Ingrediente + unidade canonica + quantidade acumulada, antes de virar {@link ShoppingListItem}. */
    private record Aggregate(Ingredient ingredient, String unit, BigDecimal quantity) {
    }
}

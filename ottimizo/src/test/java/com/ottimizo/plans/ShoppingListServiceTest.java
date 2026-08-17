package com.ottimizo.plans;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ottimizo.catalog.Ingredient;
import com.ottimizo.catalog.Recipe;
import com.ottimizo.catalog.RecipeIngredient;
import com.ottimizo.catalog.RecipeRepository;
import com.ottimizo.common.error.ErrorCode;
import com.ottimizo.common.error.ServiceException;
import com.ottimizo.common.security.CurrentUser;
import com.ottimizo.common.security.Role;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * BE-C06 — lista de compras. Foco: agregacao por ingrediente (via
 * {@code MealPlanEntry -> Recipe -> RecipeIngredient}, nunca pelo
 * {@code recipe_snapshot}), conversao de unidade g/kg e ml/l, preservacao de
 * {@code checked}/{@code haveQuantity} ao regenerar, sobrevivencia de itens
 * {@code MANUAL} ao rebuild, e ownership (mesmo padrao de
 * {@code MealPlanServiceTest}: recurso de outro utilizador e' sempre
 * {@code LSA005_NOT_FOUND}, nunca 403).
 */
@ExtendWith(MockitoExtension.class)
class ShoppingListServiceTest {

    @Mock
    private ShoppingListRepository shoppingLists;
    @Mock
    private ShoppingListItemRepository shoppingListItems;
    @Mock
    private MealPlanRepository mealPlans;
    @Mock
    private MealPlanDayRepository mealPlanDays;
    @Mock
    private MealPlanEntryRepository mealPlanEntries;
    @Mock
    private RecipeRepository recipes;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private ShoppingListService service;

    private static final Long USER_A = 1L;
    private static final Long USER_B = 2L;
    private static final Long PLAN_ID = 10L;
    private static final Long LIST_ID = 50L;
    private static final Long DAY_ID = 100L;

    @BeforeEach
    void setUp() {
        service = new ShoppingListService(shoppingLists, shoppingListItems, mealPlans, mealPlanDays, mealPlanEntries, recipes);
    }

    // ---- agregacao por ingrediente + conversao de unidade ------------------

    @Test
    void rebuildForPlan_aggregatesSameIngredientAcrossRecipes_convertingKgAndLToCanonicalUnit_andEstimatesCost() {
        MealPlan plan = mealPlan(USER_A, PLAN_ID);
        when(mealPlans.findById(PLAN_ID)).thenReturn(Optional.of(plan));
        ShoppingList list = shoppingList(LIST_ID, USER_A, PLAN_ID);
        when(shoppingLists.findByMealPlanId(PLAN_ID)).thenReturn(Optional.of(list));
        when(shoppingListItems.findByShoppingList_IdAndOrigin(LIST_ID, ShoppingListItemOrigin.PLANO)).thenReturn(List.of());

        MealPlanDay day = mealPlanDay(plan, DAY_ID);
        when(mealPlanDays.findByMealPlan_IdOrderByDateAsc(PLAN_ID)).thenReturn(List.of(day));

        // Arroz: base_unit = kg, preco de referencia 20 MT/kg.
        Ingredient arroz = ingredient(1L, "Arroz", "CEREAIS_E_FARINHAS", "kg", BigDecimal.valueOf(20));
        // Oleo: base_unit = l, preco de referencia 90 MT/l.
        Ingredient oleo = ingredient(2L, "Oleo de cozinha", "TEMPEROS_E_OLEOS", "l", BigDecimal.valueOf(90));

        Recipe almoco = recipe(200L, List.of(
            recipeIngredient(arroz, BigDecimal.valueOf(300), "g"),
            recipeIngredient(oleo, BigDecimal.valueOf(50), "ml")
        ));
        Recipe jantar = recipe(201L, List.of(
            recipeIngredient(arroz, BigDecimal.valueOf(0.5), "kg"),
            recipeIngredient(oleo, BigDecimal.valueOf(0.02), "l")
        ));

        MealPlanEntry entryAlmoco = mealPlanEntry(day, 1000L, 200L);
        MealPlanEntry entryJantar = mealPlanEntry(day, 1001L, 201L);
        when(mealPlanEntries.findByDay_IdInOrderByIdAsc(List.of(DAY_ID))).thenReturn(List.of(entryAlmoco, entryJantar));
        when(recipes.findByIdInWithIngredients(List.of(200L, 201L))).thenReturn(List.of(almoco, jantar));

        service.rebuildForPlan(PLAN_ID);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<ShoppingListItem>> savedCaptor = ArgumentCaptor.forClass(List.class);
        verify(shoppingListItems).saveAll(savedCaptor.capture());
        List<ShoppingListItem> saved = savedCaptor.getValue();
        assertThat(saved).hasSize(2);

        // 300 g + 0.5 kg (=500 g) = 800 g; custo = 20 MT/kg * 0.8 kg = 16.00
        ShoppingListItem arrozItem = saved.stream().filter(i -> "Arroz".equals(i.ingredientName())).findFirst().orElseThrow();
        assertThat(arrozItem.quantity()).isEqualByComparingTo("800.00");
        assertThat(arrozItem.unit()).isEqualTo("g");
        assertThat(arrozItem.estimatedCostMt()).isEqualByComparingTo("16.00");
        assertThat(arrozItem.origin()).isEqualTo(ShoppingListItemOrigin.PLANO);

        // 50 ml + 0.02 l (=20 ml) = 70 ml; custo = 90 MT/l * 0.07 l = 6.30
        ShoppingListItem oleoItem = saved.stream().filter(i -> i.ingredientName().startsWith("Oleo")).findFirst().orElseThrow();
        assertThat(oleoItem.quantity()).isEqualByComparingTo("70.00");
        assertThat(oleoItem.unit()).isEqualTo("ml");
        assertThat(oleoItem.estimatedCostMt()).isEqualByComparingTo("6.30");
    }

    @Test
    void rebuildForPlan_ingredientWithoutReferencePrice_leavesCostNull() {
        MealPlan plan = mealPlan(USER_A, PLAN_ID);
        when(mealPlans.findById(PLAN_ID)).thenReturn(Optional.of(plan));
        ShoppingList list = shoppingList(LIST_ID, USER_A, PLAN_ID);
        when(shoppingLists.findByMealPlanId(PLAN_ID)).thenReturn(Optional.of(list));
        when(shoppingListItems.findByShoppingList_IdAndOrigin(LIST_ID, ShoppingListItemOrigin.PLANO)).thenReturn(List.of());

        MealPlanDay day = mealPlanDay(plan, DAY_ID);
        when(mealPlanDays.findByMealPlan_IdOrderByDateAsc(PLAN_ID)).thenReturn(List.of(day));

        Ingredient alho = ingredient(3L, "Alho", "TEMPEROS_E_OLEOS", "kg", null);
        Recipe recipe = recipe(200L, List.of(recipeIngredient(alho, BigDecimal.valueOf(200), "g")));
        MealPlanEntry entry = mealPlanEntry(day, 1000L, 200L);
        when(mealPlanEntries.findByDay_IdInOrderByIdAsc(List.of(DAY_ID))).thenReturn(List.of(entry));
        when(recipes.findByIdInWithIngredients(List.of(200L))).thenReturn(List.of(recipe));

        service.rebuildForPlan(PLAN_ID);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<ShoppingListItem>> savedCaptor = ArgumentCaptor.forClass(List.class);
        verify(shoppingListItems).saveAll(savedCaptor.capture());
        assertThat(savedCaptor.getValue().get(0).estimatedCostMt()).isNull();
    }

    // ---- preservacao de checked/haveQuantity ao regenerar -------------------

    @Test
    void rebuildForPlan_preservesCheckedAndHaveQuantity_ofExistingPlanoItem_whenKeyStillPresent() {
        MealPlan plan = mealPlan(USER_A, PLAN_ID);
        when(mealPlans.findById(PLAN_ID)).thenReturn(Optional.of(plan));
        ShoppingList list = shoppingList(LIST_ID, USER_A, PLAN_ID);
        when(shoppingLists.findByMealPlanId(PLAN_ID)).thenReturn(Optional.of(list));

        Ingredient arroz = ingredient(1L, "Arroz", "CEREAIS_E_FARINHAS", "kg", BigDecimal.valueOf(20));
        ShoppingListItem existing = new ShoppingListItem(
            list, 1L, "Arroz", "CEREAIS_E_FARINHAS", BigDecimal.valueOf(300).setScale(2), "g", BigDecimal.valueOf(6), ShoppingListItemOrigin.PLANO
        );
        ReflectionTestUtils.setField(existing, "id", 900L);
        existing.setChecked(true);
        existing.setHaveQuantity(BigDecimal.valueOf(150));
        when(shoppingListItems.findByShoppingList_IdAndOrigin(LIST_ID, ShoppingListItemOrigin.PLANO)).thenReturn(List.of(existing));

        MealPlanDay day = mealPlanDay(plan, DAY_ID);
        when(mealPlanDays.findByMealPlan_IdOrderByDateAsc(PLAN_ID)).thenReturn(List.of(day));
        // O plano foi alterado (swap) e agora precisa do dobro de arroz.
        Recipe recipe = recipe(200L, List.of(recipeIngredient(arroz, BigDecimal.valueOf(500), "g")));
        MealPlanEntry entry = mealPlanEntry(day, 1000L, 200L);
        when(mealPlanEntries.findByDay_IdInOrderByIdAsc(List.of(DAY_ID))).thenReturn(List.of(entry));
        when(recipes.findByIdInWithIngredients(List.of(200L))).thenReturn(List.of(recipe));

        service.rebuildForPlan(PLAN_ID);

        // A mesma instancia/id foi actualizada in-place (nao apagada+recriada): checked e
        // haveQuantity preservados, so a quantidade agregada muda.
        assertThat(existing.id()).isEqualTo(900L);
        assertThat(existing.checked()).isTrue();
        assertThat(existing.haveQuantity()).isEqualByComparingTo("150");
        assertThat(existing.quantity()).isEqualByComparingTo("500.00");
        verify(shoppingListItems, never()).deleteAll(any(Iterable.class));
    }

    @Test
    void rebuildForPlan_removesPlanoItem_whoseIngredientNoLongerAppearsInThePlan() {
        MealPlan plan = mealPlan(USER_A, PLAN_ID);
        when(mealPlans.findById(PLAN_ID)).thenReturn(Optional.of(plan));
        ShoppingList list = shoppingList(LIST_ID, USER_A, PLAN_ID);
        when(shoppingLists.findByMealPlanId(PLAN_ID)).thenReturn(Optional.of(list));

        ShoppingListItem obsolete = new ShoppingListItem(
            list, 9L, "Batata-doce", "VEGETAIS_E_FOLHAS", BigDecimal.valueOf(500).setScale(2), "g", null, ShoppingListItemOrigin.PLANO
        );
        ReflectionTestUtils.setField(obsolete, "id", 901L);
        when(shoppingListItems.findByShoppingList_IdAndOrigin(LIST_ID, ShoppingListItemOrigin.PLANO)).thenReturn(List.of(obsolete));

        // Plano actual ja nao tem nenhuma entrada (a receita da batata-doce foi trocada/removida).
        when(mealPlanDays.findByMealPlan_IdOrderByDateAsc(PLAN_ID)).thenReturn(List.of());

        service.rebuildForPlan(PLAN_ID);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Iterable<ShoppingListItem>> deletedCaptor = ArgumentCaptor.forClass(Iterable.class);
        verify(shoppingListItems).deleteAll(deletedCaptor.capture());
        assertThat(deletedCaptor.getValue()).containsExactly(obsolete);
    }

    // ---- item MANUAL sobrevive a regeneracoes -------------------------------

    @Test
    void rebuildForPlan_neverReadsOrTouchesManualItems_onlyPlanoOnesAreFetchedForTheDiff() {
        MealPlan plan = mealPlan(USER_A, PLAN_ID);
        when(mealPlans.findById(PLAN_ID)).thenReturn(Optional.of(plan));
        ShoppingList list = shoppingList(LIST_ID, USER_A, PLAN_ID);
        when(shoppingLists.findByMealPlanId(PLAN_ID)).thenReturn(Optional.of(list));
        when(shoppingListItems.findByShoppingList_IdAndOrigin(LIST_ID, ShoppingListItemOrigin.PLANO)).thenReturn(List.of());
        when(mealPlanDays.findByMealPlan_IdOrderByDateAsc(PLAN_ID)).thenReturn(List.of());

        service.rebuildForPlan(PLAN_ID);

        // O rebuild so pede (e por isso so pode apagar/actualizar) itens PLANO — um item MANUAL
        // guardado na mesma lista nunca entra neste fluxo, por construcao.
        verify(shoppingListItems).findByShoppingList_IdAndOrigin(LIST_ID, ShoppingListItemOrigin.PLANO);
        verify(shoppingListItems, never()).findByShoppingList_IdAndOrigin(eq(LIST_ID), eq(ShoppingListItemOrigin.MANUAL));
        verify(shoppingListItems, never()).findByShoppingList_IdOrderByIdAsc(any());
    }

    @Test
    void addManualItem_createsItemWithManualOriginAndNoIngredientId() {
        MealPlan plan = mealPlan(USER_A, PLAN_ID);
        when(mealPlans.findByUserIdAndStatus(USER_A, MealPlanStatus.ACTIVE)).thenReturn(Optional.of(plan));
        ShoppingList list = shoppingList(LIST_ID, USER_A, PLAN_ID);
        when(shoppingLists.findByMealPlanId(PLAN_ID)).thenReturn(Optional.of(list));
        when(shoppingListItems.save(any())).thenAnswer(inv -> inv.getArgument(0));

        CreateShoppingListItemRequest request = new CreateShoppingListItemRequest("Cha (saquetas)", "OUTROS", BigDecimal.valueOf(7), "unidade", null);

        ShoppingListItemResponse response = service.addManualItem(request, clientUser(USER_A));

        assertThat(response.origin()).isEqualTo(ShoppingListItemOrigin.MANUAL);
        assertThat(response.ingredientName()).isEqualTo("Cha (saquetas)");
        assertThat(response.checked()).isFalse();
        assertThat(response.haveQuantity()).isEqualByComparingTo("0");

        ArgumentCaptor<ShoppingListItem> savedCaptor = ArgumentCaptor.forClass(ShoppingListItem.class);
        verify(shoppingListItems).save(savedCaptor.capture());
        assertThat(savedCaptor.getValue().ingredientId()).isNull();
    }

    @Test
    void addManualItem_withoutAnActivePlan_throwsNotFound() {
        when(mealPlans.findByUserIdAndStatus(USER_A, MealPlanStatus.ACTIVE)).thenReturn(Optional.empty());
        CreateShoppingListItemRequest request = new CreateShoppingListItemRequest("Cha", "OUTROS", BigDecimal.ONE, "unidade", null);

        assertThatThrownBy(() -> service.addManualItem(request, clientUser(USER_A)))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA005_NOT_FOUND);
    }

    // ---- ownership -----------------------------------------------------------

    @Test
    void getForActivePlan_noActivePlan_throwsNotFound() {
        when(mealPlans.findByUserIdAndStatus(USER_A, MealPlanStatus.ACTIVE)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getForActivePlan(clientUser(USER_A)))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA005_NOT_FOUND);
    }

    @Test
    void getForActivePlan_computesTotalsAndPartialCostFlag_fromCurrentItems() {
        MealPlan plan = mealPlan(USER_A, PLAN_ID);
        when(mealPlans.findByUserIdAndStatus(USER_A, MealPlanStatus.ACTIVE)).thenReturn(Optional.of(plan));
        when(mealPlans.findById(PLAN_ID)).thenReturn(Optional.of(plan));
        ShoppingList list = shoppingList(LIST_ID, USER_A, PLAN_ID);
        when(shoppingLists.findByMealPlanId(PLAN_ID)).thenReturn(Optional.of(list));
        when(shoppingListItems.findByShoppingList_IdAndOrigin(LIST_ID, ShoppingListItemOrigin.PLANO)).thenReturn(List.of());
        when(mealPlanDays.findByMealPlan_IdOrderByDateAsc(PLAN_ID)).thenReturn(List.of());

        ShoppingListItem withCost = new ShoppingListItem(list, 1L, "Arroz", "CEREAIS_E_FARINHAS", BigDecimal.valueOf(2), "kg", BigDecimal.valueOf(40), ShoppingListItemOrigin.PLANO);
        ReflectionTestUtils.setField(withCost, "id", 1L);
        withCost.setChecked(true);
        withCost.setHaveQuantity(BigDecimal.valueOf(1)); // metade ja comprada -> falta pagar metade

        ShoppingListItem withoutCost = new ShoppingListItem(list, null, "Alho", "TEMPEROS_E_OLEOS", BigDecimal.ONE, "unidade", null, ShoppingListItemOrigin.MANUAL);
        ReflectionTestUtils.setField(withoutCost, "id", 2L);

        when(shoppingListItems.findByShoppingList_IdOrderByIdAsc(LIST_ID)).thenReturn(List.of(withCost, withoutCost));

        ShoppingListResponse response = service.getForActivePlan(clientUser(USER_A));

        assertThat(response.totalItems()).isEqualTo(2);
        assertThat(response.checkedItems()).isEqualTo(1);
        assertThat(response.costIsPartial()).isTrue();
        assertThat(response.estimatedCostMt()).isEqualByComparingTo("20.00");
    }

    @Test
    void setChecked_belongsToAnotherUser_throwsNotFound_notForbidden() {
        ShoppingList listOfA = shoppingList(LIST_ID, USER_A, PLAN_ID);
        ShoppingListItem item = new ShoppingListItem(listOfA, 1L, "Arroz", "CEREAIS_E_FARINHAS", BigDecimal.TEN, "g", null, ShoppingListItemOrigin.PLANO);
        ReflectionTestUtils.setField(item, "id", 900L);
        when(shoppingListItems.findByIdWithList(900L)).thenReturn(Optional.of(item));

        assertThatThrownBy(() -> service.setChecked(900L, new SetCheckedRequest(true, null), clientUser(USER_B)))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA005_NOT_FOUND);
    }

    @Test
    void setChecked_ownedItem_updatesCheckedAndHaveQuantity() {
        ShoppingList listOfA = shoppingList(LIST_ID, USER_A, PLAN_ID);
        ShoppingListItem item = new ShoppingListItem(listOfA, 1L, "Arroz", "CEREAIS_E_FARINHAS", BigDecimal.TEN, "g", null, ShoppingListItemOrigin.PLANO);
        ReflectionTestUtils.setField(item, "id", 900L);
        when(shoppingListItems.findByIdWithList(900L)).thenReturn(Optional.of(item));

        ShoppingListItemResponse response = service.setChecked(900L, new SetCheckedRequest(true, BigDecimal.valueOf(4)), clientUser(USER_A));

        assertThat(response.checked()).isTrue();
        assertThat(response.haveQuantity()).isEqualByComparingTo("4");
    }

    @Test
    void setChecked_unknownItem_throwsNotFound() {
        when(shoppingListItems.findByIdWithList(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.setChecked(999L, new SetCheckedRequest(true, null), clientUser(USER_A)))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA005_NOT_FOUND);
    }

    // ---- fixtures --------------------------------------------------------

    private CurrentUser clientUser(Long id) {
        return new CurrentUser(id, UUID.randomUUID(), "cliente" + id + "@example.com", Role.CLIENTE, null);
    }

    private MealPlan mealPlan(Long userId, Long id) {
        MealPlan plan = new MealPlan(userId, LocalDate.of(2026, 8, 1), objectMapper.createObjectNode());
        ReflectionTestUtils.setField(plan, "id", id);
        return plan;
    }

    private MealPlanDay mealPlanDay(MealPlan plan, Long id) {
        MealPlanDay day = new MealPlanDay(
            plan, LocalDate.of(2026, 8, 1), "Sabado", BigDecimal.valueOf(1800), BigDecimal.valueOf(1800), 25, 55, 15, 5
        );
        ReflectionTestUtils.setField(day, "id", id);
        return day;
    }

    private MealPlanEntry mealPlanEntry(MealPlanDay day, Long id, Long recipeId) {
        MealPlanEntry entry = new MealPlanEntry(day, MealSlot.ALMOCO, recipeId, objectMapper.createObjectNode());
        ReflectionTestUtils.setField(entry, "id", id);
        return entry;
    }

    private ShoppingList shoppingList(Long id, Long userId, Long planId) {
        ShoppingList list = new ShoppingList(userId, planId);
        ReflectionTestUtils.setField(list, "id", id);
        return list;
    }

    private Ingredient ingredient(Long id, String name, String category, String baseUnit, BigDecimal referencePriceMt) {
        Ingredient ingredient = new Ingredient(
            name, category, baseUnit, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, referencePriceMt
        );
        ReflectionTestUtils.setField(ingredient, "id", id);
        return ingredient;
    }

    private RecipeIngredient recipeIngredient(Ingredient ingredient, BigDecimal quantity, String unit) {
        return new RecipeIngredient(ingredient, quantity, unit);
    }

    private Recipe recipe(Long id, List<RecipeIngredient> lines) {
        Recipe recipe = new Recipe("Receita " + id, null, "ALMOCO", null, 20, 1, null, List.of());
        ReflectionTestUtils.setField(recipe, "id", id);
        recipe.replaceIngredients(lines);
        return recipe;
    }
}

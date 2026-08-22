package com.ottimizo.plans;

import com.fasterxml.jackson.databind.JsonNode;
import com.ottimizo.catalog.MealFeedbackService;
import com.ottimizo.catalog.Recipe;
import com.ottimizo.catalog.RecipeCatalogService;
import com.ottimizo.catalog.RecipeSnapshotFactory;
import com.ottimizo.catalog.RecipeSwapReason;
import com.ottimizo.catalog.RecipeSwapReasonRepository;
import com.ottimizo.common.error.ErrorCode;
import com.ottimizo.common.error.ServiceException;
import com.ottimizo.common.security.CurrentUser;
import com.ottimizo.profile.ClientProfile;
import com.ottimizo.profile.ClientProfileRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * {@code POST /me/meal-plans/entries/{id}/swap} (BE-C05, F1-CLI-05) —
 * alternativa determinística para uma entrada do plano, sem IA: reaproveita
 * {@link RecipeCatalogService#eligibleFor} (BE-C02, já aplica os filtros
 * duros de saúde/alergia + exclui {@code dislikedRecipeIds} + prioriza
 * {@code likedRecipeIds}) e acrescenta apenas o filtro específico do swap —
 * ±20% do kcal da receita actual da entrada, excluindo a própria receita —
 * escolhendo depois o primeiro elegível (ordem estável, portanto
 * determinístico para o mesmo estado de catálogo/perfil/feedback).
 *
 * <p>Não filtra por {@code mealSlot} (pequeno-almoço/almoço/...) — o cartão
 * BE-C05 só pede compatibilidade de kcal; {@link Recipe} não tem um campo
 * equivalente a {@link MealSlot} (só {@code mealTag}, texto livre), por isso
 * introduzir esse filtro seria uma decisão de mapeamento fora do âmbito
 * deste cartão. Registado aqui para quem depois quiser apertar o critério.
 */
@Service
public class MealPlanSwapService {

    private static final BigDecimal MIN_FACTOR = BigDecimal.valueOf(0.8);
    private static final BigDecimal MAX_FACTOR = BigDecimal.valueOf(1.2);

    private final MealPlanEntryRepository mealPlanEntries;
    private final ClientProfileRepository clientProfiles;
    private final RecipeCatalogService recipeCatalogService;
    private final MealFeedbackService mealFeedbackService;
    private final RecipeSnapshotFactory recipeSnapshotFactory;
    private final RecipeSwapReasonRepository swapReasons;

    public MealPlanSwapService(
        MealPlanEntryRepository mealPlanEntries,
        ClientProfileRepository clientProfiles,
        RecipeCatalogService recipeCatalogService,
        MealFeedbackService mealFeedbackService,
        RecipeSnapshotFactory recipeSnapshotFactory,
        RecipeSwapReasonRepository swapReasons
    ) {
        this.mealPlanEntries = mealPlanEntries;
        this.clientProfiles = clientProfiles;
        this.recipeCatalogService = recipeCatalogService;
        this.mealFeedbackService = mealFeedbackService;
        this.recipeSnapshotFactory = recipeSnapshotFactory;
        this.swapReasons = swapReasons;
    }

    /**
     * @param confirm {@code false} (omisso) só calcula e devolve a
     *                alternativa (nada é gravado); {@code true} aplica a
     *                troca na entrada, transacionalmente.
     * @param reason  motivo livre opcional (FE-Q06); só é gravado quando
     *                {@code confirm=true} e não é vazio — contra a receita
     *                "de saída" (a que estava na entrada antes da troca),
     *                que é a que o admin quer perceber porque perdeu
     *                preferência (ver {@link RecipeSwapReason}).
     */
    @Transactional
    public SwapResponse swap(Long entryId, CurrentUser actor, boolean confirm, String reason) {
        MealPlanEntry entry = mealPlanEntries.findByIdWithOwnership(entryId)
            .filter(e -> e.day().mealPlan().userId().equals(actor.id()))
            .orElseThrow(() -> new ServiceException(ErrorCode.LSA005_NOT_FOUND));

        Recipe alternative = findAlternative(entry, actor.id());

        JsonNode snapshot = recipeSnapshotFactory.from(alternative);

        if (!confirm) {
            return SwapResponse.proposed(snapshot);
        }

        if (reason != null && !reason.isBlank()) {
            swapReasons.save(new RecipeSwapReason(entry.recipeId(), actor.id(), reason.trim()));
        }

        // TODO(BE-C06): invocar ShoppingListService.rebuildForPlan(entry.day().mealPlan().id())
        // depois de aplicar a troca — a lista de compras do plano tem de reflectir a nova
        // receita. ShoppingList/ShoppingListService ainda nao existem nesta branch (cartao
        // irmao BE-C06, pode estar a correr em paralelo numa worktree diferente); nao criar
        // aqui para nao colidir com esse trabalho.
        entry.applySwap(alternative.id(), snapshot);

        return SwapResponse.applied(snapshot);
    }

    private Recipe findAlternative(MealPlanEntry entry, Long userId) {
        BigDecimal currentKcal = currentKcal(entry);
        BigDecimal minKcal = currentKcal == null ? null : currentKcal.multiply(MIN_FACTOR);
        BigDecimal maxKcal = currentKcal == null ? null : currentKcal.multiply(MAX_FACTOR);

        ClientProfile profile = clientProfiles.findByUserId(userId).orElse(null);
        Set<Long> liked = mealFeedbackService.likedRecipeIds(userId);
        Set<Long> disliked = mealFeedbackService.dislikedRecipeIds(userId);

        List<Recipe> eligible = recipeCatalogService.eligibleFor(profile, liked, disliked);

        return eligible.stream()
            .filter(recipe -> !recipe.id().equals(entry.recipeId()))
            .filter(recipe -> withinKcalRange(recipe, minKcal, maxKcal))
            .findFirst()
            .orElseThrow(() -> new ServiceException(ErrorCode.LSA014_NO_ALTERNATIVE));
    }

    private boolean withinKcalRange(Recipe recipe, BigDecimal minKcal, BigDecimal maxKcal) {
        if (minKcal == null || maxKcal == null) {
            // Sem kcal de referencia na entrada actual (snapshot antigo/incompleto):
            // nao filtra por kcal, so' pelos filtros duros + exclusao da propria receita.
            return true;
        }
        BigDecimal kcal = recipe.kcal();
        if (kcal == null) {
            return false;
        }
        return kcal.compareTo(minKcal) >= 0 && kcal.compareTo(maxKcal) <= 0;
    }

    /** Le o kcal "actual" a partir do snapshot gravado na entrada — e' a fonte de verdade da refeicao tal como o cliente a ve, mesmo que a receita original no catalogo tenha sido editada depois. */
    private BigDecimal currentKcal(MealPlanEntry entry) {
        JsonNode snapshot = entry.recipeSnapshot();
        if (snapshot == null) {
            return null;
        }
        JsonNode kcalNode = snapshot.get("kcal");
        return kcalNode == null || kcalNode.isNull() ? null : kcalNode.decimalValue();
    }
}

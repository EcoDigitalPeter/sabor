package com.ottimizo.plans;

import com.ottimizo.catalog.MealFeedbackService;
import com.ottimizo.catalog.Recipe;
import com.ottimizo.catalog.RecipeCatalogService;
import com.ottimizo.catalog.RecipeService;
import com.ottimizo.catalog.RecipeSnapshotFactory;
import com.ottimizo.catalog.RecipeStatus;
import com.ottimizo.common.audit.AuditService;
import com.ottimizo.common.error.ErrorCode;
import com.ottimizo.common.error.ServiceException;
import com.ottimizo.common.security.CurrentUser;
import com.ottimizo.profile.ClientProfile;
import com.ottimizo.profile.ClientProfileRepository;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * BE-C08 — "Pedir receita agora" (F1-CLI, mini-wizard FE-T): pedido avulso de
 * uma unica receita fora do plano mensal, mais "guardar num dia" (substitui a
 * receita de uma entrada existente do plano activo pela receita avulsa
 * escolhida). As duas operacoes vivem no mesmo servico porque o cartao
 * BE-C08 do quadro de execucao as agrupa como uma unica funcionalidade
 * ponta-a-ponta.
 *
 * <p><b>Sem IA:</b> ao contrario de {@link AiMealPlanService} (que gera um
 * mes inteiro), aqui basta escolher UMA receita elegivel — reaproveita-se
 * {@link RecipeCatalogService#eligibleFor} (BE-C02, mesmos filtros duros de
 * saude/alergia + feedback) sem chamar {@code ChatClient}; a primeira
 * elegivel e' escolhida (ordenacao ja prioriza "gostei", mesmo criterio
 * deterministico usado em {@link MealPlanSwapService}). O processamento
 * continua assincrono (202 + polling) so' para manter o mesmo contrato de
 * loading do frontend (ecra "T-07", reutilizado por FE-T04) — nao por
 * precisar de tempo real de IA.
 *
 * <p><b>Sem filtro por {@code mealSlot}:</b> mesma decisao de ambito ja
 * registada em {@code MealPlanSwapService} — {@link Recipe} nao tem um campo
 * equivalente a {@link MealSlot} (so {@code mealTag}, texto livre); o
 * {@code mealSlot} pedido e guardado no pedido para contexto, mas nao filtra
 * o catalogo elegivel.
 */
@Service
public class AdHocRecipeService {

    private static final Logger log = LoggerFactory.getLogger(AdHocRecipeService.class);

    private final AdHocRecipeRequestRepository adHocRequests;
    private final MealPlanEntryRepository mealPlanEntries;
    private final ClientProfileRepository clientProfiles;
    private final RecipeCatalogService recipeCatalogService;
    private final MealFeedbackService mealFeedbackService;
    private final RecipeService recipeService;
    private final RecipeSnapshotFactory recipeSnapshotFactory;
    private final AuditService audit;
    /** Auto-referencia via proxy (@Lazy self-injection) — mesmo motivo documentado em {@link AiMealPlanService}. */
    private final AdHocRecipeService self;

    @Value("${ottimizo.ai.adhoc-recipe-daily-limit:3}")
    private int dailyLimit = 3;

    public AdHocRecipeService(
        AdHocRecipeRequestRepository adHocRequests,
        MealPlanEntryRepository mealPlanEntries,
        ClientProfileRepository clientProfiles,
        RecipeCatalogService recipeCatalogService,
        MealFeedbackService mealFeedbackService,
        RecipeService recipeService,
        RecipeSnapshotFactory recipeSnapshotFactory,
        AuditService audit,
        @Lazy AdHocRecipeService self
    ) {
        this.adHocRequests = adHocRequests;
        this.mealPlanEntries = mealPlanEntries;
        this.clientProfiles = clientProfiles;
        this.recipeCatalogService = recipeCatalogService;
        this.mealFeedbackService = mealFeedbackService;
        this.recipeService = recipeService;
        this.recipeSnapshotFactory = recipeSnapshotFactory;
        this.audit = audit;
        this.self = self;
    }

    /** {@code POST /me/recipes/adhoc}. Devolve de imediato ({@code 202}); o trabalho corre em {@link #generateAsync}. */
    public AdHocRecipeHandle requestGeneration(AdHocRecipeCreateRequest request, CurrentUser actor) {
        AdHocRecipeRequest saved = self.createRequest(request, actor);
        self.generateAsync(saved.id());
        return AdHocRecipeHandle.from(saved);
    }

    @Transactional
    public AdHocRecipeRequest createRequest(AdHocRecipeCreateRequest request, CurrentUser actor) {
        OffsetDateTime startOfToday = LocalDate.now().atStartOfDay().atOffset(ZoneOffset.UTC);
        long requestedToday = adHocRequests.countByUserIdAndCreatedAtGreaterThanEqual(actor.id(), startOfToday);
        if (requestedToday >= dailyLimit) {
            throw new ServiceException(ErrorCode.LSA015_ADHOC_LIMIT);
        }

        AdHocRecipeRequest saved = adHocRequests.save(
            new AdHocRecipeRequest(actor.id(), request.mealSlot(), request.goal(), request.note())
        );
        audit.record(actor, "adhoc_recipe.requested", "AdHocRecipeRequest", saved.id());
        return saved;
    }

    /** Trabalho da geracao, fora do thread do pedido. Nunca lanca — qualquer falha vira {@code FAILED}. */
    @Async
    public void generateAsync(Long requestId) {
        AdHocRecipeRequest request = adHocRequests.findById(requestId).orElse(null);
        if (request == null) {
            return;
        }
        try {
            Long userId = request.userId();
            ClientProfile profile = clientProfiles.findByUserId(userId).orElse(null);
            Set<Long> liked = mealFeedbackService.likedRecipeIds(userId);
            Set<Long> disliked = mealFeedbackService.dislikedRecipeIds(userId);
            List<Recipe> eligible = recipeCatalogService.eligibleFor(profile, liked, disliked);

            if (eligible.isEmpty()) {
                throw new ServiceException(ErrorCode.LSA018_INSUFFICIENT_CATALOG);
            }

            Recipe chosen = eligible.get(0);
            self.markReady(requestId, recipeSnapshotFactory.from(chosen));
        } catch (Exception ex) {
            log.warn("Pedido avulso {} falhou: {}", requestId, ex.toString());
            self.markFailed(requestId);
        }
    }

    @Transactional
    public void markReady(Long requestId, com.fasterxml.jackson.databind.JsonNode snapshot) {
        AdHocRecipeRequest fresh = adHocRequests.findById(requestId).orElse(null);
        if (fresh == null) {
            return;
        }
        fresh.markReady(snapshot);
    }

    @Transactional
    public void markFailed(Long requestId) {
        AdHocRecipeRequest fresh = adHocRequests.findById(requestId).orElse(null);
        if (fresh == null) {
            return;
        }
        fresh.markFailed();
    }

    /** {@code GET /me/recipes/adhoc/{id}} — polling do resultado (F1-CLI). */
    @Transactional(readOnly = true)
    public AdHocRecipeHandle pollStatus(Long id, CurrentUser actor) {
        AdHocRecipeRequest request = adHocRequests.findByIdAndUserId(id, actor.id())
            .orElseThrow(() -> new ServiceException(ErrorCode.LSA005_NOT_FOUND));
        return AdHocRecipeHandle.from(request);
    }

    /**
     * {@code POST /me/meal-plans/entries/{id}/replace} — "guardar num dia":
     * substitui a receita de uma entrada do plano activo pela receita avulsa
     * escolhida pelo cliente. So aceita receitas {@code PUBLISHED} do
     * catalogo (tratada como {@code LSA005_NOT_FOUND} se nao for — o id vem
     * directamente do pedido, ao contrario do swap/geracao que so trabalham
     * sobre o catalogo ja pre-filtrado).
     */
    @Transactional
    public MealPlanEntryResponse replaceEntry(Long entryId, Long recipeId, CurrentUser actor) {
        MealPlanEntry entry = mealPlanEntries.findByIdWithOwnership(entryId)
            .filter(e -> e.day().mealPlan().userId().equals(actor.id()))
            .orElseThrow(() -> new ServiceException(ErrorCode.LSA005_NOT_FOUND));

        Recipe recipe = recipeService.get(recipeId);
        if (recipe.status() != RecipeStatus.PUBLISHED) {
            throw new ServiceException(ErrorCode.LSA005_NOT_FOUND);
        }

        entry.applySwap(recipe.id(), recipeSnapshotFactory.from(recipe));
        audit.record(actor, "meal_plan_entry.replaced", "MealPlanEntry", entry.id());
        return MealPlanEntryResponse.from(entry);
    }
}

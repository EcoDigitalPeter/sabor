package com.ottimizo.plans;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ottimizo.catalog.MealFeedbackService;
import com.ottimizo.catalog.Recipe;
import com.ottimizo.catalog.RecipeCatalogService;
import com.ottimizo.catalog.RecipeImageService;
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
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.openai.api.ResponseFormat;
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
 * <p><b>IA + anti-alucinacao (mesmo principio de {@link AiMealPlanService}):
 * </b> reaproveita-se {@link RecipeCatalogService#eligibleFor} (BE-C02,
 * mesmos filtros duros de saude/alergia + feedback) para obter o catalogo
 * elegivel, e a IA escolhe UM {@code recipeId} dessa lista tendo em conta o
 * objectivo/observacoes do pedido — nunca inventa uma receita nova. Se a IA
 * falhar ou devolver um id fora da lista elegivel, cai-se na primeira
 * elegivel (ordenacao ja prioriza "gostei", mesmo criterio deterministico
 * usado em {@link MealPlanSwapService}) em vez de falhar o pedido inteiro.
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
    private static final int MAX_ATTEMPTS = 2;

    /** Mesmo racional de {@link AiMealPlanService#MEAL_PLAN_JSON_SCHEMA}, para uma unica receita. */
    private static final String ADHOC_RECIPE_JSON_SCHEMA = """
        {
          "type": "object",
          "properties": {
            "recipeId": {"type": "integer"}
          },
          "required": ["recipeId"],
          "additionalProperties": false
        }
        """;

    private final AdHocRecipeRequestRepository adHocRequests;
    private final MealPlanEntryRepository mealPlanEntries;
    private final ClientProfileRepository clientProfiles;
    private final RecipeCatalogService recipeCatalogService;
    private final MealFeedbackService mealFeedbackService;
    private final RecipeService recipeService;
    private final RecipeSnapshotFactory recipeSnapshotFactory;
    private final RecipeImageService recipeImageService;
    private final AuditService audit;
    private final ChatClient chatClient;
    private final ObjectMapper objectMapper;
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
        RecipeImageService recipeImageService,
        AuditService audit,
        ChatClient.Builder chatClientBuilder,
        ObjectMapper objectMapper,
        @Lazy AdHocRecipeService self
    ) {
        this.adHocRequests = adHocRequests;
        this.mealPlanEntries = mealPlanEntries;
        this.clientProfiles = clientProfiles;
        this.recipeCatalogService = recipeCatalogService;
        this.mealFeedbackService = mealFeedbackService;
        this.recipeService = recipeService;
        this.recipeSnapshotFactory = recipeSnapshotFactory;
        this.recipeImageService = recipeImageService;
        this.audit = audit;
        this.chatClient = chatClientBuilder.build();
        this.objectMapper = objectMapper;
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

            Recipe chosen = chooseRecipe(request, profile, eligible);
            Recipe withImage = ensureImage(chosen);
            self.markReady(requestId, recipeSnapshotFactory.from(withImage));
        } catch (Exception ex) {
            log.warn("Pedido avulso {} falhou: {}", requestId, ex.toString(), ex);
            self.markFailed(requestId);
        }
    }

    /**
     * Escolhe UMA receita do catalogo elegivel via IA (Structured Outputs),
     * tendo em conta o objectivo/observacoes do pedido avulso. Se a IA nao
     * responder de forma valida (esgota {@link #MAX_ATTEMPTS}) ou devolver um
     * id fora do catalogo elegivel recebido, cai-se na primeira elegivel —
     * nunca se falha o pedido inteiro por causa da IA.
     */
    private Recipe chooseRecipe(AdHocRecipeRequest request, ClientProfile profile, List<Recipe> eligible) {
        Set<Long> eligibleIds = eligible.stream().map(Recipe::id).collect(Collectors.toCollection(LinkedHashSet::new));

        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                String answer = chatClient.prompt()
                    .system(systemPrompt())
                    .user(userPrompt(request, profile, eligible))
                    .options(adHocResponseOptions())
                    .call()
                    .content();
                JsonNode parsed = objectMapper.readTree(answer);
                long recipeId = parsed.path("recipeId").asLong(-1);
                if (recipeId > 0 && eligibleIds.contains(recipeId)) {
                    return eligible.stream().filter(r -> r.id().equals(recipeId)).findFirst().orElseThrow();
                }
            } catch (Exception ex) {
                log.warn("Tentativa {} de escolha de receita avulsa falhou: {}", attempt, ex.toString());
            }
        }
        return eligible.get(0);
    }

    private OpenAiChatOptions adHocResponseOptions() {
        return OpenAiChatOptions.builder()
            .responseFormat(ResponseFormat.builder()
                .type(ResponseFormat.Type.JSON_SCHEMA)
                .jsonSchema(ResponseFormat.JsonSchema.builder()
                    .name("adhoc_recipe")
                    .schema(ADHOC_RECIPE_JSON_SCHEMA)
                    .strict(true)
                    .build())
                .build())
            .build();
    }

    private String systemPrompt() {
        return """
            Es um chef assistente que sugere UMA receita para um cliente em Mocambique.
            So podes escolher entre as receitas do catalogo elegivel fornecido -- ja registadas
            e aprovadas pelo admin -- nunca inventes uma receita nova nem um id fora dessa lista.
            Escolhe a que melhor corresponde ao objectivo, a refeicao pedida e as observacoes que
            o cliente escreveu no formulario.
            Responde APENAS com JSON, sem texto a volta, no formato:
            {"recipeId": 12}
            """;
    }

    private String userPrompt(AdHocRecipeRequest request, ClientProfile profile, List<Recipe> eligible) {
        return """
            Refeicao pedida: %s.
            Objectivo do pedido: %s.
            Objectivo geral do perfil: %s.
            Observacoes do cliente: %s.

            Receitas elegiveis:
            %s
            """.formatted(
                request.mealSlot(),
                request.goal() == null ? "nao definido" : request.goal(),
                profile == null || profile.goal() == null ? "nao definido" : profile.goal(),
                request.note() == null || request.note().isBlank() ? "nenhuma" : request.note(),
                recipePrompt(eligible)
            );
    }

    private String recipePrompt(List<Recipe> eligible) {
        StringBuilder builder = new StringBuilder();
        for (Recipe recipe : eligible) {
            builder
                .append("- id=").append(recipe.id())
                .append("; nome=").append(recipe.name())
                .append("; kcal=").append(recipe.kcal())
                .append("; tag=").append(recipe.mealTag())
                .append('\n');
        }
        return builder.toString();
    }

    /**
     * Garante imagem para a receita realmente escolhida (pela IA ou pelo
     * fallback determinístico) — nunca uma imagem generica, best-effort:
     * se a geracao falhar, o pedido segue sem imagem em vez de falhar.
     * Mesmo padrao de {@link AiMealPlanService#ensureImagesForPlan}.
     */
    private Recipe ensureImage(Recipe recipe) {
        if (recipe.imageUrl() != null && !recipe.imageUrl().isBlank()) {
            return recipe;
        }
        try {
            return recipeImageService.ensureGenerated(recipe.id());
        } catch (Exception ex) {
            log.warn("Imagem da receita {} nao foi gerada para o pedido avulso: {}", recipe.id(), ex.toString());
            return recipe;
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

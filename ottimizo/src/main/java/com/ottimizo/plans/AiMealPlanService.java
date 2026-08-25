package com.ottimizo.plans;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.ottimizo.catalog.MealFeedbackService;
import com.ottimizo.catalog.Recipe;
import com.ottimizo.catalog.RecipeCatalogService;
import com.ottimizo.catalog.RecipeSnapshotFactory;
import com.ottimizo.common.audit.AuditService;
import com.ottimizo.common.error.ErrorCode;
import com.ottimizo.common.error.ServiceException;
import com.ottimizo.common.security.CurrentUser;
import com.ottimizo.profile.ClientProfile;
import com.ottimizo.profile.ClientProfileRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.time.format.TextStyle;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
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
 * BE-C03 — motor de geracao do plano mensal do cliente via Spring AI.
 *
 * <p><b>Fluxo:</b> {@link #requestGeneration} corre no thread do pedido,
 * valida perfil/limites e grava um {@link MealGeneration} em
 * {@code GENERATING} (o mesmo padrao ja usado pelo resto do dominio Cliente:
 * {@code MealPlanSwapService}, {@code RecipeCatalogService}). Devolve de
 * imediato ({@code 202 Accepted}, ver {@link MealPlanController}); o trabalho
 * pesado (chamada a IA + persistencia do plano) corre depois, em segundo
 * plano, em {@link #generateAsync}.
 *
 * <p><b>Anti-alucinacao (mesmo principio de {@code StoreRankingService}):</b>
 * a IA nunca ve o catalogo inteiro nem inventa receitas — so recebe os
 * {@code recipeId} ja filtrados por {@link RecipeCatalogService#eligibleFor}
 * (BE-C02, que ja aplica os filtros duros de saude/alergia) e so pode
 * escolher entre esses ids. Qualquer {@code recipeId} devolvido pela IA que
 * nao esteja nesse conjunto e descartado e substituido por um id do catalogo
 * elegivel (rotacao deterministica) em {@link #normalizeAssignment} — nunca
 * confiamos cegamente na resposta da IA para decidir "que receita existe".
 *
 * <p><b>Retries vs. normalizacao — duas coisas diferentes:</b>
 * <ul>
 *   <li>Se a IA nao responder de todo, responder algo iliegivel, ou a
 *       resposta nao tiver a forma minima esperada ({@code days: [...]}),
 *       tenta-se de novo (ate {@link #MAX_ATTEMPTS} tentativas); esgotadas
 *       as tentativas sem uma resposta estruturalmente valida, lanca-se
 *       {@link ErrorCode#LSA013_AI_UNAVAILABLE} — nao ha geracao parcial.</li>
 *   <li>Se a resposta e estruturalmente valida mas contem um
 *       {@code recipeId} individual invalido/alucinado para um dia+refeicao,
 *       NAO se repete a chamada inteira — esse slot e apenas preenchido por
 *       {@link #normalizeAssignment} com uma receita elegivel real.</li>
 * </ul>
 *
 * <p><b>Decisao de scope (sem formula de meta calorica no plano funcional):</b>
 * {@code targetKcal} de cada dia usa o proprio total do dia gerado como
 * referencia (nao ha uma formula de meta calorica por objectivo/perfil
 * documentada em {@code docs/plano/01-functional-plan.md}) — inventar uma
 * formula de nutricao aqui seria uma decisao fora do ambito deste cartao.
 */
@Service
public class AiMealPlanService {

    private static final Logger log = LoggerFactory.getLogger(AiMealPlanService.class);

    private static final int MAX_ATTEMPTS = 3;
    private static final List<MealSlot> ALL_SLOTS =
        List.of(MealSlot.PEQUENO_ALMOCO, MealSlot.ALMOCO, MealSlot.LANCHE, MealSlot.JANTAR);
    private static final Locale PT = Locale.forLanguageTag("pt-PT");

    /**
     * Forma exigida a resposta da IA via OpenAI Structured Outputs
     * ({@code response_format: json_schema}) — a API garante esta forma
     * antes de a resposta chegar aqui, o que elimina a classe de falhas
     * "JSON estruturalmente invalido" que antes so era apanhada (e
     * descartada sem log) no {@code catch} de {@link #requestAssignmentFromAi}.
     * Tem de reflectir exactamente o formato pedido em {@link #systemPrompt()}
     * e assumido por {@link #normalizeAssignment}.
     */
    private static final String MEAL_PLAN_JSON_SCHEMA = """
        {
          "type": "object",
          "properties": {
            "days": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "day": {"type": "integer"},
                  "meals": {
                    "type": "array",
                    "items": {
                      "type": "object",
                      "properties": {
                        "mealSlot": {"type": "string"},
                        "recipeId": {"type": "integer"}
                      },
                      "required": ["mealSlot", "recipeId"],
                      "additionalProperties": false
                    }
                  }
                },
                "required": ["day", "meals"],
                "additionalProperties": false
              }
            }
          },
          "required": ["days"],
          "additionalProperties": false
        }
        """;

    private final MealGenerationRepository mealGenerations;
    private final MealPlanRepository mealPlans;
    private final MealPlanDayRepository mealPlanDays;
    private final MealPlanEntryRepository mealPlanEntries;
    private final ClientProfileRepository clientProfiles;
    private final RecipeCatalogService recipeCatalogService;
    private final MealFeedbackService mealFeedbackService;
    private final RecipeSnapshotFactory recipeSnapshotFactory;
    private final AuditService audit;
    private final ChatClient chatClient;
    private final ObjectMapper objectMapper;
    /**
     * Auto-referencia via proxy (padrao {@code @Lazy self-injection}):
     * necessaria porque {@link #generateAsync} ({@code @Async}) e
     * {@link #createGeneration}/{@link #persistPlan} ({@code @Transactional})
     * tem de ser invocados atraves do proxy do Spring para essas anotacoes
     * terem efeito — uma chamada directa a {@code this.metodo(...)} dentro da
     * propria classe ignora ambos os proxies (AOP self-invocation).
     */
    private final AiMealPlanService self;

    @Value("${ottimizo.ai.meal-plan-daily-limit:3}")
    private int dailyLimit = 3;

    public AiMealPlanService(
        MealGenerationRepository mealGenerations,
        MealPlanRepository mealPlans,
        MealPlanDayRepository mealPlanDays,
        MealPlanEntryRepository mealPlanEntries,
        ClientProfileRepository clientProfiles,
        RecipeCatalogService recipeCatalogService,
        MealFeedbackService mealFeedbackService,
        RecipeSnapshotFactory recipeSnapshotFactory,
        AuditService audit,
        ChatClient.Builder chatClientBuilder,
        ObjectMapper objectMapper,
        @Lazy AiMealPlanService self
    ) {
        this.mealGenerations = mealGenerations;
        this.mealPlans = mealPlans;
        this.mealPlanDays = mealPlanDays;
        this.mealPlanEntries = mealPlanEntries;
        this.clientProfiles = clientProfiles;
        this.recipeCatalogService = recipeCatalogService;
        this.mealFeedbackService = mealFeedbackService;
        this.recipeSnapshotFactory = recipeSnapshotFactory;
        this.audit = audit;
        this.chatClient = chatClientBuilder.build();
        this.objectMapper = objectMapper;
        this.self = self;
    }

    /**
     * {@code POST /me/meal-plans} (F1-CLI-02). Corre no thread do pedido: so
     * faz as validacoes rapidas (perfil completo, sem geracao em curso,
     * limite diario) e grava o {@link MealGeneration} — a chamada a IA em si
     * so arranca depois deste metodo devolver (ver {@link #createGeneration}
     * para o porque de nao arrancar o {@code @Async} dentro da mesma
     * transaccao).
     */
    public MealGenerationResponse requestGeneration(CurrentUser actor) {
        MealGeneration generation = self.createGeneration(actor);
        self.generateAsync(generation.id());
        return MealGenerationResponse.from(generation);
    }

    /**
     * Valida + grava a geracao numa transaccao curta e propria. Tem de
     * terminar (e portanto fazer commit) ANTES de {@link #generateAsync} ser
     * chamado — se disparassemos o {@code @Async} ainda dentro desta
     * transaccao, o thread em segundo plano podia tentar ler a geracao antes
     * do commit e nao a encontrar.
     */
    @Transactional
    public MealGeneration createGeneration(CurrentUser actor) {
        ClientProfile profile = clientProfiles.findByUserId(actor.id()).orElse(null);
        ensureProfileComplete(profile);

        if (mealGenerations.existsByUserIdAndKindAndStatus(
            actor.id(), MealGenerationKind.MONTHLY_PLAN, MealGenerationStatus.GENERATING)) {
            throw new ServiceException(ErrorCode.LSA011_GENERATION_IN_PROGRESS);
        }

        OffsetDateTime startOfToday = LocalDate.now().atStartOfDay().atOffset(ZoneOffset.UTC);
        long generatedToday = mealGenerations.countByUserIdAndKindAndCreatedAtGreaterThanEqual(
            actor.id(), MealGenerationKind.MONTHLY_PLAN, startOfToday);
        if (generatedToday >= dailyLimit) {
            throw new ServiceException(ErrorCode.LSA012_GENERATION_LIMIT);
        }

        MealGeneration generation = mealGenerations.save(new MealGeneration(actor.id(), MealGenerationKind.MONTHLY_PLAN));
        audit.record(actor, "meal_plan.generation.requested", "MealGeneration", generation.id());
        return generation;
    }

    /**
     * Trabalho pesado da geracao (chamada a IA + persistencia do plano),
     * fora do thread do pedido. Nunca lanca — qualquer falha e capturada e
     * traduzida num {@link MealGeneration#markFailed}, nunca propagada (nao
     * ha ninguem a "apanhar" a excepcao de um metodo {@code @Async void}).
     */
    @Async
    public void generateAsync(Long generationId) {
        MealGeneration generation = mealGenerations.findById(generationId).orElse(null);
        if (generation == null) {
            return;
        }
        Long userId = generation.userId();
        try {
            ClientProfile profile = clientProfiles.findByUserId(userId).orElse(null);
            Set<Long> liked = mealFeedbackService.likedRecipeIds(userId);
            Set<Long> disliked = mealFeedbackService.dislikedRecipeIds(userId);
            List<Recipe> eligible = recipeCatalogService.eligibleFor(profile, liked, disliked);

            if (eligible.isEmpty()) {
                throw new ServiceException(ErrorCode.LSA018_INSUFFICIENT_CATALOG);
            }

            List<MealSlot> slots = slotsFor(profile);
            LocalDate monthStart = YearMonth.now().atDay(1);
            int days = YearMonth.now().lengthOfMonth();

            Map<Integer, Map<MealSlot, Long>> assignment = requestAssignmentFromAi(profile, eligible, days, slots);

            Map<Long, Recipe> eligibleById = eligible.stream()
                .collect(Collectors.toMap(Recipe::id, r -> r, (a, b) -> a, LinkedHashMap::new));

            Long planId = self.persistPlan(userId, buildProfileSnapshot(profile), monthStart, days, slots, assignment, eligibleById);

            self.markReady(generationId, planId, userId);
        } catch (Exception ex) {
            self.markFailed(generationId, userId, ex);
        }
    }

    @Transactional
    public void markReady(Long generationId, Long planId, Long userId) {
        MealGeneration fresh = mealGenerations.findById(generationId).orElseThrow();
        fresh.markReady(planId);
        mealGenerations.save(fresh);
        audit.record(userId, "meal_plan.generation.ready", "MealPlan", planId, Map.of("generationId", generationId));
    }

    @Transactional
    public void markFailed(Long generationId, Long userId, Exception ex) {
        ErrorCode code = ex instanceof ServiceException se ? se.code() : ErrorCode.LSA013_AI_UNAVAILABLE;
        MealGeneration fresh = mealGenerations.findById(generationId).orElse(null);
        if (fresh == null) {
            return;
        }
        fresh.markFailed(code.name());
        mealGenerations.save(fresh);
        audit.record(userId, "meal_plan.generation.failed", "MealGeneration", generationId, Map.of("errorCode", code.name()));
    }

    /**
     * Persiste o plano mensal (arquiva o plano {@code ACTIVE} anterior do
     * utilizador, se existir, cria o novo {@code MealPlan}/dias/entradas).
     * Chamado atraves de {@link #self} a partir de {@link #generateAsync}
     * (que corre num thread {@code @Async}, sem transaccao propria) para que
     * toda a escrita aconteca numa unica transaccao.
     */
    @Transactional
    public Long persistPlan(
        Long userId,
        JsonNode profileSnapshot,
        LocalDate monthStart,
        int days,
        List<MealSlot> slots,
        Map<Integer, Map<MealSlot, Long>> assignment,
        Map<Long, Recipe> eligibleById
    ) {
        mealPlans.findByUserIdAndStatus(userId, MealPlanStatus.ACTIVE).ifPresent(MealPlan::archive);

        MealPlan plan = mealPlans.save(new MealPlan(userId, monthStart, profileSnapshot));

        for (int dayIndex = 1; dayIndex <= days; dayIndex++) {
            LocalDate date = monthStart.plusDays(dayIndex - 1L);
            Map<MealSlot, Long> daySlots = assignment.getOrDefault(dayIndex, Map.of());

            List<Recipe> dayRecipes = daySlots.values().stream()
                .map(eligibleById::get)
                .filter(Objects::nonNull)
                .toList();

            DayMacros macros = aggregateDay(dayRecipes);

            MealPlanDay day = mealPlanDays.save(new MealPlanDay(
                plan,
                date,
                weekdayLabel(date),
                macros.totalKcal(),
                macros.totalKcal(),
                macros.proteinPct(),
                macros.carbsPct(),
                macros.fatPct(),
                macros.fiberPct()
            ));

            for (MealSlot slot : slots) {
                Long recipeId = daySlots.get(slot);
                Recipe recipe = recipeId == null ? null : eligibleById.get(recipeId);
                if (recipe == null) {
                    continue;
                }
                JsonNode snapshot = recipeSnapshotFactory.from(recipe);
                mealPlanEntries.save(new MealPlanEntry(day, slot, recipe.id(), snapshot));
            }
        }

        return plan.id();
    }

    // ---- IA -------------------------------------------------------------

    private Map<Integer, Map<MealSlot, Long>> requestAssignmentFromAi(
        ClientProfile profile, List<Recipe> eligible, int days, List<MealSlot> slots
    ) {
        Set<Long> eligibleIds = eligible.stream().map(Recipe::id).collect(Collectors.toCollection(LinkedHashSet::new));

        JsonNode aiPlan = null;
        for (int attempt = 1; attempt <= MAX_ATTEMPTS && aiPlan == null; attempt++) {
            try {
                String answer = chatClient.prompt()
                    .system(systemPrompt())
                    .user(userPrompt(profile, eligible, days, slots))
                    .options(mealPlanResponseOptions())
                    .call()
                    .content();
                JsonNode parsed = objectMapper.readTree(answer);
                if (isStructurallyValid(parsed)) {
                    aiPlan = parsed;
                }
            } catch (Exception ex) {
                log.warn("Tentativa {} de geracao de plano falhou: {}", attempt, ex.toString());
            }
        }

        if (aiPlan == null) {
            throw new ServiceException(ErrorCode.LSA013_AI_UNAVAILABLE);
        }

        return normalizeAssignment(aiPlan, eligibleIds, eligible, days, slots);
    }

    private OpenAiChatOptions mealPlanResponseOptions() {
        return OpenAiChatOptions.builder()
            .responseFormat(ResponseFormat.builder()
                .type(ResponseFormat.Type.JSON_SCHEMA)
                .jsonSchema(ResponseFormat.JsonSchema.builder()
                    .name("meal_plan")
                    .schema(MEAL_PLAN_JSON_SCHEMA)
                    .strict(true)
                    .build())
                .build())
            .build();
    }

    private boolean isStructurallyValid(JsonNode parsed) {
        return parsed != null && parsed.path("days").isArray();
    }

    /**
     * Constroi, para cada dia x refeicao, o {@code recipeId} final: o
     * escolhido pela IA se for um id real do catalogo elegivel recebido,
     * senao um id de fallback determinístico (rotacao pelo catalogo
     * elegivel) — nunca um id inventado pela IA, nunca um slot vazio.
     */
    private Map<Integer, Map<MealSlot, Long>> normalizeAssignment(
        JsonNode aiPlan, Set<Long> eligibleIds, List<Recipe> eligible, int days, List<MealSlot> slots
    ) {
        Map<Integer, Map<String, Long>> aiByDay = new HashMap<>();
        JsonNode daysNode = aiPlan.path("days");
        if (daysNode.isArray()) {
            for (JsonNode dayNode : daysNode) {
                int dayIndex = dayNode.path("day").asInt(-1);
                if (dayIndex < 1 || dayIndex > days) {
                    continue;
                }
                Map<String, Long> slotMap = aiByDay.computeIfAbsent(dayIndex, k -> new HashMap<>());
                JsonNode mealsNode = dayNode.path("meals");
                if (mealsNode.isArray()) {
                    for (JsonNode mealNode : mealsNode) {
                        String slot = mealNode.path("mealSlot").isTextual() ? mealNode.path("mealSlot").asText() : null;
                        JsonNode recipeIdNode = mealNode.path("recipeId");
                        long recipeId = recipeIdNode.isNumber() ? recipeIdNode.asLong() : -1;
                        if (slot != null && recipeId > 0 && eligibleIds.contains(recipeId)) {
                            slotMap.put(slot, recipeId);
                        }
                    }
                }
            }
        }

        Map<Integer, Map<MealSlot, Long>> result = new LinkedHashMap<>();
        int fallbackCursor = 0;
        for (int day = 1; day <= days; day++) {
            Map<MealSlot, Long> daySlots = new LinkedHashMap<>();
            Map<String, Long> aiDay = aiByDay.getOrDefault(day, Map.of());
            for (MealSlot slot : slots) {
                Long recipeId = aiDay.get(slot.name());
                if (recipeId == null) {
                    Recipe fallback = eligible.get(fallbackCursor % eligible.size());
                    fallbackCursor++;
                    recipeId = fallback.id();
                }
                daySlots.put(slot, recipeId);
            }
            result.put(day, daySlots);
        }
        return result;
    }

    private String systemPrompt() {
        return """
            Es um planeador de refeicoes para clientes em Mocambique.
            Para cada dia do mes e cada refeicao do dia, escolhe UM recipeId da lista de receitas elegiveis fornecida.
            Usa apenas os ids recebidos - nunca inventes um recipeId novo nem uma receita nova.
            Varia as escolhas ao longo do mes sempre que possivel; repetir e aceitavel se o catalogo for pequeno.
            Responde APENAS com JSON, sem texto a volta, no formato:
            {"days":[{"day":1,"meals":[{"mealSlot":"PEQUENO_ALMOCO","recipeId":12}]}]}
            """;
    }

    private String userPrompt(ClientProfile profile, List<Recipe> eligible, int days, List<MealSlot> slots) {
        return """
            Perfil do cliente: objectivo=%s, refeicoes por dia=%d.
            Gera um plano para %d dias, com as refeicoes: %s.

            Receitas elegiveis:
            %s
            """.formatted(
                profile == null || profile.goal() == null ? "nao definido" : profile.goal(),
                slots.size(),
                days,
                slots.stream().map(Enum::name).collect(Collectors.joining(", ")),
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

    // ---- apoio ------------------------------------------------------------

    private void ensureProfileComplete(ClientProfile profile) {
        if (profile == null || profile.goal() == null || !profile.medicalDisclaimerAccepted()) {
            throw new ServiceException(ErrorCode.LSA010_PROFILE_INCOMPLETE);
        }
    }

    private List<MealSlot> slotsFor(ClientProfile profile) {
        int mealsPerDay = profile != null && profile.mealsPerDay() != null ? profile.mealsPerDay() : 3;
        int count = Math.max(2, Math.min(mealsPerDay, ALL_SLOTS.size()));
        return ALL_SLOTS.subList(0, count);
    }

    private JsonNode buildProfileSnapshot(ClientProfile profile) {
        ObjectNode node = objectMapper.createObjectNode();
        if (profile == null) {
            return node;
        }
        node.put("goal", profile.goal() != null ? profile.goal().name() : null);
        node.put("mealsPerDay", profile.mealsPerDay());
        node.put("householdSize", profile.householdSize());
        ArrayNode healthConditions = node.putArray("healthConditions");
        profile.healthConditions().forEach(healthConditions::add);
        ArrayNode allergies = node.putArray("allergies");
        profile.allergies().forEach(allergies::add);
        ArrayNode exclusions = node.putArray("foodExclusions");
        profile.foodExclusions().forEach(exclusions::add);
        ArrayNode dietary = node.putArray("dietaryPreferences");
        profile.dietaryPreferences().forEach(dietary::add);
        return node;
    }

    private String weekdayLabel(LocalDate date) {
        String raw = date.getDayOfWeek().getDisplayName(TextStyle.FULL, PT);
        return raw.isEmpty() ? raw : Character.toUpperCase(raw.charAt(0)) + raw.substring(1);
    }

    /**
     * Media ponderada pelo kcal de cada receita do dia — aproximacao (as
     * percentagens de cada receita sao relativas ao kcal dessa propria
     * receita), mas suficiente para o resumo diario; mesma logica de
     * aproximacao documentada em {@code RecipeMacroCalculator} para unidades.
     */
    private DayMacros aggregateDay(List<Recipe> dayRecipes) {
        BigDecimal totalKcal = BigDecimal.ZERO;
        BigDecimal proteinWeighted = BigDecimal.ZERO;
        BigDecimal carbsWeighted = BigDecimal.ZERO;
        BigDecimal fatWeighted = BigDecimal.ZERO;
        BigDecimal fiberWeighted = BigDecimal.ZERO;

        for (Recipe recipe : dayRecipes) {
            BigDecimal kcal = recipe.kcal() == null ? BigDecimal.ZERO : recipe.kcal();
            totalKcal = totalKcal.add(kcal);
            proteinWeighted = proteinWeighted.add(kcal.multiply(BigDecimal.valueOf(nz(recipe.proteinPct()))));
            carbsWeighted = carbsWeighted.add(kcal.multiply(BigDecimal.valueOf(nz(recipe.carbsPct()))));
            fatWeighted = fatWeighted.add(kcal.multiply(BigDecimal.valueOf(nz(recipe.fatPct()))));
            fiberWeighted = fiberWeighted.add(kcal.multiply(BigDecimal.valueOf(nz(recipe.fiberPct()))));
        }

        if (totalKcal.signum() <= 0) {
            return new DayMacros(BigDecimal.ZERO, 0, 0, 0, 0);
        }

        return new DayMacros(
            totalKcal.setScale(2, RoundingMode.HALF_UP),
            weightedPct(proteinWeighted, totalKcal),
            weightedPct(carbsWeighted, totalKcal),
            weightedPct(fatWeighted, totalKcal),
            weightedPct(fiberWeighted, totalKcal)
        );
    }

    private int weightedPct(BigDecimal weighted, BigDecimal totalKcal) {
        return weighted.divide(totalKcal, 0, RoundingMode.HALF_UP).intValue();
    }

    private int nz(Integer value) {
        return value == null ? 0 : value;
    }

    private record DayMacros(BigDecimal totalKcal, Integer proteinPct, Integer carbsPct, Integer fatPct, Integer fiberPct) {
    }
}

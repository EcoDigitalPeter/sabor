package com.ottimizo.catalog;

import com.ottimizo.profile.ClientProfile;
import com.ottimizo.profile.HealthCondition;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;
import org.hibernate.Hibernate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Pre-filtros duros de elegibilidade do catalogo de receitas para um cliente
 * (BE-C02, docs/plano/tasks.md secao Fase C). Puro Java sobre o catalogo
 * {@link RecipeStatus#PUBLISHED} — sem chamada a IA, sem heuristicas: e' a
 * barreira anti-alucinacao que garante que a IA (BE-C03/BE-C08) nunca vê, e
 * portanto nunca pode sugerir, uma receita insegura para o cliente.
 *
 * <p><b>Filtros duros implementados nesta versao:</b>
 * <ul>
 *   <li>Estado: so receitas {@code PUBLISHED} entram no catalogo elegivel.</li>
 *   <li>{@link HealthCondition#DOENCA_CELIACA}: exclui qualquer receita cujo
 *       {@code healthTags} nao contenha {@code "sem_gluten"} — o unico filtro
 *       duro por condicao de saude especificado explicitamente em
 *       docs/plano/01-functional-plan.md (linha ~211).</li>
 *   <li>Alergias/exclusoes alimentares ({@link ClientProfile#allergies()} +
 *       {@link ClientProfile#foodExclusions()}): exclui receitas que tenham,
 *       entre os seus {@link RecipeIngredient}, um ingrediente cujo nome
 *       {@link Ingredient#name()} bata, de forma exacta e case-insensitive,
 *       com algum item de qualquer uma das duas listas.</li>
 *   <li>{@code dislikedRecipeIds}: exclui essas receitas do resultado.</li>
 *   <li>{@code likedRecipeIds}: nao exclui nada — apenas reordena, ficando
 *       primeiro na lista devolvida (ordenacao estavel dentro de cada
 *       grupo).</li>
 * </ul>
 *
 * <p><b>Fora de ambito nesta versao (decisao deliberada, nao lacuna):</b> o
 * functional-plan (mesma linha ~211) tambem descreve regras de
 * exclusao/priorizacao mais finas para {@code DIABETES_TIPO_2} (excluir
 * {@code alto_acucar}, priorizar {@code acucar_controlado}) e
 * {@code HIPERTENSAO} (excluir {@code alto_sodio}, priorizar
 * {@code baixo_sodio}). BE-C02 so cobre o filtro duro documentado
 * explicitamente para celiaco; as demais condicoes (diabetes, hipertensao,
 * outra) nao aplicam qualquer filtro nesta versao. Isto fica registado aqui
 * para quem consumir este servico (BE-C03/BE-C08) nao assumir cobertura que
 * nao existe — decisao de alcance do cartao, nao pedido de aprovacao ao
 * supervisor.</p>
 *
 * <p>Sem entidade {@code MealFeedback}: os ids de "gostei"/"nao gostei" sao
 * recebidos como parametro, nunca lidos de base de dados aqui.</p>
 */
@Service
public class RecipeCatalogService {

    private static final String TAG_SEM_GLUTEN = "sem_gluten";

    private final RecipeRepository recipeRepository;

    public RecipeCatalogService(RecipeRepository recipeRepository) {
        this.recipeRepository = recipeRepository;
    }

    /**
     * Devolve as receitas {@code PUBLISHED} elegiveis para o perfil dado,
     * ja filtradas pelos filtros duros e reordenadas por preferencia.
     *
     * @param profile           perfil do cliente; {@code null} e' tratado
     *                          como perfil sem condicoes/alergias (nenhum
     *                          filtro de saude/alergia aplicado, so estado
     *                          + feedback).
     * @param likedRecipeIds    ids de receitas com feedback positivo;
     *                          reordena-as para o inicio, nao exclui nada.
     *                          {@code null} equivale a conjunto vazio.
     * @param dislikedRecipeIds ids de receitas com feedback negativo;
     *                          excluidas do resultado. {@code null} equivale
     *                          a conjunto vazio.
     * @return lista de receitas elegiveis, receitas preferidas primeiro,
     *         ordem estavel dentro de cada grupo.
     */
    @Transactional(readOnly = true)
    public List<Recipe> eligibleFor(ClientProfile profile, Set<Long> likedRecipeIds, Set<Long> dislikedRecipeIds) {
        Set<Long> liked = likedRecipeIds == null ? Set.of() : likedRecipeIds;
        Set<Long> disliked = dislikedRecipeIds == null ? Set.of() : dislikedRecipeIds;

        boolean requiresGlutenFree = hasHealthCondition(profile, HealthCondition.DOENCA_CELIACA);
        Set<String> exclusionTerms = exclusionTerms(profile);

        List<Recipe> eligible = recipeRepository.findByStatus(RecipeStatus.PUBLISHED).stream()
            .filter(recipe -> !disliked.contains(recipe.id()))
            .filter(recipe -> !requiresGlutenFree || isGlutenFree(recipe))
            .filter(recipe -> !containsExcludedIngredient(recipe, exclusionTerms))
            .collect(Collectors.toCollection(ArrayList::new));

        // Sort estavel (List.sort/TimSort): so reordena por preferencia,
        // preservando a ordem relativa dentro do grupo "preferida" e do
        // grupo "restante".
        eligible.sort(Comparator.comparing(recipe -> !liked.contains(recipe.id())));

        // Inicializa as colecoes lazy (ingredients, steps) ainda dentro desta
        // transaccao: os chamadores (AiMealPlanService/AdHocRecipeService/
        // MealPlanSwapService) usam estas receitas mais tarde, ja fora desta
        // sessao Hibernate (ex. RecipeSnapshotFactory#from numa transaccao
        // propria e posterior) -- sem isto, qualquer acesso a ingredients()/
        // steps() nessa altura rebenta com LazyInitializationException,
        // mesmo a entidade estando "detached" dentro de outra @Transactional.
        eligible.forEach(recipe -> {
            Hibernate.initialize(recipe.ingredients());
            Hibernate.initialize(recipe.steps());
        });

        return eligible;
    }

    private boolean hasHealthCondition(ClientProfile profile, HealthCondition condition) {
        return profile != null
            && profile.healthConditions() != null
            && profile.healthConditions().contains(condition.name());
    }

    private boolean isGlutenFree(Recipe recipe) {
        return recipe.healthTags() != null && recipe.healthTags().contains(TAG_SEM_GLUTEN);
    }

    private boolean containsExcludedIngredient(Recipe recipe, Set<String> exclusionTerms) {
        if (exclusionTerms.isEmpty() || recipe.ingredients() == null) {
            return false;
        }
        return recipe.ingredients().stream().anyMatch(recipeIngredient -> {
            Ingredient ingredient = recipeIngredient.ingredient();
            String name = ingredient == null ? null : ingredient.name();
            return name != null && exclusionTerms.contains(normalize(name));
        });
    }

    private Set<String> exclusionTerms(ClientProfile profile) {
        if (profile == null) {
            return Set.of();
        }
        Set<String> terms = new HashSet<>();
        addTerms(terms, profile.allergies());
        addTerms(terms, profile.foodExclusions());
        return terms;
    }

    private void addTerms(Set<String> terms, List<String> values) {
        if (values == null) {
            return;
        }
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                terms.add(normalize(value));
            }
        }
    }

    private String normalize(String value) {
        return value.trim().toLowerCase(Locale.ROOT);
    }
}

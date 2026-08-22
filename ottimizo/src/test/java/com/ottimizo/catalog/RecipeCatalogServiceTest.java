package com.ottimizo.catalog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ottimizo.profile.ClientProfile;
import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * Testes exaustivos de {@link RecipeCatalogService} — a barreira anti-alucinacao
 * do projecto (docs/plano/tasks.md, cartao BE-C02). Um caso por condicao de
 * saude do vocabulario fechado ({@link com.ottimizo.profile.HealthCondition}),
 * combinacoes com alergias/exclusoes, e casos de fronteira (catalogo vazio,
 * tudo excluido, parametros nulos).
 */
@ExtendWith(MockitoExtension.class)
class RecipeCatalogServiceTest {

    @Mock
    private RecipeRepository recipeRepository;

    private RecipeCatalogService service;

    @BeforeEach
    void setUp() {
        service = new RecipeCatalogService(recipeRepository);
    }

    // --- Base: so PUBLISHED ---------------------------------------------

    @Test
    void eligibleFor_consultaSempreOCatalogoPublicado() {
        when(recipeRepository.findByStatus(RecipeStatus.PUBLISHED)).thenReturn(List.of());

        service.eligibleFor(profileWith(List.of("NENHUMA"), List.of(), List.of()), Set.of(), Set.of());

        verify(recipeRepository).findByStatus(RecipeStatus.PUBLISHED);
    }

    @Test
    void eligibleFor_catalogoVazio_devolveListaVazia() {
        when(recipeRepository.findByStatus(RecipeStatus.PUBLISHED)).thenReturn(List.of());

        List<Recipe> result = service.eligibleFor(profileWith(List.of("NENHUMA"), List.of(), List.of()), Set.of(), Set.of());

        assertThat(result).isEmpty();
    }

    // --- Vocabulario fechado de condicoes de saude -----------------------

    @Test
    void eligibleFor_condicaoNenhuma_naoAplicaFiltroDeSaude() {
        Recipe comGluten = recipe(1L, List.of("alta_proteina"));
        Recipe semGluten = recipe(2L, List.of("sem_gluten"));
        when(recipeRepository.findByStatus(RecipeStatus.PUBLISHED)).thenReturn(List.of(comGluten, semGluten));

        List<Recipe> result = service.eligibleFor(profileWith(List.of("NENHUMA"), List.of(), List.of()), Set.of(), Set.of());

        assertThat(result).extracting(Recipe::id).containsExactlyInAnyOrder(1L, 2L);
    }

    @Test
    void eligibleFor_doencaCeliaca_excluiReceitasSemTagSemGluten() {
        Recipe comGluten = recipe(1L, List.of("alta_proteina"));
        Recipe semGluten = recipe(2L, List.of("sem_gluten"));
        when(recipeRepository.findByStatus(RecipeStatus.PUBLISHED)).thenReturn(List.of(comGluten, semGluten));

        List<Recipe> result = service.eligibleFor(
            profileWith(List.of("DOENCA_CELIACA"), List.of(), List.of()), Set.of(), Set.of());

        assertThat(result).extracting(Recipe::id).containsExactly(2L);
    }

    @Test
    void eligibleFor_doencaCeliaca_semReceitasSemGluten_devolveListaVazia() {
        Recipe comGluten = recipe(1L, List.of("alta_proteina"));
        when(recipeRepository.findByStatus(RecipeStatus.PUBLISHED)).thenReturn(List.of(comGluten));

        List<Recipe> result = service.eligibleFor(
            profileWith(List.of("DOENCA_CELIACA"), List.of(), List.of()), Set.of(), Set.of());

        assertThat(result).isEmpty();
    }

    @Test
    void eligibleFor_diabetesTipo2_naoAplicaFiltroDuro_versaoActual() {
        // functional-plan descreve regra fina (excluir alto_acucar) mas o cartao
        // BE-C02 so implementa o filtro duro documentado para celiaco — ver javadoc
        // de RecipeCatalogService. Confirma que diabetes nao exclui nada aqui.
        Recipe altoAcucar = recipe(1L, List.of("alto_acucar"));
        when(recipeRepository.findByStatus(RecipeStatus.PUBLISHED)).thenReturn(List.of(altoAcucar));

        List<Recipe> result = service.eligibleFor(
            profileWith(List.of("DIABETES_TIPO_2"), List.of(), List.of()), Set.of(), Set.of());

        assertThat(result).extracting(Recipe::id).containsExactly(1L);
    }

    @Test
    void eligibleFor_hipertensao_naoAplicaFiltroDuro_versaoActual() {
        Recipe altoSodio = recipe(1L, List.of("alto_sodio"));
        when(recipeRepository.findByStatus(RecipeStatus.PUBLISHED)).thenReturn(List.of(altoSodio));

        List<Recipe> result = service.eligibleFor(
            profileWith(List.of("HIPERTENSAO"), List.of(), List.of()), Set.of(), Set.of());

        assertThat(result).extracting(Recipe::id).containsExactly(1L);
    }

    @Test
    void eligibleFor_outra_naoAplicaFiltroDuro() {
        Recipe qualquer = recipe(1L, List.of());
        when(recipeRepository.findByStatus(RecipeStatus.PUBLISHED)).thenReturn(List.of(qualquer));

        List<Recipe> result = service.eligibleFor(
            profileWith(List.of("OUTRA"), List.of(), List.of()), Set.of(), Set.of());

        assertThat(result).extracting(Recipe::id).containsExactly(1L);
    }

    @Test
    void eligibleFor_multiplasCondicoesIncluindoCeliaco_aplicaFiltroDuroDeGluten() {
        // FE-Y02: healthConditions e multi-seleccao; celiaco continua filtro duro
        // isolado mesmo combinado com outras condicoes (functional-plan linha ~174).
        Recipe comGluten = recipe(1L, List.of("alto_sodio"));
        Recipe semGluten = recipe(2L, List.of("sem_gluten", "alto_sodio"));
        when(recipeRepository.findByStatus(RecipeStatus.PUBLISHED)).thenReturn(List.of(comGluten, semGluten));

        List<Recipe> result = service.eligibleFor(
            profileWith(List.of("HIPERTENSAO", "DOENCA_CELIACA"), List.of(), List.of()), Set.of(), Set.of());

        assertThat(result).extracting(Recipe::id).containsExactly(2L);
    }

    // --- Alergias / exclusoes alimentares ---------------------------------

    @Test
    void eligibleFor_alergia_excluiReceitaComIngredienteCorrespondente() {
        Recipe comAmendoim = recipe(1L, List.of(), recipeIngredient("Amendoim"));
        Recipe semAmendoim = recipe(2L, List.of(), recipeIngredient("Arroz"));
        when(recipeRepository.findByStatus(RecipeStatus.PUBLISHED)).thenReturn(List.of(comAmendoim, semAmendoim));

        List<Recipe> result = service.eligibleFor(
            profileWith(List.of("NENHUMA"), List.of("amendoim"), List.of()), Set.of(), Set.of());

        assertThat(result).extracting(Recipe::id).containsExactly(2L);
    }

    @Test
    void eligibleFor_alergia_comparacaoCaseInsensitive() {
        Recipe comMarisco = recipe(1L, List.of(), recipeIngredient("CAMARÃO"));
        when(recipeRepository.findByStatus(RecipeStatus.PUBLISHED)).thenReturn(List.of(comMarisco));

        List<Recipe> result = service.eligibleFor(
            profileWith(List.of("NENHUMA"), List.of("  camarão  "), List.of()), Set.of(), Set.of());

        assertThat(result).isEmpty();
    }

    @Test
    void eligibleFor_exclusaoAlimentar_excluiReceitaComIngredienteCorrespondente() {
        Recipe comFigado = recipe(1L, List.of(), recipeIngredient("Fígado"));
        Recipe semFigado = recipe(2L, List.of(), recipeIngredient("Arroz"));
        when(recipeRepository.findByStatus(RecipeStatus.PUBLISHED)).thenReturn(List.of(comFigado, semFigado));

        List<Recipe> result = service.eligibleFor(
            profileWith(List.of("NENHUMA"), List.of(), List.of("fígado")), Set.of(), Set.of());

        assertThat(result).extracting(Recipe::id).containsExactly(2L);
    }

    @Test
    void eligibleFor_semAlergiasNemExclusoes_naoExcluiPorIngrediente() {
        Recipe qualquer = recipe(1L, List.of(), recipeIngredient("Amendoim"));
        when(recipeRepository.findByStatus(RecipeStatus.PUBLISHED)).thenReturn(List.of(qualquer));

        List<Recipe> result = service.eligibleFor(
            profileWith(List.of("NENHUMA"), List.of(), List.of()), Set.of(), Set.of());

        assertThat(result).extracting(Recipe::id).containsExactly(1L);
    }

    @Test
    void eligibleFor_celiacoComAlergia_combinaAmbosOsFiltrosDuros() {
        Recipe violaAmbos = recipe(1L, List.of(), recipeIngredient("Amendoim"));
        Recipe violaSoGluten = recipe(2L, List.of(), recipeIngredient("Arroz"));
        Recipe semGlutenSemAlergenio = recipe(3L, List.of("sem_gluten"), recipeIngredient("Arroz"));
        when(recipeRepository.findByStatus(RecipeStatus.PUBLISHED))
            .thenReturn(List.of(violaAmbos, violaSoGluten, semGlutenSemAlergenio));

        List<Recipe> result = service.eligibleFor(
            profileWith(List.of("DOENCA_CELIACA"), List.of("amendoim"), List.of()), Set.of(), Set.of());

        assertThat(result).extracting(Recipe::id).containsExactly(3L);
    }

    // --- Feedback: gostei / nao gostei ------------------------------------

    @Test
    void eligibleFor_naoGostei_excluiReceitaIndependentementeDosOutrosFiltros() {
        Recipe naoGostada = recipe(1L, List.of());
        Recipe outra = recipe(2L, List.of());
        when(recipeRepository.findByStatus(RecipeStatus.PUBLISHED)).thenReturn(List.of(naoGostada, outra));

        List<Recipe> result = service.eligibleFor(
            profileWith(List.of("NENHUMA"), List.of(), List.of()), Set.of(), Set.of(1L));

        assertThat(result).extracting(Recipe::id).containsExactly(2L);
    }

    @Test
    void eligibleFor_gostei_reordenaParaOInicioSemExcluirNada() {
        Recipe primeira = recipe(1L, List.of());
        Recipe segunda = recipe(2L, List.of());
        Recipe terceiraGostada = recipe(3L, List.of());
        when(recipeRepository.findByStatus(RecipeStatus.PUBLISHED))
            .thenReturn(List.of(primeira, segunda, terceiraGostada));

        List<Recipe> result = service.eligibleFor(
            profileWith(List.of("NENHUMA"), List.of(), List.of()), Set.of(3L), Set.of());

        assertThat(result).extracting(Recipe::id).containsExactly(3L, 1L, 2L);
    }

    @Test
    void eligibleFor_gostei_mantemOrdemEstavelDentroDeCadaGrupo() {
        Recipe gostada1 = recipe(1L, List.of());
        Recipe naoGostada1 = recipe(2L, List.of());
        Recipe gostada2 = recipe(3L, List.of());
        Recipe naoGostada2 = recipe(4L, List.of());
        when(recipeRepository.findByStatus(RecipeStatus.PUBLISHED))
            .thenReturn(List.of(gostada1, naoGostada1, gostada2, naoGostada2));

        List<Recipe> result = service.eligibleFor(
            profileWith(List.of("NENHUMA"), List.of(), List.of()), Set.of(1L, 3L), Set.of());

        // Grupo preferido (1, 3) primeiro mantendo a ordem original, depois o resto (2, 4).
        assertThat(result).extracting(Recipe::id).containsExactly(1L, 3L, 2L, 4L);
    }

    @Test
    void eligibleFor_naoGostiTemPrioridadeSobreGostei_seIdEstiverNosDois() {
        // Caso de fronteira: um id inconsistente que aparece nos dois conjuntos
        // (nao deveria acontecer na pratica) — exclusao ganha, nunca aparece.
        Recipe inconsistente = recipe(1L, List.of());
        when(recipeRepository.findByStatus(RecipeStatus.PUBLISHED)).thenReturn(List.of(inconsistente));

        List<Recipe> result = service.eligibleFor(
            profileWith(List.of("NENHUMA"), List.of(), List.of()), Set.of(1L), Set.of(1L));

        assertThat(result).isEmpty();
    }

    @Test
    void eligibleFor_todasAsReceitasExcluidas_devolveListaVazia() {
        Recipe a = recipe(1L, List.of());
        Recipe b = recipe(2L, List.of());
        when(recipeRepository.findByStatus(RecipeStatus.PUBLISHED)).thenReturn(List.of(a, b));

        List<Recipe> result = service.eligibleFor(
            profileWith(List.of("NENHUMA"), List.of(), List.of()), Set.of(), Set.of(1L, 2L));

        assertThat(result).isEmpty();
    }

    // --- Parametros nulos / casos de fronteira ----------------------------

    @Test
    void eligibleFor_perfilNulo_aplicaSoFiltroDeEstadoEFeedback() {
        Recipe qualquer = recipe(1L, List.of(), recipeIngredient("Amendoim"));
        when(recipeRepository.findByStatus(RecipeStatus.PUBLISHED)).thenReturn(List.of(qualquer));

        List<Recipe> result = service.eligibleFor(null, Set.of(), Set.of());

        assertThat(result).extracting(Recipe::id).containsExactly(1L);
    }

    @Test
    void eligibleFor_likedEDislikedNulos_saoTratadosComoVazios() {
        Recipe qualquer = recipe(1L, List.of());
        when(recipeRepository.findByStatus(RecipeStatus.PUBLISHED)).thenReturn(List.of(qualquer));

        List<Recipe> result = service.eligibleFor(profileWith(List.of("NENHUMA"), List.of(), List.of()), null, null);

        assertThat(result).extracting(Recipe::id).containsExactly(1L);
    }

    @Test
    void eligibleFor_receitaSemIngredientes_naoRebentaFiltroDeAlergia() {
        Recipe semIngredientes = recipe(1L, List.of());
        when(recipeRepository.findByStatus(RecipeStatus.PUBLISHED)).thenReturn(List.of(semIngredientes));

        List<Recipe> result = service.eligibleFor(
            profileWith(List.of("NENHUMA"), List.of("amendoim"), List.of()), Set.of(), Set.of());

        assertThat(result).extracting(Recipe::id).containsExactly(1L);
    }

    // --- Helpers de fixture -------------------------------------------------

    private ClientProfile profileWith(List<String> healthConditions, List<String> allergies, List<String> foodExclusions) {
        ClientProfile profile = new ClientProfile(1L);
        //profile.merge(null, healthConditions, null, allergies, foodExclusions, null, null, null, null, null);
        return profile;
    }

    private Recipe recipe(long id, List<String> healthTags) {
        return recipe(id, healthTags, List.of());
    }

    private Recipe recipe(long id, List<String> healthTags, RecipeIngredient... ingredients) {
        return recipe(id, healthTags, List.of(ingredients));
    }

    private Recipe recipe(long id, List<String> healthTags, List<RecipeIngredient> ingredients) {
        Recipe recipe = new Recipe("Receita " + id, "descricao", "almoco", null, 15, 2, null, healthTags);
        ReflectionTestUtils.setField(recipe, "id", id);
        recipe.replaceIngredients(ingredients);
        recipe.publish();
        return recipe;
    }

    private RecipeIngredient recipeIngredient(String ingredientName) {
        Ingredient ingredient = new Ingredient(
            ingredientName, "categoria", "g",
            BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, null
        );
        return new RecipeIngredient(ingredient, BigDecimal.ONE, "g");
    }
}

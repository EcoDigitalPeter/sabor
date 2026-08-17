package com.ottimizo.catalog;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.ottimizo.common.security.Role;
import com.ottimizo.support.AbstractIntegrationTest;
import com.ottimizo.users.AppUser;
import com.ottimizo.users.AppUserRepository;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Testa {@code GET /api/v1/me/recipes} (BE-C08, docs/plano/tasks.md; spec
 * funcional F1-CLI-08) de ponta a ponta contra um Postgres real
 * (Testcontainers, {@link AbstractIntegrationTest}) — requer Docker, ver nota
 * em {@code ProfileControllerIntegrationTest}. So um teste de integracao real
 * (nao mocks) consegue verificar as regras que vivem na query nativa de
 * {@link RecipeRepository#searchPublished}: filtro so-PUBLISHED, AND entre
 * tags e paginacao. As receitas sao semeadas directamente pelo repositorio
 * JPA (sem depender do endpoint de escrita do admin, fora do ambito deste
 * cartao).
 */
@AutoConfigureMockMvc
class ClientRecipeControllerIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private AppUserRepository users;
    @Autowired
    private RecipeRepository recipes;

    @Test
    void list_onlyPublishedRecipesAppear_draftsAreExcluded() throws Exception {
        AppUser cliente = registerClient("catalogo.published@example.com");
        seedRecipe("Frango grelhado", List.of("alta_proteina"), RecipeStatus.PUBLISHED);
        seedRecipe("Rascunho ainda em edicao", List.of("alta_proteina"), RecipeStatus.DRAFT);

        mockMvc.perform(get("/api/v1/me/recipes").with(cliente(cliente.authUserId())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.items.length()").value(1))
            .andExpect(jsonPath("$.data.items[0].name").value("Frango grelhado"));
    }

    @Test
    void list_filterByTags_requiresAllTagsSelected_isAnd() throws Exception {
        AppUser cliente = registerClient("catalogo.tags@example.com");
        seedRecipe("Salada vegan sem gluten", List.of("vegan", "sem_gluten"), RecipeStatus.PUBLISHED);
        seedRecipe("Salada so vegan", List.of("vegan"), RecipeStatus.PUBLISHED);
        seedRecipe("Bolo so sem gluten", List.of("sem_gluten"), RecipeStatus.PUBLISHED);

        mockMvc.perform(get("/api/v1/me/recipes")
                .param("tags", "vegan", "sem_gluten")
                .with(cliente(cliente.authUserId())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.items.length()").value(1))
            .andExpect(jsonPath("$.data.items[0].name").value("Salada vegan sem gluten"));
    }

    @Test
    void list_searchByName_isCaseInsensitiveContains() throws Exception {
        AppUser cliente = registerClient("catalogo.pesquisa@example.com");
        seedRecipe("Frango com arroz", List.of(), RecipeStatus.PUBLISHED);
        seedRecipe("Salada de atum", List.of(), RecipeStatus.PUBLISHED);

        mockMvc.perform(get("/api/v1/me/recipes")
                .param("q", "FRANGO")
                .with(cliente(cliente.authUserId())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.items.length()").value(1))
            .andExpect(jsonPath("$.data.items[0].name").value("Frango com arroz"));
    }

    @Test
    void list_isPaginated() throws Exception {
        AppUser cliente = registerClient("catalogo.paginacao@example.com");
        seedRecipe("Receita 1", List.of(), RecipeStatus.PUBLISHED);
        seedRecipe("Receita 2", List.of(), RecipeStatus.PUBLISHED);
        seedRecipe("Receita 3", List.of(), RecipeStatus.PUBLISHED);

        mockMvc.perform(get("/api/v1/me/recipes")
                .param("page", "0")
                .param("size", "2")
                .with(cliente(cliente.authUserId())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.items.length()").value(2))
            .andExpect(jsonPath("$.data.page").value(0))
            .andExpect(jsonPath("$.data.size").value(2))
            .andExpect(jsonPath("$.data.totalItems").value(3))
            .andExpect(jsonPath("$.data.totalPages").value(2));

        mockMvc.perform(get("/api/v1/me/recipes")
                .param("page", "1")
                .param("size", "2")
                .with(cliente(cliente.authUserId())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.items.length()").value(1));
    }

    @Test
    void list_withoutJwt_isRejected() throws Exception {
        mockMvc.perform(get("/api/v1/me/recipes"))
            .andExpect(status().isUnauthorized());
    }

    private Recipe seedRecipe(String name, List<String> healthTags, RecipeStatus status) {
        Recipe recipe = new Recipe(name, "descricao de teste", "almoco", null, 15, 2, null, healthTags);
        if (status == RecipeStatus.PUBLISHED) {
            recipe.publish();
        }
        return recipes.save(recipe);
    }

    private AppUser registerClient(String email) {
        return users.save(new AppUser(UUID.randomUUID(), "Cliente Teste", email, Role.CLIENTE));
    }

    private SecurityMockMvcRequestPostProcessors.JwtRequestPostProcessor cliente(UUID authUserId) {
        return jwt().jwt(builder -> builder
            .subject(authUserId.toString())
            .claim("role", "CLIENTE"));
    }
}

package com.ottimizo.catalog;

import com.ottimizo.common.api.ApiResponse;
import com.ottimizo.common.api.PageResponse;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Catalogo navegavel de receitas do cliente (BE-C08, docs/plano/tasks.md;
 * spec funcional F1-CLI-08). Rota gated a ROLE_CLIENTE/ROLE_ADMIN em
 * {@code SecurityConfig} ({@code /api/v1/me/**}) — qualquer utilizador
 * autenticado, sem verificacao de role adicional aqui, a semelhanca de
 * {@code ProfileController}.
 *
 * <p>Diferente do plano do cliente (que so mostra as receitas ja atribuidas):
 * aqui o cliente explora livremente o catalogo inteiro de receitas
 * {@code PUBLISHED} geridas pelo admin (F2-ADM-05), sem os pre-filtros
 * duros de saude/alergia de {@link RecipeCatalogService} — esses aplicam-se
 * so a geracao do plano por IA (BE-C02/BE-C03), nao a este ecra de
 * exploracao livre.</p>
 */
@RestController
@RequestMapping("/api/v1/me/recipes")
public class ClientRecipeController {

    private final RecipeService recipeService;

    public ClientRecipeController(RecipeService recipeService) {
        this.recipeService = recipeService;
    }

    @GetMapping
    public ApiResponse<PageResponse<RecipeCatalogItemResponse>> list(
        @RequestParam(required = false) List<String> tags,
        @RequestParam(required = false) String q,
        Pageable pageable
    ) {
        var page = recipeService.listPublished(tags, q, pageable).map(RecipeCatalogItemResponse::from);
        return ApiResponse.success(PageResponse.from(page));
    }
}

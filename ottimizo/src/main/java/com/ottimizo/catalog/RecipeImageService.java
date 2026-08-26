package com.ottimizo.catalog;

import com.ottimizo.common.error.ErrorCode;
import com.ottimizo.common.error.ServiceException;
import org.hibernate.Hibernate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.image.ImageModel;
import org.springframework.ai.image.ImagePrompt;
import org.springframework.ai.image.ImageResponse;
import org.springframework.ai.openai.OpenAiImageOptions;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Geracao de imagem de prato por IA (BE-C10). Sincrono e admin-only —
 * baixo volume (uma vez por receita), sem justificar a infra assincrona
 * ja usada em {@link com.ottimizo.plans.AiMealPlanService}.
 */
@Service
public class RecipeImageService {

    private static final Logger log = LoggerFactory.getLogger(RecipeImageService.class);

    private final RecipeRepository recipes;
    private final ImageModel imageModel;
    private final SupabaseStorageClient storageClient;
    private final RecipeImageDownloader downloader;

    public RecipeImageService(
        RecipeRepository recipes,
        ImageModel imageModel,
        SupabaseStorageClient storageClient,
        RecipeImageDownloader downloader
    ) {
        this.recipes = recipes;
        this.imageModel = imageModel;
        this.storageClient = storageClient;
        this.downloader = downloader;
    }

    @Transactional
    public Recipe generate(Long recipeId, String bearerToken) {
        Recipe recipe = recipes.findById(recipeId)
            .orElseThrow(() -> new ServiceException(ErrorCode.LSA005_NOT_FOUND));

        try {
            ImageResponse response = imageModel.call(new ImagePrompt(
                prompt(recipe),
                OpenAiImageOptions.builder().quality("medium").N(1).build()
            ));
            String generatedUrl = response.getResult().getOutput().getUrl();
            byte[] bytes = downloader.download(generatedUrl);

            String path = "receitas/%d.png".formatted(recipe.id());
            String publicUrl = storageClient.upload(bytes, path, "image/png", bearerToken);

            recipe.applyImage(publicUrl);
            recipes.save(recipe);
            // RecipeResponse.from (chamado pelo controller logo a seguir, ja
            // fora desta transaccao) toca ingredients()/steps() -- inicializa
            // aqui, mesmo padrao ja usado em RecipeService#get.
            Hibernate.initialize(recipe.ingredients());
            Hibernate.initialize(recipe.steps());
            return recipe;
        } catch (ServiceException se) {
            throw se;
        } catch (Exception ex) {
            log.warn("Falha ao gerar imagem para a receita {}: {}", recipeId, ex.toString(), ex);
            throw new ServiceException(ErrorCode.LSA025_IMAGE_GENERATION_FAILED);
        }
    }

    private String prompt(Recipe recipe) {
        return """
            Fotografia de comida, estilo editorial, luz natural, prato mocambicano: %s.
            %s
            Sem texto, sem logotipos, sem pessoas na imagem. Foco no prato servido, fundo simples.
            """.formatted(recipe.name(), recipe.description() == null ? "" : recipe.description());
    }
}

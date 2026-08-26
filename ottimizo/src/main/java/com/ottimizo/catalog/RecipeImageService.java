package com.ottimizo.catalog;

import com.ottimizo.common.error.ErrorCode;
import com.ottimizo.common.error.ServiceException;
import java.util.Base64;
import org.hibernate.Hibernate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.image.Image;
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
            byte[] bytes = extractBytes(response.getResult().getOutput());

            String path = "receitas/%d.png".formatted(recipe.id());
            String publicUrl = storageClient.upload(bytes, path, "image/png", bearerToken);

            recipe.applyImage(publicUrl);
            recipes.save(recipe);
            // RecipeResponse.from (chamado pelo controller logo a seguir, ja
            // fora desta transaccao) toca ingredients()/steps() -- inicializa
            // aqui, mesmo padrao ja usado em RecipeService#get.
            Hibernate.initialize(recipe.ingredients());
            Hibernate.initialize(recipe.steps());
            // RecipeIngredient.ingredient() e' outra proxy lazy propria --
            // mesmo gap corrigido em RecipeService#get.
            recipe.ingredients().forEach(line -> Hibernate.initialize(line.ingredient()));
            return recipe;
        } catch (ServiceException se) {
            throw se;
        } catch (Exception ex) {
            log.warn("Falha ao gerar imagem para a receita {}: {}", recipeId, ex.toString(), ex);
            throw new ServiceException(ErrorCode.LSA025_IMAGE_GENERATION_FAILED);
        }
    }

    /**
     * gpt-image-1-mini (ao contrario dos modelos DALL-E anteriores) so
     * devolve {@code b64_json}, nunca {@code url} -- confirmado em producao:
     * {@code getOutput().getUrl()} vinha sempre null, rebentando com NPE em
     * {@link HttpRecipeImageDownloader#download} ao tentar criar um URI a
     * partir de null. Preferimos o base64 (decodificado directamente, sem
     * pedido HTTP extra) e so caimos para download por URL se algum dia um
     * modelo devolver essa forma em vez da outra.
     */
    private byte[] extractBytes(Image image) {
        if (image.getB64Json() != null) {
            return Base64.getDecoder().decode(image.getB64Json());
        }
        if (image.getUrl() != null) {
            return downloader.download(image.getUrl());
        }
        throw new IllegalStateException("Resposta da IA sem b64_json nem url.");
    }

    private String prompt(Recipe recipe) {
        return """
            Fotografia de comida, estilo editorial, luz natural, prato mocambicano: %s.
            %s
            Sem texto, sem logotipos, sem pessoas na imagem. Foco no prato servido, fundo simples.
            """.formatted(recipe.name(), recipe.description() == null ? "" : recipe.description());
    }
}

package com.ottimizo.catalog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ottimizo.common.error.ErrorCode;
import com.ottimizo.common.error.ServiceException;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.ai.image.Image;
import org.springframework.ai.image.ImageGeneration;
import org.springframework.ai.image.ImageModel;
import org.springframework.ai.image.ImageResponse;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class RecipeImageServiceTest {

    @Mock private RecipeRepository recipes;
    @Mock private ImageModel imageModel;
    @Mock private SupabaseStorageClient storageClient;
    @Mock private RecipeImageDownloader downloader;

    private RecipeImageService service;

    @BeforeEach
    void setUp() {
        service = new RecipeImageService(recipes, imageModel, storageClient, downloader, "service-role-key");
    }

    private Recipe recipeWithId(long id) {
        Recipe recipe = new Recipe("Xima com matapa", "descricao", "jantar", null, 30, 2, null, List.of());
        ReflectionTestUtils.setField(recipe, "id", id);
        return recipe;
    }

    @Test
    void generate_recipeInexistente_lancaNotFound() {
        when(recipes.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.generate(1L, "token"))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA005_NOT_FOUND);
    }

    @Test
    void generate_iaFalha_lancaImageGenerationFailed() {
        Recipe recipe = recipeWithId(7L);
        when(recipes.findById(7L)).thenReturn(Optional.of(recipe));
        when(imageModel.call(any())).thenThrow(new RuntimeException("IA indisponivel"));

        assertThatThrownBy(() -> service.generate(7L, "token"))
            .isInstanceOf(ServiceException.class)
            .extracting("code")
            .isEqualTo(ErrorCode.LSA025_IMAGE_GENERATION_FAILED);
    }

    @Test
    void generate_respostaValida_persisteImageUrlNaReceita() {
        Recipe recipe = recipeWithId(9L);
        when(recipes.findById(9L)).thenReturn(Optional.of(recipe));

        Image image = new Image("https://oaidalleapiprodscus.blob.core.windows.net/fake.png", null);
        ImageResponse response = new ImageResponse(List.of(new ImageGeneration(image)));
        when(imageModel.call(any())).thenReturn(response);
        when(downloader.download("https://oaidalleapiprodscus.blob.core.windows.net/fake.png"))
            .thenReturn(new byte[]{9, 9, 9});
        when(storageClient.upload(any(), anyString(), anyString(), anyString()))
            .thenReturn("https://proj.supabase.co/storage/v1/object/public/recipe-images/receitas/9.png");

        Recipe result = service.generate(9L, "token");

        assertThat(result.imageUrl()).isEqualTo("https://proj.supabase.co/storage/v1/object/public/recipe-images/receitas/9.png");
    }

    @Test
    void ensureGenerated_receitaJaTemImagem_naoChamaIaNemStorage() {
        Recipe recipe = recipeWithId(10L);
        recipe.applyImage("https://proj.supabase.co/storage/v1/object/public/recipe-images/receitas/10.png");
        when(recipes.findById(10L)).thenReturn(Optional.of(recipe));

        Recipe result = service.ensureGenerated(10L);

        assertThat(result.imageUrl()).isEqualTo("https://proj.supabase.co/storage/v1/object/public/recipe-images/receitas/10.png");
        verify(imageModel, never()).call(any());
        verify(storageClient, never()).uploadWithServiceRole(any(), anyString(), anyString(), anyString());
    }

    @Test
    void ensureGenerated_receitaSemImagem_usaServiceRoleKey() {
        Recipe recipe = recipeWithId(11L);
        when(recipes.findById(11L)).thenReturn(Optional.of(recipe));

        Image image = new Image("https://oaidalleapiprodscus.blob.core.windows.net/fake.png", null);
        ImageResponse response = new ImageResponse(List.of(new ImageGeneration(image)));
        when(imageModel.call(any())).thenReturn(response);
        when(downloader.download("https://oaidalleapiprodscus.blob.core.windows.net/fake.png"))
            .thenReturn(new byte[]{1, 1, 1});
        when(storageClient.uploadWithServiceRole(any(), anyString(), anyString(), anyString()))
            .thenReturn("https://proj.supabase.co/storage/v1/object/public/recipe-images/receitas/11.png");

        Recipe result = service.ensureGenerated(11L);

        assertThat(result.imageUrl()).isEqualTo("https://proj.supabase.co/storage/v1/object/public/recipe-images/receitas/11.png");
        verify(storageClient).uploadWithServiceRole(any(), anyString(), anyString(), anyString());
    }
}

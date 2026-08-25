package com.ottimizo.catalog;

/**
 * Descarrega os bytes de uma imagem gerada pelo {@code ImageModel} (URL
 * temporario devolvido pela OpenAI) para persistencia propria. Interface
 * separada de {@link RecipeImageService} para ser mockavel em teste sem
 * rede real — mesmo padrao ja usado em
 * {@code com.ottimizo.users.SupabaseSessionRevoker}.
 */
public interface RecipeImageDownloader {

    byte[] download(String url);
}

package com.ottimizo.catalog;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * Upload de bytes para o Supabase Storage, autenticado com o JWT de quem
 * pediu a operacao (nunca uma service-role key — ver "Decisoes tomadas
 * neste plano" no plano de implementacao, mesma escolha ja feita para
 * {@code SupabaseSessionRevoker}).
 */
@Component
public class SupabaseStorageClient {

    private static final String BUCKET = "recipe-images";

    private final RestClient restClient;
    private final String storageBaseUrl;

    public SupabaseStorageClient(
        RestClient.Builder restClientBuilder,
        @Value("${ottimizo.supabase.storage-url}") String storageBaseUrl
    ) {
        this(restClientBuilder.build(), storageBaseUrl);
    }

    SupabaseStorageClient(RestClient restClient, String storageBaseUrl) {
        this.restClient = restClient;
        this.storageBaseUrl = storageBaseUrl;
    }

    /** @return URL publico final do objecto, pronto a guardar em {@code Recipe.imageUrl}. */
    public String upload(byte[] bytes, String path, String contentType, String bearerToken) {
        restClient.put()
            .uri("{base}/object/{bucket}/{path}", storageBaseUrl, BUCKET, path)
            .headers(headers -> {
                headers.setBearerAuth(bearerToken);
                headers.add("x-upsert", "true");
            })
            .contentType(MediaType.parseMediaType(contentType))
            .body(bytes)
            .retrieve()
            .toBodilessEntity();

        return "%s/object/public/%s/%s".formatted(storageBaseUrl, BUCKET, path);
    }
}

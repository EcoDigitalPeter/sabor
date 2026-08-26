package com.ottimizo.catalog;

import java.net.URI;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * Upload de bytes para o Supabase Storage. Operacoes pedidas directamente por
 * admin usam o JWT do chamador; operacoes internas do backend podem usar a
 * service-role key configurada, sem a expor ao frontend.
 */
@Component
public class SupabaseStorageClient {

    private static final String BUCKET = "recipe-images";

    private final RestClient restClient;
    private final String storageBaseUrl;

    @Autowired
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
        return uploadWithAuth(bytes, path, contentType, bearerToken, null);
    }

    /** @return URL publico final do objecto, pronto a guardar em {@code Recipe.imageUrl}. */
    public String uploadWithServiceRole(byte[] bytes, String path, String contentType, String serviceRoleKey) {
        return uploadWithAuth(bytes, path, contentType, serviceRoleKey, serviceRoleKey);
    }

    private String uploadWithAuth(byte[] bytes, String path, String contentType, String bearerToken, String apiKey) {
        // URI.create(...) em vez de template vars: o DefaultUriBuilderFactory do Spring
        // percent-encodeia o valor substituido em "{base}" (e as barras de "path"), partindo
        // o esquema do URL e a semantica de pastas do Supabase — nao e' so' texto literal.
        restClient.put()
            .uri(URI.create("%s/object/%s/%s".formatted(storageBaseUrl, BUCKET, path)))
            .headers(headers -> {
                headers.setBearerAuth(bearerToken);
                if (apiKey != null && !apiKey.isBlank()) {
                    headers.add("apikey", apiKey);
                }
                headers.add("x-upsert", "true");
            })
            .contentType(MediaType.parseMediaType(contentType))
            .body(bytes)
            .retrieve()
            .toBodilessEntity();

        return "%s/object/public/%s/%s".formatted(storageBaseUrl, BUCKET, path);
    }
}

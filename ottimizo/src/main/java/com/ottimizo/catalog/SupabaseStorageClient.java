package com.ottimizo.catalog;

import java.net.URI;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * Upload de bytes para o Supabase Storage, autenticado com o JWT de quem
 * pediu a operacao (nunca uma service-role key — ver "Decisoes tomadas
 * neste plano" no plano de implementacao). Mesma politica de evitar a
 * service-role key ja seguida no pacote {@code com.ottimizo.users} (ver
 * {@code SupabaseSessionRevoker}), ainda que ali a key esteja simplesmente
 * por configurar (implementacao no-op) em vez de deliberadamente evitada
 * a favor do JWT do chamador, como aqui.
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
        // URI.create(...) em vez de template vars: o DefaultUriBuilderFactory do Spring
        // percent-encodeia o valor substituido em "{base}" (e as barras de "path"), partindo
        // o esquema do URL e a semantica de pastas do Supabase — nao e' so' texto literal.
        restClient.put()
            .uri(URI.create("%s/object/%s/%s".formatted(storageBaseUrl, BUCKET, path)))
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

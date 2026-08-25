package com.ottimizo.catalog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.RETURNS_DEEP_STUBS;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

class SupabaseStorageClientTest {

    // RETURNS_DEEP_STUBS tal como no brief (Step 1) resolve `headers(Consumer<HttpHeaders>)`
    // como null — a interface fluente de RestClient tem demasiados metodos genericos para o
    // deep-stub inferir sozinho. Fallback documentado no proprio brief: stub so' o primeiro
    // salto (`put()`) com um deep-stub aninhado, e focar a asserção no contrato que importa —
    // a URL publica final devolvida por upload(...) — nao na mecanica interna do RestClient.
    @Test
    void upload_devolveUrlPublicoFinal() {
        RestClient restClient = mock(RestClient.class);
        RestClient.RequestBodyUriSpec requestSpec = mock(RestClient.RequestBodyUriSpec.class, RETURNS_DEEP_STUBS);
        when(restClient.put()).thenReturn(requestSpec);
        when(requestSpec.uri(org.mockito.ArgumentMatchers.any(java.net.URI.class))).thenReturn(requestSpec);
        when(requestSpec.headers(org.mockito.ArgumentMatchers.any())).thenReturn(requestSpec);
        when(requestSpec.contentType(org.mockito.ArgumentMatchers.any())).thenReturn(requestSpec);
        when(requestSpec.body(org.mockito.ArgumentMatchers.any(byte[].class))).thenReturn(requestSpec);
        when(requestSpec.retrieve().toBodilessEntity())
            .thenReturn(org.springframework.http.ResponseEntity.ok().build());

        SupabaseStorageClient client = new SupabaseStorageClient(restClient, "https://proj.supabase.co/storage/v1");

        String url = client.upload(new byte[]{1, 2, 3}, "receitas/42.png", "image/png", "token-jwt");

        assertThat(url).isEqualTo("https://proj.supabase.co/storage/v1/object/public/recipe-images/receitas/42.png");
    }
}

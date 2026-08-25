# Migração IA para OpenAI + Imagens de Pratos por IA — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar o provider de IA de geração de receita/plano de NVIDIA NIM para OpenAI (modelo escolhido por custo/benefício), corrigir dois gaps de fiabilidade encontrados ao testar o provider actual, e acrescentar geração de imagens de pratos por IA ao catálogo de receitas.

**Architecture:** Parte A é uma troca de configuração + dois hardening fixes em `AiMealPlanService`/`AdHocRecipeService` (mesmo `ChatClient`, endpoint/modelo diferentes). Parte B é uma feature nova e independente: um `RecipeImageService` que usa o `ImageModel` do Spring AI (mesmo starter, já no `pom.xml`) para gerar uma imagem por receita, guarda os bytes no Supabase Storage, e persiste o URL público na entidade `Recipe`. Consumida pelo admin (botão manual, síncrono) e pelo catálogo do cliente (`RecipeCatalogItemResponse.imageUrl`, que já tinha o campo previsto no Javadoc mas nunca implementado).

**Tech Stack:** Spring Boot 3.5 / Spring AI 1.1.8 (`spring-ai-starter-model-openai`, já presente), Flyway, Supabase Storage (REST, sem SDK novo), JUnit 5 + Mockito (padrão já usado em `AiMealPlanServiceTest`).

**Spec:** Não há spec formal prévia — este plano nasce de: (1) achados da sessão de testes de integração de 2026-08-25 (geração via NVIDIA falha por sobrecarga/latência do provider — ver `ottimizo/logs/ottimizo.log`, `AiMealPlanService.java:209/314`), e (2) pedido directo do utilizador nesta conversa: "vamos mudar para openAI... escolher o melhor modelo tendo em conta os custos e benefícios... não esqueça a criação de imagens dos pratos através de AI".

## Global Constraints

- Copy PT-PT pré-Acordo Ortográfico de 1990 em qualquer texto orientado ao utilizador (mensagens de erro, comentários de admin) — ver `docs/plano/06-guia-de-copy-e-marca.md`.
- Sem segredos hardcoded em `application.yml`/`application-prod.yml` — só `${VAR}` sem default de valor real (o hardcode da chave NVIDIA encontrado nesta sessão é precisamente o erro a não repetir).
- `application-prod.yml` não deve ganhar defaults — falha rápido se faltar uma env var, por desenho (ver comentário no topo do ficheiro).
- Nunca aceitar `userId`/`recipeId` de fora sem validar ownership/existência — seguir o padrão já usado em `AiMealPlanService`/`RecipeService`.
- Comentários só quando o "porquê" não é óbvio (constraint escondida, decisão não-trivial) — sem comentários a explicar o quê.
- Regenerar `levesabor-web/src/types/api.d.ts` (`npm run gen:types`, backend a correr) sempre que o contrato do backend mudar, e reconciliar à mão os campos hand-editados.

---

## Decisões tomadas neste plano (podes redireccionar antes de despachar)

| Decisão | Escolha | Porquê |
|---|---|---|
| Modelo de chat (texto) | `gpt-4.1-mini` | Não-reasoning (rápido, sem "thinking" — é exactamente o que nos rebentou com o DeepSeek da NVIDIA: 169s por chamada). Para o perfil de tokens real desta app (prompt pequeno ~660 tokens, resposta grande ~1550 tokens, medido nesta sessão), `gpt-4.1-mini` ($0.40/$1.60 por 1M) sai mais barato que `gpt-5-mini` ($0.25/$2.00) porque o output pesa mais que o input aqui. Alternativas mais baratas (`gpt-4.1-nano` $0.10/$0.40, `gpt-4o-mini` $0.15/$0.60) ficam como fallback se `gpt-4.1-mini` se mostrar caro demais em produção — a diferença é céntimos por geração de qualquer forma (~$0.003/plano mensal completo), não é o factor decisivo. |
| Modelo de imagem | `gpt-image-1-mini` | Geração é admin-triggered, uma vez por receita (catálogo pequeno, ~15-30 receitas hoje) — custo total é irrelevante em qualquer tier (`gpt-image-1.5` custaria à volta de $0.01-$0.13/imagem vs `gpt-image-1-mini`, uma fracção disso). Escolhido pela combinação custo+velocidade; fica configurável por env var (`OPENAI_IMAGE_MODEL`) para trocar para `gpt-image-1.5` sem redeploy de código se a qualidade visual não for suficiente. |
| Armazenamento da imagem | Supabase Storage, bucket `recipe-images`, upload autenticado com o JWT do próprio admin que pediu a geração | Evita reabrir a decisão de segurança já adiada em `SupabaseSessionRevoker` (chave service-role "ainda não está configurada/decidida"). Usa exactamente o mesmo padrão de autenticação (JWT do pedido) que todo o resto da app já usa contra o Supabase — sem segredo novo. Custo: um passo manual na dashboard Supabase (criar bucket + policy RLS `INSERT`/`UPDATE` para `role = 'ADMIN'`), documentado na Task B1. |
| Disparo da geração de imagem | Botão manual no admin, síncrono (`POST /admin/recipes/{id}/image`, a app espera a resposta) | Baixa frequência (uma vez por receita, geridas pelo admin), evita construir infra de polling assíncrono (como o `MealGeneration`/`AdHocRecipeRequest`) só para isto. ~10-20s de espera é aceitável numa acção administrativa pontual. |

---

## File Structure

**Parte A — troca de provider:**
- Modify: `ottimizo/src/main/resources/application.yml` — base-url/modelo por omissão, comentários actualizados
- Modify: `ottimizo/src/main/java/com/ottimizo/plans/AiMealPlanService.java` — structured output + logging do erro real
- Modify: `ottimizo/src/main/java/com/ottimizo/plans/AdHocRecipeService.java` — idem
- Modify: `ottimizo/src/test/java/com/ottimizo/plans/AiMealPlanServiceTest.java` — ajustar mocks à nova chamada
- Modify: `ottimizo/src/test/java/com/ottimizo/plans/AdHocRecipeServiceTest.java` — idem

**Parte B — imagens de pratos:**
- Create: `ottimizo/src/main/resources/db/migration/V007__recipe_image_url.sql`
- Modify: `ottimizo/src/main/java/com/ottimizo/catalog/Recipe.java` — campo `imageUrl`
- Modify: `ottimizo/src/main/java/com/ottimizo/catalog/RecipeResponse.java`, `RecipeSummaryResponse.java`, `RecipeCatalogItemResponse.java` — expor `imageUrl`
- Modify: `ottimizo/src/main/java/com/ottimizo/catalog/RecipeSnapshotFactory.java` — incluir `imageUrl` no snapshot (plano/adhoc herdam automaticamente)
- Create: `ottimizo/src/main/java/com/ottimizo/catalog/SupabaseStorageClient.java` — upload de bytes para o Storage
- Create: `ottimizo/src/main/java/com/ottimizo/catalog/RecipeImageDownloader.java` + `HttpRecipeImageDownloader.java` — descarrega os bytes da imagem gerada (interface mockável, mesmo padrão de `SupabaseSessionRevoker`)
- Create: `ottimizo/src/main/java/com/ottimizo/catalog/RecipeImageService.java` — orquestra prompt + `ImageModel` + upload + persistência
- Modify: `ottimizo/src/main/java/com/ottimizo/catalog/AdminRecipeController.java` — endpoint `POST /{id}/image`
- Modify: `ottimizo/src/main/java/com/ottimizo/common/error/ErrorCode.java` — `LSA025_IMAGE_GENERATION_FAILED`
- Create: `ottimizo/src/test/java/com/ottimizo/catalog/RecipeImageServiceTest.java`
- Modify: `levesabor-web/src/types/api.d.ts` — `imageUrl` em `RecipeCatalogItem`/`RecipeSnapshot` (via `gen:types` + reconciliação manual)
- Modify: `levesabor-web/src/data/recipe-photos.ts` — vira fallback só (prioridade ao `imageUrl` real vindo da API)

---

## PARTE A — Migração NVIDIA → OpenAI

### Task A1: Trocar configuração do provider

**Files:**
- Modify: `ottimizo/src/main/resources/application.yml:31-45`

**Interfaces:**
- Consumes: nada (config pura)
- Produces: `ChatClient.Builder` autoconfigurado pelo Spring AI aponta para a OpenAI real; env vars `OPENAI_BASE_URL` (agora opcional — omitir usa o endpoint oficial), `OPENAI_API_KEY` (obrigatória, sem default), `OPENAI_CHAT_MODEL` (default `gpt-4.1-mini`)

- [ ] **Step 1: Editar `application.yml`**

Substituir o bloco `spring.ai.openai` (linhas 31-45) por:

```yaml
  ai:
    openai:
      # Endpoint oficial da OpenAI por omissao. OPENAI_BASE_URL so' e' preciso
      # se um dia se voltar a apontar para um endpoint compativel alternativo
      # (ja' foi usado NVIDIA NIM nesta app — descontinuado por latencia
      # inaceitavel: ~170s por geracao de plano mensal, contra o SLA
      # implicito de poucas dezenas de segundos que o MAX_ATTEMPTS=3 sem
      # backoff do AiMealPlanService assume).
      base-url: ${OPENAI_BASE_URL:https://api.openai.com}
      api-key: ${OPENAI_API_KEY}
      chat:
        options:
          model: ${OPENAI_CHAT_MODEL:gpt-4.1-mini}
          temperature: 0.2
      image:
        options:
          model: ${OPENAI_IMAGE_MODEL:gpt-image-1-mini}
```

Nota: `api-key` sem default — falha rápido no arranque se `OPENAI_API_KEY` não estiver definida, em vez de cair silenciosamente para uma chave errada/de terceiros (era exactamente o problema do hardcode anterior).

- [ ] **Step 2: Confirmar que `application-prod.yml` não precisa de alteração**

Já não define `spring.ai.openai.*` (herda de `application.yml`), continua correcto sem mudanças.

- [ ] **Step 3: Exportar a variável e arrancar o backend localmente**

```bash
export OPENAI_API_KEY=sk-...   # chave real da OpenAI, do Peter
cd ottimizo && mvn spring-boot:run -Dspring.profiles.active=prod
```

Confirmar no log: `Started OttimizoApplication` sem erro de bean `OpenAiChatModel`/`OpenAiImageModel`.

- [ ] **Step 4: Commit**

```bash
git add ottimizo/src/main/resources/application.yml
git commit -m "chore(ottimizo): migra provider de IA de NVIDIA NIM para OpenAI"
```

---

### Task A2: Structured Outputs — eliminar falhas silenciosas de JSON inválido (plano mensal)

**Contexto do achado:** nesta sessão, a geração #15 (via NVIDIA) falhou sem qualquer linha de log — nem o WARN do `SpringAiRetryAutoConfiguration` (que só dispara em erro HTTP, ex. 529) nem nada do lado da app, porque o `catch (Exception ex) {}` em `requestAssignmentFromAi` (linha ~319) descarta a excepção sem log quando o JSON devolvido pela IA não é estruturalmente válido. `response_format: json_schema` (Structured Outputs) da OpenAI resolve a causa (a API garante a forma do JSON, não é só "pedido educadamente" no prompt) — isto substitui a validação best-effort actual.

**Files:**
- Modify: `ottimizo/src/main/java/com/ottimizo/plans/AiMealPlanService.java:300-330`
- Modify: `ottimizo/src/test/java/com/ottimizo/plans/AiMealPlanServiceTest.java`

**Interfaces:**
- Consumes: `ChatClient` (já injectado, sem mudança de construtor)
- Produces: `requestAssignmentFromAi(...)` mantém a mesma assinatura e tipo de retorno (`Map<Integer, Map<MealSlot, Long>>`) — nenhum consumidor fora desta classe é afectado

- [ ] **Step 1: Ler o método actual para confirmar as linhas exactas**

`AiMealPlanService.java`, método `requestAssignmentFromAi` (por volta da linha 302-330 no ficheiro actual).

- [ ] **Step 2: Adicionar o schema JSON e o response format à chamada**

```java
private static final String MEAL_PLAN_JSON_SCHEMA = """
    {
      "type": "object",
      "properties": {
        "days": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "day": {"type": "integer"},
              "meals": {
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "mealSlot": {"type": "string"},
                    "recipeId": {"type": "integer"}
                  },
                  "required": ["mealSlot", "recipeId"],
                  "additionalProperties": false
                }
              }
            },
            "required": ["day", "meals"],
            "additionalProperties": false
          }
        }
      },
      "required": ["days"],
      "additionalProperties": false
    }
    """;
```

Alterar o corpo do loop em `requestAssignmentFromAi` para passar as opções com `responseFormat`:

```java
for (int attempt = 1; attempt <= MAX_ATTEMPTS && aiPlan == null; attempt++) {
    try {
        String answer = chatClient.prompt()
            .system(systemPrompt())
            .user(userPrompt(profile, eligible, days, slots))
            .options(org.springframework.ai.openai.OpenAiChatOptions.builder()
                .responseFormat(new org.springframework.ai.openai.api.ResponseFormat(
                    org.springframework.ai.openai.api.ResponseFormat.Type.JSON_SCHEMA,
                    org.springframework.ai.openai.api.ResponseFormat.JsonSchema.builder()
                        .name("meal_plan")
                        .schema(MEAL_PLAN_JSON_SCHEMA)
                        .strict(true)
                        .build()
                ))
                .build())
            .call()
            .content();
        JsonNode parsed = objectMapper.readTree(answer);
        if (isStructurallyValid(parsed)) {
            aiPlan = parsed;
        }
    } catch (Exception ex) {
        log.warn("Tentativa {} de geracao de plano falhou: {}", attempt, ex.toString());
    }
}
```

(A assinatura exacta de `ResponseFormat`/`JsonSchema` no Spring AI 1.1.8 pode variar ligeiramente da API `builder()` acima — confirmar contra `org.springframework.ai.openai.api.ResponseFormat` no classpath resolvido pelo Maven antes de compilar; se o builder não existir tal como escrito, a alternativa é passar o schema como `Map<String,Object>` via `OpenAiApi.ResponseFormat` de baixo nível. Este é o único ponto do plano com incerteza de API — resolver por compilação, não por suposição.)

- [ ] **Step 3: Adicionar um `Logger` à classe (se ainda não existir)**

No topo de `AiMealPlanService.java`:

```java
private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(AiMealPlanService.class);
```

- [ ] **Step 4: Actualizar `AiMealPlanServiceTest` para o novo `.options(...)` na chain mockada**

Os testes existentes (`generateAsync_respostaValida_...`, `generateAsync_iaEsgotaTentativas_...`, `generateAsync_recipeIdAlucinado_...`) fazem `when(requestSpec.call())` directamente depois de `.user(...)`. Com `.options(...)` a entrar no meio da chain, adicionar em cada teste que chama `chatClient.prompt()`:

```java
when(requestSpec.options(org.mockito.ArgumentMatchers.any(org.springframework.ai.chat.prompt.ChatOptions.class))).thenReturn(requestSpec);
```

Colocar esta linha junto às outras `when(requestSpec....).thenReturn(requestSpec)` já existentes em cada teste (seguir o padrão actual — os `when()` de `system`/`user`/`call` já estão por teste, não no `setUp()`, por isso replicar aí).

- [ ] **Step 5: Correr os testes**

```bash
cd ottimizo && mvn test -Dtest=AiMealPlanServiceTest
```

Esperado: os 6 testes existentes continuam a passar.

- [ ] **Step 6: Commit**

```bash
git add ottimizo/src/main/java/com/ottimizo/plans/AiMealPlanService.java ottimizo/src/test/java/com/ottimizo/plans/AiMealPlanServiceTest.java
git commit -m "fix(ottimizo): structured outputs + log de erro real na geracao de plano"
```

---

### Task A3: Mesmo tratamento em `AdHocRecipeService`

**Files:**
- Modify: `ottimizo/src/main/java/com/ottimizo/plans/AdHocRecipeService.java`
- Modify: `ottimizo/src/test/java/com/ottimizo/plans/AdHocRecipeServiceTest.java`

**Interfaces:**
- Consumes: mesmo `ChatClient` já injectado
- Produces: mesma assinatura pública, sem mudança de contrato

- [ ] **Step 1: Ler `AdHocRecipeService.java` para localizar o equivalente do loop de tentativas**

(Mesma estrutura de `AiMealPlanService` — confirmar `MAX_ATTEMPTS`/catch silencioso antes de editar; o ficheiro não foi lido nesta sessão de planeamento, só o teste correspondente.)

- [ ] **Step 2: Aplicar o mesmo padrão de Structured Outputs + log**, com um `JSON_SCHEMA` próprio para a forma de uma receita avulsa (nome/ingredientes/passos — replicar a forma exacta que `AdHocRecipeService` já espera de volta da IA hoje, não inventar uma nova).

- [ ] **Step 3: Adicionar `Logger` (mesmo padrão da Task A2, Step 3)**

- [ ] **Step 4: Ajustar `AdHocRecipeServiceTest`** com o mesmo `when(requestSpec.options(any())).thenReturn(requestSpec)` nos testes que mockam a chain do `ChatClient`.

- [ ] **Step 5: Correr os testes**

```bash
cd ottimizo && mvn test -Dtest=AdHocRecipeServiceTest
```

- [ ] **Step 6: Commit**

```bash
git add ottimizo/src/main/java/com/ottimizo/plans/AdHocRecipeService.java ottimizo/src/test/java/com/ottimizo/plans/AdHocRecipeServiceTest.java
git commit -m "fix(ottimizo): structured outputs + log de erro real na receita avulsa"
```

---

### Task A4: Teste manual contra o backend real (fecha o ciclo desta sessão)

**Files:** nenhum (validação, sem código novo)

- [ ] **Step 1: Arrancar o backend com `OPENAI_API_KEY` real** (Task A1, Step 3)

- [ ] **Step 2: Login e gerar plano**

```bash
TOKEN=$(curl -s -X POST "https://fdbgtfafynvteakamkuf.supabase.co/auth/v1/token?grant_type=password" \
  -H "apikey: sb_publishable_FZgyFl-JT1I2weI5XVa4EA_D5IyYKl4" -H "Content-Type: application/json" \
  -d '{"email":"teste.integracao.1787308566098@gmail.com","password":"Teste12345"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")
curl -s -i -X POST http://localhost:8080/api/v1/me/meal-plans -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{}'
```

- [ ] **Step 3: Poll até `READY` ou `FAILED`** (`GET /api/v1/me/meal-plans/{id}`, esperar bem menos que os 169s vistos com a NVIDIA — `gpt-4.1-mini` não é modelo de raciocínio)

- [ ] **Step 4: Se `FAILED`, confirmar que agora existe uma linha de log com a causa real** (`ottimizo/logs/ottimizo.log`, `grep AiMealPlanService`) — é o teste directo de que a Task A2 resolveu a lacuna de observabilidade encontrada nesta sessão.

- [ ] **Step 5: Repetir para `POST /api/v1/me/recipes/adhoc`** com `{"mealSlot":"ALMOCO"}`.

---

## PARTE B — Imagens de pratos por IA

### Task B1: Migração + bucket Supabase Storage

**Files:**
- Create: `ottimizo/src/main/resources/db/migration/V007__recipe_image_url.sql`

**Interfaces:**
- Produces: coluna `recipes.image_url text null` — consumida pela Task B2

- [ ] **Step 1: Escrever a migração**

```sql
-- V007: URL da imagem do prato (gerada por IA, BE-C10/imagens-de-pratos).
alter table public.recipes
    add column if not exists image_url text;
```

- [ ] **Step 2: Passo manual na dashboard Supabase (uma vez, projecto de dev e depois prod)**

1. Storage → New bucket → nome `recipe-images`, público para leitura (as imagens são conteúdo de catálogo, não sensível).
2. Storage → `recipe-images` → Policies → nova policy de `INSERT` e `UPDATE`: `(auth.jwt() ->> 'role') = 'ADMIN'` — mesma claim `role` já emitida pelo `custom_access_token_hook` da migração V006, reutilizada sem segredo novo.
3. Confirmar em `Project Settings → API` o valor de `SUPABASE_URL` (mesmo projecto já usado por `SUPABASE_JWKS_URI`/`SUPABASE_JWT_ISSUER`) — vai ser preciso como env var `SUPABASE_STORAGE_URL` na Task B4 (formato `${SUPABASE_URL}/storage/v1`).

- [ ] **Step 3: Arrancar o backend e confirmar que o Flyway aplicou V007**

```bash
cd ottimizo && mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

Log esperado: `Migrating schema "public" to version "007 - recipe image url"`.

- [ ] **Step 4: Commit**

```bash
git add ottimizo/src/main/resources/db/migration/V007__recipe_image_url.sql
git commit -m "feat(ottimizo): adiciona coluna image_url a recipes (V007)"
```

---

### Task B2: Campo `imageUrl` na entidade `Recipe`

**Files:**
- Modify: `ottimizo/src/main/java/com/ottimizo/catalog/Recipe.java`

**Interfaces:**
- Produces: `Recipe.imageUrl()` (getter), `Recipe.applyImage(String url)` (setter controlado) — consumidos pelas Tasks B3 e B4

- [ ] **Step 1: Adicionar o campo, depois de `healthNote` (linha ~42)**

```java
@Column(name = "image_url")
private String imageUrl;
```

- [ ] **Step 2: Adicionar o getter**, junto aos outros getters (depois de `healthNote()`, linha ~217):

```java
public String imageUrl() {
    return imageUrl;
}
```

- [ ] **Step 3: Adicionar o setter controlado**, junto a `publish()`/`unpublish()` (linha ~179):

```java
/** Chamado por {@link RecipeImageService} depois do upload para o Storage ter sucesso. */
public void applyImage(String url) {
    this.imageUrl = url;
}
```

- [ ] **Step 4: Compilar**

```bash
cd ottimizo && mvn compile
```

- [ ] **Step 5: Commit**

```bash
git add ottimizo/src/main/java/com/ottimizo/catalog/Recipe.java
git commit -m "feat(ottimizo): campo imageUrl na entidade Recipe"
```

---

### Task B3: Expor `imageUrl` nos DTOs de leitura

**Files:**
- Modify: `ottimizo/src/main/java/com/ottimizo/catalog/RecipeResponse.java`
- Modify: `ottimizo/src/main/java/com/ottimizo/catalog/RecipeSummaryResponse.java`
- Modify: `ottimizo/src/main/java/com/ottimizo/catalog/RecipeCatalogItemResponse.java`
- Modify: `ottimizo/src/main/java/com/ottimizo/catalog/RecipeSnapshotFactory.java`

**Interfaces:**
- Consumes: `Recipe.imageUrl()` (Task B2)
- Produces: campo `imageUrl` no JSON de `GET /admin/recipes`, `GET /admin/recipes/{id}`, `GET /me/recipes`, e no `RecipeSnapshot` gravado em `MealPlanEntry`/`AdHocRecipeRequest` (herdado automaticamente por quem já usa `RecipeSnapshotFactory.from(...)`, sem mudança adicional nesses consumidores)

- [ ] **Step 1: `RecipeResponse.java`** — adicionar `String imageUrl` ao record (depois de `healthNote`) e `recipe.imageUrl()` na chamada de `from(...)` na mesma posição.

- [ ] **Step 2: `RecipeSummaryResponse.java`** — mesmo padrão: campo `imageUrl` + `recipe.imageUrl()` em `from(...)`.

- [ ] **Step 3: `RecipeCatalogItemResponse.java`** — mesmo padrão. Este é o DTO cujo Javadoc já dizia "cartão com nome/**foto**/kcal/tempo" sem nunca ter o campo — fecha essa lacuna.

- [ ] **Step 4: `RecipeSnapshotFactory.java`** — no método `from(Recipe recipe)`, depois de `node.put("name", recipe.name())`:

```java
if (recipe.imageUrl() != null) {
    node.put("imageUrl", recipe.imageUrl());
}
```

- [ ] **Step 5: Compilar**

```bash
cd ottimizo && mvn compile
```

- [ ] **Step 6: Commit**

```bash
git add ottimizo/src/main/java/com/ottimizo/catalog/RecipeResponse.java ottimizo/src/main/java/com/ottimizo/catalog/RecipeSummaryResponse.java ottimizo/src/main/java/com/ottimizo/catalog/RecipeCatalogItemResponse.java ottimizo/src/main/java/com/ottimizo/catalog/RecipeSnapshotFactory.java
git commit -m "feat(ottimizo): expoe imageUrl nos DTOs de receita e no snapshot"
```

---

### Task B4: `SupabaseStorageClient` — upload de bytes

**Files:**
- Create: `ottimizo/src/main/java/com/ottimizo/catalog/SupabaseStorageClient.java`
- Test: `ottimizo/src/test/java/com/ottimizo/catalog/SupabaseStorageClientTest.java`

**Interfaces:**
- Consumes: `RestClient` (bean padrão do Spring Boot, sem configuração extra necessária), property `ottimizo.supabase.storage-url` (`${SUPABASE_STORAGE_URL:...}`), bucket fixo `recipe-images`
- Produces: `String upload(byte[] bytes, String path, String contentType, String bearerToken)` → URL público final. Consumido pela Task B5 (`RecipeImageService`).

- [ ] **Step 1: Escrever o teste**

```java
package com.ottimizo.catalog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

class SupabaseStorageClientTest {

    @Test
    void upload_devolveUrlPublicoFinal() {
        RestClient restClient = mock(RestClient.class, org.mockito.Mockito.RETURNS_DEEP_STUBS);
        when(restClient.put()
            .uri(any(String.class), any(), any(), any())
            .headers(any())
            .contentType(any())
            .body((byte[]) any())
            .retrieve()
            .toBodilessEntity())
            .thenReturn(org.springframework.http.ResponseEntity.ok().build());

        SupabaseStorageClient client = new SupabaseStorageClient(restClient, "https://proj.supabase.co/storage/v1");

        String url = client.upload(new byte[]{1, 2, 3}, "receitas/42.png", "image/png", "token-jwt");

        assertThat(url).isEqualTo("https://proj.supabase.co/storage/v1/object/public/recipe-images/receitas/42.png");
    }
}
```

Nota: `RestClient` mockado com `RETURNS_DEEP_STUBS` é frágil ao stubar `uri(...)` com args exactos — se este `when(...)` não colar tal como escrito, simplificar para `when(restClient.put()).thenReturn(mock(RestClient.RequestBodyUriSpec.class, RETURNS_DEEP_STUBS))` e focar a asserção só no valor de retorno de `upload(...)`, que é o contrato que importa (o teste serve para fixar a URL final construída, não a mecânica interna do `RestClient`).

- [ ] **Step 2: Correr o teste para confirmar que falha** (`SupabaseStorageClient` ainda não existe)

```bash
cd ottimizo && mvn test -Dtest=SupabaseStorageClientTest
```

Esperado: FAIL, `cannot find symbol: class SupabaseStorageClient`.

- [ ] **Step 3: Implementar**

```java
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
```

(Construtor de dois níveis — o público injectado pelo Spring, o pacote-privado usado directamente pelo teste — evita mockar `RestClient.Builder` só para chegar ao `RestClient`.)

- [ ] **Step 4: Adicionar a property em `application.yml`**

```yaml
ottimizo:
  supabase:
    storage-url: ${SUPABASE_STORAGE_URL:http://localhost/storage/v1}
```

(default localhost inofensivo para dev/test, tal como os outros defaults de `application.yml`; `application-prod.yml` não precisa de override porque a variável já vem definida no ambiente de deploy.)

- [ ] **Step 5: Correr os testes**

```bash
cd ottimizo && mvn test -Dtest=SupabaseStorageClientTest
```

- [ ] **Step 6: Commit**

```bash
git add ottimizo/src/main/java/com/ottimizo/catalog/SupabaseStorageClient.java ottimizo/src/test/java/com/ottimizo/catalog/SupabaseStorageClientTest.java ottimizo/src/main/resources/application.yml
git commit -m "feat(ottimizo): SupabaseStorageClient para upload de imagens de receitas"
```

---

### Task B5: `RecipeImageService` + endpoint admin

**Files:**
- Create: `ottimizo/src/main/java/com/ottimizo/catalog/RecipeImageDownloader.java` (interface)
- Create: `ottimizo/src/main/java/com/ottimizo/catalog/HttpRecipeImageDownloader.java` (implementação real)
- Create: `ottimizo/src/main/java/com/ottimizo/catalog/RecipeImageService.java`
- Test: `ottimizo/src/test/java/com/ottimizo/catalog/RecipeImageServiceTest.java`
- Modify: `ottimizo/src/main/java/com/ottimizo/catalog/AdminRecipeController.java`
- Modify: `ottimizo/src/main/java/com/ottimizo/common/error/ErrorCode.java`

**Interfaces:**
- Consumes: `ImageModel` (Spring AI, autoconfigurado pelo `spring-ai-starter-model-openai` já no `pom.xml` — mesma dependência da Task A1, nenhuma nova), `SupabaseStorageClient.upload(...)` (Task B4), `Recipe.applyImage(...)` (Task B2)
- Produces: `RecipeImageService.generate(Long recipeId, String bearerToken) -> Recipe` (recipe actualizada, já com `imageUrl`); `RecipeImageDownloader.download(String url) -> byte[]`

**Ruling (pré-flight, controlador):** a primeira versão deste plano injectava `HttpClient` directamente em `RecipeImageService` e testava `generate(...)` de ponta a ponta — isso faria o teste `generate_respostaValida_...` abrir uma ligação de rede real contra um URL falso e falhar sempre. Corrigido extraindo o download para uma interface `RecipeImageDownloader`, mesmo padrão já usado neste código para `SupabaseSessionRevoker` (troca de implementação real por uma mockável em teste, sem tocar no service). Custo se esta ruling estiver errada: uma interface a mais para uma única implementação real — trivial de colapsar depois se não compensar.

- [ ] **Step 1: Adicionar o código de erro**

Em `ErrorCode.java`, depois de `LSA024_STORE_IN_USE` (linha 27):

```java
LSA025_IMAGE_GENERATION_FAILED(HttpStatus.BAD_GATEWAY, "Nao foi possivel gerar a imagem. Tenta novamente."),
```

- [ ] **Step 2: Escrever o teste do service**

```java
package com.ottimizo.catalog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
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
        service = new RecipeImageService(recipes, imageModel, storageClient, downloader);
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
}
```

- [ ] **Step 3: Correr o teste para confirmar que falha**

```bash
cd ottimizo && mvn test -Dtest=RecipeImageServiceTest
```

Esperado: FAIL, `RecipeImageService`/`RecipeImageDownloader` não existem.

- [ ] **Step 4: Implementar a interface `RecipeImageDownloader`**

```java
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
```

- [ ] **Step 5: Implementar `HttpRecipeImageDownloader`**

```java
package com.ottimizo.catalog;

import com.ottimizo.common.error.ErrorCode;
import com.ottimizo.common.error.ServiceException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import org.springframework.stereotype.Component;

@Component
public class HttpRecipeImageDownloader implements RecipeImageDownloader {

    private final HttpClient httpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(30))
        .build();

    @Override
    public byte[] download(String url) {
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(url)).GET().build();
            HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());
            if (response.statusCode() != 200) {
                throw new ServiceException(ErrorCode.LSA025_IMAGE_GENERATION_FAILED);
            }
            return response.body();
        } catch (java.io.IOException | InterruptedException ex) {
            throw new ServiceException(ErrorCode.LSA025_IMAGE_GENERATION_FAILED);
        }
    }
}
```

- [ ] **Step 6: Implementar `RecipeImageService`**

```java
package com.ottimizo.catalog;

import com.ottimizo.common.error.ErrorCode;
import com.ottimizo.common.error.ServiceException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.image.ImageModel;
import org.springframework.ai.image.ImagePrompt;
import org.springframework.ai.image.ImageResponse;
import org.springframework.ai.openai.OpenAiImageOptions;
import org.springframework.stereotype.Service;

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

    public Recipe generate(Long recipeId, String bearerToken) {
        Recipe recipe = recipes.findById(recipeId)
            .orElseThrow(() -> new ServiceException(ErrorCode.LSA005_NOT_FOUND));

        try {
            ImageResponse response = imageModel.call(new ImagePrompt(
                prompt(recipe),
                OpenAiImageOptions.builder().quality("standard").N(1).build()
            ));
            String generatedUrl = response.getResult().getOutput().getUrl();
            byte[] bytes = downloader.download(generatedUrl);

            String path = "receitas/%d.png".formatted(recipe.id());
            String publicUrl = storageClient.upload(bytes, path, "image/png", bearerToken);

            recipe.applyImage(publicUrl);
            recipes.save(recipe);
            return recipe;
        } catch (ServiceException se) {
            throw se;
        } catch (Exception ex) {
            log.warn("Falha ao gerar imagem para a receita {}: {}", recipeId, ex.toString());
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
```

- [ ] **Step 7: Endpoint no `AdminRecipeController`**

Depois de `swapReasons` (linha ~57):

```java
@PostMapping("/{id}/image")
public ApiResponse<RecipeResponse> generateImage(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
    Recipe recipe = recipeImageService.generate(id, jwt.getTokenValue());
    return ApiResponse.success(RecipeResponse.from(recipe));
}
```

Injectar `RecipeImageService recipeImageService` no construtor do controller (mesmo padrão de `recipeService`/`userContext`).

- [ ] **Step 8: Correr os testes**

```bash
cd ottimizo && mvn test -Dtest=RecipeImageServiceTest
mvn compile
```

- [ ] **Step 9: Commit**

```bash
git add ottimizo/src/main/java/com/ottimizo/catalog/RecipeImageDownloader.java ottimizo/src/main/java/com/ottimizo/catalog/HttpRecipeImageDownloader.java ottimizo/src/main/java/com/ottimizo/catalog/RecipeImageService.java ottimizo/src/test/java/com/ottimizo/catalog/RecipeImageServiceTest.java ottimizo/src/main/java/com/ottimizo/catalog/AdminRecipeController.java ottimizo/src/main/java/com/ottimizo/common/error/ErrorCode.java
git commit -m "feat(ottimizo): geracao de imagem de prato por IA (POST /admin/recipes/{id}/image)"
```

---

### Task B6: Teste manual contra o backend real

**Files:** nenhum (validação)

- [ ] **Step 1: Com o backend a correr (`OPENAI_API_KEY` real, Storage já configurado na Task B1)**, login como admin e chamar:

```bash
curl -s -i -X POST http://localhost:8080/api/v1/admin/recipes/1/image -H "Authorization: Bearer $ADMIN_TOKEN"
```

- [ ] **Step 2: Confirmar `imageUrl` na resposta e que a imagem abre num browser** (URL público do bucket).

- [ ] **Step 3: Confirmar que `GET /api/v1/me/recipes` já devolve `imageUrl` para essa receita** (Task B3 propagou correctamente).

---

### Task B7: Frontend — consumir `imageUrl` real com fallback

**Files:**
- Modify: `levesabor-web/src/types/api.d.ts`
- Modify: `levesabor-web/src/data/recipe-photos.ts`

**Interfaces:**
- Consumes: `imageUrl?: string` em `RecipeCatalogItem`/`RecipeSnapshot` (contrato gerado pela Task B3)
- Produces: `getRecipePhoto(recipeId, apiImageUrl?)` — prioridade ao `imageUrl` da API, fallback para o mapa estático actual

- [ ] **Step 1: Regenerar o contrato** (backend a correr com as mudanças da Parte B)

```bash
cd levesabor/levesabor-web && npm run gen:types
```

- [ ] **Step 2: Reconciliar `api.d.ts` à mão** — confirmar que `imageUrl?: string` apareceu em `RecipeCatalogItem` e em `RecipeSnapshot`; se o gerador produziu nomes diferentes dos hand-edits já existentes no ficheiro, alinhar manualmente (seguir o aviso já presente no `CLAUDE.md` do projecto sobre reconciliação manual pós-`gen:types`).

- [ ] **Step 3: Actualizar `getRecipePhoto` em `recipe-photos.ts`**

```typescript
export function getRecipePhoto(recipeId: number | undefined, apiImageUrl?: string | null): string | undefined {
  if (apiImageUrl) {
    return apiImageUrl;
  }
  return recipeId !== undefined ? RECIPE_PHOTOS[recipeId] : undefined;
}
```

- [ ] **Step 4: Actualizar os call-sites de `getRecipePhoto`** (`grep -rn "getRecipePhoto" levesabor/levesabor-web/src`) para passarem `recipe.imageUrl` quando o objecto de receita já vier da API real (não do mock) — cada call-site precisa de ser lido individualmente antes de editar, não há um padrão único garantido em todos.

- [ ] **Step 5: Correr o dev server e confirmar visualmente** que uma receita com `imageUrl` real mostra a imagem gerada, e uma sem (ainda não gerada pelo admin) cai no fallback estático ou no placeholder já existente.

```bash
cd levesabor/levesabor-web && npm run dev
```

- [ ] **Step 6: Commit**

```bash
git add levesabor/levesabor-web/src/types/api.d.ts levesabor/levesabor-web/src/data/recipe-photos.ts
git commit -m "feat(levesabor-web): consome imageUrl real da API com fallback para fotos estaticas"
```

---

## Self-Review

**Cobertura do pedido do utilizador:**
- "mudar para openAI" → Parte A (Tasks A1-A4).
- "escolher o melhor modelo tendo em conta os custos e benefícios" → tabela de decisões, com números reais de `developers.openai.com/api/docs/pricing` (consultado nesta sessão) e o racional específico ao perfil de tokens desta app.
- "não esqueça a criação de imagens dos pratos através de AI" → Parte B completa (Tasks B1-B7), incluindo o gap já existente no código (`RecipeCatalogItemResponse` já previa "foto" no Javadoc sem nunca a implementar).
- "faça um plano... e me apresente" → este documento, sem execução ainda.

**Placeholders:** nenhum "TBD"/"implementar depois" — os dois pontos assinalados como incertos (assinatura exacta do builder `ResponseFormat` na Task A2; extracção do download testável na Task B5) têm alternativa concreta indicada, não são placeholders vazios — refletem incerteza real de API que só se resolve compilando contra o Spring AI 1.1.8 real.

**Consistência de tipos:** `Recipe.imageUrl()`/`applyImage(String)` (Task B2) usados de forma consistente em B3/B4/B5. `SupabaseStorageClient.upload(byte[], String, String, String)` com a mesma assinatura entre a Task B4 (definição) e a B5 (uso). `RecipeImageService.generate(Long, String)` consistente entre teste (B5 Step 2) e controller (B5 Step 6).

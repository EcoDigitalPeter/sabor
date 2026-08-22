# Checklist — Domínio do backend e integração frontend↔backend (INT-01)

> Gerado a partir da sessão de 2026-08-19: implementação de `BE-C08`/`BE-E01`, auditoria completa
> do backend real, e arranque local do `ottimizo/` pela primeira vez fora de testes. Serve para
> retomares o trabalho sozinho, do básico (perceber e arrancar o backend) ao avançado (deploy).
> Relacionado: [`tasks.md`](tasks.md) (cartões `BE-*`/`DB-*`/`INT-*`) e o plano de integração em
> `D:\Users\M001419\.claude\plans\faca-um-plano-para-tender-journal.md`.

---

## Nível 0 — Mapa do backend (`ottimizo/`)

Java 21-alvo (compila e corre em JDK 17 também — `pom.xml` fixa `<java.version>17</java.version>`,
apesar de `README.md` dizer 21), Spring Boot 3.5, Maven. Um pacote por domínio, todos sob
`com.ottimizo.*`:

| Pacote | Domínio | Cartões |
|---|---|---|
| `common` | `ApiResponse<T>`/`PageResponse<T>`, `ErrorCode` (`LSAxxx`), `GlobalExceptionHandler`, `SecurityConfig`, `CorrelationIdFilter`, auditoria | `BE-A` |
| `users` | Bootstrap de conta (`AuthController`), gestão admin de utilizadores | `BE-B` |
| `profile` | Perfil de saúde/orçamento do cliente | `BE-C01` |
| `catalog` | Receitas, ingredientes, catálogo elegível, feedback, motivos de troca | `BE-C02/C08/C09`, `BE-D01` |
| `plans` | Planos mensais (geração IA), entradas, swap, "comi isto", lista de compras, pedido avulso | `BE-C03..C08` |
| `stores` | Lojas (visão cliente + CRUD admin) | `BE-D02` |
| `loja` | Portal da loja: produtos, import/export Excel | `BE-L01..L03` |
| `orders` | Encomendas (cliente + loja) | `BE-C07`, `BE-L04` |
| `metrics` | Dashboard de métricas admin | `BE-E01` |

Migrações Flyway em `src/main/resources/db/migration/` (`V001`..`V006`, sempre aditivas — nunca
editar uma já aplicada). Seed de desenvolvimento em `src/main/resources/db/dev-seed/`
(`V000`/`V9002`..`V9004`, só corre no perfil `dev`).

**Estado real (2026-08-19):** todo o domínio `BE-A` a `BE-L` está implementado — confirma sempre
no código (`git log`, `Glob`/`Grep`), não só no `tasks.md`, que já esteve significativamente
desactualizado esta sessão (ver `docs/plano/README.md` e o histórico de memória do agente). Falta
mesmo por fazer: a faixa `INT-*` (este checklist) e o item avançado do pom.xml abaixo.

---

## Nível 1 — Básico: pôr o backend a arrancar localmente

- [ ] **JDK.** Confirma `JAVA_HOME` a apontar para um JDK 17+ (`java -version`). Neste ambiente
      resolveu-se com `/c/Program Files/Java/jdk-17`.
- [ ] **Maven.** `mvn -v` — usado `Apache Maven 3.9.6`.
- [ ] **Resolver o bloqueio do `pom.xml` primeiro** (ver Nível 5, item 1) — sem isto o Spring
      context nunca sobe, mesmo com tudo o resto certo. É a única coisa que impediu o arranque
      completo nesta sessão.
- [ ] **Escolher o perfil de arranque:**
  - `mvn spring-boot:run -Dspring-boot.run.profiles=dev` — Postgres **embutido**
    (`io.zonky.test:embedded-postgres`, sem Docker), já semeado com admin + ingredientes +
    receitas (`DB-06`). Mais rápido para testar a integração com o frontend.
  - `mvn spring-boot:run` (sem perfil) — espera um Postgres real em `DATABASE_URL`
    (`localhost:5432/ottimizo` por omissão).
  - `mvn spring-boot:run -Dspring.profiles.active=prod` — perfil de produção, exige todas as
    `SUPABASE_DB_*`/`SUPABASE_JWT_*` (sem defaults, falha rápido se faltar alguma).
- [ ] **Mesmo no perfil `dev`, exporta as env vars do Supabase real** antes de arrancar —
      a validação do JWT não é substituída pelo perfil dev:
      ```
      export SUPABASE_JWT_ISSUER=...
      export SUPABASE_JWKS_URI=...
      ```
- [ ] **Confirmar arranque limpo**: procura no log `Started OttimizoApplication` (sem
      `SchemaManagementException` nem `BeanCreationException`).
- [ ] **Smoke test manual mínimo** (sem frontend): `curl http://localhost:8080/api/v1/health` →
      200; `curl http://localhost:8080/v3/api-docs` → JSON do OpenAPI real.

---

## Nível 2 — Activar o hook de claims do Supabase

Sem isto, qualquer utilizador autenticado fica sem `ROLE_*` no backend e leva 403 em
`/me/**`/`/admin/**`/`/loja/**`, mesmo com tudo o resto a funcionar.

- [ ] A migração `V006__supabase_custom_claims.sql` já corre automaticamente (Flyway) e cria a
      função `public.custom_access_token_hook` — confirma que existe: no SQL Editor do Supabase,
      `select proname from pg_proc where proname = 'custom_access_token_hook';`.
- [ ] No dashboard do projecto Supabase de **desenvolvimento**: **Authentication → Hooks →
      Custom Access Token** → selecciona `public.custom_access_token_hook` → activa.
- [ ] Repete no projecto Supabase de **produção** quando chegares a essa fase (Nível 5).
- [ ] **Verificar que funcionou**: faz login com um utilizador de teste via `supabase-js` (ou
      `curl` directo à API do Supabase Auth), descodifica o JWT devolvido (ex. jwt.io) e confirma
      que tem a claim `role` (e `store_id`, se for lojista).

---

## Nível 3 — Ligar o frontend ao backend real

- [ ] `levesabor-web/.env.local`: preencher `NEXT_PUBLIC_SUPABASE_URL` e
      `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Project Settings → API no dashboard Supabase — o mesmo
      projecto do Nível 2).
- [ ] Confirmar que `NEXT_PUBLIC_API_URL` aponta para o backend a correr (`http://localhost:8080/api/v1`
      em dev local).
- [ ] Mudar `NEXT_PUBLIC_USE_MOCKS` de `true` para `false`.
- [ ] `npm run dev` e percorrer manualmente, com o backend do Nível 1 a correr:
  - [ ] Registo (Supabase `signUp` → bootstrap `POST /auth/register`)
  - [ ] Login
  - [ ] Reload da página a meio da sessão (deve manter-te autenticado — é o que o SDK Supabase
        resolve; se te devolver ao `/login`, algo no Nível 2 não está activo)
  - [ ] Onboarding do perfil
  - [ ] Gerar plano (precisa de `OPENAI_API_KEY` real no backend — sem ela, espera
        `LSA013_AI_UNAVAILABLE` e trata como aceitável nesta fase)
  - [ ] Trocar uma refeição, com motivo
  - [ ] Lista de compras (marcar item, adicionar item manual)
  - [ ] "Pedir receita agora"
  - [ ] Como ADMIN: listar/editar receitas e ingredientes, ver métricas, ver perfil de saúde de
        um utilizador
  - [ ] Como LOJISTA: produtos, import Excel, encomendas

Se algo falhar logo a seguir ao login com 403, volta ao Nível 2 (claim de role em falta é a causa
mais provável).

---

## Nível 4 — Verificação automatizada

- [ ] **Instalar Docker** (Docker Desktop ou equivalente) — necessário para os testes de
      integração Testcontainers-Postgres do backend, que não correram nesta sessão por falta dele.
- [ ] `cd ottimizo && mvn test` (suite completa, incluindo `*ControllerIntegrationTest` e
      `*IntegrationTest`) — confirma 0 falhas/erros.
- [ ] Regenerar o contrato TypeScript a partir do backend real:
      `cd levesabor-web && npm run gen:types` (já aponta para `http://localhost:8080/v3/api-docs`,
      backend tem de estar a correr). Faz diff contra `src/types/api.d.ts` actual e reconcilia à
      mão os campos "hand-editados" (`FE-S01`, `FE-T01`, etc.).
- [ ] `cd levesabor-web && npm run test:e2e` (Playwright) contra a stack real — primeira corrida é
      diagnóstica, não gate: as specs foram escritas contra dados/tempos fixos do MSW.
- [ ] Corrigir/anotar como flaky as specs que dependem de determinismo do mock (ex. geração de
      plano por IA real não é reprodutível como o fixture).

---

## Nível 5 — Avançado: robustez e produção

1. [ ] **Resolver o conflito `pom.xml` (spring-ai-bom vs Spring Boot 3.5.16).** O
       `spring-ai-bom 2.0.0` traz transitivamente módulos Spring Boot 4.1
       (`spring-boot-starter-jackson`, `spring-boot-restclient`, …) que colidem com o
       `spring-boot-autoconfigure:3.5.16` do parent. Sintomas já vistos:
       `BeanDefinitionOverrideException` em `jsonComponentModule` (contornado no perfil `dev` com
       `allow-bean-definition-overriding: true`) e `NoSuchMethodError` em
       `RestClientAutoConfiguration.restClientSsl` (ainda por resolver, bloqueia arranque fora do
       perfil `dev`... na verdade bloqueou também com o perfil `dev` nesta sessão). Caminho de
       correcção: `mvn dependency:tree -Dincludes=org.springframework.boot` para identificar as
       versões duplicadas, e excluir os módulos 4.1 trazidos pelo `spring-ai-bom` no `pom.xml`
       (`<exclusions>` no `<dependencyManagement>` ou no `spring-ai-starter-model-openai`).
2. [ ] **`ai_generation_log` sem escrita.** `AiMealPlanService`/`AdHocRecipeService` chamam o
       `ChatClient` mas nunca gravam o resultado em `ai_generation_log` — por isso
       `estimatedAiCostUsd` em `GET /admin/metrics/summary` fica sempre 0. Instrumentar a escrita
       (modelo, tokens, outcome) nesses dois services quando quiseres custos reais no dashboard.
3. [ ] **Endpoint 401 — escolha do `ErrorCode`.** Foi introduzido `LSA008_UNAUTHENTICATED` para o
       401 (token ausente/inválido/expirado); confirma que o frontend trata esse código de forma
       sensata (hoje qualquer erro não especial cai no fallback genérico da tela de login).
4. [ ] **Decidir o alojamento do backend Java** (`INT-02`, `tasks.md`) — não é Vercel (não suporta
       processo Java de longa duração). Opções típicas: Railway, Render, Fly.io, ECS/Fargate, VM
       dedicada.
5. [ ] **Deploy Fase 1** (`INT-02`): env vars de produção (`SUPABASE_DB_*`, `SUPABASE_JWT_*`,
       `OPENAI_API_KEY`, `APP_CORS_ORIGINS` a apontar para o domínio real do frontend), smoke
       tests, UAT com o cliente.
6. [ ] **Backup/restore.** `DB-07` já configurou o perfil de produção Supabase — falta agendar
       `pg_dump` externo diário e testar um restore completo pelo menos uma vez.
7. [ ] **Monitorização básica** — `/api/v1/health` (Spring Actuator) já existe; decidir onde fica
       o uptime check em produção.

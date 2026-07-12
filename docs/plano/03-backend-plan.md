# 03 — Plano de Backend (Java Spring Boot)

> Arquitetura inspirada no projeto de referência `D:\Coding\irc-container` (Maven, Java 17, Spring Boot 3, camadas controller/service/repository, envelope `ApiResponse<T>`, catálogo de erros em enum, `@RestControllerAdvice`, JWT stateless, auditoria em tabela, Lombok, injeção por construtor) — **com as práticas legadas desse projeto modernizadas** (ver §1.1).

---

## 1. Arquitetura geral

- **Stack:** Java 17 · Spring Boot 3.3.x · Maven (módulo único — ver nota) · PostgreSQL (Supabase, só JDBC) · Flyway · Spring Security + jjwt · springdoc-openapi · Apache POI · Lombok.
- **Estilo:** monólito REST stateless, `/api/v1`, JSON. Sem sessões de servidor; escala horizontal trivial.
- **Nota sobre módulos:** o irc-container é um reator multi-módulo porque integra vários adaptadores legados. Aqui não há essa necessidade — **um módulo Maven único** (`levesabor-api`) com pacotes bem separados. Se o motor de IA crescer, extrai-se para módulo próprio mais tarde.

### 1.1 O que se herda do irc-container vs. o que se moderniza

| Herdado (padrão a seguir) | Modernizado (não copiar do irc-container) |
|---|---|
| Camadas `controller / services (I* + impl) / dto / config / security / exceptions / utils` | Segredos em env vars (nunca em `pom.xml`/properties; o irc tem passwords hardcoded) |
| Envelope único `ApiResponse<T>{status, message, data}` | …mas **aplicado de forma consistente**, incl. no handler de erros (no irc coexistem 3 formatos) |
| Enum de códigos de erro com mensagens printf (`IRCxxx` → aqui `LSAxxx`) | SLF4J + Logback (o irc usa log4j 1.x) |
| `@RestControllerAdvice` global | Controllers **não** engolem exceções em try/catch local (anti-pattern do irc) |
| JWT stateless com filtro `OncePerRequestFilter` | Spring Security com regras reais por rota + roles (o irc faz `permitAll` em `/api/**`) |
| Auditoria de operações em tabela dedicada | Utilizadores persistidos com BCrypt + RBAC (o irc tem 1 user hardcoded em memória) |
| Lombok + injeção por construtor | Bean Validation (`jakarta.validation`) em vez de validação manual com listas de strings |
| Nomes snake_case nas colunas | `@Transactional` explícito (inexistente no irc); Flyway (inexistente no irc); testes a correr no build (o irc faz skip); versionamento `/api/v1` (o irc usa sufixos `_v1`) |

## 2. Estrutura do projeto

Pacote base: **`mz.levesabor.api`**

```
levesabor-api/
├── pom.xml
├── Dockerfile
├── src/main/java/mz/levesabor/api/
│   ├── LeveSaborApplication.java
│   ├── config/
│   │   ├── SecurityConfig.java          # filtros, regras por rota/role, CORS
│   │   ├── OpenAiConfig.java            # client HTTP, timeouts, retries
│   │   ├── AsyncConfig.java             # executor p/ geração de planos
│   │   └── OpenApiConfig.java           # springdoc
│   ├── security/
│   │   ├── JwtService.java              # emissão/validação (HS256, jjwt)
│   │   ├── JwtAuthFilter.java           # OncePerRequestFilter
│   │   └── CurrentUser.java             # resolver do principal autenticado
│   ├── controller/
│   │   ├── AuthController.java
│   │   ├── ProfileController.java
│   │   ├── MealPlanController.java
│   │   ├── ShoppingListController.java
│   │   ├── FeedbackController.java
│   │   └── admin/
│   │       ├── AdminUserController.java
│   │       ├── AdminStoreController.java
│   │       ├── AdminProductController.java
│   │       ├── AdminImportController.java
│   │       ├── AdminRecipeController.java
│   │       ├── AdminIngredientController.java
│   │       └── AdminMetricsController.java
│   ├── services/                        # convenção do irc: interface I* + impl
│   │   ├── IAuthService.java            / impl/AuthServiceImpl.java
│   │   ├── IProfileService.java         / impl/ProfileServiceImpl.java
│   │   ├── IMealPlanService.java        / impl/MealPlanServiceImpl.java
│   │   ├── IAiMealPlanService.java      / impl/OpenAiMealPlanService.java   # fornecedor trocável
│   │   ├── IShoppingListService.java    / impl/ShoppingListServiceImpl.java
│   │   ├── IFeedbackService.java        / impl/FeedbackServiceImpl.java
│   │   ├── IRecipeCatalogService.java   / impl/RecipeCatalogServiceImpl.java # pré-filtro p/ IA
│   │   ├── IStoreService / IProductService / IImportService (POI) / IMetricsService / IUserAdminService
│   │   └── IAuditService.java           / impl/AuditServiceImpl.java
│   ├── persist/                         # convenção do irc (módulo common): persist/entity + persist/repository
│   │   ├── entity/                      # User, ClientProfile, Recipe, Ingredient, RecipeIngredient,
│   │   │                                # MealPlan, MealPlanEntry, MealFeedback, ShoppingList(Item),
│   │   │                                # Store, Product, StoreProduct, ImportJob, RefreshToken,
│   │   │                                # AuditLog, AiGenerationLog  (+ BaseEntity @MappedSuperclass)
│   │   └── repository/                  # Spring Data JPA, 1 por agregado
│   ├── dto/                             # records Java; sub-pacotes por área (auth/, plan/, adminproduct/, …)
│   │   ├── ApiResponse.java             # envelope único
│   │   └── PageResponse.java            # paginação normalizada
│   ├── exceptions/
│   │   ├── ErrorCodes.java              # enum LSAxxx (padrão do irc)
│   │   ├── ServiceException.java        # exceção de negócio c/ ErrorCode
│   │   └── GlobalExceptionHandler.java  # @RestControllerAdvice
│   └── utils/                           # UnitConverter, ExcelTemplate, CorrelationIdFilter
├── src/main/resources/
│   ├── application.yml                  # + application-dev.yml, application-prod.yml (perfis Spring, não Maven)
│   └── db/migration/                    # V1__auth.sql … (ver 04-database-plan.md)
└── src/test/java/...                    # unit + slice + integração (Testcontainers)
```

## 3. Convenções por camada

### 3.1 Envelope de resposta e paginação

Tudo (sucesso **e** erro) responde `ApiResponse<T>`:

```java
public record ApiResponse<T>(String status, String code, String message, T data) {
    public static <T> ApiResponse<T> ok(T data) { return new ApiResponse<>("success", null, null, data); }
    public static <T> ApiResponse<T> error(ErrorCodes code, String message) {
        return new ApiResponse<>("error", code.name(), message, null);
    }
}
```

Listas paginadas: `PageResponse<T>{items, page, size, totalItems, totalPages}` dentro de `data`. Parâmetros normalizados: `?page=0&size=20&sort=campo,asc&q=texto`.

### 3.2 Catálogo de erros (`ErrorCodes`, padrão do irc com printf)

```java
@Getter
public enum ErrorCodes {
    LSA001_VALIDATION("Dados inválidos: %s", 400),
    LSA002_INVALID_CREDENTIALS("Credenciais inválidas", 401),
    LSA003_ACCOUNT_SUSPENDED("Conta suspensa — contacta o suporte", 403),
    LSA004_FORBIDDEN("Sem permissão para esta operação", 403),
    LSA005_NOT_FOUND("%s não encontrado", 404),
    LSA006_DUPLICATE("%s já existe", 409),
    LSA010_PROFILE_INCOMPLETE("Completa o teu perfil antes de gerar um plano", 409),
    LSA011_GENERATION_IN_PROGRESS("Já existe uma geração em curso", 409),
    LSA012_GENERATION_LIMIT("Limite diário de gerações atingido", 429),
    LSA013_AI_UNAVAILABLE("Não foi possível gerar o plano — tenta novamente", 502),
    LSA014_NO_ALTERNATIVE("Sem alternativa disponível para as tuas restrições", 409),
    LSA020_IMPORT_INVALID_FILE("Ficheiro inválido: %s", 400),
    LSA021_INGREDIENT_IN_USE("Ingrediente usado em %d receitas — desativa em vez de remover", 409),
    LSA022_LAST_ADMIN("Tem de existir pelo menos um administrador ativo", 409),
    LSA023_RECIPE_INCOMPLETE("Receita não publicável: %s", 409),
    LSA099_INTERNAL("Erro interno — a equipa foi notificada", 500);
    // mensagem printf + http status; getMessage(Object... args) com String.format (padrão do irc)
}
```

### 3.3 Controllers

- Finos: validam (`@Valid`), delegam no service, devolvem `ApiResponse.ok(...)`. **Sem try/catch** — erros sobem para o `GlobalExceptionHandler`.
- `@PreAuthorize("hasRole('ADMIN')")` nos controllers `admin/`; rotas `me/**` resolvem o utilizador do token (nunca aceitam `userId` no path/body).

### 3.4 Services

- Interface `I*` + impl (convenção do irc), injeção por construtor (`@RequiredArgsConstructor`).
- `@Transactional` na fronteira do service; leituras com `readOnly = true`.
- Geração de plano é assíncrona: `MealPlanServiceImpl.requestGeneration()` cria o registo `GENERATING` e submete ao executor; o worker chama `IAiMealPlanService`, valida e persiste (`READY`/`FAILED`) em transação própria.

### 3.5 DTOs e validação

- **Records** com Bean Validation; nunca expor entidades JPA.

```java
public record UpdateProfileRequest(
    @NotNull Goal goal,
    @NotNull HealthCondition healthCondition,
    @Size(max = 20) List<@Size(max = 60) String> allergies,
    BudgetBand budgetBand,
    @Min(2) @Max(5) int mealsPerDay) {}
```

- Mapeamento entidade↔DTO manual em métodos estáticos `from(entity)` (projeto pequeno; MapStruct é overkill — o irc também mapeia manualmente).

### 3.6 Entidades

- `BaseEntity` (`@MappedSuperclass`): `id` (`GenerationType.IDENTITY`, como no irc), `created_at`/`updated_at` via auditing JPA (`@EnableJpaAuditing` — melhoria face aos timestamps manuais do irc).
- Colunas snake_case explícitas em `@Column` (convenção do irc); enums persistidos como `varchar` (`@Enumerated(EnumType.STRING)`).

### 3.7 Tratamento de erros

`GlobalExceptionHandler` (`@RestControllerAdvice`) — um único formato:

| Exceção | HTTP | Código |
|---|---|---|
| `MethodArgumentNotValidException` / `ConstraintViolationException` | 400 | LSA001 (mensagem agrega os campos) |
| `BadCredentialsException` | 401 | LSA002 |
| `AccessDeniedException` / JWT inválido/expirado | 403 | LSA004 |
| `ServiceException` | status do `ErrorCode` | o do `ErrorCode` |
| `DataIntegrityViolationException` | 409 | LSA006 |
| Restante (`Exception`) | 500 | LSA099 (logada com stack + correlation-id; resposta sem detalhes internos) |

## 4. Segurança (autenticação e autorização sem Supabase Auth)

- **Autenticação:** JWT próprio. `POST /auth/login` valida BCrypt → emite **access token** (HS256, 15 min; claims: `sub`=userId, `role`, `email`) + **refresh token** (opaco, 14 dias, rotativo, guardado com hash SHA-256 em `refresh_tokens`, entregue em cookie httpOnly `Secure SameSite=Strict`).
- **Filtro:** `JwtAuthFilter` popula o `SecurityContext`; a autorização é feita pelas **regras do Spring Security** (não pelo filtro, ao contrário do irc):

```java
http.csrf(AbstractHttpConfigurer::disable)
    .sessionManagement(s -> s.sessionCreationPolicy(STATELESS))
    .authorizeHttpRequests(a -> a
        .requestMatchers("/api/v1/auth/**", "/actuator/health").permitAll()
        .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
        .requestMatchers("/api/v1/me/**").hasAnyRole("CLIENTE", "ADMIN")
        .anyRequest().denyAll());
```

- **Permissões por perfil:** 2 roles (`CLIENTE`, `ADMIN`) por rota, reforçadas com `@PreAuthorize`; **ownership** verificado no service para todo o recurso `me/**` (um cliente nunca acede a dados de outro). Suspensão revoga refresh tokens; access tokens expiram naturalmente (≤ 15 min).
- Segredo JWT (`JWT_SECRET`, ≥ 256 bits) e credenciais de BD só via variáveis de ambiente. CORS restrito à origem do frontend (`APP_CORS_ORIGINS`).

## 5. Integração OpenAI (única integração externa)

- `IAiMealPlanService` (interface do domínio) → `OpenAiMealPlanService` (impl). Trocar de fornecedor = nova impl.
- **Chamada:** Chat Completions com **Structured Outputs (JSON Schema estrito)** — o schema define `days[7].meals[N]{recipe_id, meal_slot}`. Input: perfil (objetivo, condição, alergias, orçamento, refeições/dia), preferências (👍/👎), e a **lista fechada de receitas elegíveis** (id, nome, tags, kcal, macros, custo) já pré-filtrada por `RecipeCatalogService` (filtros duros de saúde aplicados em código — nunca delegados à LLM).
- **Validação da resposta:** todos os `recipe_id` ∈ lista enviada; 7 dias × N slots completos; senão retry (máx. 2) → `LSA013`.
- **Resiliência:** timeout 60 s, retry com backoff em 429/5xx, circuit breaker simples (resilience4j — usado também no irc). Limite de 3 gerações/dia/cliente (configurável).
- **Rastreabilidade/custo:** cada chamada regista em `ai_generation_log` modelo, prompt/completion tokens, duração, resultado. Dados enviados: mínimos necessários; nunca nome/email do cliente.

## 6. Import/Export Excel (Apache POI)

- `ImportServiceImpl`: streaming (`XSSFWorkbook` com limites), validação linha-a-linha → `import_jobs` (`VALIDATED`) com erros em jsonb → confirmação aplica upsert transacional (`APPLIED`). Export e template gerados por POI com as colunas definidas em F2-ADM-04.
- Limites: `.xlsx` apenas (verificar MIME real), ≤ 5 MB, ≤ 5 000 linhas.

## 7. Logs, auditoria e rastreabilidade

- **Logs:** SLF4J + Logback, JSON em produção (fácil de indexar), pattern com `correlationId` via MDC. `CorrelationIdFilter` lê/gera `X-Correlation-Id` e devolve-o na resposta (formaliza a intenção do irc).
- **Auditoria (tabela `audit_log`):** `IAuditService.record(actor, action, entityType, entityId, detail)` — síncrono e na mesma transação para ações críticas (login falhado, suspensão, acesso a perfil de saúde, publicação de receita, import aplicado, remoções); nunca regista conteúdo sensível, só o facto do acesso.
- **Métricas técnicas:** Spring Boot Actuator (`/actuator/health` público para o orquestrador; restante fechado).

## 8. Tabela de endpoints REST (`/api/v1`)

| Método | Rota | Role | Funcionalidade | Respostas de erro relevantes |
|---|---|---|---|---|
| POST | `/auth/register` | público | F1-VIS-01 | 400 LSA001 · 409 LSA006 |
| POST | `/auth/login` | público | F1-VIS-02 | 401 LSA002 · 403 LSA003 |
| POST | `/auth/refresh` | cookie refresh | F1-VIS-02 | 401 |
| POST | `/auth/logout` | autenticado | F1-VIS-02 | — |
| GET / PUT | `/me/profile` | CLIENTE | F1-CLI-01 | 400 LSA001 |
| POST | `/me/meal-plans` | CLIENTE | F1-CLI-02 (202 + id) | 409 LSA010/LSA011 · 429 LSA012 |
| GET | `/me/meal-plans/{id}` | CLIENTE | F1-CLI-02 (estado) | 404 LSA005 |
| GET | `/me/meal-plans/active` | CLIENTE | F1-CLI-03 | 404 LSA005 (sem plano) |
| GET | `/me/meal-plans/entries/{id}` | CLIENTE | F1-CLI-04 | 404 LSA005 |
| POST | `/me/meal-plans/entries/{id}/swap` | CLIENTE | F1-CLI-05 (`?confirm=`) | 409 LSA014 |
| PUT | `/me/recipes/{id}/feedback` | CLIENTE | F1-CLI-05 | 404 LSA005 |
| GET | `/me/shopping-list` | CLIENTE | F1-CLI-06 | 404 LSA005 |
| PATCH | `/me/shopping-list/items/{id}` | CLIENTE | F1-CLI-06 | 404 LSA005 |
| GET | `/admin/users` · GET `/admin/users/{id}` | ADMIN | F2-ADM-01 | — |
| GET | `/admin/users/{id}/health-profile` | ADMIN | F2-ADM-01 (auditado) | 404 |
| PATCH | `/admin/users/{id}/status` | ADMIN | F2-ADM-01 | 409 LSA022 |
| GET/POST | `/admin/stores` · GET/PUT/DELETE `/admin/stores/{id}` · PATCH `.../status` | ADMIN | F2-ADM-02 | 409 LSA006 |
| GET/POST | `/admin/products` · GET/PUT/DELETE `/admin/products/{id}` | ADMIN | F2-ADM-03 | 409 LSA006 |
| PUT/DELETE | `/admin/products/{id}/prices/{storeId}` | ADMIN | F2-ADM-03 | 404 |
| POST | `/admin/products/import` (multipart) | ADMIN | F2-ADM-04 (valida) | 400 LSA020 |
| POST | `/admin/products/import/{jobId}/confirm` | ADMIN | F2-ADM-04 | 409 |
| GET | `/admin/products/export` · `/admin/products/import-template` | ADMIN | F2-ADM-04 | — |
| GET/POST | `/admin/recipes` · GET/PUT/DELETE `/admin/recipes/{id}` · PATCH `.../status` | ADMIN | F2-ADM-05 | 409 LSA023 |
| GET/POST | `/admin/ingredients` · GET/PUT/DELETE `/admin/ingredients/{id}` | ADMIN | F2-ADM-05 | 409 LSA021 |
| GET | `/admin/metrics/summary?period=` | ADMIN | F2-ADM-06 | 400 |

Documentação viva: springdoc-openapi em `/swagger-ui` (apenas perfis não-prod).

## 9. Estratégia de testes

| Nível | Ferramentas | Alvo mínimo |
|---|---|---|
| Unit | JUnit 5 + Mockito + AssertJ | Services com regras: filtros de saúde/alergias, validação da resposta da IA, agregação da lista (conversão de unidades), regras de publicação, seleção de alternativa no swap |
| Slice web | `@WebMvcTest` + MockMvc | Contratos dos controllers, validação Bean Validation, formato do `ApiResponse` de erro |
| Slice JPA | `@DataJpaTest` + **Testcontainers (postgres)** | Repositories, constraints e migrations Flyway reais |
| Integração | `@SpringBootTest` + Testcontainers + WireMock (OpenAI mockada) | Fluxos ponta-a-ponta: registo→perfil→geração→plano→lista; import Excel; autorização (CLIENTE vs ADMIN vs anónimo, ownership) |

- Convenção de nomes: `XxxTest` / `XxxIT` (padrão do irc); **os testes correm no build** (`mvn verify` falha o pipeline — ao contrário do irc, que os salta).
- A OpenAI é sempre mockada em testes; um teste de contrato opcional (perfil `live-ai`) corre manualmente.

## 10. Variáveis de ambiente

| Variável | Exemplo | Notas |
|---|---|---|
| `DB_URL` | `jdbc:postgresql://db.<proj>.supabase.co:5432/postgres?sslmode=require` | Supabase = só um Postgres |
| `DB_USERNAME` / `DB_PASSWORD` | — | nunca em ficheiros versionados |
| `JWT_SECRET` | base64, ≥ 256 bits | rotação = re-login geral |
| `JWT_ACCESS_TTL_MIN` / `JWT_REFRESH_TTL_DAYS` | `15` / `14` | |
| `OPENAI_API_KEY` | — | |
| `OPENAI_MODEL` | ex. `gpt-4o-mini` | equilíbrio custo/qualidade; configurável |
| `OPENAI_TIMEOUT_S` / `AI_DAILY_LIMIT` | `60` / `3` | |
| `AI_PRICE_PER_1K_INPUT` / `_OUTPUT` | — | p/ custo nas métricas |
| `APP_CORS_ORIGINS` | `https://app.levesabor.co.mz` | |
| `SPRING_PROFILES_ACTIVE` | `dev` / `prod` | perfis **Spring** (não Maven, ao contrário do irc) |

## 11. Integrações externas

1. **OpenAI API** (Fase 1) — única integração; detalhada em §5.
2. **Supabase** — não é integração aplicacional: é apenas o host do PostgreSQL (JDBC). Sem SDK Supabase no código.
3. Futuras **[Sugestão]**: fornecedor de email (FUT-05), WhatsApp Business API (FUT-02), logística/pagamentos (FUT-01).

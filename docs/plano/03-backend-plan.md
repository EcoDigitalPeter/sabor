# 03 — Plano de Backend (Next.js / TypeScript)

> **Mudança de plano (Jul/2026):** o deploy passa a ser no **Vercel**, que não suporta um processo Java/Spring Boot de longa duração. O backend deixa de ser um serviço separado e passa a viver **dentro do mesmo projeto Next.js** que o frontend (`levesabor-web`), como Route Handlers — um único deploy, base de dados remota (Supabase Postgres). Este documento substitui integralmente a versão anterior (Java/Spring Boot).

---

## 1. Arquitetura geral

- **Stack:** TypeScript · Next.js (App Router), runtime **Node.js** (não Edge — Prisma exige Node) · PostgreSQL remoto (Supabase, só via Prisma) · **Prisma** (ORM + migrations) · `jose` (JWT) · `zod` (validação) · `exceljs` (Excel, Fase 3) · `pino` (logging) · deploy no **Vercel** (plano **Pro**, necessário para `maxDuration` alargado).
- **Estilo:** API REST-like sob `/api/v1`, JSON, stateless (JWT — sem sessão de servidor). As mesmas convenções de contrato já usadas para gerar os mocks do frontend (`ApiResponse`, códigos `LSAxxx`, OpenAPI) mantêm-se — só a implementação muda de linguagem/stack.
- **Nota de separação:** frontend e backend partilham o deploy mas não a camada de código — `src/server/**` (backend) nunca é importado por componentes client-side; só as Route Handlers em `src/app/api/v1/**` o chamam. Isto preserva as duas "equipas" (frontend/backend) como componentes distintos, apenas com um único pipeline de deploy.

### 1.1 Convenções adotadas

| Convenção | Racional |
|---|---|
| Camadas `route handler (fino) → service → repository (Prisma) → dto/zod → errors` | Mesma separação de responsabilidades da versão Java, sem a bagagem de framework |
| Envelope único `ApiResponse<T>` em toda resposta (sucesso e erro) | Contrato já consumido pelo frontend (mocks MSW) — não muda com a troca de stack |
| Catálogo de erros `ErrorCodes` (`LSAxxx`) com mensagem + status HTTP | Mesma tabela de códigos já documentada; só a sintaxe (objeto TS em vez de enum Java) muda |
| Validação com `zod` nos limites da API (nunca confiar em `any`) | Equivalente TS ao Bean Validation |
| Prisma como única via de acesso à BD (sem SQL solto fora de `prisma/`) | Migrations versionadas e reprodutíveis, como o Flyway garantia antes |
| `correlationId` por pedido + logging estruturado (`pino`) | Rastreabilidade, especialmente importante em funções serverless efémeras |
| Testes correm no CI antes de qualquer deploy (`vitest run` bloqueia o pipeline) | Substitui a garantia que o `mvn verify` dava |

## 2. Estrutura do projeto

Vive dentro de `levesabor-web/` (mesmo projeto do frontend — ver `02-ui-ux-plan.md §5` para a árvore completa). Só a parte de backend:

```
levesabor-web/
├── prisma/
│   ├── schema.prisma                     # modelo de dados (ver 04-database-plan.md)
│   └── migrations/                       # histórico versionado (prisma migrate)
├── src/
│   ├── app/
│   │   └── api/v1/
│   │       ├── auth/{register,login,refresh,logout}/route.ts
│   │       ├── me/
│   │       │   ├── profile/route.ts
│   │       │   ├── meal-plans/route.ts · [id]/route.ts · entries/[id]/route.ts · entries/[id]/swap/route.ts
│   │       │   ├── recipes/[id]/feedback/route.ts
│   │       │   ├── shopping-list/route.ts · items/[id]/route.ts
│   │       │   └── orders/route.ts · [id]/route.ts · [id]/cancel/route.ts        # Fase 3
│   │       ├── admin/
│   │       │   ├── users/route.ts · [id]/route.ts · [id]/status/route.ts · [id]/health-profile/route.ts
│   │       │   ├── stores/route.ts · [id]/route.ts · [id]/status/route.ts
│   │       │   ├── recipes/route.ts · [id]/route.ts · [id]/status/route.ts
│   │       │   ├── ingredients/route.ts · [id]/route.ts
│   │       │   └── metrics/summary/route.ts
│   │       └── loja/                                                             # Fase 3 — role LOJISTA
│   │           ├── products/route.ts · [id]/route.ts · [id]/status/route.ts
│   │           ├── products/import/route.ts · import/[jobId]/confirm/route.ts
│   │           ├── products/export/route.ts · products/import-template/route.ts
│   │           └── orders/route.ts · [id]/route.ts · [id]/status/route.ts
│   ├── server/                            # backend — só chamado pelas route handlers acima
│   │   ├── config/
│   │   │   └── openai.ts                  # client OpenAI, timeouts, retries
│   │   ├── security/
│   │   │   ├── jwt.ts                     # emissão/validação (jose)
│   │   │   ├── authGuard.ts               # requireAuth(req) / requireRole(req, roles)
│   │   │   └── currentUser.ts             # resolve utilizador do token (id, role, storeId)
│   │   ├── services/                      # 1 ficheiro por domínio — authService, profileService,
│   │   │                                  # mealPlanService, aiMealPlanService (+ openAiMealPlanService),
│   │   │                                  # shoppingListService, feedbackService, recipeCatalogService,
│   │   │                                  # orderService, lojaProductService, lojaImportService,
│   │   │                                  # lojaOrderService, storeService, userAdminService,
│   │   │                                  # metricsService, auditService
│   │   ├── repositories/                  # wrappers finos sobre o Prisma Client, 1 por agregado
│   │   ├── dto/                           # schemas zod + tipos inferidos, por área (auth/, plan/, order/, …)
│   │   │   ├── apiResponse.ts             # ApiResponse<T> + helpers ok()/err()
│   │   │   └── pageResponse.ts            # paginação normalizada
│   │   ├── errors/
│   │   │   ├── errorCodes.ts              # objeto LSAxxx (mensagem + status HTTP)
│   │   │   ├── serviceError.ts            # erro de negócio com ErrorCode
│   │   │   └── errorHandler.ts            # `withErrorHandling(handler)` — equivalente ao GlobalExceptionHandler
│   │   ├── prisma.ts                      # Prisma Client singleton (evita esgotar ligações em serverless)
│   │   └── utils/                         # unitConverter, excelTemplate (exceljs), correlationId, logger (pino)
│   └── middleware.ts                      # regras de rota/role para /api/v1/admin/** e /api/v1/loja/**
└── src/test/ (ou src/**/*.test.ts colocalizado)   # unit + integração (Vitest)
```

## 3. Convenções por camada

### 3.1 Envelope de resposta e paginação

```ts
export type ApiResponse<T> =
  | { status: "success"; data: T }
  | { status: "error"; code: string; message: string };

export const ok = <T>(data: T): ApiResponse<T> => ({ status: "success", data });
export const err = (code: ErrorCode, message: string): ApiResponse<never> =>
  ({ status: "error", code: code.name, message });
```

Listas paginadas: `PageResponse<T>{ items, page, size, totalItems, totalPages }` dentro de `data`. Parâmetros normalizados: `?page=0&size=20&sort=campo,asc&q=texto`.

### 3.2 Catálogo de erros (`ErrorCodes`)

```ts
export const ErrorCodes = {
  LSA001_VALIDATION: { status: 400, message: (detail: string) => `Dados inválidos: ${detail}` },
  LSA002_INVALID_CREDENTIALS: { status: 401, message: () => "Credenciais inválidas" },
  LSA003_ACCOUNT_SUSPENDED: { status: 403, message: () => "Conta suspensa — contacta o suporte" },
  LSA004_FORBIDDEN: { status: 403, message: () => "Sem permissão para esta operação" },
  LSA005_NOT_FOUND: { status: 404, message: (what: string) => `${what} não encontrado` },
  LSA006_DUPLICATE: { status: 409, message: (what: string) => `${what} já existe` },
  LSA010_PROFILE_INCOMPLETE: { status: 409, message: () => "Completa o teu perfil antes de gerar um plano" },
  LSA011_GENERATION_IN_PROGRESS: { status: 409, message: () => "Já existe uma geração em curso" },
  LSA012_GENERATION_LIMIT: { status: 429, message: () => "Limite diário de gerações atingido" },
  LSA013_AI_UNAVAILABLE: { status: 502, message: () => "Não foi possível gerar o plano — tenta novamente" },
  LSA014_NO_ALTERNATIVE: { status: 409, message: () => "Sem alternativa disponível para as tuas restrições" },
  LSA020_IMPORT_INVALID_FILE: { status: 400, message: (detail: string) => `Ficheiro inválido: ${detail}` },
  LSA021_INGREDIENT_IN_USE: { status: 409, message: (n: number) => `Ingrediente usado em ${n} receitas — desativa em vez de remover` },
  LSA022_LAST_ADMIN: { status: 409, message: () => "Tem de existir pelo menos um administrador ativo" },
  LSA023_RECIPE_INCOMPLETE: { status: 409, message: (detail: string) => `Receita não publicável: ${detail}` },
  LSA030_INVALID_ORDER_TRANSITION: { status: 409, message: (from: string, to: string) => `Transição de estado inválida: ${from} → ${to}` },
  LSA031_STORE_INACTIVE: { status: 409, message: () => "Loja indisponível para encomendas" },
  LSA099_INTERNAL: { status: 500, message: () => "Erro interno — a equipa foi notificada" },
} as const;
```

### 3.3 Route Handlers

- Finos: fazem `parse` do body/query com `zod`, resolvem o utilizador autenticado (`currentUser.ts`), delegam no service, devolvem `NextResponse.json(ok(data))`.
- **Sem try/catch manual** — todo handler é envolvido por `withErrorHandling(async (req) => {...})`, que apanha `ServiceError` (usa o `ErrorCode`), `ZodError` (→ `LSA001`), erros do Prisma (`P2002` unique constraint → `LSA006`) e qualquer outro (→ `LSA099`, logado com stack + `correlationId`).
- Autorização por prefixo tratada em `src/middleware.ts`; ownership fino (um cliente só vê os seus dados; um lojista só vê a sua loja) é sempre verificado dentro do service, nunca confiando em `id`/`storeId` vindos do path/body do pedido.
- Todas as rotas correm em runtime **Node.js** (`export const runtime = "nodejs"`) — Prisma não funciona em Edge sem adaptador dedicado.

### 3.4 Services

- Funções assíncronas exportadas por domínio (`mealPlanService.generate(userId, ...)`); sem necessidade da convenção `I*`/`impl` do Java — TypeScript não precisa de interface só para trocar implementação (usa-se injeção simples de dependências via parâmetros/factory quando há mais que um fornecedor, ex. `AiMealPlanService`).
- Operações multi-tabela usam `prisma.$transaction(...)` para atomicidade (equivalente ao `@Transactional`).
- **Geração de plano é síncrona:** `mealPlanService.generate()` chama a IA, valida e persiste tudo dentro do mesmo pedido HTTP — sem fila nem worker (ver §5).

### 3.5 DTOs e validação

- **Zod** define o shape e infere o tipo TS; nunca se expõe o tipo gerado pelo Prisma diretamente na resposta.

```ts
export const UpdateProfileRequest = z.object({
  goal: z.enum(["PERDER_PESO", "COMER_MELHOR", "GANHAR_MASSA", "GERIR_CONDICAO"]),
  healthCondition: z.enum(["NENHUMA", "DIABETES_TIPO_2", "HIPERTENSAO", "DOENCA_CELIACA"]),
  allergies: z.array(z.string().max(60)).max(20),
  budgetBand: z.enum(["BAIXO", "MEDIO", "CONFORTAVEL"]).optional(),
  mealsPerDay: z.number().int().min(2).max(5),
});
export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequest>;
```

- Mapeamento entidade↔DTO manual em funções `toDto(entity)` (projeto pequeno; um mapper automático seria overkill).

### 3.6 Modelo de dados (Prisma)

- `schema.prisma` usa `@map`/`@@map` para preservar nomes de tabela/coluna em `snake_case` (paridade total com `04-database-plan.md`); `createdAt DateTime @default(now()) @map("created_at")`, `updatedAt DateTime @updatedAt @map("updated_at")`.
- Enums de domínio modelados como `String` + `CHECK` na migration SQL (mesma escolha do plano original — mais simples de evoluir do que enums nativos do Postgres), com o tipo TS correspondente (`z.enum`) do lado da aplicação.

### 3.7 Tratamento de erros

`withErrorHandling` — um único formato:

| Origem | HTTP | Código |
|---|---|---|
| `ZodError` (validação) | 400 | LSA001 (mensagem agrega os campos) |
| Credenciais inválidas | 401 | LSA002 |
| Token ausente/inválido/expirado ou role incorreta | 403 | LSA004 |
| `ServiceError` | status do `ErrorCode` | o do `ErrorCode` |
| `PrismaClientKnownRequestError` (`P2002`) | 409 | LSA006 |
| Restante | 500 | LSA099 (logado com stack + `correlationId`; resposta sem detalhes internos) |

## 4. Segurança (autenticação e autorização sem Supabase Auth)

- **Autenticação:** JWT próprio com `jose`. `POST /auth/login` valida hash (bcrypt/argon2) → emite **access token** (15 min; claims `sub`=userId, `role`, `storeId?`) + **refresh token** (opaco, 14 dias, rotativo, hash SHA-256 em `refresh_tokens`, cookie httpOnly `Secure SameSite=Strict`).
- **Guarda de rota** (`middleware.ts`):

```ts
const rules = [
  { prefix: "/api/v1/auth", roles: null },                 // público
  { prefix: "/api/v1/admin", roles: ["ADMIN"] },
  { prefix: "/api/v1/loja", roles: ["LOJISTA"] },
  { prefix: "/api/v1/me", roles: ["CLIENTE", "ADMIN"] },
];
```

- **Permissões por perfil:** 3 roles (`CLIENTE`, `ADMIN`, `LOJISTA`); **ownership** sempre verificado no service — um cliente nunca acede a dados de outro (`me/**`), um lojista nunca acede a dados de outra loja (`loja/**`, filtro por `storeId` do token, nunca do path/body). Suspensão revoga refresh tokens; access tokens expiram naturalmente (≤ 15 min).
- Segredo JWT (`JWT_SECRET`, ≥ 256 bits) e connection strings da BD só via **Vercel Environment Variables**; nunca commitados.

## 5. Integração OpenAI (única integração externa)

- `AiMealPlanService` (interface do domínio) → `openAiMealPlanService` (impl com o SDK Node da OpenAI). Trocar de fornecedor = nova implementação.
- **Chamada:** Chat Completions com **Structured Outputs (JSON Schema estrito)** — o schema define `days[7].meals[N]{recipeId, mealSlot}`. Input: perfil, preferências (👍/👎), e a **lista fechada de receitas elegíveis** já pré-filtrada por `recipeCatalogService` (filtros duros de saúde em código — nunca delegados à LLM).
- **Execução síncrona, não assíncrona:** mudança de plano — em vez do padrão anterior (202 + polling + worker), a geração corre **dentro do próprio Route Handler** de `POST /me/meal-plans`, com `export const maxDuration = 120;` (Vercel **Pro** permite até 300 s) definido no ficheiro da rota. Simplifica o código (sem fila/cron) à custa de exigir o plano Pro; o frontend mostra o ecrã T-07 como um `await` com mensagens rotativas por temporizador local, não por polling de estado.
- **Validação da resposta:** todos os `recipeId` ∈ lista enviada; 7 dias × N slots completos; senão retry (máx. 2) → `LSA013`.
- **Resiliência:** timeout ~90 s, retry com backoff em 429/5xx (`p-retry` ou equivalente); sem circuit breaker dedicado no MVP (volume baixo) — **[Sugestão]** Futuro se necessário. Limite de 3 gerações/dia/cliente (configurável).
- **Rastreabilidade/custo:** cada chamada regista em `ai_generation_log` modelo, tokens, duração, resultado. Dados enviados: mínimos necessários; nunca nome/email do cliente.

## 6. Import/Export Excel (`exceljs`) — Fase 3, escopado à loja

- `lojaImportService`: leitura streaming com `exceljs`, validação linha-a-linha → `import_jobs` (`VALIDATED`, com `storeId`) com erros em jsonb → confirmação aplica upsert transacional (`prisma.$transaction`, `APPLIED`), sempre restrito à loja do lojista autenticado. Export e template gerados também com `exceljs`.
- Limites: `.xlsx` apenas (verificar MIME real), ≤ 5 MB, ≤ 2 000 linhas (catálogo de uma única loja).

## 7. Logs, auditoria e rastreabilidade

- **Logs:** `pino` (JSON estruturado — adequado ao ambiente serverless do Vercel, visível no seu dashboard de logs), `correlationId` lido/gerado a partir do header `x-correlation-id` e devolvido na resposta.
- **Auditoria (tabela `audit_log`):** `recordAudit(actor, action, entityType, entityId, detail)` — chamado dentro da mesma transação Prisma para ações críticas (login falhado, suspensão, acesso a perfil de saúde, publicação de receita, import aplicado, mudança de estado de encomenda, remoções); nunca regista conteúdo sensível, só o facto do acesso.
- **Saúde do serviço:** rota `GET /api/v1/health` simples (sem Actuator — não há processo de longa duração a monitorizar; a observabilidade vive no dashboard do Vercel).

## 8. Tabela de endpoints REST (`/api/v1`)

| Método | Rota | Role | Funcionalidade | Respostas de erro relevantes |
|---|---|---|---|---|
| POST | `/auth/register` | público | F1-VIS-01 | 400 LSA001 · 409 LSA006 |
| POST | `/auth/login` | público | F1-VIS-02 | 401 LSA002 · 403 LSA003 |
| POST | `/auth/refresh` | cookie refresh | F1-VIS-02 | 401 |
| POST | `/auth/logout` | autenticado | F1-VIS-02 | — |
| GET / PUT | `/me/profile` | CLIENTE | F1-CLI-01 | 400 LSA001 |
| POST | `/me/meal-plans` | CLIENTE | F1-CLI-02 (síncrono — devolve o plano pronto) | 409 LSA010/LSA011 · 429 LSA012 · 502 LSA013 |
| GET | `/me/meal-plans/{id}` | CLIENTE | F1-CLI-02 (consulta) | 404 LSA005 |
| GET | `/me/meal-plans/active` | CLIENTE | F1-CLI-03 | 404 LSA005 (sem plano) |
| GET | `/me/meal-plans/entries/{id}` | CLIENTE | F1-CLI-04 | 404 LSA005 |
| POST | `/me/meal-plans/entries/{id}/swap` | CLIENTE | F1-CLI-05 (`?confirm=`) | 409 LSA014 |
| PUT | `/me/recipes/{id}/feedback` | CLIENTE | F1-CLI-05 | 404 LSA005 |
| GET | `/me/shopping-list` | CLIENTE | F1-CLI-06 | 404 LSA005 |
| PATCH | `/me/shopping-list/items/{id}` | CLIENTE | F1-CLI-06 | 404 LSA005 |
| POST | `/me/orders` | CLIENTE | F3-CLI-07 | 409 LSA031 |
| GET | `/me/orders` · GET `/me/orders/{id}` | CLIENTE | F3-CLI-07 | 404 LSA005 |
| PATCH | `/me/orders/{id}/cancel` | CLIENTE | F3-CLI-07 | 409 LSA030 |
| GET | `/admin/users` · GET `/admin/users/{id}` | ADMIN | F2-ADM-01 | — |
| GET | `/admin/users/{id}/health-profile` | ADMIN | F2-ADM-01 (auditado) | 404 |
| PATCH | `/admin/users/{id}/status` | ADMIN | F2-ADM-01 | 409 LSA022 |
| POST | `/admin/users` | ADMIN | F2-ADM-01 (criar admin/lojista) | 409 LSA006 |
| GET/POST | `/admin/stores` · GET/PUT/DELETE `/admin/stores/{id}` · PATCH `.../status` | ADMIN | F2-ADM-02 | 409 LSA006 |
| GET/POST | `/admin/recipes` · GET/PUT/DELETE `/admin/recipes/{id}` · PATCH `.../status` | ADMIN | F2-ADM-05 | 409 LSA023 |
| GET/POST | `/admin/ingredients` · GET/PUT/DELETE `/admin/ingredients/{id}` | ADMIN | F2-ADM-05 | 409 LSA021 |
| GET | `/admin/metrics/summary?period=` | ADMIN | F2-ADM-06 | 400 |
| GET/POST | `/loja/products` · GET/PUT/DELETE `/loja/products/{id}` · PATCH `.../status` | LOJISTA | F3-LOJ-01 | 409 LSA006 |
| POST | `/loja/products/import` (multipart) | LOJISTA | F3-LOJ-02 (valida) | 400 LSA020 |
| POST | `/loja/products/import/{jobId}/confirm` | LOJISTA | F3-LOJ-02 | 409 |
| GET | `/loja/products/export` · `/loja/products/import-template` | LOJISTA | F3-LOJ-02 | — |
| GET | `/loja/orders` · GET `/loja/orders/{id}` | LOJISTA | F3-LOJ-03 | 404 LSA005 |
| PATCH | `/loja/orders/{id}/status` | LOJISTA | F3-LOJ-03 | 409 LSA030 |

Documentação viva: OpenAPI gerado/mantido manualmente em `openapi.yaml` (já existente no repo) + Swagger UI servido apenas em `preview`/`development` (nunca em `production`).

## 9. Estratégia de testes

| Nível | Ferramentas | Alvo mínimo |
|---|---|---|
| Unit | Vitest | Services com regras: filtros de saúde/alergias, validação da resposta da IA, agregação da lista (conversão de unidades), regras de publicação, seleção de alternativa no swap, máquina de estados das encomendas |
| Route Handler (contrato) | Vitest + `next-test-api-route-handler` (ou invocação direta do handler com `Request`/`NextRequest`) | Validação Zod, formato do `ApiResponse` de erro, guardas de role |
| Integração com BD | Vitest + Postgres efémero (container Docker no CI) + Prisma real | Repositórios, constraints e migrations reais |
| Integração ponta-a-ponta | Vitest + Postgres efémero + OpenAI mockada (`nock`/`msw`) | Fluxos: registo→perfil→geração→plano→lista; import Excel; autorização (CLIENTE vs ADMIN vs LOJISTA vs anónimo, ownership) |

- Convenção de nomes: `*.test.ts` (unit) / `*.integration.test.ts` (integração); **os testes correm no CI** (`vitest run` bloqueia o merge/deploy).
- A OpenAI é sempre mockada em testes; um teste de contrato opcional (flag `LIVE_AI=1`) corre manualmente contra a API real.

## 10. Variáveis de ambiente

Geridas em **Vercel Environment Variables** (não em ficheiros versionados). Ver tabela completa por ambiente em [`05-implementation-roadmap.md §5`](05-implementation-roadmap.md); resumo do que a app lê:

| Variável | Notas |
|---|---|
| `DATABASE_URL` | Supabase — connection string **pooled** (`pgbouncer=true`), usada em runtime |
| `DIRECT_URL` | Supabase — connection string **direta**, usada só por `prisma migrate deploy` |
| `JWT_SECRET`, `JWT_ACCESS_TTL_MIN`, `JWT_REFRESH_TTL_DAYS` | Segredo ≥ 256 bits; rotação = re-login geral |
| `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_TIMEOUT_S` | Modelo económico configurável |
| `AI_DAILY_LIMIT`, `AI_PRICE_PER_1K_INPUT`, `AI_PRICE_PER_1K_OUTPUT` | Controlo de custo e cálculo nas métricas |
| `SEED_ADMIN_BCRYPT` | Usado só pelo script de seed inicial |

## 11. Integrações externas

1. **OpenAI API** (Fase 1) — única integração aplicacional; detalhada em §5.
2. **Supabase** — não é integração aplicacional: é apenas o host do PostgreSQL, acedido via Prisma. Sem SDK Supabase no código.
3. **Vercel** — plataforma de deploy; define constraints técnicas (runtime Node obrigatório para rotas com Prisma, `maxDuration` configurável por rota, variáveis de ambiente por ambiente) mas não é uma dependência de dados.
4. Futuras **[Sugestão]**: fornecedor de email (FUT-05), WhatsApp Business API (FUT-02), logística/pagamentos (FUT-01).

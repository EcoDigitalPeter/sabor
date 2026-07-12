# Tasks — Quadro de Execução (estilo Trello)

> Todas as tarefas do projeto, na ordem de execução acordada: **primeiro o frontend (contra mocks), depois o backend (+ base de dados)**.
> Cada cartão é o mais **independente e baseado em componentes** possível para permitir paralelismo.
>
> **Como usar:** mover o estado marcando a checkbox (`[ ]` por fazer → `[x]` feito) e/ou copiando o cartão para as secções *Em curso* / *Concluído* no fim do ficheiro. Cada cartão indica: `ID · título · [deps] · ref. plano`.
>
> **Legenda de etiquetas:** 🟦 frontend · 🟨 backend · 🟩 base de dados · 🟪 transversal/integração · ⚡ desbloqueia paralelismo (fazer cedo).

---

## Faixas de paralelismo (visão rápida)

```
FE-A  Fundações ⚡ ──▶  FE-B Componentes UI (todos paralelos entre si)
                    └▶  FE-C Telas Cliente ─┐   (paralelas entre si após FE-B do que usam)
                    └▶  FE-D Telas Admin  ──┤
                                            ▼
BE-A  Fundações ⚡ ──▶  DB migrations ──▶ BE-B Auth ──▶ BE-C..F Domínios (paralelos) ──▶ INT Integração/UAT
```

Regra de ouro: **MOCK-01 e FE-A ficam prontos primeiro** — a partir daí, qualquer cartão FE-B pode ser pegado por qualquer dev em paralelo; as telas (FE-C/FE-D) só dependem dos componentes que usam + mocks. No backend, após BE-B (auth), os domínios BE-C, BE-D, BE-E e BE-F são faixas independentes.

---

## 🟪 FASE 0 — Contrato e Mocks (pré-requisito do frontend-first) ⚡

- [ ] **MOCK-01 · Congelar o contrato da API** — Escrever o OpenAPI (YAML) a partir da tabela de endpoints do `03-backend-plan.md` §8, incluindo schemas de `ApiResponse`, `PageResponse` e códigos `LSAxxx`. É a fonte de verdade FE↔BE. `[deps: —]` `[ref: 03 §3, §8]`
- [ ] **MOCK-02 · Servidor de mocks (MSW)** — Configurar Mock Service Worker no projeto Next.js com handlers para todos os endpoints do MOCK-01 + fixtures realistas (1 plano completo de 7 dias com pratos moçambicanos, lista de compras, catálogos admin, respostas de erro LSAxxx). Todo o FE desenvolve contra isto. `[deps: MOCK-01, FE-A01]` `[ref: 03 §8]`
- [ ] **MOCK-03 · Tipos TypeScript gerados** — Pipeline `openapi-typescript` a gerar `src/types/` a partir do MOCK-01; script npm + verificação no CI. `[deps: MOCK-01, FE-A01]` `[ref: 02 §5]`

---

## 🟦 FRONTEND

### FE-A — Fundações ⚡ (sequencial, curto — desbloqueia tudo)

- [ ] **FE-A01 · Esqueleto Next.js + PWA** — Criar `levesabor-web` (App Router), `next-pwa`, `manifest.webmanifest` (theme `#C43E1C`, background `#F6ECDC`), estrutura de pastas do `02-ui-ux-plan.md` §5, ESLint/Prettier, CI (lint + build). `[deps: —]` `[ref: 02 §5]`
- [ ] **FE-A02 · Design tokens** — `styles/tokens.css` com todas as variáveis da tabela `02 §1` (cores, fontes Bricolage/Work Sans/IBM Plex Mono com subsets, raios, focos, animações `ls-rise`/`ls-ring-in`). `[deps: FE-A01]` `[ref: 02 §1]`
- [ ] **FE-A03 · Cliente HTTP + sessão** — `lib/api.ts` (injeta Bearer, refresh automático em 401, desembrulha `ApiResponse`, mapeia `LSAxxx`→mensagens), `lib/auth.ts` (sessão, roles, guards de rota CLIENTE/ADMIN), TanStack Query provider. Funciona igual contra MSW e backend real. `[deps: FE-A01, MOCK-03]` `[ref: 02 §5, 03 §3-4]`
- [ ] **FE-A04 · Layouts e navegação** — Layout público, layout cliente (bottom-nav Plano/Compras/Perfil), layout admin (sidebar + topbar), redirecionamentos por role. `[deps: FE-A02, FE-A03]` `[ref: 02 §2]`

### FE-B — Biblioteca de componentes (todos **paralelos entre si**; deps: FE-A02)

- [ ] **FE-B01 · Button / Input / Select / Checkbox** — Pílulas 100px, foco `outline 3px`, estados disabled/loading. `[ref: 02 §1]`
- [ ] **FE-B02 · Card / Chip / StatusBadge** — Cartões 12–24px, chips mono estilo landing (`620 kcal · 35 min`), badges de estado (ACTIVE/SUSPENDED/DRAFT/PUBLISHED). `[ref: 02 §1, §3]`
- [ ] **FE-B03 · Toast / Modal / ConfirmDialog / BottomSheet** — Toast 2,5s; diálogo de confirmação (simples e dupla); bottom-sheet mobile (usado na troca de refeição). `[ref: 02 §2]`
- [ ] **FE-B04 · Skeleton / EmptyState / ErrorState** — Os 4 estados transversais do `02 §2`; EmptyState recebe ilustração + título + CTA. `[ref: 02 §2]`
- [ ] **FE-B05 · MacroRing (sm/md/lg)** — SVG `stroke-dasharray` (técnica da landing), 4 segmentos na ordem/cores fixas (Proteína `#C43E1C` → Carbs `#E3A72E` → Gordura `#E7C9A0` → Fibra `#45614A`), kcal ao centro em mono; variante `lg` com legenda. Componente-assinatura — testar visualmente com valores extremos. `[ref: 02 §1]`
- [ ] **FE-B06 · FormField + validação** — Wrapper de campo com label/erro inline; integração react-hook-form + zod (espelha as validações do plano funcional). `[ref: 01 (validações por funcionalidade)]`
- [ ] **FE-B07 · DataTable admin** — Tabela paginada server-side reutilizável: pesquisa, filtros, ordenação, paginação por URL, estados loading/empty. Base de TODAS as telas de lista do admin. `[ref: 02 §3 T-10..T-19]`
- [ ] **FE-B08 · Wizard / Stepper** — Contentor 1-pergunta-por-ecrã com progresso e rascunho local (usado no onboarding). `[ref: 02 §3 T-03]`
- [ ] **FE-B09 · KpiCard + gráfico de linhas** — Cartão KPI e gráfico leve (sem lib pesada; ex. SVG próprio ou recharts se couber no orçamento de JS). `[ref: 02 §3 T-09]`
- [ ] **FE-B10 · Ilustrações e ícones** — Gerar P-01..P-07 com os prompts do `02 §4`, otimizar (<60 KB), integrar logotipo SVG da landing e ícones Lucide; ícones de categoria P-06. `[deps: nenhum código — pode começar já]` `[ref: 02 §4]`

### FE-C — Telas do Portal Cliente (paralelas entre si; deps indicadas + MOCK-02)

- [ ] **FE-C01 · T-01 Login + T-02 Registo** — Formulários, erros por campo, 409 email duplicado, redirecionamento por role. `[deps: FE-B01, B04, B06]` `[ref: 02 T-01/T-02, 01 F1-VIS-01/02]`
- [ ] **FE-C02 · T-03 Onboarding do perfil** — Wizard 5 passos + resumo (objetivos/condições com labels exatos da landing), rascunho local, CTA final "Gerar o meu plano". `[deps: FE-B01, B06, B08]` `[ref: 02 T-03, 01 F1-CLI-01]`
- [ ] **FE-C03 · T-04 Dashboard do plano** — Tabs de dias, cartões de refeição com MacroRing `sm`, resumo do dia, empty state com CTA, banner offline. `[deps: FE-B02, B04, B05]` `[ref: 02 T-04, 01 F1-CLI-03]`
- [ ] **FE-C04 · T-07 Ecrã de geração** — Polling do estado, mensagens rotativas, estados failed/limit_reached. `[deps: FE-B04]` `[ref: 02 T-07, 01 F1-CLI-02]`
- [ ] **FE-C05 · T-05 Detalhe de refeição/receita** — MacroRing `lg` + legenda, ingredientes, passos numerados, notas de saúde, disclaimer; feedback 👍/👎 otimista; fluxo de troca com bottom-sheet. `[deps: FE-B02, B03, B05]` `[ref: 02 T-05, 01 F1-CLI-04/05]`
- [ ] **FE-C06 · T-06 Lista de compras** — Grupos por categoria (ícones P-06), checkboxes otimistas, progresso, custo estimado com nota de parcialidade. `[deps: FE-B02, B04]` `[ref: 02 T-06, 01 F1-CLI-06]`
- [ ] **FE-C07 · T-08 Perfil** — Edição por secção, aviso "vale a partir do próximo plano", logout. `[deps: FE-B01, B06]` `[ref: 02 T-08, 01 F1-CLI-01]`
- [ ] **FE-C08 · Offline/PWA do cliente** — Precache do shell; runtime cache do plano ativo e lista (stale-while-revalidate); fila local de toggles da lista com sync; excluir `/admin` do SW; testar com throttling 3G. `[deps: FE-C03, FE-C06]` `[ref: 02 §5, 01 F1-CLI-03/06]`

### FE-D — Telas do Portal Admin (paralelas entre si; deps indicadas + MOCK-02)

- [ ] **FE-D01 · T-09 Dashboard de métricas** — KPIs, gráfico planos/dia, top/bottom receitas, custo IA, seletor de período. `[deps: FE-B09]` `[ref: 02 T-09, 01 F2-ADM-06]`
- [ ] **FE-D02 · T-10/T-11 Utilizadores** — Lista (DataTable) + detalhe com suspensão (confirmação) e "Ver perfil de saúde" explícito. `[deps: FE-B03, B07]` `[ref: 02 T-10/11, 01 F2-ADM-01]`
- [ ] **FE-D03 · T-12/T-13 Lojas** — Lista + formulário + tab de preços inline; remoção com confirmação dupla quando há produtos. `[deps: FE-B03, B06, B07]` `[ref: 02 T-12/13, 01 F2-ADM-02]`
- [ ] **FE-D04 · T-14/T-15 Produtos** — Lista + formulário com autocomplete de ingrediente e tabela de preços por loja. `[deps: FE-B06, B07]` `[ref: 02 T-14/15, 01 F2-ADM-03]`
- [ ] **FE-D05 · T-16 Import Excel** — Drag-&-drop, pré-visualização com erros destacados por linha, toggle "só linhas válidas", confirmação, ecrã de resultado, links template/export. `[deps: FE-B03, B07]` `[ref: 02 T-16, 01 F2-ADM-04]`
- [ ] **FE-D06 · T-17/T-18 Receitas** — Lista com feedback agregado + formulário rico (ingredientes dinâmicos, passos ordenáveis, tags, painel de macros com MacroRing `md`, publish com checklist de bloqueios). `[deps: FE-B05, B06, B07]` `[ref: 02 T-17/18, 01 F2-ADM-05]`
- [ ] **FE-D07 · T-19 Ingredientes** — CRUD tabular com edição inline/drawer, desativar, remoção bloqueada com lista de receitas afetadas. `[deps: FE-B07]` `[ref: 02 T-19, 01 F2-ADM-05]`

### FE-E — Qualidade frontend

- [ ] **FE-E01 · Testes E2E (Playwright) contra mocks** — Fluxos: registo→onboarding→plano→receita→troca→lista; login admin→CRUD loja→import Excel. Correm no CI sem backend. `[deps: telas correspondentes]` `[ref: 05 checklist]`
- [ ] **FE-E02 · Auditoria de performance/dados** — Bundle < 200 KB gzip na área cliente, Lighthouse PWA, fontes subsetting, imagens otimizadas. `[deps: FE-C08]` `[ref: 02 §5]`

---

## 🟨🟩 BACKEND + BASE DE DADOS

### BE-A — Fundações ⚡ (sequencial, curto)

- [ ] **BE-A01 · Esqueleto Spring Boot** — `levesabor-api` (Java 17, Boot 3.3, Maven), estrutura de pacotes `mz.levesabor.api` do `03 §2`, Lombok, springdoc, Actuator, Dockerfile multi-stage, CI `mvn verify`. `[deps: —]` `[ref: 03 §1-2]`
- [ ] **BE-A02 · Núcleo transversal** — `ApiResponse`/`PageResponse`, enum `ErrorCodes` LSAxxx completo, `ServiceException`, `GlobalExceptionHandler`, `CorrelationIdFilter` + logging JSON, `BaseEntity` + JPA auditing. `[deps: BE-A01]` `[ref: 03 §3]`
- [ ] **BE-A03 · Infra local + Flyway** — docker-compose dev (Postgres), Flyway configurado, perfis Spring dev/prod, env vars do `03 §10`; Testcontainers base para testes. `[deps: BE-A01]` `[ref: 03 §10, 05 §5]`

### DB — Migrations (sequenciais entre si; paralelas com BE-B após V1)

- [ ] **DB-01 · V1 auth + audit** — `users`, `refresh_tokens`, `audit_log` (SQL do `04 §3`). `[deps: BE-A03]`
- [ ] **DB-02 · V2 perfis + catálogo nutricional** — `client_profiles`, `ingredients`, `recipes`, `recipe_ingredients`. `[deps: DB-01]`
- [ ] **DB-03 · V3 planos + listas** — `meal_plans`, `meal_plan_entries`, `meal_feedback`, `shopping_lists(_items)`, `ai_generation_log`. `[deps: DB-02]`
- [ ] **DB-04 · V4 lojas + produtos + imports** — `stores`, `products`, `store_products`, `import_jobs`. `[deps: DB-02]` *(independente de DB-03 — paralelizável)*
- [ ] **DB-05 · V5 seed** — Admin inicial (placeholder `${seed_admin_bcrypt}`) + ≥ 40 receitas moçambicanas com nutrição/tags **(conteúdo do cliente — pedir no dia 1, risco R2)** + ~30 ingredientes. `[deps: DB-02, conteúdo do cliente]` `[ref: 04 §3 V5, 05 R2]`
- [ ] **DB-06 · Projeto Supabase prod** — Criar projeto, configurar `sslmode=require`, testar Flyway contra ele, agendar `pg_dump` externo diário + teste de restore. `[deps: DB-01]` `[ref: 05 §5]`

### BE-B — Autenticação e segurança (sequencial; desbloqueia todos os domínios)

- [ ] **BE-B01 · JWT + SecurityConfig** — `JwtService`, `JwtAuthFilter`, regras por rota/role do `03 §4`, CORS por env var. `[deps: BE-A02, DB-01]`
- [ ] **BE-B02 · Endpoints de auth** — register/login/refresh (rotativo, cookie httpOnly)/logout, BCrypt, revogação, auditoria de logins falhados; testes slice + integração. `[deps: BE-B01]` `[ref: 01 F1-VIS-01/02, 03 §4]`
- [ ] **BE-B03 · AuditService** — `IAuditService.record(...)` síncrono transacional + convenções de ações auditáveis. `[deps: BE-A02, DB-01]` `[ref: 03 §7]`

### BE-C — Domínio Cliente (após BE-B; C1→C2→C3 em cadeia; C4/C5 paralelos a C2)

- [ ] **BE-C01 · Perfil** — `GET/PUT /me/profile`, enums Goal/HealthCondition/BudgetBand, validações Bean Validation. `[deps: BE-B02, DB-02]` `[ref: 01 F1-CLI-01]`
- [ ] **BE-C02 · RecipeCatalogService (pré-filtros duros)** — Elegibilidade por condição de saúde (celíaco = filtro duro `sem_gluten`), alergias, feedback 👎 excluído/despriorizado, 👍 preferido. Unit tests exaustivos por condição — é a barreira anti-alucinação. `[deps: BE-C01, DB-03]` `[ref: 01 F1-CLI-02 regras, 03 §5]`
- [ ] **BE-C03 · Motor de geração (OpenAI)** — `IAiMealPlanService` + `OpenAiMealPlanService` (structured outputs, validação de ids, retries, timeout, resilience4j), geração assíncrona (202 + polling), snapshots, `ai_generation_log`, limite diário; WireMock nos testes. `[deps: BE-C02]` `[ref: 01 F1-CLI-02, 03 §5]`
- [ ] **BE-C04 · Plano ativo + entradas** — `GET /me/meal-plans/active` (payload único compacto), `GET .../{id}`, `GET .../entries/{id}`, ownership em tudo. `[deps: BE-C01, DB-03]` *(paralelo a BE-C03 — usa fixtures)* `[ref: 01 F1-CLI-03/04]`
- [ ] **BE-C05 · Feedback + swap** — `PUT /me/recipes/{id}/feedback`; `POST .../entries/{id}/swap` (alternativa determinística compatível ±20% kcal, transacional com rebuild da lista). `[deps: BE-C02, BE-C04]` `[ref: 01 F1-CLI-05]`
- [ ] **BE-C06 · Lista de compras** — `ShoppingListService.rebuildForPlan` (agregação + conversão de unidades g/kg, ml/l; preserva checked), `GET /me/shopping-list`, `PATCH .../items/{id}`. `[deps: BE-C04]` `[ref: 01 F1-CLI-06]`

### BE-D — Domínio Admin: contas e catálogo comercial (após BE-B; D1..D3 **paralelos entre si**)

- [ ] **BE-D01 · Gestão de utilizadores** — Lista paginada/pesquisa, detalhe, `PATCH status` (revoga refresh, guarda "último admin"), `GET health-profile` auditado. `[deps: BE-B02, BE-B03]` `[ref: 01 F2-ADM-01]`
- [ ] **BE-D02 · CRUD lojas** — Endpoints + regras de suspensão/remoção (cascata confirmada). `[deps: BE-B02, DB-04]` `[ref: 01 F2-ADM-02]`
- [ ] **BE-D03 · CRUD produtos + preços** — Endpoints + upsert de preço por (produto, loja). `[deps: BE-D02]` `[ref: 01 F2-ADM-03]`
- [ ] **BE-D04 · Import/Export Excel (POI)** — Template, export, import validar→confirmar (`import_jobs`, erros por linha jsonb, tudo-ou-nada + modo "só válidas", limites 5 MB/5 000 linhas); teste round-trip. `[deps: BE-D03]` `[ref: 01 F2-ADM-04, 03 §6]`

### BE-E — Domínio Admin: dados da IA (após BE-B; paralelo a BE-D)

- [ ] **BE-E01 · CRUD ingredientes** — Endpoints + bloqueio de remoção em uso (LSA021 com lista de receitas). `[deps: BE-B02, DB-02]` `[ref: 01 F2-ADM-05]`
- [ ] **BE-E02 · CRUD receitas + publicação** — Endpoints, cálculo de macros a partir dos ingredientes (+ override), regras de publicação server-side (LSA023 com motivos), feedback agregado por receita. `[deps: BE-E01]` `[ref: 01 F2-ADM-05]`

### BE-F — Métricas (após BE-B; paralelo a BE-C/D/E)

- [ ] **BE-F01 · metrics/summary** — KPIs + séries + custo IA num payload; testes com fixtures. `[deps: BE-B02, DB-03]` `[ref: 01 F2-ADM-06]`

---

## 🟪 INTEGRAÇÃO E ENTREGA (fim de cada fase)

- [ ] **INT-01 · Ligar FE ao backend real (Fase 1)** — Desligar MSW no cliente, correr FE-E01 contra o backend, corrigir divergências de contrato (o OpenAPI manda). `[deps: FE-C*, BE-C*, DB-05]`
- [ ] **INT-02 · Deploy Fase 1** — Compose prod (api + Next standalone + proxy TLS), env vars prod, Supabase, smoke tests, UAT com o cliente → checklist F1 do `05 §4` → **saldo 10.500 MT**. `[deps: INT-01, DB-06]`
- [ ] **INT-03 · Ligar FE admin ao backend real (Fase 2)** — Idem INT-01 para as telas admin. `[deps: FE-D*, BE-D*, BE-E*, BE-F01]`
- [ ] **INT-04 · Migração do catálogo real + Deploy Fase 2** — Admin do cliente carrega catálogo (Excel/UI), verificação de restore de backup, UAT → checklist F2 do `05 §4` → **saldo 10.000 MT**. `[deps: INT-03]`

---

## Em curso

*(mover cartões para aqui ao começar)*

## Concluído

*(mover cartões para aqui ao terminar)*

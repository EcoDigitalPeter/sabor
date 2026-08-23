# Tasks — Quadro de Execução (estilo Trello)

> Todas as tarefas do projeto, na ordem de execução acordada: **primeiro o frontend (contra mocks), depois o backend (+ base de dados)**.
> Cada cartão é o mais **independente e baseado em componentes** possível para permitir paralelismo.
>
> **Como usar:** mover o estado marcando a checkbox (`[ ]` por fazer → `[x]` feito) e/ou copiando o cartão para as secções *Em curso* / *Concluído* no fim do ficheiro. Cada cartão indica: `ID · título · [deps] · ref. plano`.
>
> **Legenda de etiquetas:** 🟦 frontend · 🟨 backend · 🟩 base de dados · 🟪 transversal/integração · ⚡ desbloqueia paralelismo (fazer cedo).

---

## Faixas de paralelismo (visão rápida)

> **Mudança de plano (Ago/2026):** o backend voltou a ser um serviço **Java/Spring Boot separado**
> (`ottimizo/`, Java 21) — a tentativa anterior de o meter dentro do projeto Next.js (Route
> Handlers) foi abandonada. `BE-A` (fundações do backend) já não depende de `FE-A01` — os dois
> projetos evoluem em paralelo, ligados só pelo contrato REST (`/api/v1/**`).

```
FE-A  Fundações ⚡ ──▶  FE-B Componentes UI (todos paralelos entre si)
      │             └▶  FE-C Telas Cliente ─┐   (paralelas entre si após FE-B do que usam)
      │             └▶  FE-D Telas Admin  ──┤
      │             └▶  FE-L Telas Loja  ───┤   (Fase 3, depende de BE-L)
      ▼                                     ▼
BE-A  Fundações ⚡ ──▶  DB migrations (Flyway) ──▶ BE-B Auth ──▶ BE-C..F Domínios (paralelos) ──▶ BE-L Domínio Loja (Fase 3) ──▶ INT Integração/UAT
```

Regra de ouro: **MOCK-01 e FE-A ficam prontos primeiro** — a partir daí, qualquer cartão FE-B pode ser pegado por qualquer dev em paralelo; as telas (FE-C/FE-D/FE-L) só dependem dos componentes que usam + mocks. O backend Java (`ottimizo/`) evolui em paralelo ao frontend, não depende de `FE-A01`. No backend, após BE-B (auth), os domínios BE-C, BE-D, BE-E e BE-F são faixas independentes.

---

## 🟪 FASE 0 — Contrato e Mocks (pré-requisito do frontend-first) ⚡

- [x] **MOCK-01 · Congelar o contrato da API** — Escrever o OpenAPI (YAML) a partir da tabela de endpoints do `03-backend-plan.md` §8, incluindo schemas de `ApiResponse`, `PageResponse` e códigos `LSAxxx`. É a fonte de verdade FE↔BE. `[deps: —]` `[ref: 03 §3, §8]`
- [x] **MOCK-02 · Servidor de mocks (MSW)** — Configurar Mock Service Worker no projeto Next.js com handlers para todos os endpoints do MOCK-01 + fixtures realistas (1 plano completo de 7 dias com pratos moçambicanos, lista de compras, catálogos admin, respostas de erro LSAxxx). Todo o FE desenvolve contra isto. `[deps: MOCK-01, FE-A01]` `[ref: 03 §8]`
- [x] **MOCK-03 · Tipos TypeScript gerados** — Pipeline `openapi-typescript` a gerar `src/types/` a partir do MOCK-01; script npm + verificação no CI. `[deps: MOCK-01, FE-A01]` `[ref: 02 §5]`

---

## 🟦 FRONTEND

### FE-A — Fundações ⚡ (sequencial, curto — desbloqueia tudo)

- [x] **FE-A01 · Esqueleto Next.js + PWA** — Criar `levesabor-web` (App Router), `next-pwa`, `manifest.webmanifest` (theme `#C43E1C`, background `#F6ECDC`), estrutura de pastas do `02-ui-ux-plan.md` §5, ESLint/Prettier, CI (lint + build). `[deps: —]` `[ref: 02 §5]`
- [x] **FE-A02 · Design tokens** — `styles/tokens.css` com todas as variáveis da tabela `02 §1` (cores, fontes Bricolage/Work Sans/IBM Plex Mono com subsets, raios, focos, animações `ls-rise`/`ls-ring-in`). `[deps: FE-A01]` `[ref: 02 §1]`
- [x] **FE-A03 · Cliente HTTP + sessão** — `lib/api.ts` (injeta Bearer, refresh automático em 401, desembrulha `ApiResponse`, mapeia `LSAxxx`→mensagens), `lib/auth.ts` (sessão, roles, guards de rota CLIENTE/ADMIN), TanStack Query provider. Funciona igual contra MSW e backend real. `[deps: FE-A01, MOCK-03]` `[ref: 02 §5, 03 §3-4]`
- [x] **FE-A04 · Layouts e navegação** — Layout público, layout cliente (bottom-nav Plano/Compras/Perfil), layout admin (sidebar + topbar), redirecionamentos por role. `[deps: FE-A02, FE-A03]` `[ref: 02 §2]`

### FE-B — Biblioteca de componentes (todos **paralelos entre si**; deps: FE-A02)

- [x] **FE-B01 · Button / Input / Select / Checkbox** — Pílulas 100px, foco `outline 3px`, estados disabled/loading. `[ref: 02 §1]`
- [x] **FE-B02 · Card / Chip / StatusBadge** — Cartões 12–24px, chips mono estilo landing (`620 kcal · 35 min`), badges de estado (ACTIVE/SUSPENDED/DRAFT/PUBLISHED). `[ref: 02 §1, §3]`
- [x] **FE-B03 · Toast / Modal / ConfirmDialog / BottomSheet** — Toast 2,5s; diálogo de confirmação (simples e dupla); bottom-sheet mobile (usado na troca de refeição). `[ref: 02 §2]`
- [x] **FE-B04 · Skeleton / EmptyState / ErrorState** — Os 4 estados transversais do `02 §2`; EmptyState recebe ilustração + título + CTA. `[ref: 02 §2]`
- [x] **FE-B05 · MacroRing (sm/md/lg)** — SVG `stroke-dasharray` (técnica da landing), 4 segmentos na ordem/cores fixas (Proteína `#C43E1C` → Carbs `#E3A72E` → Gordura `#E7C9A0` → Fibra `#45614A`), kcal ao centro em mono; variante `lg` com legenda. Componente-assinatura — testar visualmente com valores extremos. `[ref: 02 §1]`
- [x] **FE-B06 · FormField + validação** — Wrapper de campo com label/erro inline; integração react-hook-form + zod (espelha as validações do plano funcional). `[ref: 01 (validações por funcionalidade)]`
- [x] **FE-B07 · DataTable admin** — Tabela paginada server-side reutilizável: pesquisa, filtros, ordenação, paginação por URL, estados loading/empty. Base de TODAS as telas de lista do admin. `[ref: 02 §3 T-10..T-19]`
- [x] **FE-B08 · Wizard / Stepper** — Contentor 1-pergunta-por-ecrã com progresso e rascunho local (usado no onboarding). `[ref: 02 §3 T-03]`
- [x] **FE-B09 · KpiCard + gráfico de linhas** — Cartão KPI e gráfico leve (sem lib pesada; ex. SVG próprio ou recharts se couber no orçamento de JS). `[ref: 02 §3 T-09]`
- [x] **FE-B10 · Ilustrações e ícones** — Gerar P-01..P-07 com os prompts do `02 §4`, otimizar (<60 KB), integrar logotipo SVG da landing e ícones Lucide; ícones de categoria P-06. `[deps: nenhum código — pode começar já]` `[ref: 02 §4]`

### FE-C — Telas do Portal Cliente (paralelas entre si; deps indicadas + MOCK-02)

- [x] **FE-C01 · T-01 Login + T-02 Registo** — Formulários, erros por campo, 409 email duplicado, redirecionamento por role. `[deps: FE-B01, B04, B06]` `[ref: 02 T-01/T-02, 01 F1-VIS-01/02]`
- [x] **FE-C02 · T-03 Onboarding do perfil** — Wizard 5 passos + resumo (objetivos/condições com labels exatos da landing), rascunho local, CTA final "Gerar o meu plano". `[deps: FE-B01, B06, B08]` `[ref: 02 T-03, 01 F1-CLI-01]`
- [x] **FE-C03 · T-04 Dashboard do plano** — Tabs de dias, cartões de refeição com MacroRing `sm`, resumo do dia, empty state com CTA, banner offline. `[deps: FE-B02, B04, B05]` `[ref: 02 T-04, 01 F1-CLI-03]`
- [x] **FE-C04 · T-07 Ecrã de geração** — Chamada síncrona ao endpoint de geração (sem polling — resposta única, até dezenas de segundos), mensagens rotativas por temporizador local enquanto aguarda, estados failed/limit_reached. `[deps: FE-B04]` `[ref: 02 T-07, 01 F1-CLI-02]`
- [x] **FE-C05 · T-05 Detalhe de refeição/receita** — MacroRing `lg` + legenda, ingredientes, passos numerados, notas de saúde, disclaimer; feedback 👍/👎 otimista; fluxo de troca com bottom-sheet. `[deps: FE-B02, B03, B05]` `[ref: 02 T-05, 01 F1-CLI-04/05]`
- [x] **FE-C06 · T-06 Lista de compras** — Grupos por categoria (ícones P-06), checkboxes otimistas, progresso, custo estimado com nota de parcialidade. `[deps: FE-B02, B04]` `[ref: 02 T-06, 01 F1-CLI-06]`
- [x] **FE-C07 · T-08 Perfil** — Edição por secção, aviso "vale a partir do próximo plano", zona para compras (província, cidade, bairro/zona, descrição), logout. `[deps: FE-B01, B06]` `[ref: 02 T-08, 01 F1-CLI-01]`
- [x] **FE-C08 · Offline/PWA do cliente** — Precache do shell; runtime cache do plano ativo e lista (stale-while-revalidate); fila local de toggles da lista com sync; excluir `/admin` do SW; testar com throttling 3G. `[deps: FE-C03, FE-C06]` `[ref: 02 §5, 01 F1-CLI-03/06]` *(nota: teste manual com throttling 3G ainda por fazer em DevTools — não automatizável pelo agente)*
- [x] **FE-C09 · T-06 CTA "Encomendar" + T-20/T-21 Escolher loja / Rever encomenda** — Fluxo de encomenda a partir da lista de compras: lista de lojas ativas recebida já ordenada pelo backend/mock com base na zona de compras do perfil, revisão de itens (checkbox + quantidade), nota opcional, confirmação. `[deps: FE-B01, B03, B06, FE-C07]` `[ref: 02 T-20/21 (novas), 01 F3-CLI-07]` *(frontend contra mocks — sem depender do backend `BE-L01` da Fase 3; o âmbito/promessa da funcionalidade continua Fase 3 — ver nota em `01-functional-plan.md` F3-CLI-07)*
- [x] **FE-C10 · T-22 Minhas encomendas** — Lista de encomendas do cliente com estado-badge, detalhe simples, cancelamento quando permitido. `[deps: FE-B02, B07]` `[ref: 02 T-22 (nova), 01 F3-CLI-07]` *(frontend contra mocks — sem depender do backend `BE-L01` da Fase 3)*

### FE-Q — Portal do cliente v2 (redesign visual, benchmark de UI de receitas externo)

- [x] **FE-Q01 · Camada de fotos + prompts** — `src/data/recipe-photos.ts` (lookup `recipeId → foto`, vazio/tipado) + 18× `public/images/receitas/<slug>/PROMPT.md`, um por receita de `RECIPE_CATALOG`. `[deps: —]` `[ref: plano portal v2]`
- [x] **FE-Q02 · MealCard v2** — Variante foto-primeiro (16:9, overlay em gradiente, `MacroRing sm` como selo) quando `getRecipePhoto` resolve; sem foto mantém o layout original inalterado. `[deps: FE-Q01]`
- [x] **FE-Q03 · Saudação no dashboard** — `/plano` com saudação por hora do dia + primeiro nome (`getSession()?.name`, já existente). `[deps: —]`
- [x] **FE-Q04 · RecipeStatCard + RecipeHero** — Cartão de estatística preenchido (âmbar/floresta) e hero de foto/fallback 4:3, componentes novos e independentes do `KpiCard` admin. `[deps: FE-Q01]`
- [x] **FE-Q05 · Redesign do detalhe da receita** — `page.module.css` novo (antes só `style={{}}` inline); `RecipeHero` + par de `RecipeStatCard` (Tempo/Custo); "Trocar este prato" promovido a CTA principal sempre visível (antes só aparecia depois de 👎), sem campo de texto livre. `[deps: FE-Q04]`
- [x] **FE-Q06 · Motivo livre na troca** — `POST .../swap` (mock) passou a aceitar `{ reason?: string }` no corpo; `SwapSheet` ganhou campo opcional (140 carateres) com chips de exemplo, mesma UX do `HeroQuiz` freeform. `[deps: —]`
- [x] **FE-Q07 · Fotos das 18 receitas** — As 18 fotos (ChatGPT) entregues em `public/images/receitas/<slug>/`, comprimidas para `photo.webp` (~1280px, qualidade 78, ~100–200 KB cada vs. ~2.5 MB no PNG bruto) e mapeadas em `recipe-photos.ts` por `recipeId`. PNGs brutos ficam fora do git (`.gitignore`). `[deps: FE-Q01]`
- [x] **FE-Q08 · Polimento /plano/gerar** — Fundo em gradiente radial (`--amber-soft` → `--cream`) a condizer com os novos cartões (RecipeStatCard/MealCard). `[deps: —]`
- [x] **FE-Q09 · Limpeza de estilos inline em /compras** — `compras/page.module.css` novo; `compras/page.tsx` passa a usar classes, sem mudança de layout/comportamento. `[deps: —]`

- [x] **FE-Q10 · MealCard compacto (layout único)** — Unifica os dois modos atuais do `MealCard` (foto 16:9 + overlay / sem foto) num único layout horizontal: miniatura quadrada ~84px + texto + `MacroRing sm` no fim da linha (flex, não absolute). Inspirado no ecrã "T-04 Dashboard do Plano" gerado pelo Stitch MCP. Spec: `docs/superpowers/specs/2026-07-19-mealcard-compacto-stitch-design.md`. `[deps: FE-Q02 (substitui)]`

Backlog (não agendado): **Modo Cozinhar** (temporizador circular passo-a-passo, inspirado no benchmark) — feature nova maior, precisa de modelo de dados próprio (tempo por passo não existe hoje); fica para uma sessão de planeamento dedicada.

### FE-R — Lista de compras: "já tenho isto" (despensa por item)

Spec: `docs/superpowers/specs/2026-07-19-lista-compras-ja-tenho-design.md`. Feature funcional (não visual) — o cliente indica quanto de cada ingrediente já tem em casa, e a lista/custo "a comprar" ajustam-se. Quantidade exata (não binário); só a partir dos itens já gerados na lista atual (sem catálogo de ingredientes pesquisável); reinicia sempre que o plano é regenerado ou uma refeição é trocada (sem persistência entre semanas).

- [x] **FE-R01 · `haveQuantity` no contrato + mock** — `ShoppingListItem.haveQuantity` (`src/types/api.d.ts`); `PATCH /me/shopping-list/items/{id}` aceita `{ checked?, haveQuantity? }`; `updateShoppingListItem` (`src/mocks/fixtures.ts`) substitui `setShoppingListItemChecked`, com custo "a comprar" recalculado pro-rata quando há preço de referência. `[deps: —]`
- [x] **FE-R02 · Hook `useUpdateShoppingItem`** — Generaliza `useToggleShoppingItem` (`src/hooks/useShoppingList.ts`); mesma mutação otimista + fila offline (`src/lib/offline.ts`, `QueuedPatch` generalizado de `QueuedToggle`) para `checked` e `haveQuantity`. `[deps: FE-R01]`
- [x] **FE-R03 · `ShoppingItemRow` — UI "Já tenho um pouco"** — Componente novo (`src/components/plan/ShoppingItemRow.tsx`), extraído de `ShoppingGroup`; link inline → input numérico na `unit` do item; quantidade "a comprar" e estado "já tens o suficiente" (esbatido, checkbox independente). `[deps: FE-R02]`
- [x] **FE-R04 · Totais em `/compras`** — Contador "X de Y comprados" e custo estimado no topo já derivam de `ShoppingList.estimatedCostMt`/`checkedItems`, sem mudança de fórmula — confirmado que refletem os valores "a comprar" pós-`haveQuantity`. `[deps: FE-R01]`

Fora do âmbito (decisão explícita no spec): despensa persistente entre semanas, catálogo de ingredientes pesquisável fora da lista atual, conversão de unidades (desnecessária — cada item já chega numa única `unit`).

### FE-S — Controlo de porções ("Pessoas em casa")

Spec: `docs/superpowers/specs/2026-07-19-controlo-porcoes-design.md`. Extraído do mock "T-04 Dashboard Gamificado" do Stitch, descartando os elementos de gamificação (streaks/XP/níveis, contra o `descricao.md` §1). Campo novo no perfil; escala quantidades/custo da lista de compras e das receitas pelo número de pessoas — kcal/macros ficam inalterados (são por pessoa, não por casa).

- [x] **FE-S01 · Contrato `householdSize`** — Novo campo `Profile.householdSize?: number` (1–8, default 1) no OpenAPI (`MOCK-01`) + tipos regenerados (`MOCK-03`). `[deps: MOCK-01, MOCK-03]` *(nota: `levesabor-api/openapi.yaml` não existe neste worktree — removido em `1ab41c3`, plano passou a backend dentro do Next.js — campo adicionado à mão em `src/types/api.d.ts`; recriar no OpenAPI quando `BE-A01` existir)*
- [x] **FE-S02 · Onboarding — passo "Quantas pessoas moram contigo?"** — Novo passo do wizard (stepper -/N/+), depois de "refeições por dia". `[deps: FE-S01, FE-C02]`
- [x] **FE-S03 · Perfil — secção "Pessoas em casa"** — Nova `ProfileSectionCard` editável, mesmo padrão das restantes secções. `[deps: FE-S01, FE-C07]`
- [x] **FE-S04 · Mock — escalar lista de compras + ingredientes da receita** — Os handlers de `GET /me/shopping-list` e das leituras de `RecipeSnapshot` (`.../entries/{id}`, `.../active`) multiplicam `quantity`/`estimatedCostMt` pelo `householdSize` do perfil; `kcal`/`macros` inalterados. `[deps: FE-S01]`

### FE-T — "Pedir receita agora" (receita avulsa fora do plano semanal)

Spec: `docs/superpowers/specs/2026-07-20-pedir-receita-agora-design.md`. Extraído do mesmo mock "T-04 Dashboard Gamificado" do Stitch que originou o `FE-S`; ficou de fora do escopo do `FE-S` por implicar um endpoint de geração novo. Cliente pede uma receita avulsa a qualquer momento (mini-wizard de 4 passos), recebe um cartão de resultado descartável, e pode guardá-lo num dia/refeição do plano ativo ou descartar.

- [x] **FE-T01 · Contrato — `AdHocRecipeRequest`/`AdHocRecipeHandle`/`LSA015_ADHOC_LIMIT`** — Tipos novos em `src/types/api.d.ts` (hand-editado, como `FE-S01`). `[deps: —]`
- [x] **FE-T02 · Mock — geração avulsa + "guardar num dia"** — `applyRecipeToEntry` partilhada (extraída do `swap`), `requestAdHocRecipe`/`pollAdHocRecipe` (padrão 202+polling do T-07, limite próprio 3/dia), `replaceMealPlanEntry`. `[deps: FE-T01]`
- [x] **FE-T03 · Mock — handlers novos** — `POST /me/recipes/adhoc`, `GET /me/recipes/adhoc/{id}`, `POST /me/meal-plans/entries/{id}/replace`. `[deps: FE-T02]`
- [x] **FE-T04 · Página `/plano/pedir-agora`** — mini-wizard (refeição/objetivo/nota/confirmar, reaproveita `Wizard`/`OptionCard` do onboarding) + ecrã de espera (padrão T-07) + cartão de resultado (padrão T-05: `RecipeHero`/`RecipeStatCard`/`MacroRing lg`) + `BottomSheet` "guardar num dia". `[deps: FE-T03]`
- [x] **FE-T05 · Cartão CTA no dashboard + teste e2e** — Cartão "Pedir uma receita" no topo do `/plano`; `e2e/pedir-agora.spec.ts` cobrindo o fluxo completo. `[deps: FE-T04]`

### FE-U — Plano mensal

Spec: ver plano de 2026-07-25 "Planos mensais + CTA de lista de compras/encomenda + gamificação discreta" (`vamos-ajustar-para-que-shiny-squid.md`). *(TODO: ainda não existe um `docs/superpowers/specs/*.md` dedicado para esta feature — escrever um seguindo o fluxo habitual do projeto, brainstorming→spec→plan, antes/durante a implementação.)* Mudança de plano: o plano do cliente passa de semanal para mensal (até 30/31 dias), ver `01-functional-plan.md` F1-CLI-02/F1-CLI-03.

- [x] **FE-U01 · Contrato + mocks — plano mensal** — Renomeia `weekStart` → `monthStart`; `WEEK_DATES`/`WEEK_MENU` → `MONTH_DATES`/`MONTH_MENU` (até 30/31 dias) em `src/types/api.d.ts` e `src/mocks/fixtures.ts`; campo `completed` por entrada do plano + endpoint mock de marcação; limite de geração ajustado para 1/dia. `[deps: —]` `[ref: 01 F1-CLI-02/03/05B]`
- [x] **FE-U02 · Navegação semana → dia no dashboard** — Seletor de semana (chips "Semana 1"…"Semana 5", semana atual pré-selecionada) por cima do `DayTabs` existente, que passa a listar só os dias da semana escolhida em vez do mês inteiro. `[deps: FE-U01]` `[ref: 01 F1-CLI-03]`
- [x] **FE-U03 · Cabeçalho/label do mês** — Cabeçalho de `/plano` passa de "semana de X" para o mês corrente (ex. "Julho"), coerente com o novo `monthStart`. `[deps: FE-U01]` `[ref: 01 F1-CLI-03]`

### FE-V — Gamificação discreta

Spec: ver plano de 2026-07-25 "Planos mensais + CTA de lista de compras/encomenda + gamificação discreta" (`vamos-ajustar-para-que-shiny-squid.md`). *(TODO: mesmo spec pendente referido em `FE-U` acima.)* Extraído do mesmo espírito do `FE-S` (que descartou streaks/XP/níveis de um mock Stitch por contrariarem `descricao.md` §1) — aqui a exceção deliberadamente contida: progresso/continuidade simples, sem pontos/níveis/badges. Ver `01-functional-plan.md` F1-CLI-05B.

- [x] **FE-V01 · Checkmark "Comi isto" no MealCard** — Novo estado `completed` (independente do 👍/👎 de `FE-C05`) no `MealCard`, update otimista com rollback em erro. `[deps: FE-U01]` `[ref: 01 F1-CLI-05B]`
- [x] **FE-V02 · Cálculo de sequência/streak** — Deriva do plano ativo (client-side) os dias consecutivos com ≥ 1 entrada `completed`, incluindo hoje; quebra num dia sem marcações. `[deps: FE-V01]` `[ref: 01 F1-CLI-05B]`
- [x] **FE-V03 · Componente `MonthProgressRing`** — Variante de um único segmento do `MacroRing` (`FE-B05`) para "X de 30 dias com refeição marcada", no topo do dashboard. `[deps: FE-B05, FE-V01]` `[ref: 01 F1-CLI-05B]`
- [x] **FE-V04 · Check-in semanal na lista de compras** — Mensagem discreta em `/compras` quando todos os itens de uma semana (agrupamento visual de `FE-U`/F1-CLI-06) ficam marcados; sem pontos/badge, só a mensagem. `[deps: FE-U01]` `[ref: 01 F1-CLI-05B, F1-CLI-06]`

### FE-W — Gaps do feedback do cliente (perfil, lista de compras, catálogo)

Tarefas nascidas de uma análise do feedback recebido do cliente sobre a app, cruzada com o código atual (ver `01-functional-plan.md`): o perfil não captura preferência alimentar, a lista de compras promete agregação por `ingredient_id` mas ainda é um mock estático pré-somado à mão, não há forma de adicionar um item manual à lista, e não existe catálogo navegável de receitas. Prioridade diferenciada — `FE-W01` é débito técnico urgente (fecha uma promessa já escrita no plano funcional, não é feature nova); o resto é `[Sugestão]` de baixo risco.

- [x] **FE-W01 · Mock — lista de compras com agregação real** ⚡ — `buildShoppingList()` em `src/mocks/fixtures.ts` deriva agora a lista a partir de `activePlan.days[].entries[].recipe.ingredients` (30 dias × 3 refeições), agregando por ingrediente+unidade; `SHOPPING_ITEMS_SEED` reproposto como tabela de lookup categoria/preço de referência. `[deps: —]` `[ref: 01 F1-CLI-06]`
- [x] **FE-W02 · Onboarding/Perfil — passo "Preferências alimentares"** — Novo passo do wizard + secção editável em `/perfil` (chips multi-seleção: vegetariana, vegan, sem glúten, sem lactose, alta proteína, baixo calórico), mesmo padrão dos chips de alergias. `[deps: —]` `[ref: 01 F1-CLI-01]`
- [x] **FE-W03 · Mock — pré-filtro considera `dietaryPreferences`** — Âmbito ajustado na implementação: a "geração" do plano mensal em si é um seed fixo (fora de risco mexer); o pré-filtro por preferência foi aplicado nos dois pontos que já fazem seleção dinâmica sobre o catálogo — `pickAlternative` (troca de refeição) e `pickAdHocRecipe` ("Pedir receita agora") — ambos preferem receitas cujo `healthTags` interseta `dietaryPreferences`, com fallback ao comportamento anterior quando não há preferências definidas. `[deps: FE-W02]` `[ref: 01 F1-CLI-01, F1-CLI-02]`
- [x] **FE-W04 · `/compras` — botão "+ Adicionar item" manual** — `AddItemSheet` (BottomSheet) + `useAddShoppingItem()`; item criado com `origin: "MANUAL"`, sobrevive a regenerações do plano. `[deps: FE-W01]` `[ref: 01 F1-CLI-06B]`
- [x] **FE-W05 · Nova página `/receitas` — catálogo navegável com filtro** — Grelha de receitas `PUBLISHED` com chips de filtro + pesquisa; pré-seleciona filtros com `dietaryPreferences` do perfil; detalhe em `BottomSheet` reaproveitando `RecipeHero`/`MacroRing`/lista de ingredientes e passos (a rota `/plano/refeicao/[entryId]` é indexada por entrada de plano, não serve para receitas fora de um plano); ponto de entrada em `/inicio` (`BottomNav` já tinha 4 itens). `[deps: FE-W02]` `[ref: 01 F1-CLI-08]`

### FE-D — Telas do Portal Admin (paralelas entre si; deps indicadas + MOCK-02)

- [x] **FE-D01 · T-09 Dashboard de métricas** — KPIs, gráfico planos/dia, top/bottom receitas, custo IA, seletor de período. `[deps: FE-B09]` `[ref: 02 T-09, 01 F2-ADM-06]` *(inclui o shell de navegação admin — sidebar/topbar, `AdminShell`/`AdminSidebar`/`AdminTopbar` — que FE-D02/D03/D06/D07 reutilizam)*
- [x] **FE-D00 · Infra mock admin partilhada** — `pageOf()` real (pesquisa/ordenação/paginação, antes devolvia sempre a lista inteira); funções CRUD em `src/mocks/fixtures.ts` (get/create/update/delete/status para os 4 recursos, `LSA006`/`LSA021`/`LSA022`/`LSA023`); handlers novos em `handlers.ts`; `src/data/health-tags.ts` (vocabulário fechado de 10 tags); hooks `useAdminUsers/Stores/Recipes/Ingredients`; extensão de `proposeOrApplySwap` para guardar motivos de troca recentes (`getRecentSwapReasons`, usado por `FE-D06`). `[deps: MOCK-02]` `[ref: 01 F2-ADM-01/02/05]`
- [x] **FE-D02 · T-10/T-11 Utilizadores** — Lista (DataTable, filtros role/estado) + detalhe com suspensão (confirmação, bloqueada em `LSA022_LAST_ADMIN`) e "Ver perfil de saúde" explícito (inclui `dietaryPreferences`, ver `FE-W02`, **e `householdSize`, ver `FE-S01`** — mesmo reveal auditado, não são campos à parte); "+ Novo admin" (`CreateAdminSheet`). `[deps: FE-D00, FE-B03, B07]` `[ref: 02 T-10/11, 01 F2-ADM-01]` *(escopo reduzido: "criar conta de lojista" adiada, mesma razão do FE-D03 — ver `FE-L01`)*
- [x] **FE-D03 · T-12/T-13 Lojas** — Lista (DataTable, pesquisa nome/cidade) + formulário de registo (`nova`/`[id]`, campos partilhados em `StoreFormFields`); suspender/reativar e eliminar com confirmação (eliminação bloqueada quando `productCount > 0` — suspende em vez de eliminar); 409 `LSA006` (nome+cidade duplicados) mapeado a erro inline. `[deps: FE-D00, FE-B03, B06, B07]` `[ref: 02 T-12/13, 01 F2-ADM-02]` *(escopo reduzido: "criar conta de lojista" adiada — o role `LOJISTA` ainda não existe no contrato `User.role` e não há Portal da Loja para essa conta aceder; ver `FE-L01`)*
- [x] **FE-D06 · T-17/T-18 Receitas** — Lista com feedback agregado (👍/👎 + motivos de troca mais recentes, ver `FE-Q06`) + formulário rico (`RecipeForm` partilhado entre `nova`/`[id]`: ingredientes dinâmicos, passos ordenáveis, **multi-select de tags com as 10 do vocabulário fechado — as 6 originais + `vegan`/`sem_lactose`/`alta_proteina`/`baixo_calorico` adicionadas pelo `FE-W02`/`FE-W05`, gap confirmado: o formulário tem de as oferecer, senão o filtro do `/receitas` e o pré-filtro por preferência do cliente ficam sem conteúdo novo para trabalhar**, painel de macros com MacroRing `md` + override manual), publish com checklist de bloqueios (`LSA023_RECIPE_INCOMPLETE`). `[deps: FE-D00, FE-B05, B06, B07]` `[ref: 02 T-17/18, 01 F2-ADM-05]`
- [x] **FE-D07 · T-19 Ingredientes** — Página única (sem `nova`/`[id]`) com DataTable + `IngredientSheet` (BottomSheet, criar/editar), pesquisa por nome, desativar via campo `active`, remoção bloqueada com lista de receitas afetadas (409 `LSA021_INGREDIENT_IN_USE`). `[deps: FE-D00, FE-B07]` `[ref: 02 T-19, 01 F2-ADM-05]`

> `FE-D04`/`FE-D05` (Produtos/Import Excel no admin) foram **removidos** — mudança de plano: a gestão de catálogo passou para o Portal da Loja (ver `FE-L` abaixo).

### FE-X — Gaps de paridade cliente↔admin

Tarefas nascidas de uma análise de correspondência: para cada funcionalidade do lado do cliente, existe o par equivalente do lado do admin (visibilidade em métricas ou ecrã de gestão)? Cruzando `01-functional-plan.md` (F2-ADM-06 foi escrito antes de `FE-T`/`FE-C09`/`FE-C10` existirem) com o código atual, as lacunas de paridade foram fechadas no frontend contra mocks. `FE-D02/03/06/07` já têm telas reais, hooks e handlers MSW; os itens abaixo tratam apenas extensões de métricas no dashboard admin. `[Sugestão]` marca prioridade mais baixa, análogo ao critério usado em `FE-W`.

- [x] **FE-X01 · Métricas — Pedir receita agora** — Campo `adHocRecipeRequestsCount` no contrato `MetricsSummary` (`src/types/api.d.ts`), ligado ao contador real do mock (`dailyAdHocCount`) em `buildMetricsSummary()` (`src/mocks/fixtures.ts`) + `KpiCard` "Pedidos avulsos" no dashboard admin (`src/app/admin/page.tsx`). `[deps: FE-D01, FE-T02]` `[ref: 01 F2-ADM-06 (extensão)]`
- [x] **FE-X02 · Métricas — Encomendas agregadas** — Campo `ordersInPeriod` (total + contagem por estado) no `MetricsSummary`, derivado ao vivo das encomendas em memória do mock; `KpiCard`/mini-tabela "Encomendas" no dashboard admin. `[deps: FE-D01, FE-C09]` `[ref: 01 F2-ADM-06 (extensão)]`
- [x] **FE-X03 · [Sugestão] Métricas de engajamento** — Campo `engagement` (streak ativo/dias completados) no `MetricsSummary` + `KpiCard` "Streak ativo". Sem equivalente real no mock (streak é calculado client-side a partir de um único cliente fixture; "% de clientes" pressupõe multi-utilizador) — valor estático ilustrativo, documentado em `buildMetricsSummary()`, mesmo padrão de `mealPlansGenerated`/`aiSuccessRate`. `[deps: FE-D01]` `[ref: FE-V]`

### FE-Y — Nova ronda de feedback do cliente (agosto 2026)

Tarefas nascidas de `feedback/feedback.txt` (ago/2026), cobrindo quase toda a jornada do cliente. Ver plano detalhado (frentes, decisões de âmbito e ficheiros exatos) em `docs/superpowers/specs/` (a escrever) ou no histórico de planeamento da sessão que gerou esta faixa. `Y02`→`Y03`→`Y04` partilham o mesmo ficheiro monolítico (`onboarding/page.tsx`) — tratar como sequenciais, não paralelos entre si; as restantes são paralelas.

- [x] **FE-Y01 · Landing — ajustes de copy** — Remover "crédito" de "sem cartão de crédito"; "tuas preferências"→"tuas preferências alimentares"; "receitas reais"→"refeições reais" (sem reintroduzir nomes de pratos, regra 7 do guia de copy). `[deps: —]` `[ref: 06 regra 7, feedback.txt L1-9]`
- [x] **FE-Y02 · Onboarding — Objetivo & Condição de saúde** — Nova imagem no passo objetivo; checkmark visual no `OptionCard` selecionado; condição de saúde com opção "Outra" (texto livre) e seleção múltipla (`healthConditions: string[]`, ver `01-functional-plan.md` F1-CLI-01); propagar labels "Ganhar massa muscular"/"Controlar uma condição de saúde" em `onboarding/page.tsx`, `perfil/page.tsx`, `plano/pedir-agora/page.tsx`, `HeroQuiz.tsx`, `LandingPage.tsx` (grep obrigatório, regra 5 do guia). `[deps: —]` `[ref: 01 F1-CLI-01, feedback.txt L20-38]`
- [x] **FE-Y03 · Onboarding — Alergias, Preferências, Orçamento, Refeições, Pessoas** — Separar Alergias de "Alimentos que não comes"; "Vegan"→"Vegana", "Baixo teor calórico"→"Baixo em calorias", nova opção "Sem preferência"; orçamento `Baixo/Médio/Confortável`→`Económico/Equilibrado/Premium` com faixas indicativas em MT; reformular perguntas de refeições/dia e pessoas em casa. `[deps: FE-Y02 (mesmo ficheiro)]` `[ref: feedback.txt L40-81]`
- [x] **FE-Y04 · Onboarding — Resumo, ecrã final e consentimento médico** — "Nome"→"Nome completo" no registo; mover o consentimento médico do registo para o resumo do onboarding (antes do CTA de gerar o 1º plano); reformular a frase do aviso; link "Editar" por secção no resumo; hierarquia valores>labels; CTA final renomeado; loading com frases rotativas. `[deps: FE-Y02, FE-Y03 (mesmo ficheiro)]` `[ref: feedback.txt L12-18, L84-133]`
- [x] **FE-Y05 · Tela Plano/Início — dashboard e streak** — Renomear CTAs não-destrutivamente; destacar refeição atual por hora do dia; kcal+proteína no `MealCard`; mensagem motivacional junto ao "0/30"; nome de refeição limpo + tag separada (campo novo em `RecipeSnapshot`); indicador "dentro do objetivo". `[deps: —]` `[ref: feedback.txt L136-208, L344-372]`
- [x] **FE-Y06 · Pedir receita agora — wizard, resultado e guardar/substituir** — Contexto por passo; seleção preenchida a cor; reformular as 4 perguntas; unidade "kcal" no resultado; CTAs visíveis; renomear "Descartar"; destacar dia/refeição alvo + data completa ao guardar; `ConfirmDialog` ao substituir refeição existente. `[deps: —]` `[ref: feedback.txt L210-326]`
- [x] **FE-Y07 · Lista de compras** — Resumo com contadores antes dos botões; "Já tenho um pouco"→"🏠 Tenho em casa" como stepper `[-]/[+]`; arredondar quantidades a tamanho de embalagem real (tabela global por unidade); impacto de custo antes/depois; item comprado esbatido + colapso automático de categoria; barra de progresso. `[deps: —]` `[ref: feedback.txt L374-489]`
- [x] **FE-Y08 · Escolha de loja (+ admin de lojas)** — Novos campos em `Store` (rating, horário, entrega, preço médio, coordenadas), editáveis em `StoreFormFields` (admin) e visíveis na escolha de loja do cliente; pesquisa de loja; mapa simples. `[deps: —]` `[ref: feedback.txt L490-509]`

### FE-L — Telas do Portal da Loja (Fase 3; paralelas entre si; deps indicadas + MOCK-02)

- [x] **FE-L01 · Layout loja** — `LojaShell`/`LojaSidebar`/`LojaTopbar` (mirror dos componentes admin), guarda de rota `LOJISTA` em `src/app/loja/layout.tsx`, redirecionamento por role em `/login`. Role `LOJISTA` adicionada ao contrato (`AuthResult.user.role`/`User.role`, hand-edit em `api.d.ts`, mesmo padrão de `FE-S01`/`FE-X0x`) e a `src/lib/auth.ts`; conta lojista fixa no mock (`loja@ottimizo.mz`, qualquer password), ligada à loja "Loja Zambézia" (`storeId 5`) — mock de loja única, sem multi-tenancy real, mesma simplificação do cliente fixture único. `[deps: FE-A04]` `[ref: 02 (novo), 01 Persona 4]`
- [x] **FE-L02 · T-23/T-24 Produtos da loja** — Lista (`DataTable`, pesquisa nome, filtro categoria/estado) + formulário partilhado (`ProductFormFields`: nome, categoria, unidade, preço) entre `novo`/`[id]`; sem seletor de loja. Desativar/reativar + eliminar bloqueado quando o produto está numa encomenda ativa (409 do mock, sem contagem pré-carregada como em `admin/lojas` — a tentativa é sempre permitida e o bloqueio aparece no erro). `[deps: FE-B06, B07, FE-L01]` `[ref: 02 T-23/24 (novas), 01 F3-LOJ-01]`
- [x] **FE-L03 · T-25 Import Excel da loja** — Dropzone (.xlsx, ≤5MB) → pré-visualização → confirmação → resultado, estados `idle→validating→preview→confirming→done/failed`. *(Limitação aceite do mock: sem lib de parsing/escrita `.xlsx` instalada no projeto — a validação devolve sempre a mesma pré-visualização determinística e template/export são um blob `text/csv`, documentado em `fixtures.ts`; não há backend real por trás.)* `[deps: FE-B03, B07, FE-L01]` `[ref: 02 T-25 (nova), 01 F3-LOJ-02]`
- [x] **FE-L04 · T-26/T-27 Encomendas da loja** — Lista (`DataTable`, filtro por estado) + detalhe (cartão do cliente, itens, botões de transição válidos só para o estado atual). `Order` ganhou `customerName`/`customerContact` (hand-edit no contrato, mesmo padrão de snapshot de `storeName`/`storeContact`) — preenchidos a partir do cliente fixture único em `createOrder()`, já que o schema original só tinha a perspetiva do cliente. `[deps: FE-B03, B07, FE-L01]` `[ref: 02 T-26/27 (novas), 01 F3-LOJ-03]`

### FE-P — Landing v2 ("excitação") — a v1 (FE-P01) foi implementada via `docs/superpowers/specs/2026-07-14-landing-page-design.md`, fora deste quadro; esta faixa cobre a evolução seguinte, feita depois de comparar com Fotor/DishGen.

- [x] **FE-P02 · Fundações de movimento** — Tokens `--motion-*`/`--ease-out` em `tokens.css`, `Reveal.tsx` (IntersectionObserver) + `motion.module.css`, transição do FAQ (`grid-template-rows: 0fr→1fr`), hover-lift nos cartões existentes, guard `prefers-reduced-motion`. `[deps: —]` `[ref: plano landing v2 §3]`
- [x] **FE-P03 · Hero v2** — Novo headline/sub/microcopy; `HeroQuiz` v2 (plano por `goal × condition`, beat "a compor…", count-up de kcal, modo de texto livre com chips de exemplo); `LandingNav` com âncoras (`#como-funciona`, `#pratos`, `#faq`) + ênfase do CTA ao scroll. `[deps: FE-P02]` `[ref: §2.1-2.2]`
- [x] **FE-P04 · Galeria de pratos + benefícios** — `DishGallery.tsx` (8 pratos moçambicanos, expande com `MacroRing` + CTA), `dish-gallery-data.ts`, `BenefitCards.tsx` (ícones Lucide como fallback). `[deps: FE-P02]` `[ref: §2.4-2.5]`
- [x] **FE-P05 · Product showcase** — `ProductShowcase.tsx` + `showcase-fixtures.ts` (tipadas contra `src/types/api.d.ts`) a renderizar `MealCard`/`DayTabs`/`MacroRing`/`ShoppingGroup` reais numa moldura CSS; substitui o antigo painel estático de macros. `[deps: FE-P02]` `[ref: §2.7]`
- [x] **FE-P06 · Prova honesta + FAQ v2 + CTA final + montagem** — `ProofStrip.tsx`, cartão "Em desenvolvimento aberto" na secção de confiança, FAQ 4→7 perguntas, CTA final v2, CTAs por secção, ordem final das secções em `LandingPage.tsx`. `[deps: FE-P03..P05]` `[ref: §2.3, 2.10-2.12]`
- [x] **FE-P07 · Prompts de imagens da landing** — `PROMPT.md` para P-08 (prato do hero), P-09 (galeria de 8 pratos), P-10 (ícones de benefícios), P-11 (fundo do CTA) em `public/images/{hero-prato,pratos,beneficios,fundo-cta}/`; página funciona só com os fallbacks CSS/Lucide, sem depender destas imagens. `[deps: nenhum código]` `[ref: 02 §4]`
- [x] **FE-P08 · QA da landing v2** — `e2e/landing.spec.ts` + `playwright.config.ts` (novo, o projeto ainda não tinha config Playwright) cobrindo secções/quiz/FAQ/CTAs/reduced-motion/360px — 8/8 a passar (usa o Chrome do sistema via `channel: "chrome"`, porque `cdn.playwright.dev` não é alcançável neste ambiente para descarregar o Chromium próprio do Playwright); `npm run build`+`lint`+`typecheck` também verificados. `[deps: FE-P06]` `[ref: §7]`
- [x] **FE-P09 · Polimento da landing (mock Stitch)** — Hero com `hero-prato.webp` como fundo full-bleed (≥1024px) + `HeroQuiz` sobreposto em cartão "vidro" (`backdrop-filter`) + selo estático "Sugestão do Dia"; sombra na `LandingNav` a partir de ~20px de scroll; disclaimer médico do rodapé movido para dentro de `.footerBrand`, em itálico. Mobile mantém-se inalterado (sem a foto grande). Spec: `docs/superpowers/specs/2026-07-19-landing-polimento-stitch-design.md`. `[deps: FE-P03 (HeroQuiz), FE-P06 (footer)]`

### FE-E — Qualidade frontend

- [x] **FE-E01 · Testes E2E (Playwright) contra mocks** — Fluxos do **portal do cliente** concluídos: registo→onboarding (incl. preferências alimentares)→plano, troca de refeição completa, lista de compras (marcar/"já tenho"/adicionar item manual), catálogo `/receitas`, cancelar encomenda — 5 specs, 10 testes, `e2e/registo-onboarding.spec.ts` / `troca-refeicao.spec.ts` / `lista-compras-interacoes.spec.ts` / `receitas.spec.ts` / `encomendas-cancelar.spec.ts`. **Portal admin concluído**: `e2e/admin-lojas.spec.ts` (4), `admin-ingredientes.spec.ts` (4), `admin-utilizadores.spec.ts` (5), `admin-receitas.spec.ts` (4) — 17 testes. **Portal da loja concluído**: `e2e/loja-produtos.spec.ts` (4 — lista/pesquisa, criação, eliminação bloqueada por encomenda ativa, import Excel completo) + `e2e/loja-encomendas.spec.ts` (3 — lista/filtro, aceitar, recusar) — 7 testes. 34 testes no total, todos a passar isoladamente/por spec (`--workers=1`; ver nota de memória abaixo). *(Nota: correr a suite completa com paralelismo total esgota memória do Node (`JavaScript heap out of memory`) nesta máquina — não é regressão, é limite de recursos ao somar tantos browsers Chromium em simultâneo; correr com `--workers` reduzido ou em lotes até isso ser afinado.)* `[deps: telas correspondentes]` `[ref: 05 checklist]`
- [x] **FE-E02 · Auditoria de performance/dados** — Bundle da área cliente 116-126 KB gzip (meta <200 KB, folga confortável); Lighthouse Performance 76 (categoria "PWA" descontinuada no Lighthouse atual); `next/image`/`next/font` já usados corretamente; `@next/bundle-analyzer` configurado (`npm run analyze`) para auditorias futuras. `[deps: FE-C08]` `[ref: 02 §5]`

---

## 🟨🟩 BACKEND + BASE DE DADOS

> Stack real (Ago/2026): Java 21 / Spring Boot 3.5 em `ottimizo/` (raiz do repo, fora de
> `levesabor/`), Flyway para migrações, Spring Data JPA/Hibernate, Spring AI (`ChatClient`) para as
> features de IA, Supabase Auth como emissor do JWT (backend valida via OAuth2 resource server,
> não gere password/refresh tokens próprios). Contrato de resposta comum já existe:
> `ApiResponse<T>`/`PageResponse<T>`, `ErrorCode` (`com.ottimizo.common.error`, ~20 códigos `LSAxxx`
> já reservados), `GlobalExceptionHandler`, `CorrelationIdFilter`. Ver plano de implementação
> completo em `D:\Users\M001419\.claude\plans\faca-um-plano-para-imperative-petal.md` (fases
> técnicas detalhadas, riscos em aberto).

### BE-A — Fundações ⚡ (sequencial, curto)

- [x] **BE-A01 · Esqueleto Spring Boot** — Projeto `ottimizo/` (Java 21, Spring Boot 3.5), `pom.xml` com starters `web`/`data-jpa`/`security`/`oauth2-resource-server`/`validation`/`actuator`, `flyway-database-postgresql`, `springdoc-openapi` (gera `/v3/api-docs` automaticamente — passa a ser a fonte de verdade do contrato, substitui o `openapi.yaml` manual perdido), `spring-ai-starter-model-openai`. `[deps: —]` `[ref: plano técnico Fase 1]`
- [x] **BE-A02 · Núcleo transversal** — `ApiResponse<T>`/`PageResponse<T>`, `ErrorCode` (enum `LSAxxx`), `ServiceException`, `GlobalExceptionHandler` (`@RestControllerAdvice`), `CorrelationIdFilter` (header `x-correlation-id` + MDC). `[deps: BE-A01]`
- [x] **BE-A03 · Segurança e contexto de utilizador** — `SecurityConfig` (JWT OAuth2 resource server contra issuer/JWKS do Supabase, regras de rota por `Role`), `CurrentUser`/`UserContextService` (resolve `AppUser` a partir do `sub` do JWT, bloqueia `SUSPENDED`). `[deps: BE-A01]`
- [x] **BE-A04 · AuditService + Testcontainers** — Entidade `AuditLog` (mapeia `audit_log`, já existe desde V001) + `AuditService.record(...)` transacional, chamado por todos os services de escrita das fases seguintes. Adicionar `org.testcontainers:postgresql`+`junit-jupiter` ao `pom.xml` (ainda não presente) + classe base `@Testcontainers` a correr as migrações Flyway reais — pré-requisito dos testes de integração de `BE-C`/`BE-D`/`BE-E`/`BE-L` em diante. `[deps: BE-A02]`

### DB — Migrations Flyway (já escritas; entidades JPA/controllers por cima é que faltam)

- [x] **DB-01 · V001 auth + audit** — `users`, `audit_log`. *(sem `refresh_tokens` — decisão de usar Supabase Auth como IdP, não password/refresh tokens próprios; ver risco em aberto sobre o modelo de integração no plano técnico)* `[ref: V001__auth_users_audit.sql]`
- [x] **DB-02 · V002 perfis + catálogo nutricional** — `client_profiles`, `ingredients`, `recipes`, `recipe_ingredients`, `recipe_steps`, `meal_feedback`, `recipe_swap_reasons`. `[ref: V002__profiles_catalog_plans.sql]`
- [x] **DB-03 · V003 planos + listas** — `meal_generations`, `meal_plans`, `meal_plan_days`, `meal_plan_entries`, `shopping_lists`, `shopping_list_items`, `ad_hoc_recipe_requests`. `[ref: V003__meal_plans_shopping.sql]`
- [x] **DB-04 · V004 lojas + catálogo próprio + encomendas** — `stores`, `products`, `import_jobs`, `orders`, `order_items`, `store_rankings_cache`. *(já inclui o âmbito que o plano antigo separava em "DB-04 lojas" + "DB-07 loja Fase 3" — a migração real fundiu os dois)* `[ref: V004__stores_products_orders.sql]`
- [x] **DB-05 · V005 views + realtime** — `ai_generation_log` + 6 views SQL para dashboards admin (`v_recipe_feedback_summary`, `v_store_product_counts`, `v_admin_recipe_list`, `v_order_status_counts`, `v_admin_metrics_daily`, `v_user_engagement_monthly`) + publicação `supabase_realtime`. *(nota: âmbito diferente do "V5 seed" do plano antigo — seed de receitas/admin inicial ainda não existe como migração, ver `DB-06` abaixo)* `[ref: V005__views_realtime.sql]`
- [x] **DB-06 · Seed de dados** — Admin inicial + ≥ 40 receitas moçambicanas com nutrição/tags **(conteúdo do cliente — risco R2 do `05-implementation-roadmap.md`)** + ~30 ingredientes, como migração Flyway `V006__seed.sql` ou script separado. `[deps: BE-D/BE-E (CRUD para validar os dados), conteúdo do cliente]`
- [x] **DB-07 · Projeto Supabase prod** — Confirmar/configurar o projeto Supabase de produção (pooler de transações, JWKS URI, `SUPABASE_JWT_ISSUER`), testar `mvn flyway:migrate`/arranque do Spring Boot contra ele, agendar `pg_dump` externo diário + teste de restore. `[deps: DB-01]`

### BE-B — Autenticação e utilizadores (após BE-A; desbloqueia todos os domínios)

- [x] **BE-B01 · Decisão do modelo Supabase Auth** — **Decidido (2026-08-15):** o frontend usa `supabase-js` diretamente para signup/login/refresh (Supabase já emite o JWT que `SecurityConfig` valida via JWKS); o backend só expõe um endpoint de "bootstrap" que cria o `AppUser` local a partir de um JWT já válido. `login`/`refresh`/`logout` **não são** endpoints do backend — o `01-functional-plan.md` descreve-os assumindo password/refresh tokens próprios, isso já não se aplica; corrigir esse documento quando for reescrito. Sem service-role key no backend. `[deps: —]`
- [x] **BE-B02 · `AuthController`** — `POST /api/v1/auth/register` (bootstrap do `AppUser` local a partir de um JWT Supabase já válido, idempotente — nunca `login`/`refresh`/`logout` no backend, ver `BE-B01`). `[deps: BE-A03]` `[ref: 01 F1-VIS-01/02]`
- [x] **BE-B03 · `AdminUserController`** — `GET /admin/users` (paginado, filtros role/estado), `GET/PATCH /admin/users/{id}` (suspensão — incluindo invalidar a sessão do lado do Supabase, não só `status=SUSPENDED` local), `POST /admin/users` (criar admin/lojista), regra "último admin ativo" (`LSA022`). `[deps: BE-A04, BE-B02]` `[ref: 01 F2-ADM-01]`

### BE-C — Domínio Cliente (após BE-B; C1→C2→C3 em cadeia; C4/C5 paralelos a C2)

- [x] **BE-C01 · Perfil** — Completar entidade `ClientProfile` (falta `healthConditions text[]`, `healthConditionOther`, `allergies`/`foodExclusions jsonb`, `dietaryPreferences text[]` — colunas já existem em V002, só a entidade JPA ficou incompleta; usar `@JdbcTypeCode(SqlTypes.ARRAY)`/`SqlTypes.JSON`, Hibernate 6). `ProfileController` — `GET/PUT /api/v1/me/profile`, validação Bean Validation dos enums `Goal`/`BudgetBand`/vocabulário de `dietaryPreferences` (labels byte-idênticos ao `01-functional-plan.md`). `[deps: BE-B02]` `[ref: 01 F1-CLI-01]`
- [x] **BE-C02 · `RecipeCatalogService` (pré-filtros duros)** — Elegibilidade por condição de saúde (celíaco = filtro duro `sem_gluten`), alergias, feedback 👎 excluído/despriorizado, 👍 preferido. Sem IA — é puro Java sobre o catálogo `PUBLISHED`. Testes unitários exaustivos por condição — é a barreira anti-alucinação, merece o maior investimento de testes de toda a Fase C. `[deps: BE-C01, BE-D02]` `[ref: 01 F1-CLI-02 regras]`
- [x] **BE-C03 · `AiMealPlanService` (Spring AI)** — `ChatClient` sobre o catálogo pré-filtrado, valida cada `recipeId` devolvido contra a lista curada (mesmo padrão de `StoreRankingService.normalizeRanking`), retries limitados, `LSA013_AI_UNAVAILABLE` em falha final. Entidades `MealGeneration`/`MealPlan`/`MealPlanDay`/`MealPlanEntry` + `AiGenerationLog`. **Decisão: geração assíncrona** (`POST` devolve 202 + `MealGeneration(GENERATING)`, processamento `@Async`, frontend faz polling — o schema `meal_generations.status` já foi desenhado para isto; o fluxo síncrono do `01-functional-plan.md` era herança do desenho Vercel/Next.js abandonado). `[deps: BE-C02]` `[ref: 01 F1-CLI-02]`
- [x] **BE-C04 · Plano ativo + entradas** — `GET /me/meal-plans/active`, `GET .../{id}`, `GET .../entries/{id}`, `GET /me/meal-plans/generations/{id}` (polling), ownership em tudo. `[deps: BE-C01]` *(paralelo a BE-C03)* `[ref: 01 F1-CLI-03/04]`
- [x] **BE-C05 · Feedback + swap** — `PUT /me/recipes/{id}/feedback` (entidade `MealFeedback`); `POST .../entries/{id}/swap` (alternativa determinística compatível ±20% kcal, sem IA, transacional com rebuild da lista; `LSA014_NO_ALTERNATIVE`). `[deps: BE-C02, BE-C04]` `[ref: 01 F1-CLI-05]`
- [x] **BE-C06 · Lista de compras** — Entidades `ShoppingList`/`ShoppingListItem`. `ShoppingListService.rebuildForPlan` (agregação por `ingredient_id` + conversão g/kg, ml/l; preserva `checked`; item `MANUAL` sobrevive a regenerações), `GET /me/shopping-list`, `PATCH .../items/{id}`, `POST .../items` (item manual). `[deps: BE-C04]` `[ref: 01 F1-CLI-06/06B]`
- [x] **BE-C07 · Encomendas (cliente)** — `POST /me/orders`, `GET /me/orders`, `GET /me/orders/{id}`, `PATCH /me/orders/{id}/cancel` (`LSA017_ORDER_NOT_CANCELABLE`); resolução best-effort de preço unitário pelo catálogo da loja. `[deps: BE-C06, BE-L02]` `[ref: 01 F3-CLI-07]` **Fase 3**
- [x] **BE-C08 · Pedido avulso de receita** — Entidade `AdHocRecipeRequest`. `POST /me/recipes/adhoc`, `GET /me/recipes/adhoc/{id}`, `POST /me/meal-plans/entries/{id}/replace`. Reutiliza `RecipeCatalogService`/`AiMealPlanService` em escala menor (1 receita). `LSA015_ADHOC_LIMIT` (3/dia). `[deps: BE-C02, BE-C03]` `[ref: 01 F1-CLI (Pedir agora)]`
- [x] **BE-C09 · Catálogo de receitas navegável** — `GET /me/recipes?tags=...&q=...`, paginado, só `PUBLISHED`. `[deps: BE-D01]` `[ref: 01 F1-CLI-08]`

### BE-D — Domínio Admin: catálogo (após BE-B; D1/D2 paralelos entre si)

- [x] **BE-D01 · CRUD ingredientes + receitas** — Completar entidades `Ingredient` (campos nutricionais: `kcalPer100g`/`proteinPer100g`/`carbsPer100g`/`fatPer100g`/`fiberPer100g`, já em V002) e `Recipe` (`healthNote`, `healthTags text[]`, `proteinPct`/`carbsPct`/`fatPct`/`fiberPct`, `macrosOverride`, relação com `RecipeStep`); nova entidade `RecipeIngredient` (tabela existe desde V002, sem entidade JPA ainda). `AdminIngredientController`/`AdminRecipeController` — CRUD + `PATCH .../status` (publish/unpublish), `RecipeMacroCalculator`, `RecipePublicationValidator` (`LSA023_RECIPE_INCOMPLETE`), bloqueio de remoção de ingrediente em uso (`LSA021_INGREDIENT_IN_USE`). `[deps: BE-A04]` `[ref: 01 F2-ADM-05]`
- [x] **BE-D02 · CRUD lojas (admin)** — Completar entidade `Store` (`rating`, `openingHoursText`, `averagePriceLevel`, já em V004). `AdminStoreController` — CRUD + `PATCH .../status`, `LSA006_DUPLICATE` (nome+cidade). `[deps: BE-A04]` `[ref: 01 F2-ADM-02]`

### BE-E — Domínio Admin: métricas (após BE-B/BE-D, paralelo a BE-C)

- [x] **BE-E01 · `AdminMetricsController`** — `GET /admin/metrics/summary?period=7d|30d|90d`, mapeando as 6 views SQL de V005 (`@Immutable`/`@Subselect` ou `JdbcTemplate`) — não replicável em H2, exige Testcontainers-Postgres nos testes de integração. `[deps: BE-A04, BE-C03 (para ai_generation_log ter dados)]` `[ref: 01 F2-ADM-06]`

### BE-L — Domínio Loja (Fase 3; após BE-B + BE-D02; L1/L2 paralelos entre si, L3 depois)

- [x] **BE-L01 · RBAC `LOJISTA` + ownership por loja** — Já parcialmente pronto: `Role.LOJISTA` e a regra `/api/v1/loja/**` → `ROLE_LOJISTA` já existem em `SecurityConfig`; falta o filtro de ownership por `currentUser.storeId()` em todos os services do domínio (nunca aceitar `storeId` vindo do cliente). `[deps: BE-B03]` `[ref: 01 Persona 4]`
- [x] **BE-L02 · CRUD produtos da loja** — Completar entidade `Product` (tabela já existe em V004). `LojaProductController` — `GET/POST /loja/products`, `GET/PUT/DELETE /loja/products/{id}`, `PATCH .../status`, sempre escopado ao `storeId` do token. `[deps: BE-L01]` `[ref: 01 F3-LOJ-01]`
- [x] **BE-L03 · Import/Export Excel da loja (Apache POI)** — Adicionar `poi-ooxml` ao `pom.xml` (ainda não presente). Entidade `ImportJob` (tabela já em V004). Template/export/import validar→confirmar escopados à loja. `LSA020_IMPORT_INVALID_FILE`. `[deps: BE-L02]` `[ref: 01 F3-LOJ-02]`
- [x] **BE-L04 · Gestão de encomendas (loja + cliente)** — Entidades `Order`/`OrderItem` (tabelas já em V004). `OrderStateMachine` (transições `PENDENTE→ACEITE→EM_PREPARACAO→PRONTA→CONCLUIDA`, `RECUSADA`/`CANCELADA` com regras próprias — `LSA030_INVALID_ORDER_TRANSITION`). `LojaOrderController` — `GET/PATCH /loja/orders/**`; liga a `BE-C07` do lado do cliente. `[deps: BE-L01, BE-C06]` `[ref: 01 F3-LOJ-03]`

---

## 🟪 INTEGRAÇÃO E ENTREGA (fim de cada fase)

- [ ] **INT-01 · Ligar FE ao backend real (Fase 1)** — Desligar MSW no cliente, correr FE-E01 contra o backend Java (`ottimizo/`), corrigir divergências de contrato (o `/v3/api-docs` do `springdoc` manda). `[deps: FE-C*, BE-C*, DB-06]`
- [ ] **INT-02 · Deploy Fase 1** — Frontend no Vercel (plano Pro) + backend Java num serviço à parte (alvo de deploy do `ottimizo/` por decidir — não é Vercel, que não suporta processo Java de longa duração), env vars prod, Supabase, smoke tests, UAT com o cliente → checklist F1 do `05 §4` → **saldo 10.500 MT**. `[deps: INT-01, DB-07]`
- [ ] **INT-03 · Ligar FE admin ao backend real (Fase 2)** — Idem INT-01 para as telas admin. `[deps: FE-D*, BE-D*, BE-E01]`
- [ ] **INT-04 · Deploy Fase 2** — Verificação de restore de backup, UAT → checklist F2 do `05 §4` → **saldo 10.000 MT**. `[deps: INT-03]`
- [ ] **INT-05 · Ligar FE loja + fluxo de encomendas ao backend real (Fase 3)** — Desligar MSW nas telas `FE-L*`/`FE-C09`/`FE-C10`, corrigir divergências de contrato. `[deps: FE-L*, FE-C09, FE-C10, BE-L*, BE-C07]`
- [ ] **INT-06 · Migração do catálogo de cada loja + Deploy Fase 3** — Lojistas carregam catálogo (Excel/UI), UAT confirmando explicitamente que entrega/pagamento ficam fora do sistema → checklist F3 do `05 §4` → saldo conforme aditamento comercial da Fase 3. `[deps: INT-05]`

---

## Em curso

*(referência rápida — o cartão original mantém-se na sua secção acima; lista aqui só o ID enquanto está ativo)*

*(sem cartões frontend activos para os portais Admin/Loja; do backend só falta a faixa `INT-*` de integração/deploy — `BE-C08` e `BE-E01` foram implementados em 2026-08-19)*

**INT-01 (Cliente) — progresso 2026-08-24:** ver `docs/superpowers/plans/2026-08-23-frontend-sem-hardcoded-consumir-backend-real.md`. Feito: Tarefa 1 (bug confirmado — `dietaryPreferences: ["sem_preferencia"]` rejeitado pelo backend real com `LSA001_VALIDATION`, corrigido em `onboarding/page.tsx` e `perfil/page.tsx` + simetria no mock), Tarefa 2 (`recipe-photos.ts` deixou de depender do `id` numérico do mock, passou a chave por slug do nome), Tarefa 3 (`docs/plano/10-checklist-ambientes-deploy.md`), Tarefa 4 (`e2e/smoke-real-backend.spec.ts`, idempotente, salta sem credenciais). Suite de mocks re-validada (`registo-onboarding`/`receitas`/`troca-refeicao`, 6/6). **Por fazer antes de fechar `INT-01`:** correr o smoke novo contra o backend real com `SMOKE_CLIENT_EMAIL`/`SMOKE_CLIENT_PASSWORD`; `INT-03`/`INT-05` (Admin/Loja) nem começaram esta verificação.

## Concluído

- **MOCK-01** · Congelar o contrato da API
- **MOCK-02** · Servidor de mocks (MSW)
- **MOCK-03** · Tipos TypeScript gerados
- **FE-A01** · Esqueleto Next.js + PWA
- **FE-A02** · Design tokens
- **FE-A03** · Cliente HTTP + sessão
- **FE-A04** · Layouts e navegação
- **FE-B01** · Button / Input / Select / Checkbox
- **FE-B02** · Card / Chip / StatusBadge
- **FE-B03** · Toast / Modal / ConfirmDialog / BottomSheet
- **FE-B04** · Skeleton / EmptyState / ErrorState
- **FE-B05** · MacroRing (sm/md/lg)
- **FE-B06** · FormField + validação
- **FE-B07** · DataTable admin
- **FE-B08** · Wizard / Stepper
- **FE-B09** · KpiCard + gráfico de linhas
- **FE-B10** · Ilustrações e ícones
- **FE-C01** · T-01 Login + T-02 Registo
- **FE-C02** · T-03 Onboarding do perfil
- **FE-C03** · T-04 Dashboard do plano
- **FE-C04** · T-07 Ecrã de geração
- **FE-C05** · T-05 Detalhe de refeição/receita
- **FE-C06** · T-06 Lista de compras
- **FE-C07** · T-08 Perfil
- **FE-C08** · Offline/PWA do cliente (falta apenas QA manual com throttling 3G)
- **FE-D00** · Infra mock admin partilhada
- **FE-D01** · T-09 Dashboard de métricas
- **FE-D02** · T-10/T-11 Utilizadores
- **FE-D03** · T-12/T-13 Lojas
- **FE-D06** · T-17/T-18 Receitas
- **FE-D07** · T-19 Ingredientes
- **FE-X01..X03** · Métricas de paridade cliente/admin
- **FE-L01..L04** · Portal da Loja (layout, produtos, import Excel, encomendas)
- **FE-P09** · Polimento da landing (mock Stitch)
- **FE-Q10** · MealCard compacto (mock Stitch)
- **FE-S01..S04** · Controlo de porções (mock Stitch)
- **FE-T01..T05** · Pedir receita agora (receita avulsa fora do plano semanal)
- **FE-U01..U03** · Plano mensal (contrato/mocks, navegação semana→dia, cabeçalho do mês) — confirmado no código, checklist estava desatualizado
- **FE-V01..V04** · Gamificação discreta ("Comi isto", streak, `MonthProgressRing`, check-in semanal) — confirmado no código, checklist estava desatualizado
- **FE-W01..W05** · Gaps do feedback do cliente (agregação real da lista, preferências alimentares, adicionar item manual, catálogo de receitas navegável)
- **FE-C09** · Encomendar rancho (escolher loja / rever encomenda) — confirmado no código, checklist estava desatualizado
- **FE-C10** · Minhas encomendas — confirmado no código, checklist estava desatualizado
- **FE-Q06** · Motivo livre na troca de refeição
- **FE-E02** · Auditoria de performance/dados
- **BE-A04** · AuditService + Testcontainers
- **DB-06** · Seed de dados dev
- **DB-07** · Projeto Supabase prod
- **BE-B02** · `AuthController`
- **BE-B03** · `AdminUserController`
- **BE-C01..C09** · Domínio Cliente completo (perfil, catálogo pré-filtrado, geração IA, plano ativo, feedback/swap, lista de compras, encomendas, pedido avulso de receita + "guardar num dia", catálogo navegável)
- **BE-D01..D02** · Domínio Admin: catálogo (ingredientes/receitas) + lojas
- **BE-E01** · `AdminMetricsController`/`AdminMetricsService` — `GET /admin/metrics/summary` via `JdbcTemplate` sobre as 6 views de V005; `estimatedAiCostUsd` fica 0 até `ai_generation_log` passar a ter escrita real (BE-C03/BE-C08 ainda não gravam lá)
- **BE-L01..L04** · Domínio Loja (RBAC, produtos, import/export Excel, encomendas) — confirmado em `quadro/be-a04`, checklist estava desatualizado

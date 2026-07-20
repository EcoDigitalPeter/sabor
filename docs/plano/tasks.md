# Tasks — Quadro de Execução (estilo Trello)

> Todas as tarefas do projeto, na ordem de execução acordada: **primeiro o frontend (contra mocks), depois o backend (+ base de dados)**.
> Cada cartão é o mais **independente e baseado em componentes** possível para permitir paralelismo.
>
> **Como usar:** mover o estado marcando a checkbox (`[ ]` por fazer → `[x]` feito) e/ou copiando o cartão para as secções *Em curso* / *Concluído* no fim do ficheiro. Cada cartão indica: `ID · título · [deps] · ref. plano`.
>
> **Legenda de etiquetas:** 🟦 frontend · 🟨 backend · 🟩 base de dados · 🟪 transversal/integração · ⚡ desbloqueia paralelismo (fazer cedo).

---

## Faixas de paralelismo (visão rápida)

> **Mudança de plano:** o backend deixou de ser um serviço Java separado — passa a viver **dentro do mesmo projeto Next.js** (Route Handlers), para permitir um único deploy no Vercel. Por isso `BE-A` (fundações do backend) depende agora de `FE-A01` (esqueleto Next.js já existir).

```
FE-A  Fundações ⚡ ──▶  FE-B Componentes UI (todos paralelos entre si)
      │             └▶  FE-C Telas Cliente ─┐   (paralelas entre si após FE-B do que usam)
      │             └▶  FE-D Telas Admin  ──┤
      │             └▶  FE-L Telas Loja  ───┤   (Fase 3, depende de BE-L)
      ▼                                     ▼
BE-A  Fundações ⚡ ──▶  DB migrations ──▶ BE-B Auth ──▶ BE-C..F Domínios (paralelos) ──▶ BE-L Domínio Loja (Fase 3) ──▶ INT Integração/UAT
```

Regra de ouro: **MOCK-01 e FE-A ficam prontos primeiro** — a partir daí, qualquer cartão FE-B pode ser pegado por qualquer dev em paralelo; as telas (FE-C/FE-D/FE-L) só dependem dos componentes que usam + mocks; e o backend (`BE-A01`) só arranca depois de `FE-A01` existir, por viverem no mesmo projeto. No backend, após BE-B (auth), os domínios BE-C, BE-D, BE-E e BE-F são faixas independentes.

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
- [x] **FE-C07 · T-08 Perfil** — Edição por secção, aviso "vale a partir do próximo plano", logout. `[deps: FE-B01, B06]` `[ref: 02 T-08, 01 F1-CLI-01]`
- [x] **FE-C08 · Offline/PWA do cliente** — Precache do shell; runtime cache do plano ativo e lista (stale-while-revalidate); fila local de toggles da lista com sync; excluir `/admin` do SW; testar com throttling 3G. `[deps: FE-C03, FE-C06]` `[ref: 02 §5, 01 F1-CLI-03/06]` *(nota: teste manual com throttling 3G ainda por fazer em DevTools — não automatizável pelo agente)*
- [ ] **FE-C09 · T-06 CTA "Encomendar" + T-20/T-21 Escolher loja / Rever encomenda** — Fluxo de encomenda a partir da lista de compras: seleção de loja ativa, revisão de itens (checkbox + quantidade), nota opcional, confirmação. `[deps: FE-B01, B03, B06]` `[ref: 02 T-20/21 (novas), 01 F3-CLI-07]` **Fase 3**
- [ ] **FE-C10 · T-22 Minhas encomendas** — Lista de encomendas do cliente com estado-badge, detalhe simples, cancelamento quando permitido. `[deps: FE-B02, B07]` `[ref: 02 T-22 (nova), 01 F3-CLI-07]` **Fase 3**

### FE-Q — Portal do cliente v2 (redesign visual, benchmark de UI de receitas externo)

- [x] **FE-Q01 · Camada de fotos + prompts** — `src/data/recipe-photos.ts` (lookup `recipeId → foto`, vazio/tipado) + 18× `public/images/receitas/<slug>/PROMPT.md`, um por receita de `RECIPE_CATALOG`. `[deps: —]` `[ref: plano portal v2]`
- [x] **FE-Q02 · MealCard v2** — Variante foto-primeiro (16:9, overlay em gradiente, `MacroRing sm` como selo) quando `getRecipePhoto` resolve; sem foto mantém o layout original inalterado. `[deps: FE-Q01]`
- [x] **FE-Q03 · Saudação no dashboard** — `/plano` com saudação por hora do dia + primeiro nome (`getSession()?.name`, já existente). `[deps: —]`
- [x] **FE-Q04 · RecipeStatCard + RecipeHero** — Cartão de estatística preenchido (âmbar/floresta) e hero de foto/fallback 4:3, componentes novos e independentes do `KpiCard` admin. `[deps: FE-Q01]`
- [x] **FE-Q05 · Redesign do detalhe da receita** — `page.module.css` novo (antes só `style={{}}` inline); `RecipeHero` + par de `RecipeStatCard` (Tempo/Custo); "Trocar este prato" promovido a CTA principal sempre visível (antes só aparecia depois de 👎), sem campo de texto livre. `[deps: FE-Q04]`
- [ ] **FE-Q06 · Motivo livre na troca** (opcional/adiada) — Só se/quando `POST .../swap` aceitar um campo `reason`; a UX do `HeroQuiz` freeform já está pronta a reaproveitar. `[deps: contrato /swap ganhar `reason`]`
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

Backlog (não agendado): **"Pedir receita agora"** — botão de acesso rápido no dashboard para pedir uma receita ad-hoc (mesmo mock do Stitch); implica endpoint de geração novo — fica para uma sessão de planeamento dedicada, como o Modo Cozinhar.

### FE-D — Telas do Portal Admin (paralelas entre si; deps indicadas + MOCK-02)

- [x] **FE-D01 · T-09 Dashboard de métricas** — KPIs, gráfico planos/dia, top/bottom receitas, custo IA, seletor de período. `[deps: FE-B09]` `[ref: 02 T-09, 01 F2-ADM-06]` *(inclui o shell de navegação admin — sidebar/topbar, `AdminShell`/`AdminSidebar`/`AdminTopbar` — que FE-D02/D03/D06/D07 reutilizam)*
- [ ] **FE-D02 · T-10/T-11 Utilizadores** — Lista (DataTable) + detalhe com suspensão (confirmação) e "Ver perfil de saúde" explícito; criação de conta lojista (`storeId`). `[deps: FE-B03, B07]` `[ref: 02 T-10/11, 01 F2-ADM-01]`
- [ ] **FE-D03 · T-12/T-13 Lojas** — Lista + formulário de registo da loja; remoção com confirmação; opção de criar conta de lojista ao criar a loja. `[deps: FE-B03, B06, B07]` `[ref: 02 T-12/13, 01 F2-ADM-02]`
- [ ] **FE-D06 · T-17/T-18 Receitas** — Lista com feedback agregado + formulário rico (ingredientes dinâmicos, passos ordenáveis, tags, painel de macros com MacroRing `md`, publish com checklist de bloqueios). `[deps: FE-B05, B06, B07]` `[ref: 02 T-17/18, 01 F2-ADM-05]`
- [ ] **FE-D07 · T-19 Ingredientes** — CRUD tabular com edição inline/drawer, desativar, remoção bloqueada com lista de receitas afetadas. `[deps: FE-B07]` `[ref: 02 T-19, 01 F2-ADM-05]`

> `FE-D04`/`FE-D05` (Produtos/Import Excel no admin) foram **removidos** — mudança de plano: a gestão de catálogo passou para o Portal da Loja (ver `FE-L` abaixo).

### FE-L — Telas do Portal da Loja (Fase 3; paralelas entre si; deps indicadas + MOCK-02)

- [ ] **FE-L01 · Layout loja** — Sidebar simples (Produtos, Encomendas), guarda de rota `LOJISTA`, redirecionamento por role em `/login`. `[deps: FE-A04]` `[ref: 02 (novo), 01 Persona 4]`
- [ ] **FE-L02 · T-23/T-24 Produtos da loja** — Tabela (DataTable) + formulário (nome, categoria, unidade, preço); sem seletor de loja. `[deps: FE-B06, B07, FE-L01]` `[ref: 02 T-23/24 (novas), 01 F3-LOJ-01]`
- [ ] **FE-L03 · T-25 Import Excel da loja** — Reaproveita o padrão do antigo T-16: drag-&-drop, pré-visualização, confirmação, resultado. `[deps: FE-B03, B07, FE-L01]` `[ref: 02 T-25 (nova), 01 F3-LOJ-02]`
- [ ] **FE-L04 · T-26/T-27 Encomendas da loja** — Lista (DataTable, filtro por estado) + detalhe com botões de transição de estado válidos. `[deps: FE-B03, B07, FE-L01]` `[ref: 02 T-26/27 (novas), 01 F3-LOJ-03]`

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

- [ ] **FE-E01 · Testes E2E (Playwright) contra mocks** — Fluxos: registo→onboarding→plano→receita→troca→lista; login admin→CRUD loja→import Excel. Correm no CI sem backend. `[deps: telas correspondentes]` `[ref: 05 checklist]`
- [ ] **FE-E02 · Auditoria de performance/dados** — Bundle < 200 KB gzip na área cliente, Lighthouse PWA, fontes subsetting, imagens otimizadas. `[deps: FE-C08]` `[ref: 02 §5]`

---

## 🟨🟩 BACKEND + BASE DE DADOS

### BE-A — Fundações ⚡ (sequencial, curto; mudança de plano — vive dentro do projeto Next.js, não num serviço separado)

- [ ] **BE-A01 · Camada de API no Next.js** — Route Handlers em `src/app/api/v1/**`, estrutura de pastas `src/server/{services,repositories,dto,errors,security}` do `03 §2`; Prisma instalado (`prisma/schema.prisma`); CI a correr lint + typecheck. `[deps: FE-A01]` `[ref: 03 §1-2]`
- [ ] **BE-A02 · Núcleo transversal** — tipos `ApiResponse`/`PageResponse`, objeto `ErrorCodes` LSAxxx completo, `ServiceError`, handler central de erros para os Route Handlers, `correlationId` por pedido + logging estruturado. `[deps: BE-A01]` `[ref: 03 §3]`
- [ ] **BE-A03 · Prisma + ambiente local** — `schema.prisma` inicial, Postgres local (Docker) para dev, `DATABASE_URL`/`DIRECT_URL`, `prisma migrate dev`; base de testes de integração com Postgres efémero. `[deps: BE-A01]` `[ref: 03 §10, 05 §5]`

### DB — Migrations (sequenciais entre si; paralelas com BE-B após V1)

- [ ] **DB-01 · V1 auth + audit** — `users`, `refresh_tokens`, `audit_log` (SQL do `04 §3`). `[deps: BE-A03]`
- [ ] **DB-02 · V2 perfis + catálogo nutricional** — `client_profiles`, `ingredients`, `recipes`, `recipe_ingredients`. `[deps: DB-01]`
- [ ] **DB-03 · V3 planos + listas** — `meal_plans`, `meal_plan_entries`, `meal_feedback`, `shopping_lists(_items)`, `ai_generation_log`. `[deps: DB-02]`
- [ ] **DB-04 · V4 lojas** — `stores`. `[deps: DB-02]` *(independente de DB-03 — paralelizável)*
- [ ] **DB-05 · V5 seed** — Admin inicial (placeholder `${seed_admin_bcrypt}`) + ≥ 40 receitas moçambicanas com nutrição/tags **(conteúdo do cliente — pedir no dia 1, risco R2)** + ~30 ingredientes. `[deps: DB-02, conteúdo do cliente]` `[ref: 04 §3 V5, 05 R2]`
- [ ] **DB-06 · Projeto Supabase prod** — Criar projeto, configurar pooler de transações + connection string direta para migrations, testar `prisma migrate deploy` contra ele, agendar `pg_dump` externo diário + teste de restore. `[deps: DB-01]` `[ref: 05 §5]`
- [ ] **DB-07 · V6 loja + catálogo próprio + encomendas (Fase 3)** — `users.store_id` + role `LOJISTA`; `products` redesenhado (por loja, com `price_mt` embutido); `import_jobs` (com `store_id`); `orders`, `order_items`. `[deps: DB-04]` `[ref: 04 §3 V6]`

### BE-B — Autenticação e segurança (sequencial; desbloqueia todos os domínios)

- [ ] **BE-B01 · JWT + guarda de autorização** — `JwtService` (lib `jose`), helper/middleware de verificação por rota/role do `03 §4`. `[deps: BE-A02, DB-01]`
- [ ] **BE-B02 · Endpoints de auth** — register/login/refresh (rotativo, cookie httpOnly)/logout, hash de password (bcrypt/argon2), revogação, auditoria de logins falhados; testes de integração. `[deps: BE-B01]` `[ref: 01 F1-VIS-01/02, 03 §4]`
- [ ] **BE-B03 · AuditService** — `recordAudit(...)` síncrono transacional + convenções de ações auditáveis. `[deps: BE-A02, DB-01]` `[ref: 03 §7]`

### BE-C — Domínio Cliente (após BE-B; C1→C2→C3 em cadeia; C4/C5 paralelos a C2)

- [ ] **BE-C01 · Perfil** — `GET/PUT /me/profile`, enums Goal/HealthCondition/BudgetBand, validações Bean Validation. `[deps: BE-B02, DB-02]` `[ref: 01 F1-CLI-01]`
- [ ] **BE-C02 · RecipeCatalogService (pré-filtros duros)** — Elegibilidade por condição de saúde (celíaco = filtro duro `sem_gluten`), alergias, feedback 👎 excluído/despriorizado, 👍 preferido. Unit tests exaustivos por condição — é a barreira anti-alucinação. `[deps: BE-C01, DB-03]` `[ref: 01 F1-CLI-02 regras, 03 §5]`
- [ ] **BE-C03 · Motor de geração (OpenAI)** — `AiMealPlanService` + `openAiMealPlanService` (structured outputs, validação de ids, retries, timeout), chamada **síncrona** dentro do Route Handler (`maxDuration` alargado — Vercel Pro), snapshots, `ai_generation_log`, limite diário; OpenAI mockada nos testes (nock/msw). `[deps: BE-C02]` `[ref: 01 F1-CLI-02, 03 §5]`
- [ ] **BE-C04 · Plano ativo + entradas** — `GET /me/meal-plans/active` (payload único compacto), `GET .../{id}`, `GET .../entries/{id}`, ownership em tudo. `[deps: BE-C01, DB-03]` *(paralelo a BE-C03 — usa fixtures)* `[ref: 01 F1-CLI-03/04]`
- [ ] **BE-C05 · Feedback + swap** — `PUT /me/recipes/{id}/feedback`; `POST .../entries/{id}/swap` (alternativa determinística compatível ±20% kcal, transacional com rebuild da lista). `[deps: BE-C02, BE-C04]` `[ref: 01 F1-CLI-05]`
- [ ] **BE-C06 · Lista de compras** — `ShoppingListService.rebuildForPlan` (agregação + conversão de unidades g/kg, ml/l; preserva checked), `GET /me/shopping-list`, `PATCH .../items/{id}`. `[deps: BE-C04]` `[ref: 01 F1-CLI-06]`
- [ ] **BE-C07 · Encomendas (cliente)** — `POST /me/orders` (a partir da lista de compras ativa, itens selecionados), `GET /me/orders`, `GET /me/orders/{id}`, `PATCH /me/orders/{id}/cancel`; resolução best-effort de preço unitário pelo catálogo da loja. `[deps: BE-C06, BE-L01]` `[ref: 01 F3-CLI-07]` **Fase 3**

### BE-D — Domínio Admin: contas e catálogo de lojas (após BE-B; D1/D2 **paralelos entre si**)

- [ ] **BE-D01 · Gestão de utilizadores** — Lista paginada/pesquisa, detalhe, `PATCH status` (revoga refresh, guarda "último admin"), `GET health-profile` auditado; `POST /admin/users` para criar admin ou lojista (`storeId`). `[deps: BE-B02, BE-B03]` `[ref: 01 F2-ADM-01]`
- [ ] **BE-D02 · CRUD lojas** — Endpoints + regras de suspensão/remoção do registo da loja. `[deps: BE-B02, DB-04]` `[ref: 01 F2-ADM-02]`

> `BE-D03`/`BE-D04` (produtos/preços e Excel no admin) foram **removidos** — ver `BE-L` abaixo (Fase 3).

### BE-E — Domínio Admin: dados da IA (após BE-B; paralelo a BE-D)

- [ ] **BE-E01 · CRUD ingredientes** — Endpoints + bloqueio de remoção em uso (LSA021 com lista de receitas). `[deps: BE-B02, DB-02]` `[ref: 01 F2-ADM-05]`
- [ ] **BE-E02 · CRUD receitas + publicação** — Endpoints, cálculo de macros a partir dos ingredientes (+ override), regras de publicação server-side (LSA023 com motivos), feedback agregado por receita. `[deps: BE-E01]` `[ref: 01 F2-ADM-05]`

### BE-F — Métricas (após BE-B; paralelo a BE-C/D/E)

- [ ] **BE-F01 · metrics/summary** — KPIs + séries + custo IA num payload; testes com fixtures. `[deps: BE-B02, DB-03]` `[ref: 01 F2-ADM-06]`

### BE-L — Domínio Loja (Fase 3; após BE-B + DB-07; L1/L2 paralelos entre si, L3 depois)

- [ ] **BE-L01 · RBAC `LOJISTA` + ownership por loja** — Extensão do guarda de autorização e do `JwtService` para resolver `store_id` do token; regra `/api/v1/loja/**` → role `LOJISTA` + filtro de ownership em todos os services do domínio. `[deps: BE-B01, DB-07]` `[ref: 03 §4, 01 Persona 4]`
- [ ] **BE-L02 · CRUD produtos da loja** — `GET/POST /loja/products`, `GET/PUT/DELETE /loja/products/{id}`, `PATCH .../status`, sempre escopado ao `store_id` do token. `[deps: BE-L01]` `[ref: 01 F3-LOJ-01]`
- [ ] **BE-L03 · Import/Export Excel da loja (exceljs)** — Template/export/import validar→confirmar escopados à loja; `import_jobs` com `store_id`. `[deps: BE-L02]` `[ref: 01 F3-LOJ-02]`
- [ ] **BE-L04 · Gestão de encomendas (loja)** — `GET /loja/orders` (paginado, filtro estado), `GET /loja/orders/{id}`, `PATCH /loja/orders/{id}/status` com máquina de estados validada server-side (erro de transição inválida); auditoria de cada mudança. `[deps: BE-L01, BE-C07]` `[ref: 01 F3-LOJ-03]`

---

## 🟪 INTEGRAÇÃO E ENTREGA (fim de cada fase)

- [ ] **INT-01 · Ligar FE ao backend real (Fase 1)** — Desligar MSW no cliente, correr FE-E01 contra o backend, corrigir divergências de contrato (o OpenAPI manda). `[deps: FE-C*, BE-C*, DB-05]`
- [ ] **INT-02 · Deploy Fase 1 (Vercel)** — Projeto Vercel (plano Pro), env vars prod, Supabase, smoke tests, UAT com o cliente → checklist F1 do `05 §4` → **saldo 10.500 MT**. `[deps: INT-01, DB-06]`
- [ ] **INT-03 · Ligar FE admin ao backend real (Fase 2)** — Idem INT-01 para as telas admin. `[deps: FE-D*, BE-D*, BE-E*, BE-F01]`
- [ ] **INT-04 · Deploy Fase 2** — Verificação de restore de backup, UAT → checklist F2 do `05 §4` → **saldo 10.000 MT**. `[deps: INT-03]`
- [ ] **INT-05 · Ligar FE loja + fluxo de encomendas ao backend real (Fase 3)** — Desligar MSW nas telas `FE-L*`/`FE-C09`/`FE-C10`, corrigir divergências de contrato. `[deps: FE-L*, FE-C09, FE-C10, BE-L*, BE-C07, DB-07]`
- [ ] **INT-06 · Migração do catálogo de cada loja + Deploy Fase 3** — Lojistas carregam catálogo (Excel/UI), UAT confirmando explicitamente que entrega/pagamento ficam fora do sistema → checklist F3 do `05 §4` → saldo conforme aditamento comercial da Fase 3. `[deps: INT-05]`

---

## Em curso

*(referência rápida — o cartão original mantém-se na sua secção acima; lista aqui só o ID enquanto está ativo)*

- **FE-D02** · T-10/T-11 Utilizadores
- **FE-D03** · T-12/T-13 Lojas
- **FE-D06** · T-17/T-18 Receitas
- **FE-D07** · T-19 Ingredientes

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
- **FE-D01** · T-09 Dashboard de métricas
- **FE-P09** · Polimento da landing (mock Stitch)
- **FE-Q10** · MealCard compacto (mock Stitch)
- **FE-S01..S04** · Controlo de porções (mock Stitch)

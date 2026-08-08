# Adoção dos skills de design (ui-ux-pro-max, impeccable, redesign-existing-projects) na ronda de feedback FE-Y

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Definir, cartão a cartão (`FE-Y01..FE-Y09` em `docs/plano/tasks.md`), qual skill de design recém-instalado usar, com que âmbito, e onde ele entra no fluxo de verificação já existente — sem introduzir dependências, animações ou custo que contradigam as restrições do projeto.

**Architecture:** Não é código novo — é um plano de processo. Cada task abaixo é: (1) invocar o skill certo com o âmbito certo, (2) aplicar só os achados que não contradizem tokens/copy já validados por rondas anteriores de feedback do cliente, (3) correr a verificação que o próprio plano FE-Y já exige (lint/typecheck/grep/e2e/QA manual).

**Tech Stack:** Next.js App Router + TypeScript + CSS Modules (sem lib de animação — hoje só `@keyframes` `ls-rise`/`ls-ring-in`). Skills novos disponíveis: `ui-ux-pro-max`, `impeccable`, `redesign-existing-projects`, `minimalist-ui`, `high-end-visual-design`, `gpt-taste`, `scroll-world` (instalados globalmente, symlinked pra Claude Code).

## Global Constraints

- Idioma de toda a copy tocada: europeu, grafia pós-1990 por agora — a conversão pré-acordo é sempre o último passo, cartão `FE-Y09`, nunca antecipar (ver `docs/plano/tasks.md` L176 e plano-mãe `temos-um-novo-feedback-moonlit-balloon.md`).
- Orçamento de dados móveis do cliente: **< 200 KB de JS inicial (gzip)** na área do cliente (`docs/plano/02-ui-ux-plan.md` §5) — qualquer sugestão de skill que implique nova dependência de runtime (GSAP, vídeo, etc.) é **decisão separada**, não se aplica automaticamente por este plano.
- Movimento: "Animações discretas... Nada mais" é regra explícita (`02-ui-ux-plan.md` §1) — skills de motion agressivo (`gpt-taste` ScrollTrigger pin/stack/scrub) ficam fora do âmbito deste plano.
- Stack está fechada (Next.js/TS/MSW) — `CLAUDE.md` proíbe relitigar; nenhuma task abaixo adiciona pacote npm.
- Tokens de cor/tipografia (`02-ui-ux-plan.md` §1) já vêm de rondas reais de feedback do cliente — skills só **validam ou apontam gaps**, não substituem tokens sem confirmação humana.
- Verificação por cartão já definida no plano-mãe: `npm run lint && npm run typecheck` em `levesabor/levesabor-web`, grep do texto antigo antes de fechar rename, atualizar e2e afetados, QA manual no browser.
- Skills fora de âmbito neste plano (vieram junto nos repos instalados, não usar aqui): `scroll-world` (vídeo pago, contradiz orçamento de dados), `brand`, `brandkit`, `banner-design`, `design`, `design-system`, `slides`, `image-to-code`, `imagegen-frontend-mobile/web`, `stitch-design-taste`, `industrial-brutalist-ui`, `design-taste-frontend`/`-v1`, `full-output-enforcement` — nenhum resolve um problema real dos cartões FE-Y.

---

### Task 0: Validação cross-cutting de tokens com `ui-ux-pro-max` (antes de Y01)

**Files:**
- Read: `levesabor/levesabor-web/src/styles/tokens.css`
- Modify (só se houver gap real): `docs/plano/02-ui-ux-plan.md:9-47` (§1 Design tokens)

**Interfaces:**
- Consumes: tabela de cores/tipografia existente em `02-ui-ux-plan.md` §1.
- Produces: nota de validação (aprovado ou lista de gaps) que as tasks 1-7 assumem como já resolvida — nenhuma delas deve re-questionar tokens.

- [ ] **Passo 1: Validar contraste WCAG AA dos pares usados em texto/CTA**
  Invocar `Skill ui-ux-pro-max` pedindo checagem de contraste para os pares: `terracotta #C43E1C` sobre `cream #F6ECDC` (CTA principal), `ink #241A14` sobre `cream #F6ECDC` (texto principal), `amber #E3A72E` sobre `ink #241A14` (destaques em fundo escuro), `clay-soft #8A7A65` sobre `cream-card #FFFFFF` (texto terciário — o par mais provável de falhar AA por ser claro sobre claro).

- [ ] **Passo 2: Validar o par tipográfico**
  Invocar `Skill ui-ux-pro-max` pedindo avaliação do trio Bricolage Grotesque (display) + Work Sans (corpo) + IBM Plex Mono (números), na categoria "food app / editorial calorosa", para confirmar que a combinação não tem alerta conhecido de legibilidade em mobile a 360px.

- [ ] **Passo 3: Registar resultado**
  Se os dois passos vierem "conforme": adicionar uma linha de nota no fim de §1 de `02-ui-ux-plan.md` — `> Validado com ui-ux-pro-max em 2026-08-06 — sem gaps de contraste ou legibilidade.` Não mexer em nenhum valor de token.
  Se vier gap real (ex. `clay-soft` sobre `cream-card` abaixo de AA): não corrigir sozinho — parar e reportar ao utilizador antes de tocar em qualquer token, porque tokens vêm de rondas de feedback já fechadas com o cliente.

- [ ] **Passo 4: Commit (só se §1 foi editado)**
  ```bash
  git add docs/plano/02-ui-ux-plan.md
  git commit -m "docs(ui-ux): regista validação de tokens com ui-ux-pro-max"
  ```

---

### Task 1: FE-Y01 (landing) — `redesign-existing-projects` + `impeccable` como rede de segurança

**Files:**
- Modify: `levesabor/levesabor-web/src/components/landing/LandingPage.tsx`, `HeroQuiz.tsx`, `FaqAccordion.tsx` (mudanças de copy já especificadas no plano-mãe: "sem cartão de crédito"→"sem cartão"; "tuas preferências"→"tuas preferências alimentares"; "receitas reais"→"refeições reais")

**Interfaces:**
- Consumes: copy exata definida em `FE-Y01` do plano-mãe (`~/.claude/plans/temos-um-novo-feedback-moonlit-balloon.md` L30-34).
- Produces: componentes da landing com copy atualizada e auditoria de UI aplicada — task 2+ não dependem deste, podem correr em paralelo.

- [ ] **Passo 1: Aplicar as 3 mudanças de copy do FE-Y01** (sem tocar em layout/tokens).

- [ ] **Passo 2: Auditoria com `redesign-existing-projects`**
  Invocar `Skill redesign-existing-projects` com âmbito explícito: "auditar só os 3 componentes da landing tocados, preservar 100% dos tokens/estrutura existentes, sinalizar apenas padrões genéricos de IA (não sugerir GSAP, não sugerir vídeo, não sugerir reestruturar hero)". Este skill é feito pra achar "AI slop" sem quebrar o que já funciona — uso certo aqui é achar 1-2 detalhes de acabamento, não redesenhar.

- [ ] **Passo 3: Auditoria com `impeccable`**
  Invocar `Skill impeccable` em modo "critique/audit" sobre os mesmos 3 ficheiros, focado em: hierarquia visual, cognitive load, copy UX. Aplicar só achados que não contradigam `docs/plano/06-guia-de-copy-e-marca.md`.

- [ ] **Passo 4: Verificação padrão**
  ```bash
  npm run lint && npm run typecheck
  ```
  Grep pelas 3 strings antigas antes de fechar; correr `e2e/landing.spec.ts`.

- [ ] **Passo 5: Commit**
  ```bash
  git add levesabor/levesabor-web/src/components/landing
  git commit -m "feat(landing): FE-Y01 ajustes de copy + auditoria de design"
  ```

---

### Task 2: FE-Y02→Y04 (onboarding, mesmo ficheiro, sequencial) — `ui-ux-pro-max` guideline de wizard + `impeccable` no fim

**Files:**
- Modify: `levesabor/levesabor-web/src/app/(cliente)/onboarding/page.tsx` (`GOAL_OPTIONS` L30-35, `HEALTH_OPTIONS` L37-42, `ALLERGY_SUGGESTIONS` L53, `DIETARY_PREFERENCE_OPTIONS` L57-64, `BUDGET_OPTIONS` L46-50, resumo L483-513)
- Modify: `levesabor/levesabor-web/src/components/onboarding/OptionCard.tsx`
- Modify: `levesabor/levesabor-web/src/app/(auth)/registo/page.tsx` (L292-310, zod L34)
- Modify: `levesabor/levesabor-web/src/types/api.d.ts`, `levesabor/levesabor-web/src/mocks/{fixtures.ts,handlers.ts}`

**Interfaces:**
- Consumes: `canGoNext` de `src/components/ui/Wizard.tsx` (já existe, não recriar); contrato `Profile.healthConditions: string[]` definido nesta task, consumido por `pickAlternative`/`pickAdHocRecipe` (usado nas tasks 4 e 5).
- Produces: `Profile.healthConditions: string[]`, labels finais "Ganhar massa muscular" / "Controlar uma condição de saúde" — tasks 3-7 devem usar exatamente estes rótulos ao fazer grep de propagação.

- [ ] **Passo 1: Implementar FE-Y02 (objetivo/condição de saúde + propagação de label)** conforme especificado no plano-mãe L36-41.

- [ ] **Passo 2: Guideline de wizard multi-passo com `ui-ux-pro-max`**
  Antes de implementar Y03/Y04, invocar `Skill ui-ux-pro-max` pedindo as UX guidelines de "multi-step form / onboarding wizard" da base de 98 entradas — comparar contra o que já está desenhado (1 pergunta por ecrã, barra de progresso, resumo com edição por secção) só pra confirmar que não falta um estado padrão (ex. "voltar preserva rascunho" já está no spec — confirmar que continua coberto).

- [ ] **Passo 3: Implementar FE-Y03 (alergias/preferências/orçamento/refeições/pessoas)** conforme plano-mãe L43-48.

- [ ] **Passo 4: Implementar FE-Y04 (resumo, ecrã final, consentimento médico)** conforme plano-mãe L50-56.

- [ ] **Passo 5: Auditoria única com `impeccable` no fim dos três** (não a cada sub-cartão, porque é o mesmo ficheiro monolítico — auditar 3x geraria ruído)
  Invocar `Skill impeccable` focado em: estados de erro/edge case do wizard, i18n do texto de consentimento médico, micro-interações do `OptionCard` selecionado.

- [ ] **Passo 6: Verificação padrão + e2e**
  ```bash
  npm run lint && npm run typecheck
  ```
  Rodar `e2e/registo-onboarding.spec.ts` (ou o spec equivalente atual).

- [ ] **Passo 7: Commits** — um por sub-cartão (Y02, Y03, Y04), conforme já orientado no plano-mãe L25.

---

### Task 3: FE-Y05 (dashboard `/plano`, `/inicio`) — `ui-ux-pro-max` (dashboard/chart guidelines) + `impeccable`

**Files:**
- Modify: `levesabor/levesabor-web/src/app/(cliente)/plano/page.tsx`, `.../inicio/page.tsx`
- Modify: `levesabor/levesabor-web/src/components/plan/{MonthProgressRing,MealCard,DaySummary}.tsx`
- Modify: `levesabor/levesabor-web/src/lib/planStats.ts`, `levesabor/levesabor-web/src/mocks/fixtures.ts`

**Interfaces:**
- Consumes: `Profile.healthConditions`, labels da Task 2.
- Produces: `streakText` em `planStats.ts`, campo `contextTag` em `fixtures.ts` — Task 4 (pedir-agora) pode reaproveitar `contextTag` se fizer sentido pro resultado da receita avulsa.

- [ ] **Passo 1: Implementar FE-Y05** conforme plano-mãe L58-65 (CTAs renomeados, refeição atual em destaque, kcal+proteína no `MealCard`, mensagem motivacional, tag separada, indicador "dentro do objetivo").

- [ ] **Passo 2: Guideline de "stat tile / dashboard" com `ui-ux-pro-max`**
  Invocar `Skill ui-ux-pro-max` pedindo padrões de "stat tile" e hierarquia de KPI card pra validar a composição kcal+proteína+streak no `MealCard`/`DaySummary` — objetivo é confirmar que o valor concreto (kcal) tem mais peso visual que o rótulo, que já é regra do guia de copy (`06-guia-de-copy-e-marca.md`).

- [ ] **Passo 3: Auditoria com `impeccable`** focada em micro-interações (destaque da refeição atual por hora do dia é dinâmico — checar estado "sem refeição atual", ex. entre o almoço e o jantar).

- [ ] **Passo 4: Verificação padrão + e2e** — `npm run lint && npm run typecheck`; rodar `e2e/plano-mensal.spec.ts`.

- [ ] **Passo 5: Commit**
  ```bash
  git add levesabor/levesabor-web/src/app/\(cliente\)/plano levesabor/levesabor-web/src/app/\(cliente\)/inicio levesabor/levesabor-web/src/components/plan levesabor/levesabor-web/src/lib/planStats.ts levesabor/levesabor-web/src/mocks/fixtures.ts
  git commit -m "feat(plano): FE-Y05 dashboard e streak"
  ```

---

### Task 4: FE-Y06 (pedir receita agora) — `impeccable` apenas (sem `ui-ux-pro-max` motion preset, sem `gpt-taste`)

**Files:**
- Modify: `levesabor/levesabor-web/src/app/(cliente)/plano/pedir-agora/page.tsx` (perguntas L183/201/220/243, "Descartar" L365, resultado L335, bottom-sheet L362-404)
- Modify: `levesabor/levesabor-web/src/components/plan/SwapSheet.tsx`

**Interfaces:**
- Consumes: `contextTag` (Task 3, opcional), `Profile.healthConditions` (Task 2).
- Produces: nenhuma interface nova consumida por outras tasks — cartão isolado.

- [ ] **Passo 1: Implementar FE-Y06** conforme plano-mãe L67-74.

- [ ] **Passo 2: Auditoria com `impeccable`** focada em micro-interações de confirmação e nos estados `proposing/proposed/applied/no_alternative` do `SwapSheet` — é exatamente o tipo de "empty/edge state" que o skill cobre bem.
  **Explicitamente não invocar** `ui-ux-pro-max` motion preset nem `gpt-taste` aqui: é um wizard de 4 perguntas em mobile, a regra "animações discretas, nada mais" aplica-se de cheio.

- [ ] **Passo 3: Verificação padrão + e2e** — `npm run lint && npm run typecheck`; rodar `e2e/pedir-agora.spec.ts`.

- [ ] **Passo 4: Commit**
  ```bash
  git add "levesabor/levesabor-web/src/app/(cliente)/plano/pedir-agora" levesabor/levesabor-web/src/components/plan/SwapSheet.tsx
  git commit -m "feat(plano): FE-Y06 pedir receita agora — wizard e resultado"
  ```

---

### Task 5: FE-Y07 (lista de compras) — `ui-ux-pro-max` (ícones + padrões de checklist) + `impeccable`

**Files:**
- Modify: `levesabor/levesabor-web/src/app/(cliente)/compras/page.tsx`
- Modify: `levesabor/levesabor-web/src/components/plan/{ShoppingItemRow,ShoppingGroup}.tsx`
- Modify: `levesabor/levesabor-web/src/app/(cliente)/compras/AddItemSheet.tsx`
- Modify: `levesabor/levesabor-web/src/types/api.d.ts`, `levesabor/levesabor-web/src/mocks/fixtures.ts` (tabela de arredondamento por unidade)

**Interfaces:**
- Consumes: nenhuma das tasks anteriores.
- Produces: tabela de arredondamento por unidade em `fixtures.ts` — Task 6 (loja) não depende disto.

- [ ] **Passo 1: Implementar FE-Y07** conforme plano-mãe L76-81 (contadores, "🏠 Tenho em casa" como stepper, arredondamento por embalagem, colapso automático, barra de progresso).

- [ ] **Passo 2: Checagem de ícones com `ui-ux-pro-max`**
  Invocar `Skill ui-ux-pro-max` na base de 104 entradas de ícone pra validar que os emojis/ícones usados (🏠, ➕) seguem um padrão coerente com o resto da app (que hoje usa Lucide pra utilitários, conforme nota em `02-ui-ux-plan.md` L321) — decidir explicitamente entre manter emoji (mais leve, sem dependência) ou trocar por ícone Lucide equivalente, e registar a escolha no PR, não deixar ambíguo.

- [ ] **Passo 3: Auditoria com `impeccable`** focada em: colapso automático de categoria (transição precisa ser "discreta", não chamativa) e legibilidade da barra de progresso.

- [ ] **Passo 4: Verificação padrão + e2e** — `npm run lint && npm run typecheck`; rodar `e2e/lista-compras-interacoes.spec.ts`.

- [ ] **Passo 5: Commit**
  ```bash
  git add levesabor/levesabor-web/src/app/\(cliente\)/compras levesabor/levesabor-web/src/components/plan levesabor/levesabor-web/src/types/api.d.ts levesabor/levesabor-web/src/mocks/fixtures.ts
  git commit -m "feat(compras): FE-Y07 lista de compras"
  ```

---

### Task 6: FE-Y08 (escolha de loja + admin de lojas) — `ui-ux-pro-max` (tabela/formulário admin)

**Files:**
- Modify: `levesabor/levesabor-web/src/app/(cliente)/compras/encomendar/page.tsx`
- Modify: `levesabor/levesabor-web/src/types/api.d.ts` (`Store`), `levesabor/levesabor-web/src/mocks/fixtures.ts` (`ADMIN_STORES`)
- Modify: `levesabor/levesabor-web/src/app/admin/lojas/**`, `StoreFormFields`

**Interfaces:**
- Consumes: nenhuma das tasks anteriores.
- Produces: `Store` estendido (rating, horário, entrega, preço médio, coordenadas) — fim da cadeia FE-Y, nada consome isto depois.

- [ ] **Passo 1: Implementar FE-Y08** conforme plano-mãe L83-86.

- [ ] **Passo 2: Guideline de formulário/tabela admin com `ui-ux-pro-max`**
  Invocar `Skill ui-ux-pro-max` pedindo padrões de "admin form / data table" pra validar `StoreFormFields` com os novos campos (5 campos novos é o ponto onde formulários admin costumam ficar confusos sem agrupamento) — aplicar só se o guideline apontar problema real de agrupamento/ordem, não reestruturar por estética.

- [ ] **Passo 3: Verificação padrão + QA manual** — `npm run lint && npm run typecheck`; QA manual da escolha de loja no browser (não há e2e dedicado ainda pra este fluxo — não inventar um só por causa desta task).

- [ ] **Passo 4: Commit**
  ```bash
  git add "levesabor/levesabor-web/src/app/(cliente)/compras/encomendar" levesabor/levesabor-web/src/types/api.d.ts levesabor/levesabor-web/src/mocks/fixtures.ts levesabor/levesabor-web/src/app/admin/lojas
  git commit -m "feat(compras): FE-Y08 escolha de loja e admin de lojas"
  ```

---

### Task 7: FE-Y09 (varredura de idioma) — sem skill de design, metodologia já fechada

Nenhum dos skills instalados ajuda aqui — é substituição de grafia (pós-acordo → pré-acordo), não é decisão de design. Seguir a metodologia já escrita no plano-mãe (`temos-um-novo-feedback-moonlit-balloon.md` L88-95) sem alteração: levantar famílias de palavras por grep, excluir identificadores de código, rever por ficheiro, `npm run lint && npm run typecheck && npm run build` no fim.

- [ ] **Passo 1: Executar FE-Y09 conforme metodologia já definida**, só depois de Tasks 1-6 fechadas (é sempre o último cartão).

---

## Backlog explícito (fora deste plano, decisão futura do utilizador)

- **`gpt-taste` na landing pública** (fora dos portais): só se, depois de Y09, o utilizador pedir explicitamente um "polish" de marketing na landing com motion mais forte. Precisa de decisão separada porque implica dependência GSAP nova e pesa no orçamento de JS — hoje a landing não carrega esse orçamento de 200KB (é área pública, não PWA do cliente), mas ainda assim é uma adição de stack que `CLAUDE.md` pede pra não relitigar sem necessidade.
- **`scroll-world`**: rejeitado para este projeto — vídeo gerado pago (Higgsfield/Monid) contradiz o orçamento de dados móveis do público-alvo em Moçambique e não há vendor pago previsto no plano de custos. Não reconsiderar sem mudança explícita de orçamento/estratégia vinda do cliente.

# "Pedir receita agora" — receita avulsa a pedido, fora do plano semanal

**Data:** 2026-07-20
**Estado:** aprovado, pronto para plano de implementação

## Contexto

Extraído do mesmo mock "T-04 Dashboard Gamificado" do Stitch MCP que originou `FE-S` (controlo de porções). Ficou explicitamente de fora do escopo do `FE-S` (ver `docs/superpowers/specs/2026-07-19-controlo-porcoes-design.md` §Fora de escopo) e listado como backlog não agendado em `docs/plano/tasks.md`: "implica endpoint de geração novo — fica para uma sessão de planeamento dedicada". Esta é essa sessão.

A ideia: o cliente pode pedir, a qualquer momento, uma receita avulsa fora da geração semanal normal — para "agora não sei o que cozinhar", sem esperar pela próxima geração de plano. Reaproveita ao máximo o que já existe (Wizard do onboarding, ecrã de espera do T-07, `swap` de refeição, `RecipeHero`/`RecipeStatCard` do detalhe de receita) — a única peça genuinamente nova é o mock de geração avulsa e o mecanismo de "guardar num dia".

## 1. Entrada — cartão no dashboard

**Ficheiros:** `(cliente)/plano/page.tsx`, `(cliente)/plano/page.module.css`.

Cartão dedicado no topo do `/plano`, acima do `DayTabs` — usa `Card`/`Button` já existentes, sem componente novo. Texto: "Não sabes o que cozinhar agora?" + CTA "Pedir uma receita". Navega para `/plano/pedir-agora`.

## 2. Mini-wizard (4 ecrãs, 1 pergunta por ecrã)

**Ficheiros novos:** `(cliente)/plano/pedir-agora/page.tsx` (+ `page.module.css`), reaproveitando `Wizard`/`WizardStep`/`OptionCard`/`FormField` do onboarding (`FE-B08`, `FE-C02`) como referência direta de padrão.

1. **"Para que refeição é agora?"** — `MealSlot` (Pequeno-almoço/Almoço/Jantar/Lanche), via `OptionCard`, igual ao padrão do onboarding. Pré-selecionado pela hora do dia (mesma lógica de `timeOfDayGreeting`, adaptada: madrugada/manhã→Pequeno-almoço, meio-dia→Almoço, noite→Jantar).
2. **"Qual é o objetivo desta receita?"** — reaproveita o enum `Goal` já existente (`PERDER_PESO`/`COMER_MELHOR`/`GANHAR_MASSA`/`GERIR_CONDICAO`) e as mesmas labels do onboarding — não inventa taxonomia nova. Pré-selecionado com o `goal` do perfil, editável só para este pedido (não grava no perfil).
3. **"Alguma restrição pontual para agora?"** — `Input` de texto livre, opcional, máx. 140 caracteres (ex.: "só tenho o que está na despensa", "sem carne hoje"). **Limitação honesta, documentada na UI e no código:** o mock não tem IA real — este texto é guardado e devolvido no pedido, mas não filtra a receita escolhida. Fica pronto para quando houver geração real a interpretá-lo.
4. **"Confirma"** — resumo (refeição, objetivo, restrição se preenchida) + botão "Gerar receita".

Sem rascunho local (ao contrário do onboarding) — é um fluxo curto e de um único uso; sair a meio descarta o progresso.

## 3. Geração — contrato/mock novo

**Ficheiros:** tipos novos em `src/types/api.d.ts` (hand-editado, como `FE-S01` — `levesabor-api/openapi.yaml` não existe neste worktree, ver nota em `FE-S01` no `tasks.md`), `src/mocks/fixtures.ts`, `src/mocks/handlers.ts`.

- `AdHocRecipeRequest`: `{ mealSlot: MealSlot; goal?: Goal; note?: string }`.
- `POST /me/recipes/adhoc` → `202 { id, status: "GENERATING" }` — mesmo padrão 202+polling do `POST /me/meal-plans` (T-07).
- `GET /me/recipes/adhoc/{id}` → polling (mesmo `POLL_INTERVAL_MS`/nº de polls do T-07) → `{ id, status: "GENERATING" | "READY" | "FAILED", recipe: RecipeSnapshot | null }`.
- Mock escolhe uma receita do `RECIPE_CATALOG` cujo `slotOf(id) === mealSlot`, excluindo receitas com feedback `DISLIKE` do cliente (mesma regra de exclusão usada em `pickAlternative`, reaproveitada/partilhada). `note` é guardado no registo do pedido em memória mas não influencia a escolha (ver limitação no passo 3 acima).
- **Limite diário — contador próprio, 3/dia**, separado do contador de geração semanal (`dailyGenerationCount`). Novo código de erro `LSA015_ADHOC_LIMIT` (encaixa a seguir a `LSA014_NO_ALTERNATIVE`, no cluster de geração 010–014 do `ErrorCode`). Ecrã de espera trata este erro como o `limit_reached` do T-07.

## 4. Ecrã de espera + resultado

**Ficheiros:** dentro de `(cliente)/plano/pedir-agora/page.tsx` (fase seguinte ao wizard, mesma página/rota — não uma rota nova).

- Espera: reaproveita o padrão visual do T-07 (`BrandIllustration variant="generating"`, mensagens rotativas — pode reaproveitar `ROTATING_MESSAGES` ou uma lista curta própria) enquanto faz polling.
- Resultado: reaproveita a composição visual do detalhe da receita (T-05) — `RecipeHero` + par de `RecipeStatCard` (Tempo/Custo) + `MacroRing lg`. **Cartão avulso descartável**, duas ações no fim:
  - **"Guardar num dia"** — abre `BottomSheet` (já existe, mesmo padrão da troca de refeição) listando os 7 dias × 3 refeições do plano ativo (nome do dia + refeição atual nesse slot); cliente escolhe qual substituir.
  - **"Descartar"** — fecha, nada muda, volta a `/plano`.

## 5. "Guardar num dia" — reaproveita o mecanismo do swap

**Ficheiros:** `src/mocks/fixtures.ts`, `src/mocks/handlers.ts`.

- `POST /me/meal-plans/entries/{id}/replace` `{ recipeId }` — variante do que `proposeOrApplySwap(entryId, confirm=true)` já faz internamente (`entry.recipe = cloneRecipe(recipeId); entry.feedback = "NONE"`), mas com o `recipeId` escolhido pelo cliente (a receita avulsa) em vez de uma alternativa escolhida pelo servidor. Extrai-se essa mutação para uma função partilhada `applyRecipeToEntry(entryId, recipeId)`, reaproveitada por `proposeOrApplySwap` e pelo novo endpoint.
- Mesmo comportamento atual do swap: **não recalcula a lista de compras automaticamente** (fora de escopo, tal como hoje).

## Fora de escopo

- Editar a nota de texto livre depois de gerado, ou re-gerar com o mesmo input.
- Histórico de pedidos avulsos (não há ecrã "as tuas receitas pedidas").
- Qualquer alteração ao `ShoppingListService`/backend real — mock apenas (mesma fronteira do `FE-S`).
- Interpretação real da nota de texto livre por IA — documentado como limitação atual, não implementado aqui.
- Alterar o `swap` existente além da extração interna da função partilhada — o comportamento de `POST .../swap` não muda.

## Critérios de verificação

- Cartão "Pedir uma receita" visível no topo do `/plano`, navega para o wizard.
- Wizard: 4 passos, refeição pré-selecionada pela hora, objetivo pré-selecionado pelo perfil (editável), nota opcional (máx. 140 carateres), resumo antes de gerar.
- Geração: ecrã de espera com polling, chega a `READY` com uma receita do `mealSlot` pedido, nunca uma que o cliente já tenha 👎.
- 4º pedido avulso no mesmo dia (mock) devolve `LSA015_ADHOC_LIMIT` e o ecrã mostra o estado de limite atingido — sem afetar o contador da geração semanal (continua a permitir gerar plano semanal normalmente).
- "Guardar num dia": `BottomSheet` lista os 7×3 slots, escolher um substitui essa entrada no plano ativo (visível no dashboard ao voltar) — mesmo efeito visual de uma troca normal.
- "Descartar": volta ao dashboard sem alterar o plano.
- `npm run build`/`typecheck`/`lint` sem erros novos; teste manual no browser (dashboard → pedir agora → wizard → espera → guardar num dia) antes de dar como concluído.

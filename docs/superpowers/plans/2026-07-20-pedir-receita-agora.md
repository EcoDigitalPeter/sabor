# "Pedir receita agora" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deixar o cliente pedir, a qualquer momento, uma receita avulsa fora do plano semanal (mini-wizard → geração assíncrona simulada → cartão de resultado descartável → opção de guardar num dia do plano ativo).

**Architecture:** Nova rota `/plano/pedir-agora` no App Router (Next.js), reaproveitando os padrões já existentes no projeto (Wizard do onboarding, ecrã de espera com polling do T-07, composição visual do detalhe de receita T-05, `BottomSheet`). Contrato e "backend" continuam a viver só no mock MSW (`src/mocks/fixtures.ts` + `handlers.ts`) — sem alterações a infraestrutura real, projeto ainda não tem `BE-A01`.

**Tech Stack:** Next.js 14 App Router, TanStack Query, MSW (mocks), TypeScript, CSS Modules, lucide-react.

## Global Constraints

- Spec de referência: `docs/superpowers/specs/2026-07-20-pedir-receita-agora-design.md` — todo requisito deste plano remete para uma secção numerada desse documento.
- Sem framework de testes unitários neste projeto (só `test:e2e` via Playwright, ver `package.json`) — a verificação "TDD" desta feature usa `npm run typecheck`/`npm run lint`/`npm run build` a cada task de código, e um teste e2e Playwright cobrindo o fluxo completo na task final (mesmo padrão do `e2e/portal.spec.ts` já existente).
- `levesabor-api/openapi.yaml` não existe neste worktree (removido no commit `1ab41c3`) — tipos novos são editados à mão em `src/types/api.d.ts`, só em `components["schemas"]` (mesmo padrão do `FE-S01`, que não tocou em `paths`/`operations`, que também não são consumidos por nenhum código do frontend).
- Reaproveitar componentes/padrões existentes sempre que possível — não criar componentes novos que dupliquem `Wizard`, `OptionCard`, `BottomSheet`, `RecipeHero`, `RecipeStatCard`, `MacroRing`, `Button`, `Card`, `FormField`, `Input`.
- Regra do projeto (memory `frontend-first-workflow`): pedir confirmação do utilizador antes de cada bloco de trabalho, salvo se o utilizador disser para executar tudo de seguida.

---

### Task 1: `docs/plano/tasks.md` — promover backlog a cartão FE-T

**Files:**
- Modify: `docs/plano/tasks.md`

**Interfaces:** N/A (documentação).

- [ ] **Step 1: Remover a linha de backlog e adicionar a secção FE-T**

Localizar a linha (dentro da secção `### FE-Q`):
```
Backlog (não agendado): **"Pedir receita agora"** — botão de acesso rápido no dashboard para pedir uma receita ad-hoc (mesmo mock do Stitch); implica endpoint de geração novo — fica para uma sessão de planeamento dedicada, como o Modo Cozinhar.
```

Substituir por (mantém o parágrafo, remove só a linha de backlog "Pedir receita agora" — "Modo Cozinhar" fica):
```
Backlog (não agendado): **Modo Cozinhar** (temporizador circular passo-a-passo, inspirado no benchmark) — feature nova maior, precisa de modelo de dados próprio (tempo por passo não existe hoje); fica para uma sessão de planeamento dedicada.
```

Depois, adicionar uma nova secção logo a seguir à secção `### FE-S — Controlo de porções ("Pessoas em casa")` (antes de `### FE-D — Telas do Portal Admin`):

```markdown
### FE-T — "Pedir receita agora" (receita avulsa fora do plano semanal)

Spec: `docs/superpowers/specs/2026-07-20-pedir-receita-agora-design.md`. Extraído do mesmo mock "T-04 Dashboard Gamificado" do Stitch que originou o `FE-S`; ficou de fora do escopo do `FE-S` por implicar um endpoint de geração novo. Cliente pede uma receita avulsa a qualquer momento (mini-wizard de 4 passos), recebe um cartão de resultado descartável, e pode guardá-lo num dia/refeição do plano ativo ou descartar.

- [ ] **FE-T01 · Contrato — `AdHocRecipeRequest`/`AdHocRecipeHandle`/`LSA015_ADHOC_LIMIT`** — Tipos novos em `src/types/api.d.ts` (hand-editado, como `FE-S01`). `[deps: —]`
- [ ] **FE-T02 · Mock — geração avulsa + "guardar num dia"** — `applyRecipeToEntry` partilhada (extraída do `swap`), `requestAdHocRecipe`/`pollAdHocRecipe` (padrão 202+polling do T-07, limite próprio 3/dia), `replaceMealPlanEntry`. `[deps: FE-T01]`
- [ ] **FE-T03 · Mock — handlers novos** — `POST /me/recipes/adhoc`, `GET /me/recipes/adhoc/{id}`, `POST /me/meal-plans/entries/{id}/replace`. `[deps: FE-T02]`
- [ ] **FE-T04 · Página `/plano/pedir-agora`** — mini-wizard (refeição/objetivo/nota/confirmar, reaproveita `Wizard`/`OptionCard` do onboarding) + ecrã de espera (padrão T-07) + cartão de resultado (padrão T-05: `RecipeHero`/`RecipeStatCard`/`MacroRing lg`) + `BottomSheet` "guardar num dia". `[deps: FE-T03]`
- [ ] **FE-T05 · Cartão CTA no dashboard + teste e2e** — Cartão "Pedir uma receita" no topo do `/plano`; `e2e/pedir-agora.spec.ts` cobrindo o fluxo completo. `[deps: FE-T04]`
```

- [ ] **Step 2: Commit**

```bash
git add docs/plano/tasks.md
git commit -m "docs(tasks): promove backlog Pedir receita agora a cartão FE-T"
```

---

### Task 2: Contrato — tipos novos + `LSA015_ADHOC_LIMIT`

**Files:**
- Modify: `levesabor/levesabor-web/src/types/api.d.ts`

**Interfaces:**
- Produces: `components["schemas"]["AdHocRecipeRequest"]` (`{ mealSlot: "PEQUENO_ALMOCO"|"ALMOCO"|"JANTAR"|"LANCHE"; goal?: Goal; note?: string }`), `components["schemas"]["AdHocRecipeHandle"]` (`{ id?: number; status?: "GENERATING"|"READY"|"FAILED"; recipe?: RecipeSnapshot | null }`), `components["schemas"]["ReplaceMealPlanEntryRequest"]` (`{ recipeId: number }`), `ErrorCode` inclui `"LSA015_ADHOC_LIMIT"`.

- [ ] **Step 1: Adicionar `LSA015_ADHOC_LIMIT` ao enum `ErrorCode`**

Encontrar (linha ~586):
```ts
        ErrorCode: "LSA001_VALIDATION" | "LSA002_INVALID_CREDENTIALS" | "LSA003_ACCOUNT_SUSPENDED" | "LSA004_FORBIDDEN" | "LSA005_NOT_FOUND" | "LSA006_DUPLICATE" | "LSA010_PROFILE_INCOMPLETE" | "LSA011_GENERATION_IN_PROGRESS" | "LSA012_GENERATION_LIMIT" | "LSA013_AI_UNAVAILABLE" | "LSA014_NO_ALTERNATIVE" | "LSA020_IMPORT_INVALID_FILE" | "LSA021_INGREDIENT_IN_USE" | "LSA022_LAST_ADMIN" | "LSA023_RECIPE_INCOMPLETE" | "LSA099_INTERNAL";
```

Substituir por (insere `LSA015_ADHOC_LIMIT` a seguir a `LSA014_NO_ALTERNATIVE`):
```ts
        ErrorCode: "LSA001_VALIDATION" | "LSA002_INVALID_CREDENTIALS" | "LSA003_ACCOUNT_SUSPENDED" | "LSA004_FORBIDDEN" | "LSA005_NOT_FOUND" | "LSA006_DUPLICATE" | "LSA010_PROFILE_INCOMPLETE" | "LSA011_GENERATION_IN_PROGRESS" | "LSA012_GENERATION_LIMIT" | "LSA013_AI_UNAVAILABLE" | "LSA014_NO_ALTERNATIVE" | "LSA015_ADHOC_LIMIT" | "LSA020_IMPORT_INVALID_FILE" | "LSA021_INGREDIENT_IN_USE" | "LSA022_LAST_ADMIN" | "LSA023_RECIPE_INCOMPLETE" | "LSA099_INTERNAL";
```

- [ ] **Step 2: Adicionar os schemas novos a seguir a `GenerationHandleEnvelope`**

Encontrar (linha ~710-717):
```ts
        GenerationHandle: {
            /** Format: int64 */
            id?: number;
            /** @enum {string} */
            status?: "GENERATING" | "READY" | "FAILED";
        };
        GenerationHandleEnvelope: components["schemas"]["ApiResponseVoid"] & {
            data?: components["schemas"]["GenerationHandle"];
        };
```

Adicionar imediatamente a seguir (antes do próximo schema existente):
```ts
        /** @description "Pedir receita agora" (FE-T) — mini-wizard de receita avulsa fora do plano semanal. */
        AdHocRecipeRequest: {
            /** @enum {string} */
            mealSlot: "PEQUENO_ALMOCO" | "ALMOCO" | "JANTAR" | "LANCHE";
            goal?: components["schemas"]["Goal"];
            /** @description Restrição pontual em texto livre, opcional, máx. 140 caracteres. Guardada no pedido mas não filtra a receita escolhida — o mock não tem IA real para a interpretar. */
            note?: string;
        };
        AdHocRecipeHandle: {
            /** Format: int64 */
            id?: number;
            /** @enum {string} */
            status?: "GENERATING" | "READY" | "FAILED";
            recipe?: components["schemas"]["RecipeSnapshot"] | null;
        };
        AdHocRecipeEnvelope: components["schemas"]["ApiResponseVoid"] & {
            data?: components["schemas"]["AdHocRecipeHandle"];
        };
        ReplaceMealPlanEntryRequest: {
            /** Format: int64 */
            recipeId: number;
        };
```

- [ ] **Step 3: Typecheck**

Run: `cd levesabor/levesabor-web && npm run typecheck`
Expected: sem erros (ficheiro só adiciona tipos, nada os consome ainda).

- [ ] **Step 4: Commit**

```bash
git add levesabor/levesabor-web/src/types/api.d.ts
git commit -m "feat(contrato): tipos AdHocRecipeRequest/Handle + LSA015_ADHOC_LIMIT (FE-T01)"
```

---

### Task 3: Mock — `applyRecipeToEntry` partilhada + geração avulsa + "guardar num dia"

**Files:**
- Modify: `levesabor/levesabor-web/src/mocks/fixtures.ts`

**Interfaces:**
- Consumes: `RECIPE_CATALOG: Record<number, RecipeSnapshot>`, `cloneRecipe(recipeId: number): RecipeSnapshot`, `slotOf(recipeId: number): MealSlot`, `activePlan: MealPlan`, `findMealPlanEntry(entryId: number): MealPlanEntry | undefined`, `scaleRecipeSnapshot(recipe: RecipeSnapshot | undefined): RecipeSnapshot | undefined`, `okResult`/`errResult`/`MockResult<T>`.
- Produces: `requestAdHocRecipe(input: AdHocRecipeRequest): MockResult<{ id: number; status: "GENERATING" }>`, `pollAdHocRecipe(id: number): MockResult<AdHocRecipeHandle>`, `replaceMealPlanEntry(entryId: number, recipeId: number): MockResult<MealPlanEntry>`.

- [ ] **Step 1: Adicionar os aliases de tipo novos**

No topo do ficheiro, a seguir à linha `type MealSlot = NonNullable<MealPlanEntry["mealSlot"]>;` (linha ~23), adicionar:
```ts
type AdHocRecipeRequest = components["schemas"]["AdHocRecipeRequest"];
type AdHocRecipeHandle = components["schemas"]["AdHocRecipeHandle"];
```

- [ ] **Step 2: Extrair `applyRecipeToEntry` partilhada e usá-la no `swap`**

Encontrar, dentro de `proposeOrApplySwap` (perto da linha ~562):
```ts
  if (confirm) {
    entry.recipe = alternative;
    entry.feedback = "NONE";
    return okResult({ state: "applied", alternative: { recipe: cloneRecipe(alternative.recipeId!) } });
  }
```

Substituir por:
```ts
  if (confirm) {
    applyRecipeToEntry(entry, alternative);
    return okResult({ state: "applied", alternative: { recipe: cloneRecipe(alternative.recipeId!) } });
  }
```

Imediatamente antes da função `export function proposeOrApplySwap(`, adicionar a nova função partilhada:
```ts
// FE-T02: mutação partilhada entre o swap (confirm=true) e "guardar num dia" (receita avulsa) —
// ambos substituem a receita de uma entrada do plano ativo da mesma forma.
function applyRecipeToEntry(entry: MealPlanEntry, recipe: RecipeSnapshot): void {
  entry.recipe = recipe;
  entry.feedback = "NONE";
}

```

- [ ] **Step 3: Adicionar `replaceMealPlanEntry` a seguir a `applyRecipeFeedback`**

Localizar o fim de `applyRecipeFeedback` (linha ~583-584, termina em `return okResult(null);\n}`). Imediatamente a seguir, adicionar:
```ts

// FE-T02: "guardar num dia" — mesma mutação do swap confirmado, mas com o recipeId escolhido
// pelo cliente (a receita avulsa) em vez de uma alternativa escolhida pelo servidor.
export function replaceMealPlanEntry(entryId: number, recipeId: number): MockResult<MealPlanEntry> {
  const entry = findMealPlanEntry(entryId);
  if (!entry) {
    return errResult("LSA005_NOT_FOUND", "Refeição não encontrada.", 404);
  }
  if (!RECIPE_CATALOG[recipeId]) {
    return errResult("LSA005_NOT_FOUND", "Receita não encontrada.", 404);
  }
  applyRecipeToEntry(entry, cloneRecipe(recipeId));
  return okResult({ ...entry, recipe: scaleRecipeSnapshot(entry.recipe) });
}
```

- [ ] **Step 4: Adicionar o bloco de geração avulsa, a seguir ao bloco de geração do plano semanal**

Localizar o fim de `pollMealPlanGeneration` (fecha com `return okResult({ id, status: "READY", mealPlanId: ACTIVE_PLAN_ID });\n}`, logo antes do comentário `// ─── Lista de compras (F1-CLI-06) ...`). Adicionar imediatamente a seguir (antes desse comentário):

```ts

// ─────────────────────────────────────────────────────────────────────────
// "Pedir receita agora" (FE-T) — receita avulsa fora do plano semanal. Mesmo padrão
// 202+polling da geração do plano, mas com contador diário próprio (não partilha o
// dailyGenerationCount da geração semanal — pedir uma receita avulsa não deve bloquear
// nem ser bloqueado por gerar um plano novo).
// ─────────────────────────────────────────────────────────────────────────
const adHocPolls = new Map<number, { polls: number; mealSlot: MealSlot; goal?: Goal; note?: string }>();
let dailyAdHocCount = 0;
let nextAdHocId = 9000;

function dislikedRecipeIds(): Set<number> {
  const ids = new Set<number>();
  for (const day of activePlan.days ?? []) {
    for (const entry of day.entries ?? []) {
      if (entry.feedback === "DISLIKE" && entry.recipe?.recipeId !== undefined) {
        ids.add(entry.recipe.recipeId);
      }
    }
  }
  return ids;
}

function pickAdHocRecipe(mealSlot: MealSlot): RecipeSnapshot {
  const disliked = dislikedRecipeIds();
  const allIds = Object.keys(RECIPE_CATALOG).map(Number);
  // slotOf() só mapeia para PEQUENO_ALMOCO/ALMOCO/JANTAR — a semente de RECIPE_CATALOG não tem
  // receitas dedicadas a LANCHE. Pedido de LANCHE cai no catálogo inteiro como fallback,
  // preferindo sempre receitas que o cliente não tenha marcado 👎.
  const bySlot = allIds.filter((id) => slotOf(id) === mealSlot);
  const pool = bySlot.length > 0 ? bySlot : allIds;
  const preferredId = pool.find((id) => !disliked.has(id));
  const chosenId = preferredId ?? pool[0];
  return cloneRecipe(chosenId);
}

export function requestAdHocRecipe(input: AdHocRecipeRequest): MockResult<{ id: number; status: "GENERATING" }> {
  if (dailyAdHocCount >= 3) {
    return errResult(
      "LSA015_ADHOC_LIMIT",
      "Atingiste o limite diário de 3 pedidos avulsos. Tenta novamente amanhã.",
      429,
    );
  }
  dailyAdHocCount += 1;
  const id = nextAdHocId++;
  adHocPolls.set(id, { polls: 0, mealSlot: input.mealSlot, goal: input.goal, note: input.note });
  return okResult({ id, status: "GENERATING" }, 202);
}

export function pollAdHocRecipe(id: number): MockResult<AdHocRecipeHandle> {
  const record = adHocPolls.get(id);
  if (!record) {
    return errResult("LSA005_NOT_FOUND", "Pedido não encontrado.", 404);
  }
  record.polls += 1;
  if (record.polls < 2) {
    return okResult({ id, status: "GENERATING", recipe: null });
  }
  const recipe = pickAdHocRecipe(record.mealSlot);
  return okResult({ id, status: "READY", recipe: scaleRecipeSnapshot(recipe) ?? recipe });
}
```

- [ ] **Step 5: Typecheck**

Run: `cd levesabor/levesabor-web && npm run typecheck`
Expected: sem erros. Se `Goal` não estiver importado como tipo local, confirmar que a linha `type Goal = components["schemas"]["Goal"];` já existe perto do topo do ficheiro (deve existir — `RECIPE_CATALOG`/perfil já a usam via `Profile`; se o typecheck acusar `Goal` não definido, adicionar `type Goal = components["schemas"]["Goal"];` junto aos outros aliases do topo).

- [ ] **Step 6: Commit**

```bash
git add levesabor/levesabor-web/src/mocks/fixtures.ts
git commit -m "feat(mocks): geração avulsa (adhoc) + guardar num dia partilhando mutação do swap (FE-T02)"
```

---

### Task 4: Mock — handlers novos

**Files:**
- Modify: `levesabor/levesabor-web/src/mocks/handlers.ts`

**Interfaces:**
- Consumes: `requestAdHocRecipe`, `pollAdHocRecipe`, `replaceMealPlanEntry` (de `./fixtures`, Task 3), `respond<T>(result: MockResult<T>)` (já existe no ficheiro).
- Produces: 3 rotas MSW novas — `POST */api/v1/me/recipes/adhoc`, `GET */api/v1/me/recipes/adhoc/:id`, `POST */api/v1/me/meal-plans/entries/:id/replace`.

- [ ] **Step 1: Importar as novas funções de `./fixtures`**

No bloco de import (linhas ~18-40), adicionar `replaceMealPlanEntry`, `requestAdHocRecipe`, `pollAdHocRecipe` à lista (ordem alfabética, mesmo estilo do resto do import):
```ts
import {
  ADMIN_INGREDIENTS,
  ADMIN_RECIPES,
  ADMIN_STORES,
  ADMIN_USERS,
  LOJA_PRODUCTS,
  METRICS_SUMMARY,
  applyRecipeFeedback,
  getActivePlan,
  getMealPlanEntryForResponse,
  getProfile,
  getShoppingList,
  login,
  pollAdHocRecipe,
  pollMealPlanGeneration,
  proposeOrApplySwap,
  refreshSession,
  registerAccount,
  replaceMealPlanEntry,
  requestAdHocRecipe,
  requestMealPlanGeneration,
  setAdminRecipeStatus,
  updateProfile,
  updateShoppingListItem,
  type MockResult,
} from "./fixtures";
```

- [ ] **Step 2: Adicionar o alias de tipo do body**

Junto aos outros `type ... = components["schemas"][...]` (linhas ~42-48), adicionar:
```ts
type AdHocRecipeRequest = components["schemas"]["AdHocRecipeRequest"];
type ReplaceMealPlanEntryRequest = components["schemas"]["ReplaceMealPlanEntryRequest"];
```

- [ ] **Step 3: Adicionar as 3 rotas novas**

A seguir ao handler `http.post("*/api/v1/me/meal-plans", ...)` (geração do plano semanal, linha ~92) e antes do comentário `// IMPORTANTE: "/me/meal-plans/active" ...`, adicionar:
```ts
  // ── "Pedir receita agora" (FE-T) ────────────────────────────────────
  http.post("*/api/v1/me/recipes/adhoc", async ({ request }) => {
    const body = (await request.json()) as AdHocRecipeRequest;
    return respond(requestAdHocRecipe(body));
  }),

  http.get("*/api/v1/me/recipes/adhoc/:id", ({ params }) => {
    return respond(pollAdHocRecipe(Number(params.id)));
  }),

```

A seguir ao handler `http.post("*/api/v1/me/meal-plans/entries/:id/swap", ...)` (linha ~112-117), adicionar:
```ts

  // ── Guardar receita avulsa num dia (FE-T) ───────────────────────────
  http.post("*/api/v1/me/meal-plans/entries/:id/replace", async ({ params, request }) => {
    const entryId = Number(params.id);
    const body = (await request.json()) as ReplaceMealPlanEntryRequest;
    return respond(replaceMealPlanEntry(entryId, body.recipeId));
  }),
```

- [ ] **Step 4: Typecheck + lint**

Run: `cd levesabor/levesabor-web && npm run typecheck && npm run lint`
Expected: sem erros/avisos novos.

- [ ] **Step 5: Commit**

```bash
git add levesabor/levesabor-web/src/mocks/handlers.ts
git commit -m "feat(mocks): handlers de geração avulsa e guardar num dia (FE-T03)"
```

---

### Task 5: Página `/plano/pedir-agora`

**Files:**
- Create: `levesabor/levesabor-web/src/app/(cliente)/plano/pedir-agora/page.tsx`
- Create: `levesabor/levesabor-web/src/app/(cliente)/plano/pedir-agora/page.module.css`

**Interfaces:**
- Consumes: `api`/`ApiError`/`queryClient` (`@/lib/api`), `Wizard`/`WizardStep` (`@/components/ui/Wizard`), `OptionCard` (`@/components/onboarding/OptionCard`), `FormField`/`formFieldErrorId` (`@/components/ui/FormField`), `Input` (`@/components/ui/Input`), `Button` (`@/components/ui/Button`), `BrandIllustration` (`@/components/ui/BrandIllustration`), `ErrorState` (`@/components/ui/ErrorState`), `BottomSheet` (`@/components/ui/BottomSheet`), `RecipeHero` (`@/components/plan/RecipeHero`), `RecipeStatCard` (`@/components/plan/RecipeStatCard`), `MacroRing` (`@/components/macro-ring/MacroRing`), `getRecipePhoto` (`@/data/recipe-photos`), `ROTATING_MESSAGES`/`MESSAGE_ROTATE_INTERVAL_MS` (`../gerar/messages`), tipos `AdHocRecipeRequest`/`AdHocRecipeHandle`/`Goal`/`MealSlot`/`Profile`/`MealPlan`/`MealPlanEntry` (`@/types/api`).
- Produces: rota `/plano/pedir-agora` (nenhum outro ficheiro depende desta página — é folha da árvore de navegação, só a Task 6 adiciona um link para ela).

- [ ] **Step 1: Escrever `page.module.css`**

```css
/* FE-T04 · "Pedir receita agora" — mini-wizard + espera + resultado. Reaproveita os padrões
   visuais do onboarding (wizard), T-07 (espera) e T-05 (resultado). */

.step {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.question {
  margin: 0;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.4rem;
  line-height: 1.3;
  color: var(--ink);
}

.hint {
  margin: -10px 0 0;
  font-family: var(--font-body);
  font-size: 0.9rem;
  line-height: 1.4;
  color: var(--clay-soft);
}

.optionGrid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

@media (max-width: 380px) {
  .optionGrid {
    grid-template-columns: 1fr;
  }
}

.summaryList {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 16px;
  border-radius: var(--radius-card);
  background: var(--cream-card-alt);
}

.summaryRow {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-family: var(--font-body);
  font-size: 0.9rem;
}

.summaryRow dt {
  color: var(--clay-soft);
}

.summaryRow dd {
  margin: 0;
  font-weight: 600;
  color: var(--ink);
  text-align: right;
}

.submitError {
  margin-top: 4px;
}

/* ---------- Espera (mesmo padrão visual do T-07) ---------- */

.main {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  padding: 24px 16px 32px;
  max-width: 640px;
  margin: 0 auto;
}

.generating {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 28px;
  padding: 40px 24px;
  text-align: center;
}

.ringWrap {
  display: flex;
  animation: ls-pedir-rotate 3.6s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
  .ringWrap {
    animation: none;
  }
}

@keyframes ls-pedir-rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.message {
  margin: 0;
  min-height: 2.6em;
  max-width: 320px;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 1.05rem;
  line-height: 1.4;
  color: var(--ink);
}

/* ---------- Resultado (mesmo padrão visual do T-05) ---------- */

.resultTitle {
  margin: 16px 0 0;
  font-family: var(--font-display);
  font-size: clamp(1.3rem, 1.15rem + 0.6vw, 1.6rem);
  font-weight: 700;
  color: var(--ink);
}

.statsRow {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin: 16px 0;
}

.ringRow {
  display: flex;
  justify-content: center;
  padding: 8px 0 20px;
}

.resultActions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* ---------- BottomSheet "guardar num dia" ---------- */

.sheetTitle {
  margin: 0 0 12px;
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--ink);
}

.dayList {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 50vh;
  overflow-y: auto;
}

.dayRow {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  width: 100%;
  padding: 10px 14px;
  border: 1px solid rgba(36, 26, 20, 0.08);
  border-radius: var(--radius-card-sm);
  background: var(--cream-card);
  text-align: left;
  cursor: pointer;
  font-family: var(--font-body);
}

.dayRow:hover:not(:disabled) {
  border-color: var(--tan);
}

.dayRow:disabled {
  opacity: 0.6;
  cursor: default;
}

.dayRowMeta {
  font-size: 12px;
  font-weight: 600;
  color: var(--clay-soft);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.dayRowName {
  font-size: 0.95rem;
  color: var(--ink);
}

.disclaimer {
  margin-top: 24px;
  max-width: 360px;
  font-family: var(--font-body);
  font-size: 0.8rem;
  line-height: 1.5;
  color: var(--clay-soft);
}
```

- [ ] **Step 2: Escrever `page.tsx`**

```tsx
// FE-T04 · "Pedir receita agora" — mini-wizard (refeição/objetivo/nota/confirmar) + espera
// (padrão T-07) + resultado descartável (padrão T-05) + guardar num dia (BottomSheet).
// docs/superpowers/specs/2026-07-20-pedir-receita-agora-design.md
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import type { components } from "@/types/api";
import { Wizard, type WizardStep } from "@/components/ui/Wizard";
import { OptionCard } from "@/components/onboarding/OptionCard";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { BrandIllustration } from "@/components/ui/BrandIllustration";
import { ErrorState } from "@/components/ui/ErrorState";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { RecipeHero } from "@/components/plan/RecipeHero";
import { RecipeStatCard } from "@/components/plan/RecipeStatCard";
import { MacroRing } from "@/components/macro-ring/MacroRing";
import { getRecipePhoto } from "@/data/recipe-photos";
import { ROTATING_MESSAGES, MESSAGE_ROTATE_INTERVAL_MS } from "../gerar/messages";
import styles from "./page.module.css";

type Profile = components["schemas"]["Profile"];
type Goal = components["schemas"]["Goal"];
type MealSlot = NonNullable<components["schemas"]["MealPlanEntry"]["mealSlot"]>;
type AdHocRecipeRequest = components["schemas"]["AdHocRecipeRequest"];
type AdHocRecipeHandle = components["schemas"]["AdHocRecipeHandle"];
type MealPlan = components["schemas"]["MealPlan"];
type MealPlanEntry = components["schemas"]["MealPlanEntry"];
type RecipeSnapshot = components["schemas"]["RecipeSnapshot"];

const MEAL_SLOT_OPTIONS: { value: MealSlot; label: string }[] = [
  { value: "PEQUENO_ALMOCO", label: "Pequeno-almoço" },
  { value: "ALMOCO", label: "Almoço" },
  { value: "JANTAR", label: "Jantar" },
  { value: "LANCHE", label: "Lanche" },
];

const GOAL_OPTIONS: { value: Goal; label: string }[] = [
  { value: "PERDER_PESO", label: "Perder peso" },
  { value: "COMER_MELHOR", label: "Comer melhor no dia a dia" },
  { value: "GANHAR_MASSA", label: "Ganhar massa" },
  { value: "GERIR_CONDICAO", label: "Gerir uma condição de saúde" },
];

const SLOT_ORDER: Record<string, number> = { PEQUENO_ALMOCO: 0, ALMOCO: 1, JANTAR: 2, LANCHE: 3 };
const MAX_NOTE_LENGTH = 140;
const POLL_INTERVAL_MS = 2500;
const DEFAULT_ERROR_MESSAGE = "Não foi possível gerar a tua receita agora. Tenta novamente.";

function defaultMealSlotForNow(): MealSlot {
  const hour = new Date().getHours();
  if (hour < 11) return "PEQUENO_ALMOCO";
  if (hour < 15) return "ALMOCO";
  return "JANTAR";
}

type Phase = "wizard" | "generating" | "result" | "failed" | "limit_reached";

export default function PedirAgoraPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const profileQuery = useQuery<Profile>({
    queryKey: ["profile"],
    queryFn: () => api<Profile>("/me/profile"),
    retry: false,
  });

  const [phase, setPhase] = useState<Phase>("wizard");
  const [stepIndex, setStepIndex] = useState(0);
  const [mealSlot, setMealSlot] = useState<MealSlot>(defaultMealSlotForNow());
  const [goal, setGoal] = useState<Goal | null>(null);
  const [note, setNote] = useState("");
  const [generationId, setGenerationId] = useState<number | null>(null);
  const [messageIndex, setMessageIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState(DEFAULT_ERROR_MESSAGE);
  const [resultRecipe, setResultRecipe] = useState<RecipeSnapshot | null>(null);
  const [saveSheetOpen, setSaveSheetOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Pré-seleciona o objetivo com o do perfil assim que carrega (editável só para este pedido).
  useEffect(() => {
    if (profileQuery.data?.goal && goal === null) {
      setGoal(profileQuery.data.goal);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só corre quando o perfil chega
  }, [profileQuery.data]);

  const requestAdHoc = useMutation<AdHocRecipeHandle, Error, AdHocRecipeRequest>({
    mutationFn: (body) => api<AdHocRecipeHandle>("/me/recipes/adhoc", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: (data) => {
      setGenerationId(data.id ?? null);
      setMessageIndex(0);
      setPhase("generating");
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === "LSA015_ADHOC_LIMIT") {
        setPhase("limit_reached");
        return;
      }
      setErrorMessage(error instanceof ApiError ? error.message : DEFAULT_ERROR_MESSAGE);
      setPhase("failed");
    },
  });

  const pollingEnabled = phase === "generating" && generationId !== null;
  const generationQuery = useQuery<AdHocRecipeHandle, Error>({
    queryKey: ["adhoc-recipe", generationId],
    queryFn: () => api<AdHocRecipeHandle>(`/me/recipes/adhoc/${generationId}`),
    enabled: pollingEnabled,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "READY" || status === "FAILED") return false;
      return POLL_INTERVAL_MS;
    },
  });

  useEffect(() => {
    const status = generationQuery.data?.status;
    if (status === "READY") {
      setResultRecipe(generationQuery.data?.recipe ?? null);
      setPhase("result");
    } else if (status === "FAILED") {
      setErrorMessage("A geração da tua receita falhou. Tenta novamente.");
      setPhase("failed");
    }
  }, [generationQuery.data]);

  useEffect(() => {
    if (!generationQuery.isError) return;
    setErrorMessage(generationQuery.error instanceof ApiError ? generationQuery.error.message : DEFAULT_ERROR_MESSAGE);
    setPhase("failed");
  }, [generationQuery.isError, generationQuery.error]);

  useEffect(() => {
    if (phase !== "generating") return;
    const timer = setInterval(() => {
      setMessageIndex((i) => (i + 1) % ROTATING_MESSAGES.length);
    }, MESSAGE_ROTATE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [phase]);

  const activePlanQuery = useQuery<MealPlan>({
    queryKey: ["active-meal-plan"],
    queryFn: () => api<MealPlan>("/me/meal-plans/active"),
    enabled: phase === "result",
  });

  const replaceMutation = useMutation<MealPlanEntry, Error, { entryId: number; recipeId: number }>({
    mutationFn: ({ entryId, recipeId }) =>
      api<MealPlanEntry>(`/me/meal-plans/entries/${entryId}/replace`, {
        method: "POST",
        body: JSON.stringify({ recipeId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-meal-plan"] });
      router.replace("/plano");
    },
    onError: () => {
      setSaveError("Não foi possível guardar a receita neste dia. Tenta novamente.");
    },
  });

  function handleGenerate() {
    requestAdHoc.mutate({ mealSlot, goal: goal ?? undefined, note: note.trim() || undefined });
  }

  function handleRetry() {
    setErrorMessage(DEFAULT_ERROR_MESSAGE);
    setGenerationId(null);
    handleGenerate();
  }

  const steps: WizardStep[] = [
    {
      id: "refeicao",
      content: (
        <div className={styles.step}>
          <h1 className={styles.question}>Para que refeição é agora?</h1>
          <div className={styles.optionGrid}>
            {MEAL_SLOT_OPTIONS.map((opt) => (
              <OptionCard
                key={opt.value}
                label={opt.label}
                selected={mealSlot === opt.value}
                onSelect={() => setMealSlot(opt.value)}
              />
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "objetivo",
      content: (
        <div className={styles.step}>
          <h1 className={styles.question}>Qual é o objetivo desta receita?</h1>
          <p className={styles.hint}>Começa igual ao teu perfil — muda só para este pedido.</p>
          <div className={styles.optionGrid}>
            {GOAL_OPTIONS.map((opt) => (
              <OptionCard
                key={opt.value}
                label={opt.label}
                selected={goal === opt.value}
                onSelect={() => setGoal(opt.value)}
              />
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "nota",
      content: (
        <div className={styles.step}>
          <h1 className={styles.question}>Alguma restrição pontual para agora?</h1>
          <p className={styles.hint}>Opcional. Ex.: &quot;só tenho o que está na despensa&quot;.</p>
          <FormField
            label="Nota"
            htmlFor="pedir-agora-nota"
            hint={`${note.length}/${MAX_NOTE_LENGTH} caracteres`}
          >
            <Input
              id="pedir-agora-nota"
              type="text"
              value={note}
              maxLength={MAX_NOTE_LENGTH}
              placeholder="ex.: sem carne hoje"
              onChange={(e) => setNote(e.target.value)}
            />
          </FormField>
        </div>
      ),
    },
    {
      id: "resumo",
      content: (
        <div className={styles.step}>
          <h1 className={styles.question}>Confirma o teu pedido</h1>
          <dl className={styles.summaryList}>
            <div className={styles.summaryRow}>
              <dt>Refeição</dt>
              <dd>{MEAL_SLOT_OPTIONS.find((o) => o.value === mealSlot)?.label ?? "—"}</dd>
            </div>
            <div className={styles.summaryRow}>
              <dt>Objetivo</dt>
              <dd>{GOAL_OPTIONS.find((o) => o.value === goal)?.label ?? "—"}</dd>
            </div>
            <div className={styles.summaryRow}>
              <dt>Restrição</dt>
              <dd>{note.trim() ? note.trim() : "Nenhuma"}</dd>
            </div>
          </dl>
          {requestAdHoc.isError ? (
            <ErrorState
              className={styles.submitError}
              message={requestAdHoc.error instanceof ApiError ? requestAdHoc.error.message : DEFAULT_ERROR_MESSAGE}
              onRetry={handleGenerate}
            />
          ) : null}
        </div>
      ),
    },
  ];

  const isLastStep = stepIndex === steps.length - 1;

  function handleNext() {
    if (isLastStep) {
      handleGenerate();
      return;
    }
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }

  function handleBack() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  if (phase === "wizard") {
    if (profileQuery.isLoading) {
      return <main className={styles.main} />;
    }
    return (
      <main className={styles.main}>
        <Wizard
          steps={steps}
          currentStepIndex={stepIndex}
          onNext={handleNext}
          onBack={handleBack}
          canGoNext={!requestAdHoc.isPending}
          nextLabel={isLastStep ? (requestAdHoc.isPending ? "A gerar…" : "Gerar receita") : "Continuar"}
        />
      </main>
    );
  }

  if (phase === "generating") {
    return (
      <main className={styles.main}>
        <div className={styles.generating}>
          <div className={styles.ringWrap}>
            <BrandIllustration variant="generating" size={200} />
          </div>
          <p className={styles.message} role="status" aria-live="polite">
            {ROTATING_MESSAGES[messageIndex]}
          </p>
        </div>
      </main>
    );
  }

  if (phase === "limit_reached") {
    return (
      <main className={styles.main}>
        <ErrorState message="Atingiste o limite de pedidos avulsos de hoje — tenta amanhã." />
      </main>
    );
  }

  if (phase === "failed") {
    return (
      <main className={styles.main}>
        <ErrorState message={errorMessage} onRetry={handleRetry} />
      </main>
    );
  }

  // phase === "result"
  const recipe = resultRecipe;
  const photoSrc = getRecipePhoto(recipe?.recipeId);
  const costLabel = recipe?.estimatedCostMt != null ? `${recipe.estimatedCostMt} MT` : "—";
  const days = activePlanQuery.data?.days ?? [];

  return (
    <main className={styles.main}>
      <RecipeHero photoSrc={photoSrc} alt={recipe?.name ?? "Receita"} />
      <h1 className={styles.resultTitle}>{recipe?.name ?? "Receita"}</h1>

      <div className={styles.statsRow}>
        <RecipeStatCard label="Tempo de preparação" value={`${recipe?.prepMinutes ?? 0} min`} tone="amber" />
        <RecipeStatCard label="Custo estimado" value={costLabel} tone="forest" />
      </div>

      <div className={styles.ringRow}>
        <MacroRing
          size="lg"
          kcal={recipe?.kcal ?? 0}
          macros={{
            proteina: recipe?.macros?.proteina ?? 0,
            carbs: recipe?.macros?.carbs ?? 0,
            gordura: recipe?.macros?.gordura ?? 0,
            fibra: recipe?.macros?.fibra ?? 0,
          }}
        />
      </div>

      <div className={styles.resultActions}>
        <Button
          type="button"
          variant="primary"
          onClick={() => setSaveSheetOpen(true)}
          disabled={!recipe?.recipeId}
        >
          Guardar num dia
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.push("/plano")}>
          Descartar
        </Button>
        {saveError ? (
          <p role="alert" className={styles.submitError}>
            {saveError}
          </p>
        ) : null}
      </div>

      <p className={styles.disclaimer}>Esta receita não substitui aconselhamento médico ou nutricional.</p>

      <BottomSheet open={saveSheetOpen} onClose={() => setSaveSheetOpen(false)}>
        <h2 className={styles.sheetTitle}>Guardar em que refeição?</h2>
        <div className={styles.dayList}>
          {days
            .flatMap((day) =>
              [...(day.entries ?? [])]
                .sort((a, b) => (SLOT_ORDER[a.mealSlot ?? ""] ?? 99) - (SLOT_ORDER[b.mealSlot ?? ""] ?? 99))
                .map((entry) => ({ day, entry })),
            )
            .map(({ day, entry }) => (
              <button
                key={entry.id}
                type="button"
                className={styles.dayRow}
                disabled={replaceMutation.isPending || !recipe?.recipeId}
                onClick={() =>
                  entry.id !== undefined &&
                  recipe?.recipeId !== undefined &&
                  replaceMutation.mutate({ entryId: entry.id, recipeId: recipe.recipeId })
                }
              >
                <span className={styles.dayRowMeta}>
                  {day.weekday} · {MEAL_SLOT_OPTIONS.find((o) => o.value === entry.mealSlot)?.label ?? ""}
                </span>
                <span className={styles.dayRowName}>{entry.recipe?.name ?? "—"}</span>
              </button>
            ))}
        </div>
      </BottomSheet>
    </main>
  );
}
```

- [ ] **Step 3: Typecheck + lint**

Run: `cd levesabor/levesabor-web && npm run typecheck && npm run lint`
Expected: sem erros/avisos. Se `FormField` não aceitar `hint` sem `error`, verificar a assinatura em `src/components/ui/FormField.tsx` e ajustar a prop conforme o componente real (já usada assim em `onboarding/page.tsx` linha 286, deve bater certo).

- [ ] **Step 4: Build**

Run: `cd levesabor/levesabor-web && npm run build`
Expected: `✓ Compiled successfully`, rota `/plano/pedir-agora` listada no output.

- [ ] **Step 5: Commit**

```bash
git add "levesabor/levesabor-web/src/app/(cliente)/plano/pedir-agora"
git commit -m "feat(plano): página Pedir receita agora — wizard + espera + resultado (FE-T04)"
```

---

### Task 6: Cartão CTA no dashboard + teste e2e + fechar cartão FE-T

**Files:**
- Modify: `levesabor/levesabor-web/src/app/(cliente)/plano/page.tsx`
- Modify: `levesabor/levesabor-web/src/app/(cliente)/plano/page.module.css`
- Create: `levesabor/levesabor-web/e2e/pedir-agora.spec.ts`
- Modify: `docs/plano/tasks.md`

**Interfaces:**
- Consumes: `Card` (`@/components/ui/Card`), `Link` (`next/link`) — ambos já usados noutras páginas do projeto.

- [ ] **Step 1: Adicionar o import de `Card` e o cartão CTA no dashboard**

Em `plano/page.tsx`, no bloco de imports (perto de `import { Button } from "@/components/ui/Button";`), adicionar:
```tsx
import { Card } from "@/components/ui/Card";
```

Localizar o `<header>` do dashboard:
```tsx
      <header className={styles.header}>
        {firstName ? (
          <p className={styles.greeting}>
            {timeOfDayGreeting()}, {firstName}
          </p>
        ) : null}
        <h1 className={styles.title}>O teu plano · {formatWeekRange(plan.weekStart ?? days[0]?.date ?? "")}</h1>
      </header>

      <DayTabs
```

Substituir por (adiciona o cartão entre o `</header>` e o `<DayTabs`):
```tsx
      <header className={styles.header}>
        {firstName ? (
          <p className={styles.greeting}>
            {timeOfDayGreeting()}, {firstName}
          </p>
        ) : null}
        <h1 className={styles.title}>O teu plano · {formatWeekRange(plan.weekStart ?? days[0]?.date ?? "")}</h1>
      </header>

      <Card className={styles.adHocCard}>
        <p className={styles.adHocText}>Não sabes o que cozinhar agora?</p>
        <Link href="/plano/pedir-agora" className={styles.adHocCta}>
          Pedir uma receita
        </Link>
      </Card>

      <DayTabs
```

- [ ] **Step 2: Estilos do cartão CTA em `page.module.css`**

Adicionar no fim de `plano/page.module.css`:
```css
/* FE-T05 · Cartão "Pedir receita agora" no topo do dashboard */
.adHocCard {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.adHocText {
  margin: 0;
  font-family: var(--font-body);
  font-size: 0.9rem;
  color: var(--clay);
}

.adHocCta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 20px;
  border-radius: var(--radius-pill);
  background: var(--terracotta);
  color: #ffffff;
  font-family: var(--font-body);
  font-weight: 600;
  font-size: 0.85rem;
  text-decoration: none;
  white-space: nowrap;
  transition: background 0.15s ease;
}

.adHocCta:hover {
  background: var(--terracotta-dark);
}

.adHocCta:focus-visible {
  outline: var(--focus-on-light);
  outline-offset: 2px;
}
```

- [ ] **Step 3: Typecheck + lint + build**

Run: `cd levesabor/levesabor-web && npm run typecheck && npm run lint && npm run build`
Expected: sem erros/avisos novos; `/plano` continua no output do build.

- [ ] **Step 4: Escrever o teste e2e**

Create `levesabor/levesabor-web/e2e/pedir-agora.spec.ts`:
```ts
// FE-T05 · pedir-agora.spec.ts — smoke do fluxo "Pedir receita agora" (roda contra mocks).
import { test, expect, type Page } from "@playwright/test";

async function loginAsClient(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("amelia@levesabor.mz");
  await page.getByLabel("Password", { exact: true }).fill("password123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/plano");
}

test.describe("Pedir receita agora", () => {
  test("fluxo completo: cartão → wizard → espera → resultado → guardar num dia", async ({ page }) => {
    await loginAsClient(page);

    await page.getByRole("link", { name: "Pedir uma receita" }).click();
    await page.waitForURL("**/plano/pedir-agora");

    // Passo 1: refeição (mantém o valor pré-selecionado, só avança)
    await page.getByRole("button", { name: "Continuar" }).click();
    // Passo 2: objetivo (mantém o valor pré-selecionado)
    await page.getByRole("button", { name: "Continuar" }).click();
    // Passo 3: nota (opcional, deixa vazio)
    await page.getByRole("button", { name: "Continuar" }).click();
    // Passo 4: confirmar
    await page.getByRole("button", { name: "Gerar receita" }).click();

    // Espera (polling) → resultado
    await expect(page.getByRole("button", { name: "Guardar num dia" })).toBeVisible({ timeout: 15000 });

    await page.getByRole("button", { name: "Guardar num dia" }).click();
    await expect(page.getByRole("heading", { name: "Guardar em que refeição?" })).toBeVisible();

    const firstRow = page.locator('[class*="dayRow"]').first();
    await firstRow.click();

    await page.waitForURL("**/plano");
    await expect(page.getByRole("heading", { name: /O teu plano/ })).toBeVisible();
  });

  test("limite diário: 4º pedido avulso mostra estado de limite atingido", async ({ page }) => {
    await loginAsClient(page);

    for (let i = 0; i < 4; i += 1) {
      await page.goto("/plano/pedir-agora");
      await page.getByRole("button", { name: "Continuar" }).click();
      await page.getByRole("button", { name: "Continuar" }).click();
      await page.getByRole("button", { name: "Continuar" }).click();
      await page.getByRole("button", { name: "Gerar receita" }).click();
      if (i < 3) {
        await expect(page.getByRole("button", { name: "Guardar num dia" })).toBeVisible({ timeout: 15000 });
      }
    }

    await expect(page.getByText(/limite de pedidos avulsos de hoje/)).toBeVisible();
  });
});
```

- [ ] **Step 5: Correr o teste e2e**

Run: `cd levesabor/levesabor-web && npx playwright test e2e/pedir-agora.spec.ts`
Expected: 2/2 a passar. Se o seletor `[class*="dayRow"]` não encontrar nada (CSS Modules ofusca nomes em build de produção mas o Playwright corre contra o `next dev`/preview do próprio `playwright.config.ts` — confirmar em `playwright.config.ts` se usa `next dev` ou build de produção; se produção, trocar o seletor por `page.getByRole("button").filter({ hasText: day.weekday })` usando o primeiro dia visível, ou adicionar `data-testid="day-row"` ao botão em `page.tsx` e usar `page.getByTestId("day-row").first()`).

- [ ] **Step 6: Marcar o cartão FE-T como concluído em `docs/plano/tasks.md`**

Marcar `[x]` em `FE-T01`..`FE-T05` (adicionados na Task 1 deste plano) e adicionar `FE-T01..T05 · Pedir receita agora` à secção `## Concluído` no fim do ficheiro, mesmo padrão das entradas `FE-Q10`/`FE-S01..S04` já lá.

- [ ] **Step 7: Commit**

```bash
git add levesabor/levesabor-web/src/app/"(cliente)"/plano/page.tsx levesabor/levesabor-web/src/app/"(cliente)"/plano/page.module.css levesabor/levesabor-web/e2e/pedir-agora.spec.ts docs/plano/tasks.md
git commit -m "feat(plano): cartão Pedir receita agora no dashboard + teste e2e (FE-T05)"
```

---

## Self-Review Notes

- **Cobertura do spec:** §1 (cartão dashboard) → Task 6; §2 (mini-wizard 4 passos) → Task 5; §3 (contrato + mock geração) → Tasks 2-4; §4 (espera + resultado) → Task 5; §5 (guardar num dia via mutação partilhada do swap) → Tasks 3-5. Todos os critérios de verificação do spec têm uma task correspondente.
- **Lacuna de dados descoberta durante o desenho do código (não estava no spec):** `RECIPE_CATALOG`/`slotOf()` não têm receitas de `LANCHE` — documentado e tratado com fallback em `pickAdHocRecipe` (Task 3, Step 4) em vez de deixado como suposição implícita.
- **Consistência de tipos:** `MealSlot` (local, `NonNullable<MealPlanEntry["mealSlot"]>`), `AdHocRecipeRequest`/`AdHocRecipeHandle` (Task 2 → consumidos idênticos em Tasks 3, 4, 5), `replaceMealPlanEntry(entryId: number, recipeId: number): MockResult<MealPlanEntry>` (definido Task 3, consumido Task 4 idêntico), rota `POST /me/meal-plans/entries/:id/replace` com body `{ recipeId }` (Task 4 handler ↔ Task 5 `replaceMutation` — mesmo shape).

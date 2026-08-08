// MOCK-02 · Handlers MSW — todo o frontend desenvolve contra isto até INT-01/INT-03
// Cobre todos os endpoints Fase 1 (cliente) do contrato OpenAPI (levesabor-api/openapi.yaml)
// com fixtures realistas, mais os endpoints de listagem admin (Fase 2, mais rasos).
//
// Dados/estado em memória vivem em ./fixtures.ts — este ficheiro só faz a "cola" HTTP
// (parsing de request/query, mapeamento de MockResult para HttpResponse).
//
// Gatilhos de erro documentados (ver fixtures.ts para detalhe):
//  - LSA002_INVALID_CREDENTIALS → POST /auth/login com email "erro@ottimizo.mz"
//  - LSA003_ACCOUNT_SUSPENDED   → POST /auth/login com email "suspensa@ottimizo.mz"
//  - LSA006_DUPLICATE           → POST /auth/register com email "existente@ottimizo.mz"
//  - LSA011_GENERATION_IN_PROGRESS → 2ª POST /me/meal-plans antes da 1ª geração chegar a READY
//  - LSA012_GENERATION_LIMIT    → 2ª POST /me/meal-plans na mesma sessão do mock (limite = 1/dia)
//  - LSA014_NO_ALTERNATIVE      → POST /me/meal-plans/entries/21/swap (Domingo/Jantar)
//  - LSA023_RECIPE_INCOMPLETE   → PATCH /admin/recipes/9999/status { "status": "PUBLISHED" }
import { http, HttpResponse } from "msw";
import type { components, operations } from "@/types/api";
import {
  ADMIN_INGREDIENTS,
  ADMIN_RECIPES,
  ADMIN_STORES,
  ADMIN_USERS,
  LOJA_PRODUCTS,
  addManualShoppingItem,
  applyRecipeFeedback,
  buildMetricsSummary,
  cancelOrder,
  confirmProductsImport,
  createIngredient,
  createLojaProduct,
  createOrder,
  createRecipe,
  createStore,
  createUser,
  deleteIngredient,
  deleteLojaProduct,
  deleteRecipe,
  deleteStore,
  exportLojaProducts,
  getActivePlan,
  getIngredient,
  getLojaImportTemplate,
  getLojaOrder,
  getLojaProduct,
  getMealPlanEntryForResponse,
  getOrder,
  getProfile,
  getRecentSwapReasons,
  getRecipe,
  getShoppingList,
  getStore,
  getUser,
  getUserHealthProfile,
  listActiveStores,
  listLojaOrders,
  listMyRecipes,
  listOrders,
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
  setLojaOrderStatus,
  setLojaProductStatus,
  setMealPlanEntryCompleted,
  setStoreStatus,
  setUserStatus,
  updateIngredient,
  updateLojaProduct,
  updateProfile,
  updateRecipe,
  updateShoppingListItem,
  updateStore,
  validateProductsImport,
  type MockResult,
} from "./fixtures";

type ErrorCode = components["schemas"]["ErrorCode"];
type Profile = components["schemas"]["Profile"];
type SetCheckedRequest = components["schemas"]["SetCheckedRequest"];
type CreateShoppingListItemRequest = components["schemas"]["CreateShoppingListItemRequest"];
type FeedbackRequest = components["schemas"]["FeedbackRequest"];
type RegisterRequest = components["schemas"]["RegisterRequest"];
type LoginRequest = components["schemas"]["LoginRequest"];
type SetRecipeStatusRequest = components["schemas"]["SetRecipeStatusRequest"];
type SetStatusRequest = components["schemas"]["SetStatusRequest"];
type StoreRequest = components["schemas"]["StoreRequest"];
type IngredientRequest = components["schemas"]["IngredientRequest"];
type RecipeRequest = components["schemas"]["RecipeRequest"];
type AdHocRecipeRequest = components["schemas"]["AdHocRecipeRequest"];
type ReplaceMealPlanEntryRequest = components["schemas"]["ReplaceMealPlanEntryRequest"];
type SetCompletedRequest = components["schemas"]["SetCompletedRequest"];
type OrderRequest = components["schemas"]["OrderRequest"];
type ProductRequest = components["schemas"]["ProductRequest"];
type OrderStatusUpdateRequest = components["schemas"]["OrderStatusUpdateRequest"];
// setProductStatus (FE-L02) aceita ACTIVE|INACTIVE — diferente de SetStatusRequest (ACTIVE|SUSPENDED,
// usado por utilizadores/lojas), por isso tem o seu próprio tipo em vez de reaproveitar aquele.
type SetProductStatusRequest = { status: "ACTIVE" | "INACTIVE" };
type ConfirmImportRequest = components["schemas"]["ConfirmImportRequest"];
// FE-Q06: corpo do swap não é um schema nomeado (definido inline na operation) — extrai o tipo
// diretamente de `operations["swapMealPlanEntry"]`.
type SwapMealPlanEntryRequest = NonNullable<
  operations["swapMealPlanEntry"]["requestBody"]
>["content"]["application/json"];

const ok = <T,>(data: T, status = 200) => HttpResponse.json({ status: "success", data }, { status });

const fail = (code: ErrorCode, message: string, status: number) =>
  HttpResponse.json({ status: "error", code, message, data: null }, { status });

function respond<T>(result: MockResult<T>) {
  if (result.ok) return ok(result.data, result.status ?? 200);
  return fail(result.code, result.message, result.status);
}

// FE-D00: antes só devolvia a lista inteira (page/size lidos mas ignorados, totalPages sempre 1).
// Agora suporta pesquisa (`q`) e paginação reais; `sortValue` é opcional e resolvido pelo chamador
// porque T é genérico — cada handler de lista sabe os campos ordenáveis do seu próprio recurso.
function pageOf<T>(
  items: T[],
  request: Request,
  options?: {
    matches?: (item: T, query: string) => boolean;
    sortValue?: (item: T, key: string) => string | number | null | undefined;
  },
) {
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") ?? 0);
  const size = Number(url.searchParams.get("size") ?? 20) || 20;
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const sortParam = url.searchParams.get("sort") ?? "";

  let filtered = q && options?.matches ? items.filter((item) => options.matches!(item, q)) : items;

  if (sortParam && options?.sortValue) {
    const [key, direction] = sortParam.split(":");
    const dir = direction === "desc" ? -1 : 1;
    filtered = [...filtered].sort((a, b) => {
      const av = options.sortValue!(a, key);
      const bv = options.sortValue!(b, key);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / size));
  const pageItems = filtered.slice(page * size, page * size + size);
  return ok({ items: pageItems, page, size, totalItems, totalPages });
}

function genericSortValue<T>(item: T, key: string): string | number | null {
  const value = (item as unknown as Record<string, unknown>)[key];
  return typeof value === "string" || typeof value === "number" ? value : null;
}

export const handlers = [
  // ── Auth (F1-VIS-01/02) ──────────────────────────────────────────────
  http.post("*/api/v1/auth/register", async ({ request }) => {
    const body = (await request.json()) as RegisterRequest;
    return respond(registerAccount(body));
  }),

  http.post("*/api/v1/auth/login", async ({ request }) => {
    const body = (await request.json()) as LoginRequest;
    return respond(login(body));
  }),

  http.post("*/api/v1/auth/refresh", () => ok(refreshSession())),

  http.post("*/api/v1/auth/logout", () => ok(null)),

  // ── Perfil (F1-CLI-01) ───────────────────────────────────────────────
  http.get("*/api/v1/me/profile", () => ok(getProfile())),

  http.put("*/api/v1/me/profile", async ({ request }) => {
    const body = (await request.json()) as Profile;
    return respond(updateProfile(body));
  }),

  // ── Geração do plano (F1-CLI-02) ────────────────────────────────────
  http.post("*/api/v1/me/meal-plans", () => respond(requestMealPlanGeneration())),

  // ── "Pedir receita agora" (FE-T) ────────────────────────────────────
  http.post("*/api/v1/me/recipes/adhoc", async ({ request }) => {
    const body = (await request.json()) as AdHocRecipeRequest;
    return respond(requestAdHocRecipe(body));
  }),

  http.get("*/api/v1/me/recipes/adhoc/:id", ({ params }) => {
    return respond(pollAdHocRecipe(Number(params.id)));
  }),

  // IMPORTANTE: "/me/meal-plans/active" (F1-CLI-03) tem de ser registado ANTES de
  // "/me/meal-plans/:id" (polling da geração) — o MSW usa a primeira correspondência
  // do array, e ":id" combinaria com o literal "active" se viesse primeiro.
  http.get("*/api/v1/me/meal-plans/active", () => ok(getActivePlan())),

  http.get("*/api/v1/me/meal-plans/:id", ({ params }) => {
    const id = Number(params.id);
    return respond(pollMealPlanGeneration(id));
  }),

  // ── Detalhe de refeição/receita (F1-CLI-04) ─────────────────────────
  http.get("*/api/v1/me/meal-plans/entries/:id", ({ params }) => {
    const entry = getMealPlanEntryForResponse(Number(params.id));
    if (!entry) return fail("LSA005_NOT_FOUND", "Entrada do plano não encontrada.", 404);
    return ok(entry);
  }),

  // ── Troca de refeição (F1-CLI-05) ───────────────────────────────────
  http.post("*/api/v1/me/meal-plans/entries/:id/swap", async ({ params, request }) => {
    const entryId = Number(params.id);
    const url = new URL(request.url);
    const confirm = url.searchParams.get("confirm") === "true";
    // FE-Q06: corpo é opcional (sem body em requests só de propor a troca) — cai para {} se
    // vier vazio/inválido, tal como o pedido nunca envia body sem confirm=true.
    const body = (await request.json().catch(() => ({}))) as { reason?: string };
    return respond(proposeOrApplySwap(entryId, confirm, body.reason));
  }),

  // ── Guardar receita avulsa num dia (FE-T) ───────────────────────────
  http.post("*/api/v1/me/meal-plans/entries/:id/replace", async ({ params, request }) => {
    const entryId = Number(params.id);
    const body = (await request.json()) as ReplaceMealPlanEntryRequest;
    return respond(replaceMealPlanEntry(entryId, body.recipeId));
  }),

  // ── "Comi isto" (F1-CLI-04) ─────────────────────────────────────────
  http.patch("*/api/v1/me/meal-plans/entries/:id/completed", async ({ params, request }) => {
    const entryId = Number(params.id);
    const body = (await request.json()) as SetCompletedRequest;
    return respond(setMealPlanEntryCompleted(entryId, body.completed));
  }),

  // ── Feedback de receita (F1-CLI-05) ──────────────────────────────────
  http.put("*/api/v1/me/recipes/:id/feedback", async ({ params, request }) => {
    const recipeId = Number(params.id);
    const body = (await request.json()) as FeedbackRequest;
    return respond(applyRecipeFeedback(recipeId, body.value ?? "NONE"));
  }),

  // ── Lista de compras (F1-CLI-06) ────────────────────────────────────
  http.get("*/api/v1/me/shopping-list", () => ok(getShoppingList())),

  http.patch("*/api/v1/me/shopping-list/items/:id", async ({ params, request }) => {
    const itemId = Number(params.id);
    const body = (await request.json()) as SetCheckedRequest;
    return respond(updateShoppingListItem(itemId, { checked: body.checked, haveQuantity: body.haveQuantity }));
  }),

  // ── Adicionar item manual (F1-CLI-06B) ──────────────────────────────
  http.post("*/api/v1/me/shopping-list/items", async ({ request }) => {
    const body = (await request.json()) as CreateShoppingListItemRequest;
    return respond(addManualShoppingItem(body));
  }),

  // ── Catálogo de receitas navegável (F1-CLI-08) ──────────────────────
  http.get("*/api/v1/me/recipes", ({ request }) => {
    const url = new URL(request.url);
    const tags = url.searchParams.getAll("tags");
    const q = url.searchParams.get("q") ?? "";
    return pageOf(listMyRecipes(tags, q), request);
  }),

  // ── Lojas parceiras ativas (F3-CLI-07) ──────────────────────────────
  http.get("*/api/v1/stores", ({ request }) => pageOf(listActiveStores(), request)),

  // ── Encomendas (F3-CLI-07) ──────────────────────────────────────────
  http.get("*/api/v1/me/orders", ({ request }) => pageOf(listOrders(), request)),

  http.post("*/api/v1/me/orders", async ({ request }) => {
    const body = (await request.json()) as OrderRequest;
    return respond(createOrder(body));
  }),

  http.get("*/api/v1/me/orders/:id", ({ params }) => {
    return respond(getOrder(Number(params.id)));
  }),

  http.patch("*/api/v1/me/orders/:id/cancel", ({ params }) => {
    return respond(cancelOrder(Number(params.id)));
  }),

  // ── Admin (Fase 2) — Utilizadores (F2-ADM-01) ────────────────────────
  http.get("*/api/v1/admin/users", ({ request }) =>
    pageOf(ADMIN_USERS, request, {
      matches: (u, q) => (u.name ?? "").toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q),
      sortValue: genericSortValue,
    }),
  ),
  http.get("*/api/v1/admin/users/:id", ({ params }) => respond(getUser(Number(params.id)))),
  http.get("*/api/v1/admin/users/:id/health-profile", ({ params }) =>
    respond(getUserHealthProfile(Number(params.id))),
  ),
  http.patch("*/api/v1/admin/users/:id/status", async ({ params, request }) => {
    const body = (await request.json()) as SetStatusRequest;
    return respond(setUserStatus(Number(params.id), body.status));
  }),
  http.post("*/api/v1/admin/users", async ({ request }) => {
    const body = (await request.json()) as { name?: string; email?: string };
    return respond(createUser(body));
  }),

  // ── Admin — Lojas (F2-ADM-02) ────────────────────────────────────────
  http.get("*/api/v1/admin/stores", ({ request }) =>
    pageOf(ADMIN_STORES, request, {
      matches: (s, q) => (s.name ?? "").toLowerCase().includes(q) || (s.city ?? "").toLowerCase().includes(q),
      sortValue: genericSortValue,
    }),
  ),
  http.post("*/api/v1/admin/stores", async ({ request }) => {
    const body = (await request.json()) as StoreRequest;
    return respond(createStore(body));
  }),
  http.get("*/api/v1/admin/stores/:id", ({ params }) => respond(getStore(Number(params.id)))),
  http.put("*/api/v1/admin/stores/:id", async ({ params, request }) => {
    const body = (await request.json()) as StoreRequest;
    return respond(updateStore(Number(params.id), body));
  }),
  http.patch("*/api/v1/admin/stores/:id/status", async ({ params, request }) => {
    const body = (await request.json()) as SetStatusRequest;
    return respond(setStoreStatus(Number(params.id), body.status));
  }),
  http.delete("*/api/v1/admin/stores/:id", ({ params }) => respond(deleteStore(Number(params.id)))),

  // ── Loja — Produtos (F3-LOJ-01) ──────────────────────────────────────
  http.get("*/api/v1/loja/products", ({ request }) =>
    pageOf(LOJA_PRODUCTS, request, {
      matches: (p, q) => (p.name ?? "").toLowerCase().includes(q),
      sortValue: genericSortValue,
    }),
  ),
  http.post("*/api/v1/loja/products", async ({ request }) => {
    const body = (await request.json()) as ProductRequest;
    return respond(createLojaProduct(body));
  }),
  http.get("*/api/v1/loja/products/:id", ({ params }) => respond(getLojaProduct(Number(params.id)))),
  http.put("*/api/v1/loja/products/:id", async ({ params, request }) => {
    const body = (await request.json()) as ProductRequest;
    return respond(updateLojaProduct(Number(params.id), body));
  }),
  http.patch("*/api/v1/loja/products/:id/status", async ({ params, request }) => {
    const body = (await request.json()) as SetProductStatusRequest;
    return respond(setLojaProductStatus(Number(params.id), body.status));
  }),
  http.delete("*/api/v1/loja/products/:id", ({ params }) => respond(deleteLojaProduct(Number(params.id)))),

  // ── Loja — Import/Export Excel (F3-LOJ-02) ───────────────────────────
  // FE-L03: sem lib de parsing/escrita .xlsx no projeto — validação/template/export são mock
  // determinístico, documentado em fixtures.ts junto a validateProductsImport().
  http.post("*/api/v1/loja/products/import", () => respond(validateProductsImport())),
  http.post("*/api/v1/loja/products/import/:jobId/confirm", async ({ params, request }) => {
    // ConfirmImportRequest.onlyValidRows é lido mas não usado — a pré-visualização mock já só
    // aplica as linhas "válidas" (ver CANNED_IMPORT_PREVIEW em fixtures.ts).
    void ((await request.json()) as ConfirmImportRequest);
    return respond(confirmProductsImport(Number(params.jobId)));
  }),
  http.get(
    "*/api/v1/loja/products/export",
    () => new HttpResponse(exportLojaProducts(), { headers: { "Content-Type": "text/csv" } }),
  ),
  http.get(
    "*/api/v1/loja/products/import-template",
    () => new HttpResponse(getLojaImportTemplate(), { headers: { "Content-Type": "text/csv" } }),
  ),

  // ── Loja — Encomendas (F3-LOJ-03) ────────────────────────────────────
  http.get("*/api/v1/loja/orders", ({ request }) => pageOf(listLojaOrders(), request)),
  http.get("*/api/v1/loja/orders/:id", ({ params }) => respond(getLojaOrder(Number(params.id)))),
  http.patch("*/api/v1/loja/orders/:id/status", async ({ params, request }) => {
    const body = (await request.json()) as OrderStatusUpdateRequest;
    return respond(setLojaOrderStatus(Number(params.id), body.status));
  }),

  // ── Admin — Receitas (F2-ADM-05) ─────────────────────────────────────
  http.get("*/api/v1/admin/recipes", ({ request }) =>
    pageOf(ADMIN_RECIPES, request, {
      matches: (r, q) => (r.name ?? "").toLowerCase().includes(q),
      sortValue: genericSortValue,
    }),
  ),
  http.post("*/api/v1/admin/recipes", async ({ request }) => {
    const body = (await request.json()) as RecipeRequest;
    return respond(createRecipe(body));
  }),
  http.get("*/api/v1/admin/recipes/:id", ({ params }) => respond(getRecipe(Number(params.id)))),
  http.put("*/api/v1/admin/recipes/:id", async ({ params, request }) => {
    const body = (await request.json()) as RecipeRequest;
    return respond(updateRecipe(Number(params.id), body));
  }),
  http.delete("*/api/v1/admin/recipes/:id", ({ params }) => respond(deleteRecipe(Number(params.id)))),
  // FE-D06: "motivos de troca mais recentes" — endpoint só de mock, sem schema OpenAPI dedicado
  // (ver nota em fixtures.ts junto a getRecentSwapReasons).
  http.get("*/api/v1/admin/recipes/:id/swap-reasons", ({ params }) =>
    ok(getRecentSwapReasons(Number(params.id))),
  ),
  http.patch("*/api/v1/admin/recipes/:id/status", async ({ params, request }) => {
    const id = Number(params.id);
    const body = (await request.json()) as SetRecipeStatusRequest;
    return respond(setAdminRecipeStatus(id, body.status));
  }),

  // ── Admin — Ingredientes (F2-ADM-05) ─────────────────────────────────
  http.get("*/api/v1/admin/ingredients", ({ request }) =>
    pageOf(ADMIN_INGREDIENTS, request, {
      matches: (i, q) => (i.name ?? "").toLowerCase().includes(q),
      sortValue: genericSortValue,
    }),
  ),
  http.post("*/api/v1/admin/ingredients", async ({ request }) => {
    const body = (await request.json()) as IngredientRequest;
    return respond(createIngredient(body));
  }),
  http.get("*/api/v1/admin/ingredients/:id", ({ params }) => respond(getIngredient(Number(params.id)))),
  http.put("*/api/v1/admin/ingredients/:id", async ({ params, request }) => {
    const body = (await request.json()) as IngredientRequest;
    return respond(updateIngredient(Number(params.id), body));
  }),
  http.delete("*/api/v1/admin/ingredients/:id", ({ params }) => respond(deleteIngredient(Number(params.id)))),

  http.get("*/api/v1/admin/metrics/summary", () => ok(buildMetricsSummary())),
];

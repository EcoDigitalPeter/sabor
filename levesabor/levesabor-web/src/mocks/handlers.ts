// MOCK-02 · Handlers MSW — todo o frontend desenvolve contra isto até INT-01/INT-03
// Cobre todos os endpoints Fase 1 (cliente) do contrato OpenAPI (levesabor-api/openapi.yaml)
// com fixtures realistas, mais os endpoints de listagem admin (Fase 2, mais rasos).
//
// Dados/estado em memória vivem em ./fixtures.ts — este ficheiro só faz a "cola" HTTP
// (parsing de request/query, mapeamento de MockResult para HttpResponse).
//
// Gatilhos de erro documentados (ver fixtures.ts para detalhe):
//  - LSA002_INVALID_CREDENTIALS → POST /auth/login com email "erro@levesabor.mz"
//  - LSA003_ACCOUNT_SUSPENDED   → POST /auth/login com email "suspensa@levesabor.mz"
//  - LSA006_DUPLICATE           → POST /auth/register com email "existente@levesabor.mz"
//  - LSA011_GENERATION_IN_PROGRESS → 2ª POST /me/meal-plans antes da 1ª geração chegar a READY
//  - LSA012_GENERATION_LIMIT    → 4ª POST /me/meal-plans na mesma sessão do mock
//  - LSA014_NO_ALTERNATIVE      → POST /me/meal-plans/entries/21/swap (Domingo/Jantar)
//  - LSA023_RECIPE_INCOMPLETE   → PATCH /admin/recipes/9999/status { "status": "PUBLISHED" }
import { http, HttpResponse } from "msw";
import type { components } from "@/types/api";
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
  pollMealPlanGeneration,
  proposeOrApplySwap,
  refreshSession,
  registerAccount,
  requestMealPlanGeneration,
  setAdminRecipeStatus,
  updateProfile,
  updateShoppingListItem,
  type MockResult,
} from "./fixtures";

type ErrorCode = components["schemas"]["ErrorCode"];
type Profile = components["schemas"]["Profile"];
type SetCheckedRequest = components["schemas"]["SetCheckedRequest"];
type FeedbackRequest = components["schemas"]["FeedbackRequest"];
type RegisterRequest = components["schemas"]["RegisterRequest"];
type LoginRequest = components["schemas"]["LoginRequest"];
type SetRecipeStatusRequest = components["schemas"]["SetRecipeStatusRequest"];

const ok = <T,>(data: T, status = 200) => HttpResponse.json({ status: "success", data }, { status });

const fail = (code: ErrorCode, message: string, status: number) =>
  HttpResponse.json({ status: "error", code, message, data: null }, { status });

function respond<T>(result: MockResult<T>) {
  if (result.ok) return ok(result.data, result.status ?? 200);
  return fail(result.code, result.message, result.status);
}

function pageOf<T>(items: T[], request: Request) {
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") ?? 0);
  const size = Number(url.searchParams.get("size") ?? items.length);
  return ok({ items, page, size, totalItems: items.length, totalPages: 1 });
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
  http.post("*/api/v1/me/meal-plans/entries/:id/swap", ({ params, request }) => {
    const entryId = Number(params.id);
    const url = new URL(request.url);
    const confirm = url.searchParams.get("confirm") === "true";
    return respond(proposeOrApplySwap(entryId, confirm));
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

  // ── Admin (Fase 2) — listagens rasas + 1 patch para gatilho de LSA023 ─
  http.get("*/api/v1/admin/users", ({ request }) => pageOf(ADMIN_USERS, request)),
  http.get("*/api/v1/admin/stores", ({ request }) => pageOf(ADMIN_STORES, request)),
  http.get("*/api/v1/loja/products", ({ request }) => pageOf(LOJA_PRODUCTS, request)),
  http.get("*/api/v1/admin/recipes", ({ request }) => pageOf(ADMIN_RECIPES, request)),
  http.get("*/api/v1/admin/ingredients", ({ request }) => pageOf(ADMIN_INGREDIENTS, request)),
  http.get("*/api/v1/admin/metrics/summary", () => ok(METRICS_SUMMARY)),

  http.patch("*/api/v1/admin/recipes/:id/status", async ({ params, request }) => {
    const id = Number(params.id);
    const body = (await request.json()) as SetRecipeStatusRequest;
    return respond(setAdminRecipeStatus(id, body.status));
  }),
];

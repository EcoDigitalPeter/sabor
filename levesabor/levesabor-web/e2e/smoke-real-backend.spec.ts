// Tarefa 4 · docs/superpowers/plans/2026-08-23-frontend-sem-hardcoded-consumir-backend-real.md
// Smoke IDEMPOTENTE contra o backend real (não os mocks) — só GET/login, nunca POST/PATCH/DELETE
// que mutem estado. Objectivo: apanhar divergências de contrato entre frontend e o backend Java
// real (ex.: LSA001_VALIDATION em campos que o mock aceita sem validar) antes de cada deploy
// (INT-02/04/06 em docs/plano/tasks.md), sem depender da suite manual em
// docs/superpowers/plans/2026-08-21-testes-integracao-nao-ia-admin-loja.md.
//
// NÃO corre no CI normal (que continua contra mocks — ver docs/plano/09-plano-testes-feedback-cliente.md).
// Correr manualmente antes de um deploy:
//   1. Editar .env.local: NEXT_PUBLIC_USE_MOCKS=false, NEXT_PUBLIC_API_URL apontado ao backend a
//      validar (local :8080 ou Railway), NEXT_PUBLIC_SUPABASE_URL/ANON_KEY do mesmo projecto Supabase.
//   2. Definir as variáveis de ambiente do runner (nunca commitar credenciais):
//        SMOKE_CLIENT_EMAIL / SMOKE_CLIENT_PASSWORD — conta CLIENTE já existente no backend alvo.
//   3. npx playwright test e2e/smoke-real-backend.spec.ts --project=chromium --workers=1
// Sem as env vars de credenciais, os testes saltam (test.skip) em vez de falhar — para não quebrar
// quem correr "todos os specs" sem querer, por engano, contra o backend real.
import { test, expect, type Page } from "@playwright/test";

const CLIENT_EMAIL = process.env.SMOKE_CLIENT_EMAIL;
const CLIENT_PASSWORD = process.env.SMOKE_CLIENT_PASSWORD;
const hasCredentials = Boolean(CLIENT_EMAIL && CLIENT_PASSWORD);

async function loginAsClient(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(CLIENT_EMAIL!);
  await page.locator("#login-password").fill(CLIENT_PASSWORD!);
  await page.getByRole("button", { name: "Entrar" }).click();
  // Backend real demora mais que o mock (rede + Supabase) — margem maior que o padrão dos specs de mock.
  await page.waitForURL(/\/(inicio|onboarding)/, { timeout: 20_000 });
}

test.describe("Smoke — backend real (idempotente, sem mutações)", () => {
  test.skip(!hasCredentials, "SMOKE_CLIENT_EMAIL/SMOKE_CLIENT_PASSWORD não definidas — a saltar smoke contra backend real.");

  test("login com conta CLIENTE real chega a /inicio ou /onboarding sem erro de rede/CORS", async ({ page }) => {
    await loginAsClient(page);
    // Se o login "funcionar" mas o perfil vier vazio/inválido, cai em /onboarding em vez de /inicio
    // — ambos são sucesso aqui (o alvo é confirmar que login+backend respondem, não o estado do perfil).
    await expect(page).toHaveURL(/\/(inicio|onboarding)/);
  });

  test("catálogo de receitas carrega com dados reais (não vazio, sem erro)", async ({ page }) => {
    await loginAsClient(page);
    await page.goto("/receitas");
    // Falha alto e explícito em vez de silencioso: se o catálogo real vier vazio (0 receitas
    // PUBLISHED) isto é um achado do smoke, não um falso positivo a ignorar.
    await expect(page.getByRole("button", { name: /./ }).first()).toBeVisible({ timeout: 15_000 });
    const cards = page.locator("[class*='card']");
    await expect(cards.first()).toBeVisible();
  });

  test("perfil carrega sem LSA001_VALIDATION — cobre a Tarefa 1 (dietaryPreferences)", async ({ page }) => {
    await loginAsClient(page);
    await page.goto("/perfil");
    // Não há toast de erro visível ao simplesmente abrir /perfil (GET, sem submissão) — este teste
    // é sobretudo uma vara de medir para o dia em que alguém adicionar uma escrita automática aqui.
    await expect(page.getByRole("heading", { name: "Perfil" })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/LSA\d{3}/)).toHaveCount(0);
  });
});

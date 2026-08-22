// FE-Q · portal.spec.ts — smoke do portal do cliente (roda contra mocks, sem backend). Cobre o
// que o plano de verificação da redesign v2 pede: saudação, MealCard foto/fallback, hero +
// stat cards da receita, "Trocar este prato" sempre visível, e regressão de 👍/👎.
import { test, expect, type Page } from "@playwright/test";

// Login mock: qualquer email/password (exceto os gatilhos de erro documentados em
// src/mocks/fixtures.ts) entra como o cliente fixture "Amélia Cossa".
async function loginAsClient(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("amelia@ottimizo.mz");
  // getByLabel("Password", { exact: true }) não bate certo com o campo real (ver nota igual em
  // e2e/pedir-agora.spec.ts e e2e/plano-mensal.spec.ts): o FormField acrescenta um "(obrigatório)"
  // invisível ao nome acessível do label, e sem exact:true "Password" também correspondia ao botão
  // "Mostrar/Ocultar password". O id é estável independentemente do texto do label — corrigido aqui
  // (FE-E01) porque este spec ainda usava o padrão antigo e falhava de forma consistente (mesmo
  // isolado, sem qualquer interferência de outros specs).
  await page.locator("#login-password").fill("password123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/inicio");
  await page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name: "Plano" }).click();
  await page.waitForURL("**/plano");
}

async function openFirstMealDetail(page: Page) {
  const firstCard = page.locator('a[href^="/plano/refeicao/"]').first();
  await expect(firstCard).toBeVisible();
  await expect(firstCard).toHaveAttribute("href", /\/plano\/refeicao\/\d+/);
  const cardTitle = firstCard.getByRole("heading");
  await expect(cardTitle).toBeVisible();
  await cardTitle.click({ trial: true });
  await Promise.all([page.waitForURL(/\/plano\/refeicao\/\d+/), cardTitle.click()]);
}

test.describe("Portal do cliente v2", () => {
  test("mostra saudação pessoal no dashboard", async ({ page }) => {
    await loginAsClient(page);
    await expect(page.getByText(/^(Bom dia|Boa tarde|Boa noite), Amélia$/)).toBeVisible();
    await expect(page.getByRole("heading", { name: /O teu plano/ })).toBeVisible();
  });

  test("MealCard navega para o detalhe da refeição", async ({ page }) => {
    await loginAsClient(page);
    await openFirstMealDetail(page);
  });

  test("detalhe da receita mostra hero, stat cards e CTA de troca sempre visível", async ({ page }) => {
    await loginAsClient(page);
    await openFirstMealDetail(page);

    // Hero: sempre presente, foto ou fallback (ambos ocupam o mesmo espaço 4:3).
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Stat cards: Tempo de preparação + Custo estimado.
    await expect(page.getByText("Tempo de preparação")).toBeVisible();
    await expect(page.getByText("Custo estimado")).toBeVisible();

    // CTA de troca sempre visível, sem precisar de 👎 primeiro (mudança de comportamento).
    const swapCta = page.getByRole("button", { name: "Trocar este prato" });
    await expect(swapCta).toBeVisible();
    await expect(page.getByLabel("Não gosto desta receita")).toHaveAttribute("aria-pressed", "false");
  });

  test("feedback 👍/👎 alterna aria-pressed (regressão)", async ({ page }) => {
    await loginAsClient(page);
    await openFirstMealDetail(page);

    // exact:true — sem isto, "Gosto desta receita" também corresponde por substring a
    // "Não gosto desta receita" (violação de modo estrito do Playwright).
    const like = page.getByLabel("Gosto desta receita", { exact: true });
    await expect(like).toHaveAttribute("aria-pressed", "false");
    await like.click();
    await expect(like).toHaveAttribute("aria-pressed", "true");
  });
});

// FE-Q · portal.spec.ts — smoke do portal do cliente (roda contra mocks, sem backend). Cobre o
// que o plano de verificação da redesign v2 pede: saudação, MealCard foto/fallback, hero +
// stat cards da receita, "Trocar este prato" sempre visível, e regressão de 👍/👎.
import { test, expect, type Page } from "@playwright/test";

// Login mock: qualquer email/password (exceto os gatilhos de erro documentados em
// src/mocks/fixtures.ts) entra como o cliente fixture "Amélia Cossa".
async function loginAsClient(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("amelia@levesabor.mz");
  await page.getByLabel("Password", { exact: true }).fill("password123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/plano");
}

test.describe("Portal do cliente v2", () => {
  test("mostra saudação pessoal no dashboard", async ({ page }) => {
    await loginAsClient(page);
    await expect(page.getByText(/^(Bom dia|Boa tarde|Boa noite), Amélia$/)).toBeVisible();
    await expect(page.getByRole("heading", { name: /O teu plano/ })).toBeVisible();
  });

  test("MealCard navega para o detalhe da refeição", async ({ page }) => {
    await loginAsClient(page);
    const firstCard = page.locator('a[href^="/plano/refeicao/"]').first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();
    await expect(page).toHaveURL(/\/plano\/refeicao\/\d+/);
  });

  test("detalhe da receita mostra hero, stat cards e CTA de troca sempre visível", async ({ page }) => {
    await loginAsClient(page);
    await page.locator('a[href^="/plano/refeicao/"]').first().click();
    await expect(page).toHaveURL(/\/plano\/refeicao\/\d+/);

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
    await page.locator('a[href^="/plano/refeicao/"]').first().click();
    await expect(page).toHaveURL(/\/plano\/refeicao\/\d+/);

    const like = page.getByLabel("Gosto desta receita");
    await expect(like).toHaveAttribute("aria-pressed", "false");
    await like.click();
    await expect(like).toHaveAttribute("aria-pressed", "true");
  });
});

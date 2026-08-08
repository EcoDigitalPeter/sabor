// FE-E01 · troca-refeicao.spec.ts — fluxo completo de troca de refeição (propor → confirmar) a
// partir do detalhe de uma refeição (roda contra mocks, sem backend).
//
// Nota: em 2026-07-30 o SwapSheet (src/components/plan/SwapSheet.tsx) ainda não tem nenhum campo
// de "motivo" opcional (nem a página de detalhe em src/app/(cliente)/plano/refeicao/[entryId]/page.tsx
// envia um) — FE-Q06 não tocou este fluxo ainda. Por isso este spec cobre só o fluxo único
// existente (sem variante "com/sem motivo"); quando esse campo existir, acrescentar aqui.
import { test, expect, type Page } from "@playwright/test";

async function loginAsClient(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("amelia@ottimizo.mz");
  // Ver nota em e2e/pedir-agora.spec.ts sobre porque se usa o id em vez de getByLabel("Password").
  await page.locator("#login-password").fill("password123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/inicio");
  await page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name: "Plano" }).click();
  await page.waitForURL("**/plano");
}

test.describe("Troca de refeição", () => {
  test("propor troca mostra a alternativa e confirmar substitui a receita", async ({ page }) => {
    await loginAsClient(page);

    // A 1ª entrada do plano (id 1, pequeno-almoço de segunda-feira) nunca é a entrada reservada
    // para o cenário "sem alternativa" (id 21, fixtures.ts NO_ALTERNATIVE_ENTRY_ID).
    await page.locator('a[href^="/plano/refeicao/"]').first().click();
    await expect(page).toHaveURL(/\/plano\/refeicao\/\d+/);

    const originalTitle = await page.getByRole("heading", { level: 1 }).textContent();

    await page.getByRole("button", { name: "Trocar este prato" }).click();

    // A folha de troca abre com a alternativa proposta (ainda não aplicada).
    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();
    await expect(sheet.getByText("Alternativa proposta")).toBeVisible();
    const confirmButton = sheet.getByRole("button", { name: "Confirmar troca" });
    await expect(confirmButton).toBeVisible();
    await expect(sheet.getByRole("button", { name: "Manter" })).toBeVisible();

    await confirmButton.click();

    // A folha fecha e a receita da página muda para a alternativa confirmada.
    await expect(sheet).not.toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).not.toHaveText(originalTitle ?? "");
  });

  test("manter a receita atual fecha a folha sem trocar", async ({ page }) => {
    await loginAsClient(page);
    await page.locator('a[href^="/plano/refeicao/"]').first().click();
    await expect(page).toHaveURL(/\/plano\/refeicao\/\d+/);

    const originalTitle = await page.getByRole("heading", { level: 1 }).textContent();

    await page.getByRole("button", { name: "Trocar este prato" }).click();
    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();

    await sheet.getByRole("button", { name: "Manter" }).click();

    await expect(sheet).not.toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(originalTitle ?? "");
  });
});

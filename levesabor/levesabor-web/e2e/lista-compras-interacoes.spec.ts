// FE-E01 · lista-compras-interacoes.spec.ts — interações da lista de compras em /compras: marcar
// item como comprado, "já tenho X" (haveQuantity) e "+ Adicionar item" manual (FE-W04) (roda
// contra mocks, sem backend).
import { test, expect, type Page } from "@playwright/test";

async function loginAsClient(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("amelia@ottimizo.mz");
  await page.locator("#login-password").fill("password123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/inicio");
  await page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name: "Plano" }).click();
  await page.waitForURL("**/plano");
}

// Navega SEMPRE por clique in-app (ver nota em e2e/plano-mensal.spec.ts sobre a sessão em memória).
async function goToCompras(page: Page) {
  await page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name: "Compras" }).click();
  await page.waitForURL("**/compras");
}

test.describe("Lista de compras — interações", () => {
  test('marcar um item como comprado atualiza o progresso', async ({ page }) => {
    await loginAsClient(page);
    await goToCompras(page);

    // Não fixamos o total de itens (soma agregada de 30 dias × 3 refeições, frágil a mudanças no
    // catálogo/menu mensal) — lemos o total inicial do próprio ecrã e confirmamos que só o
    // contador de "comprados" sobe 1, mantendo o mesmo total.
    const progressText = page.getByText(/de \d+ comprados/);
    const initialText = (await progressText.textContent()) ?? "";
    const [, , total] = initialText.match(/^(\d+) de (\d+) comprados$/) ?? [];
    expect(initialText).toMatch(/^0 de \d+ comprados$/);

    // O <input> real do Checkbox é visualmente escondido (sr-only, Checkbox.module.css) — clicar
    // no <label> que o envolve (com o nome do item) aciona o toggle nativamente, tal como um
    // clique real faria na caixa visível.
    const firstItem = page.locator('li:has(input[type="checkbox"])').first();
    await firstItem.locator("label").click();

    await expect(progressText).toHaveText(`1 de ${total} comprados`);
    await expect(firstItem.getByRole("checkbox")).toBeChecked();
  });

  test('"já tenho X" regista a quantidade que o cliente já tem em casa', async ({ page }) => {
    await loginAsClient(page);
    await goToCompras(page);

    const firstItem = page.locator('li:has(input[type="checkbox"])').first();
    await firstItem.getByRole("button", { name: "Já tenho um pouco" }).click();

    const pantryInput = firstItem.locator('input[type="number"]');
    await expect(pantryInput).toBeVisible();
    await pantryInput.fill("1");
    await pantryInput.press("Enter");

    await expect(firstItem.getByText(/já tens 1/)).toBeVisible();
  });

  test("+ Adicionar item cria um novo item manual na lista", async ({ page }) => {
    await loginAsClient(page);
    await goToCompras(page);

    await page.getByRole("button", { name: "+ Adicionar item" }).click();

    const sheet = page.getByRole("dialog");
    await expect(sheet.getByRole("heading", { name: "Adicionar item" })).toBeVisible();

    const itemName = `Item de teste ${Date.now()}`;
    await sheet.getByLabel("Nome do ingrediente").fill(itemName);
    await sheet.getByLabel("Quantidade").fill("2");
    await sheet.getByLabel("Unidade").fill("kg");
    await sheet.getByLabel("Categoria").selectOption("OUTROS");

    await sheet.getByRole("button", { name: "Adicionar item" }).click();

    await expect(sheet).not.toBeVisible();
    await expect(page.getByText(itemName)).toBeVisible();
  });
});

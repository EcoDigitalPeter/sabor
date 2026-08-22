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
    // FE-Y07: o contador "X de Y" e o rótulo "comprados" vivem agora em elementos separados
    // (ShoppingSummary), por isso a leitura aponta ao valor, não a uma frase única.
    const progressValue = page.locator('[class*="statValue"]').filter({ hasText: /^\d+ de \d+$/ });
    const initialText = (await progressValue.textContent()) ?? "";
    const [, , total] = initialText.match(/^(\d+) de (\d+)$/) ?? [];
    expect(initialText).toMatch(/^0 de \d+$/);

    // O <input> real do Checkbox é visualmente escondido (sr-only, Checkbox.module.css) — clicar
    // no <label> que o envolve (com o nome do item) aciona o toggle nativamente, tal como um
    // clique real faria na caixa visível.
    // FE-Y07: itens comprados afundam para o fundo do grupo (ShoppingGroup), por isso guardamos o
    // nome do item ANTES de clicar — "primeiro <li>" já não aponta ao mesmo item depois do toggle.
    const firstItem = page.locator('li:has(input[type="checkbox"])').first();
    const itemName = (await firstItem.locator("label").textContent())?.trim() ?? "";
    await firstItem.locator("label").click();

    await expect(progressValue).toHaveText(`1 de ${total}`);
    const checkedItem = page.locator('li:has(input[type="checkbox"])').filter({ hasText: itemName });
    await expect(checkedItem.getByRole("checkbox")).toBeChecked();
  });

  test('"tenho em casa" regista a quantidade que o cliente já tem em casa', async ({ page }) => {
    await loginAsClient(page);
    await goToCompras(page);

    // FE-Y07: o antigo link "Já tenho um pouco" + campo de texto foi trocado por um selector
    // [-]/[+] sempre visível (feedback do cliente) — recalcula de imediato, sem editar nada.
    const firstItem = page.locator('li:has(input[type="checkbox"])').first();
    const stepperValue = firstItem.locator('[class*="stepperValue"]');
    await expect(stepperValue).toHaveText(/^0\s/);

    await firstItem.getByRole("button", { name: /Aumentar a quantidade/ }).click();

    await expect(stepperValue).not.toHaveText(/^0\s/);
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

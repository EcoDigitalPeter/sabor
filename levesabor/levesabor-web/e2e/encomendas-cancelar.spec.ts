// FE-E01 · encomendas-cancelar.spec.ts — cancelar encomenda em /encomendas (F3-CLI-07): abre uma
// encomenda PENDENTE (só estado cancelável nesta seed — src/mocks/fixtures.ts `orders` começa
// vazio, por isso o teste cria a encomenda pelo mesmo fluxo de e2e/plano-mensal.spec.ts antes de a
// cancelar), confirma no ConfirmDialog e verifica que o estado muda para CANCELADA.
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

// Cria uma encomenda PENDENTE a partir de /compras (mesmo fluxo de e2e/plano-mensal.spec.ts) —
// é o único jeito de ter uma encomenda cancelável, já que a seed do mock começa sem encomendas.
async function createPendingOrder(page: Page) {
  await page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name: "Compras" }).click();
  await page.waitForURL("**/compras");

  await page.getByRole("link", { name: "Encomendar rancho" }).click();
  await page.waitForURL("**/compras/encomendar");

  await expect(page.getByRole("heading", { name: "Escolhe a loja" })).toBeVisible();
  await page.getByRole("button", { name: /Mercado Central/ }).click();
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page.getByRole("heading", { name: "Rever encomenda" })).toBeVisible();
  await page.getByRole("button", { name: "Confirmar encomenda" }).click();

  await expect(page.getByRole("heading", { name: "Encomenda enviada" })).toBeVisible();
  await page.getByRole("button", { name: "Ver as minhas encomendas" }).click();
  await page.waitForURL("**/encomendas");
}

test.describe("Cancelar encomenda", () => {
  test("cancelar uma encomenda PENDENTE muda o seu estado para Cancelada", async ({ page }) => {
    await loginAsClient(page);
    await createPendingOrder(page);

    const orderRow = page.getByRole("button", { name: /Mercado Central/ }).first();
    await expect(orderRow).toBeVisible();
    await expect(orderRow.getByText("Pendente")).toBeVisible();

    await orderRow.click();

    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();
    const cancelButton = sheet.getByRole("button", { name: "Cancelar encomenda" });
    await expect(cancelButton).toBeVisible();
    await cancelButton.click();

    // ConfirmDialog exige uma segunda confirmação explícita antes de cancelar de facto.
    await expect(page.getByText("Tens a certeza que queres cancelar esta encomenda?")).toBeVisible();
    await page.getByRole("button", { name: "Cancelar encomenda" }).last().click();

    // A folha fecha e a linha da lista passa a mostrar o estado "Cancelada".
    await expect(orderRow.getByText("Cancelada")).toBeVisible();
  });
});

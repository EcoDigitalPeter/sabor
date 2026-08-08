// FE-L04 · loja-encomendas.spec.ts — lista + detalhe + transição de estado no Portal da Loja
// (contra mocks, sem backend). Cobre: lista + filtro por estado, aceitar uma encomenda pendente,
// recusar uma encomenda aceite.
import { test, expect, type Page } from "@playwright/test";

async function loginAsLojista(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("loja@ottimizo.mz");
  await page.locator("#login-password").fill("password123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/loja/produtos");
}

async function goToEncomendas(page: Page) {
  await page.getByRole("navigation", { name: "Navegação da loja" }).getByRole("link", { name: "Encomendas" }).click();
  await page.waitForURL("**/loja/encomendas");
}

test.describe("Loja — Encomendas", () => {
  test("mostra a lista de encomendas seed e o filtro por estado", async ({ page }) => {
    await loginAsLojista(page);
    await goToEncomendas(page);

    await expect(page.getByRole("heading", { name: "Encomendas" })).toBeVisible();
    await expect(page.getByText("Amélia Cossa")).toHaveCount(2);
    // Scoped à tabela — "Pendente"/"Aceite" também existem como <option> do filtro de estado.
    const table = page.locator("table");
    await expect(table.getByText("Pendente")).toBeVisible();
    await expect(table.getByText("Aceite")).toBeVisible();

    await page.getByLabel("Filtrar por estado").selectOption("PENDENTE");
    await expect(table.getByText("Pendente")).toBeVisible();
    await expect(table.getByText("Aceite")).not.toBeVisible();
  });

  test("aceita uma encomenda pendente", async ({ page }) => {
    await loginAsLojista(page);
    await goToEncomendas(page);

    await page.getByLabel("Filtrar por estado").selectOption("PENDENTE");
    await page.getByText("Amélia Cossa").first().click();
    await page.waitForURL(/\/loja\/encomendas\/\d+/);

    await expect(page.getByText("Farinha de milho (fuba) 1kg")).toBeVisible();
    await page.getByRole("button", { name: "Aceitar" }).click();

    await expect(page.getByText("Aceite", { exact: true })).toBeVisible();
  });

  test("recusa uma encomenda aceite", async ({ page }) => {
    await loginAsLojista(page);
    await goToEncomendas(page);

    await page.getByLabel("Filtrar por estado").selectOption("ACEITE");
    await page.getByText("Amélia Cossa").first().click();
    await page.waitForURL(/\/loja\/encomendas\/\d+/);

    await page.getByRole("button", { name: "Recusar" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Recusar" }).click();

    await expect(page.getByText("Recusada", { exact: true })).toBeVisible();
  });
});

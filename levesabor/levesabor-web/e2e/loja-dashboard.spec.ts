// Fluxo funcional Loja: login -> dashboard operacional de produtos -> navegação para encomendas.
// Roda contra MSW, sem backend real.
import { test, expect } from "@playwright/test";

test.describe("Loja — Dashboard operacional", () => {
  test("login como lojista chega a produtos com catálogo e navegação", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("loja@ottimizo.mz");
    await page.locator("#login-password").fill("password123");
    await page.getByRole("button", { name: "Entrar" }).click();

    await page.waitForURL("**/loja/produtos");

    await expect(page.getByText("Loja Zambézia")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Navegação da loja" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Produtos" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("heading", { name: "Produtos" })).toBeVisible();

    await expect(page.getByRole("button", { name: "Exportar Excel" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Importar Excel" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Novo produto" })).toBeVisible();
    await expect(page.getByText("Farinha de milho (fuba) 1kg")).toBeVisible();
    await expect(page.getByText("Arroz agulha 1kg")).toBeVisible();

    await page.getByRole("navigation", { name: "Navegação da loja" }).getByRole("link", { name: "Encomendas" }).click();
    await page.waitForURL("**/loja/encomendas");
    await expect(page.getByRole("heading", { name: "Encomendas" })).toBeVisible();
  });
});

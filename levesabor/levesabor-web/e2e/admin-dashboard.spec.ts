// Fluxo funcional Admin: login -> dashboard -> navegação principal.
// Roda contra MSW, sem backend real.
import { test, expect } from "@playwright/test";

test.describe("Admin — Dashboard", () => {
  test("login como admin chega ao dashboard com métricas e navegação", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@ottimizo.mz");
    await page.locator("#login-password").fill("password123");
    await page.getByRole("button", { name: "Entrar" }).click();

    await page.waitForURL("**/admin");

    await expect(page.getByText("Equipa Ottimizo")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Navegação admin" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    const main = page.getByRole("main");
    await expect(main.getByText("Utilizadores", { exact: true })).toBeVisible();
    await expect(main.getByText("Planos gerados", { exact: true })).toBeVisible();
    await expect(main.getByText("Taxa de sucesso da IA", { exact: true })).toBeVisible();
    await expect(main.getByRole("heading", { name: "Planos gerados por dia" })).toBeVisible();
    await expect(main.getByRole("heading", { name: "Melhor feedback" })).toBeVisible();
    await expect(main.getByRole("heading", { name: "Pior feedback" })).toBeVisible();
    await expect(main.getByText(/Encomendas — \d+/)).toBeVisible();

    await page.getByRole("navigation", { name: "Navegação admin" }).getByRole("link", { name: "Lojas" }).click();
    await page.waitForURL("**/admin/lojas");
    await expect(page.getByRole("heading", { name: "Lojas" })).toBeVisible();
  });
});

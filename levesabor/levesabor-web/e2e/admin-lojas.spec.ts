// FE-D03 · admin-lojas.spec.ts — CRUD de lojas no portal admin (contra mocks, sem backend).
// Cobre: lista + pesquisa, criação com sucesso, bloqueio de duplicado (LSA006), suspender/reativar.
import { test, expect, type Page } from "@playwright/test";

// Login mock: "admin@ottimizo.mz" entra sempre como o admin fixture "Equipa Ottimizo"
// (ver src/mocks/fixtures.ts DEFAULT_ADMIN_USER); qualquer password é aceite.
async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@ottimizo.mz");
  await page.locator("#login-password").fill("password123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/admin");
}

async function goToLojas(page: Page) {
  await page.getByRole("navigation", { name: "Navegação admin" }).getByRole("link", { name: "Lojas" }).click();
  await page.waitForURL("**/admin/lojas");
}

test.describe("Admin — Lojas", () => {
  test("mostra a lista de lojas e a pesquisa filtra por nome", async ({ page }) => {
    await loginAsAdmin(page);
    await goToLojas(page);

    await expect(page.getByRole("heading", { name: "Lojas" })).toBeVisible();
    await expect(page.getByText("Mercado Central")).toBeVisible();
    await expect(page.getByText("Shoprite Matola")).toBeVisible();

    await page.getByPlaceholder("Pesquisar por nome ou cidade…").fill("Zambézia");
    await expect(page.getByText("Loja Zambézia")).toBeVisible();
    await expect(page.getByText("Mercado Central")).not.toBeVisible();
  });

  test("cria uma nova loja com sucesso", async ({ page }) => {
    await loginAsAdmin(page);
    await goToLojas(page);

    await page.getByRole("button", { name: "Nova loja" }).click();
    await page.waitForURL("**/admin/lojas/nova");

    await page.getByLabel("Nome").fill("Loja Teste E2E");
    await page.getByLabel("Cidade").fill("Nampula");
    await page.getByLabel("Contacto").fill("+258 84 000 0000");
    await page.getByRole("button", { name: "Criar loja" }).click();

    await page.waitForURL("**/admin/lojas");
    await expect(page.getByText("Loja Teste E2E")).toBeVisible();
  });

  test("bloqueia criação com nome+cidade já existentes (LSA006)", async ({ page }) => {
    await loginAsAdmin(page);
    await goToLojas(page);

    await page.getByRole("button", { name: "Nova loja" }).click();
    await page.waitForURL("**/admin/lojas/nova");

    await page.getByLabel("Nome").fill("Mercado Central");
    await page.getByLabel("Cidade").fill("Maputo");
    await page.getByRole("button", { name: "Criar loja" }).click();

    // O erro de duplicado é mapeado nos dois campos (nome + cidade, unicidade composta) — daí
    // aparecer 2x na página.
    await expect(page.getByText(/já existe uma loja com este nome nesta cidade/i)).toHaveCount(2);
    await expect(page).toHaveURL(/\/admin\/lojas\/nova/);
  });

  test("suspende e reativa uma loja a partir do detalhe", async ({ page }) => {
    await loginAsAdmin(page);
    await goToLojas(page);

    await page.getByText("Mercado Central").click();
    await page.waitForURL(/\/admin\/lojas\/\d+/);

    await page.getByRole("button", { name: "Suspender loja" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Suspender" }).click();
    await expect(page.getByText("Suspenso")).toBeVisible();

    await page.getByRole("button", { name: "Reativar loja" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Reativar" }).click();
    await expect(page.getByText("Ativo")).toBeVisible();
  });
});

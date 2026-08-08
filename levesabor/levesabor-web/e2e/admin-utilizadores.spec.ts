// FE-D02 · admin-utilizadores.spec.ts — Utilizadores no portal admin (contra mocks, sem backend).
// Cobre: lista + pesquisa, criação de admin, bloqueio de suspender o último admin ativo (LSA022),
// reveal auditado do perfil de saúde (só após clique explícito), suspender/reativar um cliente.
import { test, expect, type Page } from "@playwright/test";

async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@ottimizo.mz");
  await page.locator("#login-password").fill("password123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/admin");
}

async function goToUtilizadores(page: Page) {
  await page
    .getByRole("navigation", { name: "Navegação admin" })
    .getByRole("link", { name: "Utilizadores" })
    .click();
  await page.waitForURL("**/admin/utilizadores");
}

test.describe("Admin — Utilizadores", () => {
  test("mostra a lista e a pesquisa filtra por nome/email", async ({ page }) => {
    await loginAsAdmin(page);
    await goToUtilizadores(page);

    await expect(page.getByRole("heading", { name: "Utilizadores" })).toBeVisible();
    await expect(page.getByText("Amélia Cossa")).toBeVisible();
    await expect(page.getByText("Carlos Muianga")).toBeVisible();

    await page.getByPlaceholder("Pesquisar por nome ou email…").fill("Carlos");
    await expect(page.getByText("Carlos Muianga")).toBeVisible();
    await expect(page.getByText("Amélia Cossa")).not.toBeVisible();
  });

  test("cria um novo admin com sucesso", async ({ page }) => {
    await loginAsAdmin(page);
    await goToUtilizadores(page);

    await page.getByRole("button", { name: "Novo admin" }).click();
    const sheet = page.getByRole("dialog");
    await sheet.getByLabel("Nome").fill("Admin Teste E2E");
    await sheet.getByLabel("Email").fill("admin.e2e@ottimizo.mz");
    await sheet.getByRole("button", { name: "Criar admin" }).click();

    await expect(page.getByText("Admin Teste E2E")).toBeVisible();
  });

  test("bloqueia suspender o último administrador ativo (LSA022)", async ({ page }) => {
    await loginAsAdmin(page);
    await goToUtilizadores(page);
    // "Equipa Ottimizo" (id 2) é o único ADMIN ACTIVE na seed — ver src/mocks/fixtures.ts ADMIN_USERS.
    // getByText("Equipa Ottimizo") também apanharia o nome do admin na AdminTopbar — usa a linha
    // clicável da tabela (role="button", ver DataTable.tsx) para desambiguar.
    await page.getByRole("button", { name: /Equipa Ottimizo/ }).click();
    await page.waitForURL(/\/admin\/utilizadores\/\d+/);

    await expect(page.getByRole("heading", { name: "Equipa Ottimizo" })).toBeVisible();
    await page.getByRole("button", { name: "Suspender" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Suspender" }).click();

    // Bloqueado pelo mock (LSA022_LAST_ADMIN) — o estado continua "Ativo".
    await expect(page.getByText("Ativo", { exact: true })).toBeVisible();
  });

  test("perfil de saúde só aparece depois do clique explícito", async ({ page }) => {
    await loginAsAdmin(page);
    await goToUtilizadores(page);
    // "Carlos Muianga" (id 3), cliente comum.
    await page.getByText("Carlos Muianga").click();
    await page.waitForURL(/\/admin\/utilizadores\/\d+/);

    await expect(page.getByRole("heading", { name: "Carlos Muianga" })).toBeVisible();
    await expect(page.getByText("Pessoas em casa")).not.toBeVisible();

    await page.getByRole("button", { name: "Ver perfil de saúde" }).click();
    await expect(page.getByText("Pessoas em casa")).toBeVisible();
  });

  test("suspende e reativa um cliente a partir do detalhe", async ({ page }) => {
    await loginAsAdmin(page);
    await goToUtilizadores(page);
    await page.getByText("Carlos Muianga").click();
    await page.waitForURL(/\/admin\/utilizadores\/\d+/);

    await page.getByRole("button", { name: "Suspender" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Suspender" }).click();
    await expect(page.getByText("Suspenso", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Reativar" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Reativar" }).click();
    await expect(page.getByText("Ativo", { exact: true })).toBeVisible();
  });
});

// FE-D06 · admin-receitas.spec.ts — CRUD de receitas no portal admin (contra mocks, sem backend).
// Cobre: lista + pesquisa, criação com sucesso, checklist de publicação bloqueada (LSA023),
// publicação de uma receita já completa.
import { test, expect, type Page } from "@playwright/test";

async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@ottimizo.mz");
  await page.locator("#login-password").fill("password123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/admin");
}

async function goToReceitas(page: Page) {
  await page
    .getByRole("navigation", { name: "Navegação admin" })
    .getByRole("link", { name: "Receitas" })
    .click();
  await page.waitForURL("**/admin/receitas");
}

test.describe("Admin — Receitas", () => {
  test("mostra a lista e a pesquisa filtra por nome", async ({ page }) => {
    await loginAsAdmin(page);
    await goToReceitas(page);

    await expect(page.getByRole("heading", { name: "Receitas" })).toBeVisible();
    await expect(page.getByText("Xima com matapa e camarão")).toBeVisible();

    await page.getByPlaceholder("Pesquisar por nome…").fill("Frango");
    await expect(page.getByText("Frango à zambeziana com arroz e salada")).toBeVisible();
    await expect(page.getByText("Xima com matapa e camarão")).not.toBeVisible();
  });

  test("cria uma nova receita com sucesso", async ({ page }) => {
    await loginAsAdmin(page);
    await goToReceitas(page);

    await page.getByRole("button", { name: "Nova receita" }).click();
    await page.waitForURL("**/admin/receitas/nova");

    await page.getByLabel("Nome").fill("Receita Teste E2E");
    await page.getByLabel("Preparação (min)").fill("15");

    // getByLabel("Ingrediente") também apanharia o botão "Remover ingrediente" (substring,
    // case-insensitive) — getByRole("combobox") desambigua para o <select>.
    await page.getByRole("combobox", { name: "Ingrediente" }).selectOption({ label: "Arroz" });
    await page.getByLabel("Quantidade").fill("100");

    // getByLabel("Passo 1") também apanharia os botões "Mover/Remover passo 1" (substring) —
    // getByRole("textbox") desambigua para o <input>.
    await page.getByRole("textbox", { name: "Passo 1" }).fill("Primeiro passo da receita.");
    await page.getByRole("textbox", { name: "Passo 2" }).fill("Segundo passo da receita.");

    await page.getByRole("button", { name: "Vegetariana" }).click();

    await page.getByRole("button", { name: "Criar receita" }).click();

    await expect(page.getByRole("heading", { name: "Receita Teste E2E" })).toBeVisible();
  });

  test("bloqueia publicação de receita incompleta (checklist)", async ({ page }) => {
    await loginAsAdmin(page);
    await goToReceitas(page);

    // "Bolo de arroz (rascunho)" (id 9999) é propositadamente incompleta na seed — ver
    // src/mocks/fixtures.ts ADMIN_RECIPES.
    await page.getByText("Bolo de arroz (rascunho)").click();
    await page.waitForURL(/\/admin\/receitas\/\d+/);

    await expect(page.getByRole("heading", { name: "Bolo de arroz (rascunho)" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Publicar" })).toBeDisabled();
  });

  test("publica uma receita completa", async ({ page }) => {
    await loginAsAdmin(page);
    await goToReceitas(page);

    // "Feijão nhemba com arroz e couve" (id 7) está em DRAFT mas já tem todos os requisitos —
    // ver src/mocks/fixtures.ts ADMIN_RECIPES / RECIPE_CATALOG[7].
    await page.getByText("Feijão nhemba com arroz e couve").click();
    await page.waitForURL(/\/admin\/receitas\/\d+/);

    await page.getByRole("button", { name: "Publicar" }).click();
    await expect(page.getByText("Publicada", { exact: true })).toBeVisible();
  });
});

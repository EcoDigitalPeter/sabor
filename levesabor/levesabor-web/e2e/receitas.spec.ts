// FE-E01 · receitas.spec.ts — catálogo de receitas navegável em /receitas (FE-W05): filtro por
// tag, pesquisa por nome, e abertura do detalhe em BottomSheet (roda contra mocks, sem backend).
import { test, expect, type Page } from "@playwright/test";

async function loginAsClient(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("amelia@ottimizo.mz");
  await page.locator("#login-password").fill("password123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/inicio");
}

// /receitas não está no BottomNav (só 4 itens: Início/Plano/Compras/Perfil, ver comentário em
// src/app/(cliente)/inicio/page.tsx) — o acesso é o cartão "Receitas" do dashboard /inicio.
// Navega SEMPRE por clique in-app (ver nota em e2e/plano-mensal.spec.ts sobre a sessão em memória).
async function goToReceitas(page: Page) {
  await page.getByRole("link", { name: "Receitas" }).click();
  await page.waitForURL("**/receitas");
}

test.describe("Catálogo de receitas", () => {
  test("aplicar um filtro por tag atualiza a grelha", async ({ page }) => {
    await loginAsClient(page);
    await goToReceitas(page);

    await expect(page.getByRole("heading", { name: "Receitas" })).toBeVisible();
    // Um chip "X kcal" por cartão da grelha — forma estável de contar cartões sem depender de
    // nomes de classe CSS-module ofuscados. `.count()` não espera pela carga assíncrona do
    // catálogo, por isso esperamos primeiro por um cartão visível.
    const grid = page.getByText(/^\d+ kcal$/);
    await expect(grid.first()).toBeVisible();
    const initialCount = await grid.count();
    expect(initialCount).toBeGreaterThan(0);

    await page.getByRole("button", { name: "Vegetariana", exact: true }).click();

    // A grelha filtrada tem menos cartões do que o catálogo completo (RECIPE_CATALOG tem 18
    // receitas, nem todas marcadas "vegetariana").
    await expect(async () => {
      const filteredCount = await grid.count();
      expect(filteredCount).toBeGreaterThan(0);
      expect(filteredCount).toBeLessThan(initialCount);
    }).toPass();
  });

  test("pesquisar por nome filtra a grelha", async ({ page }) => {
    await loginAsClient(page);
    await goToReceitas(page);

    await page.getByLabel("Pesquisar receitas por nome").fill("frango");

    await expect(page.getByRole("button", { name: /Frango à zambeziana/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Xima com matapa e camarão/i })).not.toBeVisible();
  });

  test("abrir uma receita mostra o detalhe com MacroRing e ingredientes", async ({ page }) => {
    await loginAsClient(page);
    await goToReceitas(page);

    await page.getByRole("button", { name: /Frango à zambeziana/i }).click();

    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("heading", { name: /Frango à zambeziana/i })).toBeVisible();
    await expect(sheet.getByText("Tempo de preparação")).toBeVisible();
    await expect(sheet.getByText("Ingredientes")).toBeVisible();
    await expect(sheet.getByText("Frango", { exact: true })).toBeVisible();
  });
});

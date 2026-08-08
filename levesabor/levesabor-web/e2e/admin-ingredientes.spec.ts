// FE-D07 · admin-ingredientes.spec.ts — CRUD de ingredientes no portal admin (contra mocks, sem
// backend). Cobre: lista + pesquisa, criação, eliminação bloqueada por LSA021 (em uso numa
// receita), eliminação bem-sucedida (sem receitas associadas).
import { test, expect, type Page } from "@playwright/test";

async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@ottimizo.mz");
  await page.locator("#login-password").fill("password123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/admin");
}

async function goToIngredientes(page: Page) {
  await page
    .getByRole("navigation", { name: "Navegação admin" })
    .getByRole("link", { name: "Ingredientes" })
    .click();
  await page.waitForURL("**/admin/ingredientes");
}

test.describe("Admin — Ingredientes", () => {
  test("mostra a lista e a pesquisa filtra por nome", async ({ page }) => {
    await loginAsAdmin(page);
    await goToIngredientes(page);

    await expect(page.getByRole("heading", { name: "Ingredientes" })).toBeVisible();
    await expect(page.getByText("Arroz", { exact: true })).toBeVisible();
    await expect(page.getByText("Frango", { exact: true })).toBeVisible();

    await page.getByPlaceholder("Pesquisar por nome…").fill("Arroz");
    await expect(page.getByText("Arroz", { exact: true })).toBeVisible();
    await expect(page.getByText("Frango", { exact: true })).not.toBeVisible();
  });

  test("cria um novo ingrediente com sucesso", async ({ page }) => {
    await loginAsAdmin(page);
    await goToIngredientes(page);

    await page.getByRole("button", { name: "Novo ingrediente" }).click();
    // Escopo ao BottomSheet (role="dialog") — sem isto, getByLabel("Nome") também apanha a caixa
    // de pesquisa da lista ("Pesquisar por nome…" contém "nome" como substring, case-insensitive).
    const sheet = page.getByRole("dialog");
    await expect(sheet.getByRole("heading", { name: "Novo ingrediente" })).toBeVisible();

    await sheet.getByLabel("Nome").fill("Batata reno E2E");
    await sheet.getByLabel("Categoria").fill("Vegetais e Folhas");
    await sheet.getByLabel("Unidade base").fill("kg");
    await sheet.getByLabel("Kcal / 100g").fill("77");
    await sheet.getByRole("button", { name: "Criar ingrediente" }).click();

    await expect(page.getByText("Batata reno E2E")).toBeVisible();
  });

  test("bloqueia eliminação de ingrediente em uso numa receita (LSA021)", async ({ page }) => {
    await loginAsAdmin(page);
    await goToIngredientes(page);

    // "Arroz" (id 19) entra em várias receitas da seed (ver src/mocks/fixtures.ts RECIPE_CATALOG).
    // exact:true evita apanhar a linha da tabela — o nome acessível dela também inclui "Eliminar
    // Arroz" como substring, herdado do aria-label do botão aninhado.
    await page.getByRole("button", { name: "Eliminar Arroz", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Eliminar" }).click();

    // Bloqueado — a linha continua na lista (o toast de erro desaparece em 2,5s, não é fiável
    // esperar por ele; o estado observável estável é o ingrediente continuar presente).
    await expect(page.getByText("Arroz", { exact: true })).toBeVisible();
  });

  test("elimina um ingrediente sem receitas associadas", async ({ page }) => {
    await loginAsAdmin(page);
    await goToIngredientes(page);

    await page.getByRole("button", { name: "Novo ingrediente" }).click();
    const sheet = page.getByRole("dialog");
    await sheet.getByLabel("Nome").fill("Ingrediente Descartável E2E");
    await sheet.getByLabel("Categoria").fill("Outros");
    await sheet.getByLabel("Unidade base").fill("unidade");
    await sheet.getByLabel("Kcal / 100g").fill("10");
    await sheet.getByRole("button", { name: "Criar ingrediente" }).click();
    await expect(page.getByText("Ingrediente Descartável E2E")).toBeVisible();

    await page.getByRole("button", { name: "Eliminar Ingrediente Descartável E2E", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Eliminar" }).click();

    // Esperar o dialog fechar primeiro — enquanto está a fechar, a sua mensagem de confirmação
    // ("...eliminar 'Ingrediente Descartável E2E'...") também contém o texto do locator abaixo,
    // dando strict-mode violation (2 matches) se a asserção correr em paralelo com o fecho.
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(page.getByText("Ingrediente Descartável E2E")).not.toBeVisible();
  });
});

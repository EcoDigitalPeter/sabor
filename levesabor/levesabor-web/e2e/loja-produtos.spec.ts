// FE-L02/FE-L03 · loja-produtos.spec.ts — CRUD de produtos + import Excel no Portal da Loja
// (contra mocks, sem backend). Cobre: lista + pesquisa, criação, eliminação bloqueada por
// encomenda ativa, fluxo de import (validar → pré-visualizar → confirmar → resultado).
import { test, expect, type Page } from "@playwright/test";

// Login mock: "loja@ottimizo.mz" entra sempre como a conta lojista fixture "Loja Zambézia"
// (ver src/mocks/fixtures.ts DEFAULT_LOJISTA_USER); qualquer password é aceite.
async function loginAsLojista(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("loja@ottimizo.mz");
  await page.locator("#login-password").fill("password123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/loja/produtos");
}

test.describe("Loja — Produtos", () => {
  test("login como lojista redireciona para /loja/produtos e mostra o catálogo seed", async ({ page }) => {
    await loginAsLojista(page);

    await expect(page.getByRole("heading", { name: "Produtos" })).toBeVisible();
    await expect(page.getByText("Farinha de milho (fuba) 1kg")).toBeVisible();
    await expect(page.getByText("Arroz agulha 1kg")).toBeVisible();

    await page.getByPlaceholder("Pesquisar por nome…").fill("Arroz");
    await expect(page.getByText("Arroz agulha 1kg")).toBeVisible();
    await expect(page.getByText("Farinha de milho (fuba) 1kg")).not.toBeVisible();
  });

  test("cria um novo produto com sucesso", async ({ page }) => {
    await loginAsLojista(page);

    await page.getByRole("button", { name: "Novo produto" }).click();
    await page.waitForURL("**/loja/produtos/novo");

    await page.getByLabel("Nome").fill("Feijão manteiga 1kg");
    await page.getByLabel("Unidade/tamanho").fill("1 kg");
    await page.getByLabel("Preço (MT)").fill("110");
    await page.getByRole("button", { name: "Criar produto" }).click();

    await page.waitForURL("**/loja/produtos");
    await expect(page.getByText("Feijão manteiga 1kg")).toBeVisible();
  });

  test("bloqueia eliminação de produto numa encomenda ativa", async ({ page }) => {
    await loginAsLojista(page);

    await page.getByText("Farinha de milho (fuba) 1kg").click();
    await page.waitForURL(/\/loja\/produtos\/\d+/);

    await page.getByRole("button", { name: "Eliminar produto" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Eliminar" }).click();

    // Bloqueado (409 do mock, ver activeOrdersReferencingProduct em fixtures.ts) — continua na
    // página de detalhe do produto, que continua a mostrar o seu nome.
    await expect(page.getByRole("heading", { name: "Farinha de milho (fuba) 1kg" })).toBeVisible();
  });

  test("importa um Excel: validar → pré-visualizar → confirmar → resultado", async ({ page }) => {
    await loginAsLojista(page);

    await page.getByRole("button", { name: "Importar Excel" }).click();
    await page.waitForURL("**/loja/produtos/importar");

    await page.locator('input[type="file"]').setInputFiles({
      name: "catalogo.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: Buffer.from("conteúdo ignorado pelo mock"),
    });

    await expect(page.getByText(/pré-visualização/i)).toBeVisible();
    await expect(page.getByText("4 válidas")).toBeVisible();
    await expect(page.getByText("1 com erro")).toBeVisible();

    await page.getByRole("button", { name: "Confirmar importação" }).click();

    await expect(page.getByText("Import concluído")).toBeVisible();
    await expect(page.getByText(/4 produto\(s\) criado\(s\)/)).toBeVisible();

    await page.getByRole("button", { name: "Ver produtos" }).click();
    await page.waitForURL("**/loja/produtos");
    await expect(page.getByText("Batata-doce 1kg")).toBeVisible();
  });
});

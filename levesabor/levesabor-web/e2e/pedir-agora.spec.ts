// FE-T05 · pedir-agora.spec.ts — smoke do fluxo "Pedir receita agora" (roda contra mocks).
import { test, expect, type Page } from "@playwright/test";

async function loginAsClient(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("amelia@levesabor.mz");
  // getByLabel("Password", { exact: true }) não bate certo com o campo real: o FormField
  // acrescenta um "(obrigatório)" invisível ao nome acessível do label ("Password (obrigatório)"),
  // e sem exact:true "Password" também correspondia ao botão "Mostrar/Ocultar password". O id é
  // estável independentemente do texto do label.
  await page.locator("#login-password").fill("password123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/plano");
}

// Navega SEMPRE por clique em link/botão in-app, nunca por page.goto() — a sessão do cliente
// vive só em memória (lib/auth.ts: "nunca localStorage/sessionStorage"), e uma navegação forçada
// (reload completo) perde-a, fazendo o layout (cliente) redirecionar para /login a meio do teste.
async function requestAdHocRecipeFromDashboard(page: Page) {
  await page.getByRole("link", { name: "Pedir uma receita" }).click();
  await page.waitForURL("**/plano/pedir-agora");
  // Passo 1: refeição (mantém o valor pré-selecionado, só avança)
  await page.getByRole("button", { name: "Continuar" }).click();
  // Passo 2: objetivo (mantém o valor pré-selecionado)
  await page.getByRole("button", { name: "Continuar" }).click();
  // Passo 3: nota (opcional, deixa vazio)
  await page.getByRole("button", { name: "Continuar" }).click();
  // Passo 4: confirmar
  await page.getByRole("button", { name: "Gerar receita" }).click();
}

test.describe("Pedir receita agora", () => {
  // Um único teste sequencial: o contador diário de pedidos avulsos é estado em memória
  // partilhado no servidor `next dev` (não isolado por teste) — dividir em dois testes faria
  // com que o consumo de um contaminasse a contagem esperada pelo outro. Este teste cobre o
  // fluxo completo (guardar num dia) na 1ª geração e o limite diário nas seguintes.
  test("fluxo completo + limite diário de pedidos avulsos", async ({ page }) => {
    test.slow(); // 4 gerações + polling; primeira navegação também compila rotas a frio no `next dev`.
    await loginAsClient(page);

    // 1º pedido avulso: fluxo completo cartão → wizard → espera → resultado → guardar num dia.
    await requestAdHocRecipeFromDashboard(page);
    await expect(page.getByRole("button", { name: "Guardar num dia" })).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: "Guardar num dia" }).click();
    await expect(page.getByRole("heading", { name: "Guardar em que refeição?" })).toBeVisible();

    const firstRow = page.locator('[class*="dayRow"]').first();
    await firstRow.click();

    await page.waitForURL("**/plano");
    await expect(page.getByRole("heading", { name: /O teu plano/ })).toBeVisible();

    // 2º e 3º pedidos avulsos: ainda dentro do limite diário de 3 — descarta cada um para voltar
    // ao dashboard e poder pedir o seguinte.
    await requestAdHocRecipeFromDashboard(page);
    await expect(page.getByRole("button", { name: "Guardar num dia" })).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: "Descartar" }).click();
    await page.waitForURL("**/plano");

    await requestAdHocRecipeFromDashboard(page);
    await expect(page.getByRole("button", { name: "Guardar num dia" })).toBeVisible({ timeout: 15000 });
    await page.getByRole("button", { name: "Descartar" }).click();
    await page.waitForURL("**/plano");

    // 4º pedido avulso no mesmo dia: excede o limite (LSA015_ADHOC_LIMIT).
    await requestAdHocRecipeFromDashboard(page);
    await expect(page.getByText(/limite de pedidos avulsos de hoje/)).toBeVisible();
  });
});

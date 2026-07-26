// FE-C09 · plano-mensal.spec.ts — smoke do plano mensal (30 dias + seletor de semanas), do toggle
// "comi isto" (gamificação: anel de progresso do mês + sequência) e do fluxo de encomendar rancho
// a partir de /compras (roda contra mocks, sem backend).
import { test, expect, type Page } from "@playwright/test";

async function loginAsClient(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("amelia@levesabor.mz");
  // Ver nota em e2e/pedir-agora.spec.ts: getByLabel("Password", { exact: true }) não bate certo
  // com o campo real (label acessível ganha um "(obrigatório)" invisível, e sem exact:true
  // "Password" também correspondia ao botão "Mostrar/Ocultar password"). O id é estável.
  await page.locator("#login-password").fill("password123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/inicio");
  await page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name: "Plano" }).click();
  await page.waitForURL("**/plano");
}

// Navega SEMPRE por clique em link/botão in-app, nunca por page.goto() — a sessão do cliente
// vive só em memória (lib/auth.ts: "nunca localStorage/sessionStorage"), e uma navegação forçada
// perde-a, fazendo o layout (cliente) redirecionar para /login a meio do teste.
async function goToCompras(page: Page) {
  await page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name: "Compras" }).click();
  await page.waitForURL("**/compras");
}

test.describe("Plano mensal", () => {
  test("mostra rótulo do mês e mais do que uma semana no seletor", async ({ page }) => {
    await loginAsClient(page);

    await expect(page.getByRole("heading", { name: /O teu plano · \w+ \d{4}/ })).toBeVisible();

    const weekTabs = page.getByRole("tablist", { name: "Semanas do plano" }).getByRole("tab");
    expect(await weekTabs.count()).toBeGreaterThan(1);
    await expect(page.getByRole("tab", { name: "Semana 1" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Semana 2" })).toBeVisible();
  });

  test('marcar "comi isto" atualiza o estado de conclusão do cartão', async ({ page }) => {
    await loginAsClient(page);

    const firstCard = page.locator('a[href^="/plano/refeicao/"]').first();
    await expect(firstCard).toBeVisible();
    const completeButton = firstCard.getByRole("button", { name: 'Marcar "Comi isto"' });
    await expect(completeButton).toHaveAttribute("aria-pressed", "false");

    await completeButton.click();

    // Continua na mesma página (o toggle não navega para o detalhe da receita).
    await expect(page).toHaveURL(/\/plano$/);
    const toggledButton = firstCard.getByRole("button", { name: 'Desmarcar "Comi isto"' });
    await expect(toggledButton).toHaveAttribute("aria-pressed", "true");
  });

  test("fluxo completo de encomendar rancho a partir de /compras", async ({ page }) => {
    await loginAsClient(page);
    await goToCompras(page);

    await expect(page.getByText("Rancho do mês inteiro.", { exact: false })).toBeVisible();
    await expect(page.getByRole("link", { name: "Minhas encomendas" })).toBeVisible();

    await page.getByRole("link", { name: "Encomendar rancho" }).click();
    await page.waitForURL("**/compras/encomendar");

    // Passo 1: escolher loja.
    await expect(page.getByRole("heading", { name: "Escolhe a loja" })).toBeVisible();
    await page.getByRole("button", { name: /Mercado Central/ }).click();
    await page.getByRole("button", { name: "Continuar" }).click();

    // Passo 2: rever itens/quantidades pré-selecionados e confirmar.
    await expect(page.getByRole("heading", { name: "Rever encomenda" })).toBeVisible();
    await expect(page.getByRole("checkbox", { name: "Farinha de milho (fuba)" })).toBeChecked();
    await page.getByRole("button", { name: "Confirmar encomenda" }).click();

    // Confirmação: contacto da loja, sem pagamento/entrega.
    await expect(page.getByRole("heading", { name: "Encomenda enviada" })).toBeVisible();
    await expect(page.getByText("Mercado Central", { exact: false })).toBeVisible();

    await page.getByRole("button", { name: "Ver as minhas encomendas" }).click();
    await page.waitForURL("**/encomendas");

    // A nova encomenda aparece com estado PENDENTE ("Pendente").
    const orderRow = page.getByRole("button", { name: /Mercado Central/ }).first();
    await expect(orderRow).toBeVisible();
    await expect(orderRow.getByText("Pendente")).toBeVisible();
  });
});

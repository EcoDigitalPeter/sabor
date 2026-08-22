// Fluxo funcional cliente: landing publica -> registo -> onboarding -> primeiro plano -> dashboard.
// Roda contra MSW, sem backend real; o objectivo e validar a travessia real entre ecras.
import { test, expect } from "@playwright/test";

test.describe("Landing -> dashboard do cliente", () => {
  test("cria conta a partir da landing e chega ao dashboard autenticado", async ({ page }) => {
    test.slow();

    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Alimentação inteligente, pensada para ti/i })).toBeVisible();
    await page.getByRole("link", { name: "Criar conta", exact: true }).first().click();
    await page.waitForURL("**/registo");

    const uniqueEmail = `cliente.fluxo.${Date.now()}@ottimizo.mz`;
    await page.getByLabel("Nome completo").fill("Cliente Fluxo");
    await page.getByLabel("Email").fill(uniqueEmail);
    await page.locator("#registo-password").fill("password123");
    await page.locator("#registo-confirm-password").fill("password123");
    await page.getByRole("button", { name: "Criar conta" }).click();

    await page.waitForURL("**/onboarding");

    await expect(page.getByRole("heading", { name: "Qual é o teu objectivo?" })).toBeVisible();
    await page.getByRole("button", { name: "Comer melhor no dia a dia" }).click();
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page.getByRole("heading", { name: "Alguma condição de saúde a considerar?" })).toBeVisible();
    await page.getByRole("button", { name: "Nenhuma" }).click();
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page.getByRole("heading", { name: "As tuas alergias e exclusões alimentares" })).toBeVisible();
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page.getByRole("heading", { name: "Tens preferências alimentares?" })).toBeVisible();
    await page.getByRole("button", { name: "Sem preferência" }).click();
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page.getByRole("heading", { name: "Qual é o teu orçamento semanal aproximado?" })).toBeVisible();
    await page.getByRole("button", { name: "Equilibrado" }).click();
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page.getByRole("heading", { name: "Quantas refeições queres incluir no teu plano?" })).toBeVisible();
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page.getByRole("heading", { name: "Quantas pessoas moram contigo?" })).toBeVisible();
    await page.getByRole("button", { name: "Continuar" }).click();

    await expect(page.getByRole("heading", { name: "Confirma os teus dados" })).toBeVisible();
    await page
      .getByText("Compreendo que a Ottimizzo não substitui o acompanhamento médico ou nutricional.")
      .click();
    await page.getByRole("button", { name: "Criar o meu plano" }).click();

    await expect(page.getByRole("heading", { name: "Tudo pronto!" })).toBeVisible();
    await page.getByRole("button", { name: "Ver o meu plano" }).click();
    await page.waitForURL("**/plano/gerar");
    await page.waitForURL("**/plano", { timeout: 20000 });

    await page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name: "Início" }).click();
    await page.waitForURL("**/inicio");

    await expect(page.getByText(/^(Bom dia|Boa tarde|Boa noite), Cliente$/)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Refeições de hoje" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Receitas" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Compras" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Encomendas" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Pedir uma receita" })).toBeVisible();
  });
});

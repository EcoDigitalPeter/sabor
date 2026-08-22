// FE-E01 · registo-onboarding.spec.ts — fluxo completo registo → onboarding (todos os passos,
// incluindo "Preferências alimentares") → resumo → confirmar → primeiro plano gerado (roda contra
// mocks, sem backend).
import { test, expect } from "@playwright/test";

test.describe("Registo → onboarding → primeiro plano", () => {
  test("cria conta, percorre o wizard completo e chega ao plano gerado", async ({ page }) => {
    test.slow(); // geração do plano faz polling (2 pedidos × 2.5s) antes de redirecionar.

    await page.goto("/registo");

    const uniqueEmail = `nova.cliente.${Date.now()}@ottimizo.mz`;
    await page.getByLabel("Nome completo").fill("Nova Cliente");
    await page.getByLabel("Email").fill(uniqueEmail);
    await page.locator("#registo-password").fill("password123");
    await page.locator("#registo-confirm-password").fill("password123");
    await page.getByRole("button", { name: "Criar conta" }).click();

    await page.waitForURL("**/onboarding");

    // Passo 1: objetivo (obrigatório) — bloqueia "Continuar" antes de escolher.
    await expect(page.getByRole("heading", { name: "Qual é o teu objectivo?" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continuar" })).toBeDisabled();
    await page.getByRole("button", { name: "Ganhar massa muscular" }).click();
    await page.getByRole("button", { name: "Continuar" }).click();

    // Passo 2: condição de saúde (obrigatório).
    await expect(page.getByRole("heading", { name: "Alguma condição de saúde a considerar?" })).toBeVisible();
    await page.getByRole("button", { name: "Nenhuma" }).click();
    await page.getByRole("button", { name: "Continuar" }).click();

    // Passo 3: alergias (opcional) — deixa vazio.
    await expect(page.getByRole("heading", { name: "As tuas alergias e exclusões alimentares" })).toBeVisible();
    await page.getByRole("button", { name: "Continuar" }).click();

    // Passo 4: preferências alimentares (novo passo, opcional mas cobrimos a seleção).
    await expect(page.getByRole("heading", { name: "Tens preferências alimentares?" })).toBeVisible();
    const vegetariana = page.getByRole("button", { name: "Vegetariana", exact: true });
    await expect(vegetariana).toHaveAttribute("aria-pressed", "false");
    await vegetariana.click();
    await expect(vegetariana).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Continuar" }).click();

    // Passo 5: orçamento (opcional).
    await expect(page.getByRole("heading", { name: "Qual é o teu orçamento semanal aproximado?" })).toBeVisible();
    await page.getByRole("button", { name: "Equilibrado" }).click();
    await page.getByRole("button", { name: "Continuar" }).click();

    // Passo 6: refeições por dia (stepper, mantém valor por omissão).
    await expect(page.getByRole("heading", { name: "Quantas refeições queres incluir no teu plano?" })).toBeVisible();
    await page.getByRole("button", { name: "Continuar" }).click();

    // Passo 7: pessoas em casa (stepper, mantém valor por omissão).
    await expect(page.getByRole("heading", { name: "Quantas pessoas moram contigo?" })).toBeVisible();
    await page.getByRole("button", { name: "Continuar" }).click();

    // Passo 8: resumo — confirma que a preferência escolhida aparece antes de submeter.
    await expect(page.getByRole("heading", { name: "Confirma os teus dados" })).toBeVisible();
    await expect(page.getByText("Vegetariana")).toBeVisible();
    // FE-Y04: consentimento médico movido do registo para aqui — o <input> real do Checkbox é
    // visualmente escondido (sr-only, Checkbox.module.css), clicar no texto do <label> aciona o
    // toggle nativamente, tal como um clique real faria na caixa visível.
    await page
      .getByText("Compreendo que a Ottimizzo não substitui o acompanhamento médico ou nutricional.")
      .click();
    await page.getByRole("button", { name: "Criar o meu plano" }).click();

    // Ecrã de sucesso do onboarding.
    await expect(page.getByRole("heading", { name: "Tudo pronto!" })).toBeVisible();
    await page.getByRole("button", { name: "Ver o meu plano" }).click();

    await page.waitForURL("**/plano/gerar");
    // A geração usa polling; ao terminar redireciona automaticamente para /plano.
    await page.waitForURL("**/plano", { timeout: 20000 });
    await expect(page.getByRole("heading", { name: /O teu plano/ })).toBeVisible();
    await expect(page.locator('a[href^="/plano/refeicao/"]').first()).toBeVisible();
  });
});

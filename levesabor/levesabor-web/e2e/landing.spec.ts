// FE-P08 · landing.spec.ts — smoke da landing v2 (roda contra mocks, sem backend). Cobre o
// que o plano de verificação pede: secções presentes, quiz completo, FAQ acessível, CTAs para
// /registo, reduced-motion sem esconder conteúdo, e um smoke em mobile.
import { test, expect } from "@playwright/test";

test.describe("Landing v2", () => {
  test("mostra todas as secções para um visitante anónimo", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Comida moçambicana de verdade/i })).toBeVisible();
    await expect(page.locator("#pratos")).toBeVisible();
    await expect(page.locator("#como-funciona")).toBeVisible();
    await expect(page.locator("#faq")).toBeVisible();
    await expect(page.getByText("Vê o que vais receber")).toBeVisible();
  });

  test("fluxo do quiz reage às duas respostas e leva ao registo", async ({ page }) => {
    await page.goto("/#demo");
    const demo = page.locator("#demo");
    await demo.getByRole("button", { name: "Ganhar massa" }).click();
    await demo.getByRole("button", { name: "Diabetes tipo 2" }).click();

    await expect(demo.getByText("A compor o teu prato…")).toBeVisible();
    await expect(demo.getByText(/matapa de amendoim/i)).toBeVisible({ timeout: 3000 });

    const cta = demo.getByRole("link", { name: "Criar a minha conta" });
    await expect(cta).toHaveAttribute("href", "/registo");
  });

  test("modo de texto livre responde a um chip de exemplo", async ({ page }) => {
    await page.goto("/#demo");
    await page.getByRole("tab", { name: "Escreve o teu pedido" }).click();
    await page.getByRole("button", { name: "jantar sem açúcar" }).click();

    await expect(page.getByText(/Para "jantar sem açúcar"/)).toBeVisible({ timeout: 3000 });
  });

  test("galeria de pratos expande com MacroRing e CTA", async ({ page }) => {
    await page.goto("/#pratos");
    const gallery = page.locator("#pratos");
    const trigger = gallery.getByRole("button", { name: /Matapa de amendoim/i });
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(gallery.getByRole("link", { name: "Quero isto no meu plano →" }).first()).toBeVisible();
  });

  test("FAQ alterna aria-expanded e mostra a resposta", async ({ page }) => {
    await page.goto("/#faq");
    const question = page.getByRole("button", { name: "Quanto custa?" });
    await expect(question).toHaveAttribute("aria-expanded", "false");
    await question.click();
    await expect(question).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByText(/Durante o lançamento, é grátis/)).toBeVisible();
  });

  test("todos os CTAs principais apontam para /registo", async ({ page }) => {
    await page.goto("/");
    for (const name of ["Criar conta", "Criar a minha conta grátis"]) {
      await expect(page.getByRole("link", { name, exact: true }).first()).toHaveAttribute("href", "/registo");
    }
  });

  test("mantém-se visível sem animação sob prefers-reduced-motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator("#pratos")).toBeVisible();
    await expect(page.getByText("Vê o que vais receber")).toBeVisible();
  });

  test("smoke em ecrã de 360px", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Comida moçambicana de verdade/i })).toBeVisible();
    const bodyWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(361);
  });
});

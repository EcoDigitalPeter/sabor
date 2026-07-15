# Landing Page Pública (FE-P01) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public landing page at `/` in `levesabor-web`, replicating `project/Leve Sabor AI.dc.html`'s layout/copy/animations (with CTAs pointing to real `/registo` instead of the original waitlist), and get the project ready to deploy on Vercel — including wiring MSW into the browser so the whole app (not just the landing) is navigable against mocks once deployed.

**Architecture:** `src/app/page.tsx` becomes a session-aware Server Component: unauthenticated visitors get the landing (Server Component `LandingPage` composed of static sections + two `"use client"` islands, `HeroQuiz` and `FaqAccordion`); authenticated sessions keep today's `CLIENTE`→`/plano` / `ADMIN`→`/admin` redirect. New components live in `src/components/landing/`, reusing the existing `MacroRing`/`Chip` component library and `styles/tokens.css` design tokens instead of the original file's inline styles.

**Tech Stack:** Next.js 14 App Router, React 18, CSS Modules, TanStack Query, MSW v2, Playwright, `next-pwa`, Vercel.

## Global Constraints

- Full design source of truth: `docs/superpowers/specs/2026-07-14-landing-page-design.md` (read before starting; every task below implements a piece of it).
- Visual reference: `project/Leve Sabor AI.dc.html` — replicate layout/spacing/colors/copy pixel-for-pixel except where the copy-changes table in the spec says otherwise.
- No backend/DB work of any kind — no waitlist form, no persistence. All primary CTAs are plain navigation links to `/registo`.
- Reuse `MacroRing` (`@/components/macro-ring/MacroRing`) and `Chip` (`@/components/ui/Chip`) rather than re-implementing ring/chip markup.
- Use CSS Modules + the tokens in `src/styles/tokens.css` (`--terracotta`, `--amber`, `--ink`, `--cream`, `--tan`, `--forest`, `--clay`, `--radius-pill`, `--radius-card`, `--font-display`/`--font-body`/`--font-mono`, `--focus-on-light`/`--focus-on-dark`, `ls-rise`/`ls-ring-in` keyframes) — never hardcode a color/font already defined there.
- Path alias: `@/*` → `./src/*` (see `tsconfig.json`).
- Do not create a git commit unless a step explicitly says so, and never run `git add -A` / `git add .` — stage only the files each task lists.

---

### Task 1: LandingNav component

**Files:**
- Create: `levesabor/levesabor-web/src/components/landing/LandingNav.tsx`
- Create: `levesabor/levesabor-web/src/components/landing/LandingNav.module.css`

**Interfaces:**
- Consumes: nothing (no props).
- Produces: `LandingNav()` — a Server Component (no `"use client"`), default export not used, named export `LandingNav`. Consumed by `LandingPage` in Task 4.

- [ ] **Step 1: Create `LandingNav.tsx`**

```tsx
// FE-P01 · LandingNav — nav sticky da landing pública (project/Leve Sabor AI.dc.html linhas 34-44)
import Link from "next/link";
import styles from "./LandingNav.module.css";

export function LandingNav() {
  return (
    <nav className={styles.nav}>
      <a href="#top" className={styles.brand}>
        <svg width="30" height="30" viewBox="0 0 40 40" aria-hidden="true" style={{ flex: "none" }}>
          <circle cx="20" cy="20" r="16" fill="none" stroke="#241A14" strokeWidth={3} opacity={0.12} />
          <circle
            cx="20"
            cy="20"
            r="16"
            fill="none"
            stroke="#C43E1C"
            strokeWidth={3}
            strokeDasharray="34 66"
            transform="rotate(-90 20 20)"
          />
          <circle
            cx="20"
            cy="20"
            r="16"
            fill="none"
            stroke="#E3A72E"
            strokeWidth={3}
            strokeDasharray="24 76"
            strokeDashoffset="-34"
            transform="rotate(-90 20 20)"
          />
        </svg>
        <span className={styles.wordmark}>
          leve <span className={styles.accent}>sabor</span>
        </span>
      </a>
      <Link href="/registo" className={styles.cta}>
        Criar conta
      </Link>
    </nav>
  );
}
```

- [ ] **Step 2: Create `LandingNav.module.css`**

```css
/* FE-P01 · LandingNav — nav sticky (project/Leve Sabor AI.dc.html linhas 34-44) */
.nav {
  position: sticky;
  top: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px clamp(20px, 5vw, 56px);
  background: rgba(246, 236, 220, 0.88);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid rgba(36, 26, 20, 0.1);
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: var(--ink);
}

.wordmark {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 19px;
  letter-spacing: -0.02em;
}

.accent {
  color: var(--terracotta);
}

.cta {
  font-family: var(--font-body);
  font-weight: 600;
  font-size: 14px;
  color: var(--cream);
  background: var(--ink);
  padding: 10px 20px;
  border-radius: var(--radius-pill);
  text-decoration: none;
  white-space: nowrap;
  transition: background-color 0.15s ease;
}

.cta:hover {
  background: var(--terracotta);
}

.cta:focus-visible {
  outline: var(--focus-on-light);
  outline-offset: 2px;
}
```

- [ ] **Step 3: Typecheck**

Run: `cd levesabor/levesabor-web && npm run typecheck`
Expected: no errors (component isn't imported anywhere yet, so this just confirms the two new files themselves are valid TypeScript/JSX).

- [ ] **Step 4: Commit**

```bash
git add levesabor/levesabor-web/src/components/landing/LandingNav.tsx levesabor/levesabor-web/src/components/landing/LandingNav.module.css
git commit -m "feat(landing): add LandingNav component"
```

---

### Task 2: HeroQuiz component

**Files:**
- Create: `levesabor/levesabor-web/src/components/landing/HeroQuiz.tsx`
- Create: `levesabor/levesabor-web/src/components/landing/HeroQuiz.module.css`

**Interfaces:**
- Consumes: `MacroRing` from `@/components/macro-ring/MacroRing` — `MacroRing({ macros: {proteina, carbs, gordura, fibra}, kcal: number, size: "sm"|"md"|"lg" })`.
- Produces: `HeroQuiz()` — `"use client"` component, named export, no props. Consumed by `LandingPage` in Task 4. Renders an element with `id="demo"` (the hero's secondary CTA scrolls to `#demo`).

- [ ] **Step 1: Create `HeroQuiz.tsx`**

```tsx
"use client";
// FE-P01 · HeroQuiz — mini-quiz de 2 perguntas do hero (project/Leve Sabor AI.dc.html linhas 64-132)
import { useState } from "react";
import Link from "next/link";
import { MacroRing } from "@/components/macro-ring/MacroRing";
import styles from "./HeroQuiz.module.css";

type Goal = "perda" | "manter" | "massa" | "condicao";
type Condition = "nenhuma" | "diabetes" | "hipertensao" | "celiaca";

const GOAL_LABELS: Record<Goal, string> = {
  perda: "Perder peso",
  manter: "Comer melhor no dia a dia",
  massa: "Ganhar massa",
  condicao: "Gerir uma condição de saúde",
};

const GOAL_ORDER: Goal[] = ["perda", "manter", "massa", "condicao"];

const GOAL_INTROS: Record<Goal, string> = {
  perda: "Para perder peso, a Leve Sabor sugere:",
  manter: "Para o teu dia a dia, a Leve Sabor sugere:",
  massa: "Para ganhar massa, a Leve Sabor sugere:",
  condicao: "Para gerir a tua condição, a Leve Sabor sugere:",
};

const CONDITION_OPTIONS: { key: Condition; label: string }[] = [
  { key: "nenhuma", label: "Nenhuma" },
  { key: "diabetes", label: "Diabetes tipo 2" },
  { key: "hipertensao", label: "Hipertensão" },
  { key: "celiaca", label: "Doença celíaca" },
];

type Plan = {
  dish: string;
  note: string;
  kcal: number;
  macros: { proteina: number; carbs: number; gordura: number; fibra: number };
};

const PLANS: Record<Condition, Plan> = {
  nenhuma: {
    dish: "Frango grelhado com quiabo e xima",
    note: "Prato equilibrado para o teu dia a dia.",
    kcal: 620,
    macros: { proteina: 32, carbs: 42, gordura: 18, fibra: 8 },
  },
  diabetes: {
    dish: "Matapa de amendoim com peixe grelhado e batata-doce (porção controlada)",
    note: "Hidratos controlados — sempre com o teu médico a acompanhar.",
    kcal: 540,
    macros: { proteina: 30, carbs: 36, gordura: 22, fibra: 12 },
  },
  hipertensao: {
    dish: "Caril de peixe com pouco sal, quiabo e arroz integral",
    note: "Baixo em sódio — sempre com o teu médico a acompanhar.",
    kcal: 560,
    macros: { proteina: 28, carbs: 44, gordura: 18, fibra: 10 },
  },
  celiaca: {
    dish: "Xima de milho com frango grelhado e folhas de abóbora",
    note: "Sem glúten, pensado para a tua condição.",
    kcal: 600,
    macros: { proteina: 34, carbs: 40, gordura: 17, fibra: 9 },
  },
};

export function HeroQuiz() {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [condition, setCondition] = useState<Condition | null>(null);

  function selectGoal(next: Goal) {
    setGoal(next);
    setStep(1);
  }

  function selectCondition(next: Condition) {
    setCondition(next);
    setStep(2);
  }

  function reset() {
    setStep(0);
    setGoal(null);
    setCondition(null);
  }

  const plan = PLANS[condition ?? "nenhuma"];

  return (
    <div id="demo" className={styles.card}>
      <p className={styles.eyebrow}>Experimenta — 2 perguntas</p>

      {step === 0 && (
        <div className={styles.rise}>
          <p className={styles.question}>Qual é o teu objetivo?</p>
          <div className={styles.optionGrid}>
            {GOAL_ORDER.map((key) => (
              <button key={key} type="button" className={styles.option} onClick={() => selectGoal(key)}>
                {GOAL_LABELS[key]}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 1 && goal && (
        <div className={styles.rise}>
          <p className={styles.subtext}>
            Objetivo: <span className={styles.subtextAccent}>{GOAL_LABELS[goal]}</span>
          </p>
          <p className={styles.question}>Alguma condição de saúde a considerar?</p>
          <div className={styles.optionGrid}>
            {CONDITION_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                className={styles.option}
                onClick={() => selectCondition(opt.key)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && goal && (
        <div className={styles.riseResult}>
          <p className={styles.subtext}>{GOAL_INTROS[goal]}</p>
          <div className={styles.resultRow}>
            <MacroRing macros={plan.macros} kcal={plan.kcal} size="md" />
            <div className={styles.resultText}>
              <p className={styles.dish}>{plan.dish}</p>
              <p className={styles.note}>{plan.note}</p>
            </div>
          </div>
          <div className={styles.resultActions}>
            <button type="button" className={styles.resetButton} onClick={reset}>
              ↺ Experimentar outra vez
            </button>
            <Link href="/registo" className={styles.ctaButton}>
              Criar a minha conta
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `HeroQuiz.module.css`**

```css
/* FE-P01 · HeroQuiz — cartão do hero (project/Leve Sabor AI.dc.html linhas 65-131) */
.card {
  background: var(--ink-soft);
  border: 1px solid rgba(246, 236, 220, 0.12);
  border-radius: 20px;
  padding: clamp(22px, 3vw, 30px);
  scroll-margin-top: 90px;
}

.eyebrow {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--amber);
  margin: 0 0 18px;
}

.rise,
.riseResult {
  animation: ls-rise 0.4s ease both;
}

.question {
  font-size: 17px;
  font-weight: 600;
  margin: 0 0 16px;
  color: var(--cream);
}

.subtext {
  font-size: 13px;
  color: var(--muted-on-dark);
  margin: 0 0 6px;
}

.subtextAccent {
  color: var(--amber);
  font-weight: 600;
}

.optionGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
}

.option {
  font-family: var(--font-body);
  text-align: left;
  font-size: 14.5px;
  font-weight: 500;
  color: var(--cream);
  background: rgba(246, 236, 220, 0.06);
  border: 1px solid rgba(246, 236, 220, 0.16);
  border-radius: 12px;
  padding: 14px 16px;
  cursor: pointer;
}

.option:hover {
  background: rgba(227, 167, 46, 0.16);
  border-color: var(--amber);
}

.option:focus-visible {
  outline: var(--focus-on-dark);
  outline-offset: 1px;
}

.resultRow {
  display: flex;
  gap: 20px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.resultText {
  flex: 1 1 160px;
  min-width: 160px;
}

.dish {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 18px;
  line-height: 1.25;
  margin: 0 0 6px;
  color: var(--cream);
}

.note {
  font-size: 13px;
  color: var(--muted-on-dark);
  line-height: 1.5;
  margin: 0;
}

.resultActions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.resetButton {
  font-family: var(--font-body);
  font-size: 13.5px;
  font-weight: 600;
  color: var(--ink);
  background: var(--cream);
  border: none;
  border-radius: var(--radius-pill);
  padding: 11px 20px;
  cursor: pointer;
}

.resetButton:hover {
  background: #ffffff;
}

.resetButton:focus-visible {
  outline: var(--focus-on-dark);
  outline-offset: 2px;
}

.ctaButton {
  display: inline-flex;
  align-items: center;
  font-family: var(--font-body);
  font-size: 13.5px;
  font-weight: 600;
  color: #ffffff;
  background: var(--terracotta);
  border-radius: var(--radius-pill);
  padding: 11px 20px;
  text-decoration: none;
}

.ctaButton:hover {
  background: var(--terracotta-dark);
}

.ctaButton:focus-visible {
  outline: var(--focus-on-dark);
  outline-offset: 2px;
}
```

- [ ] **Step 3: Typecheck**

Run: `cd levesabor/levesabor-web && npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add levesabor/levesabor-web/src/components/landing/HeroQuiz.tsx levesabor/levesabor-web/src/components/landing/HeroQuiz.module.css
git commit -m "feat(landing): add HeroQuiz component"
```

---

### Task 3: FaqAccordion component

**Files:**
- Create: `levesabor/levesabor-web/src/components/landing/FaqAccordion.tsx`
- Create: `levesabor/levesabor-web/src/components/landing/FaqAccordion.module.css`

**Interfaces:**
- Consumes: nothing.
- Produces: `FaqAccordion()` — `"use client"` component, named export, no props. First item starts open (`openIndex` initial state `0`, matching the original design's `faqOpen: 0`). Consumed by `LandingPage` in Task 4.

- [ ] **Step 1: Create `FaqAccordion.tsx`**

```tsx
"use client";
// FE-P01 · FaqAccordion — acordeão do FAQ (project/Leve Sabor AI.dc.html linhas 242-260)
import { useState } from "react";
import styles from "./FaqAccordion.module.css";

const FAQS = [
  {
    q: "Os meus dados de saúde ficam seguros?",
    a: "Sim. As informações sobre a tua saúde servem apenas para gerar o teu plano e nunca são partilhadas com terceiros ou vendidas.",
  },
  {
    q: "Funciona com pouco dado móvel ou internet instável?",
    a: "É uma prioridade de design: a Leve Sabor está a ser pensada para pesar pouco em dados, com os planos gerados a ficarem guardados no teu telemóvel.",
  },
  {
    q: "Isto substitui o meu nutricionista ou médico?",
    a: "Não, nunca. A Leve Sabor é uma ferramenta de apoio — as decisões sobre a tua saúde continuam sempre com o teu médico ou nutricionista.",
  },
  {
    q: "Preciso de saber cozinhar bem para seguir os planos?",
    a: "Não. As receitas são simples, com ingredientes comuns e passos diretos — pensadas para o dia a dia, não para uma cozinha profissional.",
  },
];

export function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  function toggle(index: number) {
    setOpenIndex((current) => (current === index ? null : index));
  }

  return (
    <div className={styles.list}>
      {FAQS.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div key={item.q} className={styles.item}>
            <button type="button" className={styles.trigger} onClick={() => toggle(index)} aria-expanded={isOpen}>
              <span>{item.q}</span>
              <span className={styles.icon} aria-hidden="true">
                {isOpen ? "–" : "+"}
              </span>
            </button>
            {isOpen && <p className={styles.answer}>{item.a}</p>}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Create `FaqAccordion.module.css`**

```css
/* FE-P01 · FaqAccordion (project/Leve Sabor AI.dc.html linhas 246-258) */
.list {
  display: flex;
  flex-direction: column;
}

.item {
  border-bottom: 1px solid rgba(36, 26, 20, 0.12);
}

.trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  padding: 20px 4px;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 16.5px;
  color: var(--ink);
}

.trigger:focus-visible {
  outline: var(--focus-on-light);
  outline-offset: 2px;
}

.icon {
  font-family: var(--font-mono);
  font-size: 18px;
  color: var(--terracotta);
  flex: none;
}

.answer {
  font-size: 14.5px;
  line-height: 1.65;
  color: var(--clay);
  margin: 0 4px 22px;
  max-width: 64ch;
}
```

- [ ] **Step 3: Typecheck**

Run: `cd levesabor/levesabor-web && npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add levesabor/levesabor-web/src/components/landing/FaqAccordion.tsx levesabor/levesabor-web/src/components/landing/FaqAccordion.module.css
git commit -m "feat(landing): add FaqAccordion component"
```

---

### Task 4: LandingPage assembly + routing

**Files:**
- Create: `levesabor/levesabor-web/src/components/landing/LandingPage.tsx`
- Create: `levesabor/levesabor-web/src/components/landing/LandingPage.module.css`
- Modify: `levesabor/levesabor-web/src/app/page.tsx` (full replace — currently 14 lines, unconditional redirect)

**Interfaces:**
- Consumes: `LandingNav` (Task 1), `HeroQuiz` (Task 2), `FaqAccordion` (Task 3), `MacroRing` (`@/components/macro-ring/MacroRing`), `Chip` (`@/components/ui/Chip`), `getSession` (`@/lib/auth`).
- Produces: `LandingPage()` — Server Component, named export, no props. Consumed by `src/app/page.tsx`.

- [ ] **Step 1: Create `LandingPage.tsx`**

```tsx
// FE-P01 · LandingPage — secções estáticas da landing pública (project/Leve Sabor AI.dc.html)
import Link from "next/link";
import { LandingNav } from "./LandingNav";
import { HeroQuiz } from "./HeroQuiz";
import { FaqAccordion } from "./FaqAccordion";
import { MacroRing } from "@/components/macro-ring/MacroRing";
import { Chip } from "@/components/ui/Chip";
import styles from "./LandingPage.module.css";

const STEPS = [
  { num: "01", title: "Perfil", desc: "Conta-nos o teu objetivo, condições de saúde e o que gostas de comer." },
  { num: "02", title: "A IA gera o plano", desc: "A Leve Sabor cria um plano semanal com pratos moçambicanos reais." },
  { num: "03", title: "Receitas", desc: "Cada refeição vem com receita simples e ingredientes fáceis de encontrar." },
  { num: "04", title: "Lista de compras", desc: "Recebes a lista da semana, organizada e sem desperdício." },
  {
    num: "05",
    title: "Encomenda à loja parceira",
    desc: "Passa a lista para uma encomenda e combina entrega/pagamento diretamente com a loja.",
  },
];

const ORDER_CARDS = [
  {
    pedido: "Cria um jantar barato com o que tenho em casa: ovos, tomate e arroz.",
    dish: "Omelete de tomate com arroz e folhas verdes",
    chips: ["480 kcal", "20 min", "custo baixo"],
  },
  {
    pedido: "Adapta esta receita de xima para quem tem diabetes tipo 2.",
    dish: "Xima de milho integral com peixe grelhado e quiabo",
    chips: ["520 kcal", "açúcar controlado", "35 min"],
  },
  {
    pedido: "Preciso de uma dieta para hipertensão sem perder o sabor.",
    dish: "Caril de peixe com especiarias e pouco sal",
    chips: ["560 kcal", "sódio reduzido", "40 min"],
  },
  {
    pedido: "Quero ganhar massa muscular comendo comida de casa.",
    dish: "Feijão nhemba com arroz, ovo e amendoim torrado",
    chips: ["710 kcal", "38g proteína", "45 min"],
  },
];

const SCENARIOS = [
  {
    title: "Perder peso",
    body: "Queres perder peso sem contar calorias à mão nem desistir da xima ao domingo.",
    color: "var(--terracotta)",
  },
  {
    title: "Ganhar massa",
    body: "Treinas e precisas de comer mais, com mais proteína, sem gastar uma fortuna.",
    color: "var(--amber)",
  },
  {
    title: "Diabetes tipo 2",
    body: "Foste diagnosticado com diabetes tipo 2 e não sabes por onde começar a mudar a alimentação.",
    color: "var(--forest)",
  },
  {
    title: "Hipertensão",
    body: "Tens hipertensão e o médico pediu para reduzires o sal — sem saber como cozinhar diferente.",
    color: "#8A5A3A",
  },
];

const SHOWCASE_MACROS = { proteina: 26, carbs: 48, gordura: 16, fibra: 10 };

export function LandingPage() {
  return (
    <div className={styles.page}>
      <LandingNav />

      <section id="top" className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <h1 className={styles.heroTitle}>O teu plano alimentar, feito para a tua vida.</h1>
            <p className={styles.heroSubtitle}>
              A Leve Sabor cria planos alimentares à tua medida — com comida real, moçambicana, pensada para o teu
              orçamento, os teus gostos e a tua saúde.
            </p>
            <div className={styles.heroActions}>
              <a href="#demo" className={styles.heroPrimaryCta}>
                Cria o teu plano de exemplo
              </a>
              <a href="#como-funciona" className={styles.heroSecondaryCta}>
                Ver como funciona ↓
              </a>
            </div>
            <p className={styles.heroDisclaimer}>
              A Leve Sabor não substitui o teu médico ou nutricionista — trabalha sempre a par de quem já cuida da
              tua saúde.
            </p>
          </div>
          <div className={styles.heroDemo}>
            <HeroQuiz />
          </div>
        </div>
      </section>

      <section id="como-funciona" className={styles.section}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>Como funciona</h2>
          <p className={styles.sectionLead}>Cinco passos, do teu perfil à encomenda.</p>
          <div className={styles.stepsGrid}>
            {STEPS.map((step) => (
              <div key={step.num} className={styles.stepCard}>
                <span className={styles.stepNum}>{step.num}</span>
                <p className={styles.stepTitle}>{step.title}</p>
                <p className={styles.stepDesc}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>Pede. A Leve Sabor responde.</h2>
          <p className={styles.sectionLead}>Exemplos reais do tipo de pedido que podes fazer — e do que recebes de volta.</p>
          <div className={styles.orderGrid}>
            {ORDER_CARDS.map((card) => (
              <div key={card.dish} className={styles.orderCard}>
                <div className={styles.orderRequest}>
                  <p className={styles.orderLabel}>Pedido</p>
                  <p className={styles.orderPedido}>&ldquo;{card.pedido}&rdquo;</p>
                </div>
                <div className={styles.orderResponse}>
                  <p className={styles.orderLabelResponse}>Leve Sabor diz</p>
                  <p className={styles.orderDish}>{card.dish}</p>
                  <div className={styles.orderChips}>
                    {card.chips.map((chip) => (
                      <Chip key={chip} variant="tan">
                        {chip}
                      </Chip>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.macroShowcase}>
          <div className={styles.macroRingWrap}>
            <MacroRing macros={SHOWCASE_MACROS} kcal={640} size="lg" />
          </div>
          <div className={styles.macroText}>
            <p className={styles.macroEyebrow}>Prato do dia</p>
            <p className={styles.macroDish}>Feijão nhemba com arroz e couve refogada</p>
            <p className={styles.macroNote}>Valores ilustrativos, por porção.</p>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>Para quem é</h2>
          <p className={styles.sectionLead}>Se te revês numa destas situações, é para ti.</p>
          <div className={styles.scenarioGrid}>
            {SCENARIOS.map((s) => (
              <div key={s.title} className={styles.scenarioCard} style={{ borderLeftColor: s.color }}>
                <p className={styles.scenarioTitle}>{s.title}</p>
                <p className={styles.scenarioBody}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.trustSection}>
        <div className={styles.trustInner}>
          <div>
            <p className={styles.trustEyebrow}>Porque isto importa</p>
            <p className={styles.trustHeadline}>
              Em Moçambique, cerca de 3 milhões de pessoas vivem com diabetes — e um nutricionista particular
              continua fora do alcance da maioria.
            </p>
            <p className={styles.trustBody}>
              O número de profissionais de saúde por habitante no país é reduzido, e nutricionistas especializados
              são ainda mais raros fora de Maputo. A Leve Sabor não substitui esse acompanhamento — existe para
              chegar a quem hoje não tem acesso a nenhum.
            </p>
          </div>
          <div>
            <p className={styles.trustEyebrowGreen}>A nossa visão</p>
            <p className={styles.trustVision}>
              Começámos a construir a Leve Sabor porque planos alimentares sérios existem — mas só para quem pode
              pagar uma consulta particular todos os meses.
            </p>
            <p className={styles.trustVision}>
              Queremos que qualquer moçambicano, com qualquer orçamento, tenha um plano pensado para si — com
              comida que já conhece e já gosta.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.faqInner}>
          <h2 className={styles.sectionTitle}>Perguntas diretas</h2>
          <FaqAccordion />
        </div>
      </section>

      <section className={styles.ctaSection}>
        <div className={styles.ctaCard}>
          <p className={styles.ctaTitle}>Sê dos primeiros a experimentar.</p>
          <p className={styles.ctaLead}>Cria a tua conta grátis e recebe o teu primeiro plano alimentar em minutos.</p>
          <Link href="/registo" className={styles.ctaButton}>
            Criar a minha conta grátis
          </Link>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerTop}>
            <div className={styles.footerBrand}>
              <span className={styles.footerWordmark}>
                leve <span className={styles.footerAccent}>sabor</span>
              </span>
              <p className={styles.footerTagline}>
                A nossa visão: comida real, adaptada a cada moçambicano — sem depender de quem pode pagar um
                nutricionista particular.
              </p>
            </div>
            <div className={styles.footerContact}>
              <p className={styles.footerContactLabel}>Contacto</p>
              <a href="mailto:ola@levesabor.ai" className={styles.footerLink}>
                ola@levesabor.ai
              </a>
            </div>
          </div>
          <p className={styles.footerDisclaimer}>
            A Leve Sabor AI não substitui aconselhamento médico ou nutricional profissional. Consulta sempre o teu
            médico antes de mudanças significativas na tua alimentação, sobretudo se tiveres uma condição de saúde
            diagnosticada.
          </p>
          <p className={styles.footerCopyright}>© 2026 Leve Sabor AI</p>
        </div>
      </footer>
    </div>
  );
}
```

Note: the original design's footer had a second contact link ("WhatsApp — fala connosco") pointing at `#waitlist`. Since the waitlist section no longer exists (Section C decision — CTAs go to `/registo`, no waitlist form), that link is dropped rather than left pointing at a dead anchor. Email contact is kept.

- [ ] **Step 2: Create `LandingPage.module.css`**

```css
/* FE-P01 · LandingPage — secções estáticas (project/Leve Sabor AI.dc.html) */

.page {
  overflow-x: hidden;
}

.sectionInner,
.heroInner,
.trustInner,
.faqInner {
  max-width: 1180px;
  margin: 0 auto;
}

.faqInner {
  max-width: 800px;
}

/* ---------- Hero ---------- */

.hero {
  background: var(--ink);
  color: var(--cream);
  padding: clamp(48px, 8vw, 88px) clamp(20px, 6vw, 56px) clamp(64px, 9vw, 110px);
}

.heroInner {
  display: flex;
  flex-wrap: wrap;
  gap: clamp(32px, 6vw, 64px);
  align-items: flex-start;
}

.heroCopy {
  flex: 1 1 420px;
  min-width: 300px;
}

.heroTitle {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: clamp(2.3rem, 5.4vw, 3.9rem);
  line-height: 1.05;
  letter-spacing: -0.02em;
  margin: 0 0 22px;
}

.heroSubtitle {
  font-size: clamp(1.05rem, 1.6vw, 1.25rem);
  line-height: 1.6;
  color: var(--muted-on-dark-2);
  max-width: 52ch;
  margin: 0 0 32px;
}

.heroActions {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-bottom: 36px;
}

.heroPrimaryCta {
  font-family: var(--font-body);
  font-weight: 600;
  font-size: 15px;
  color: var(--ink);
  background: var(--amber);
  padding: 14px 26px;
  border-radius: var(--radius-pill);
  text-decoration: none;
}

.heroPrimaryCta:hover {
  background: var(--amber-soft);
}

.heroPrimaryCta:focus-visible {
  outline: var(--focus-on-dark);
  outline-offset: 2px;
}

.heroSecondaryCta {
  font-family: var(--font-body);
  font-weight: 600;
  font-size: 15px;
  color: var(--cream);
  padding: 14px 22px;
  border-radius: var(--radius-pill);
  text-decoration: none;
  border: 1px solid rgba(246, 236, 220, 0.35);
}

.heroSecondaryCta:hover {
  border-color: var(--cream);
}

.heroSecondaryCta:focus-visible {
  outline: var(--focus-on-dark);
  outline-offset: 2px;
}

.heroDisclaimer {
  font-size: 13px;
  color: var(--muted-on-dark);
  max-width: 44ch;
  line-height: 1.5;
  margin: 0;
}

.heroDemo {
  flex: 1 1 380px;
  min-width: 300px;
}

/* ---------- Secções gerais ---------- */

.section {
  padding: 0 clamp(20px, 6vw, 56px) clamp(64px, 9vw, 110px);
}

.sectionTitle {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: clamp(1.8rem, 3.6vw, 2.6rem);
  letter-spacing: -0.01em;
  margin: 0 0 12px;
}

.sectionLead {
  font-size: 17px;
  color: var(--clay);
  max-width: 60ch;
  margin: 0 0 clamp(36px, 5vw, 56px);
}

/* ---------- Como funciona ---------- */

.stepsGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: clamp(20px, 3vw, 28px);
}

.stepCard {
  background: var(--cream-card);
  border: 1px solid rgba(36, 26, 20, 0.08);
  border-radius: var(--radius-card);
  padding: 26px 22px;
}

.stepNum {
  font-family: var(--font-mono);
  font-weight: 600;
  font-size: 14px;
  color: var(--terracotta);
  display: inline-block;
  margin-bottom: 16px;
}

.stepTitle {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 18px;
  margin: 0 0 8px;
}

.stepDesc {
  font-size: 14.5px;
  line-height: 1.55;
  color: var(--clay);
  margin: 0;
}

/* ---------- Exemplos de pedido ---------- */

.orderGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 20px;
}

.orderCard {
  background: var(--cream-card);
  border: 1px solid rgba(36, 26, 20, 0.08);
  border-radius: var(--radius-card);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.orderRequest {
  padding: 20px 20px 16px;
  border-bottom: 1px dashed rgba(36, 26, 20, 0.14);
}

.orderLabel {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--clay-soft);
  margin: 0 0 8px;
}

.orderPedido {
  font-size: 14.5px;
  line-height: 1.5;
  color: var(--ink);
  margin: 0;
  font-style: italic;
}

.orderResponse {
  padding: 18px 20px 22px;
  background: var(--cream-card-alt);
  flex: 1;
  display: flex;
  flex-direction: column;
}

.orderLabelResponse {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--forest);
  margin: 0 0 8px;
}

.orderDish {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 16.5px;
  line-height: 1.3;
  margin: 0 0 14px;
}

.orderChips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: auto;
}

/* ---------- Macros showcase ---------- */

.macroShowcase {
  max-width: 1180px;
  margin: 0 auto;
  background: var(--ink);
  border-radius: 24px;
  padding: clamp(32px, 5vw, 56px);
  display: flex;
  flex-wrap: wrap;
  gap: clamp(32px, 5vw, 56px);
  align-items: center;
}

.macroRingWrap {
  flex: 1 1 260px;
  min-width: 240px;
  display: flex;
  justify-content: center;
}

.macroText {
  flex: 1 1 340px;
  min-width: 280px;
}

.macroEyebrow {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--amber);
  margin: 0 0 10px;
}

.macroDish {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: clamp(1.4rem, 2.6vw, 1.9rem);
  color: var(--cream);
  margin: 0 0 22px;
}

.macroNote {
  font-size: 12.5px;
  color: var(--clay-soft);
  margin: 18px 0 0;
}

/* ---------- Para quem é ---------- */

.scenarioGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.scenarioCard {
  border-left: 3px solid;
  padding: 4px 0 4px 20px;
}

.scenarioTitle {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 17px;
  margin: 0 0 8px;
}

.scenarioBody {
  font-size: 14.5px;
  line-height: 1.6;
  color: var(--clay);
  margin: 0;
}

/* ---------- Confiança ---------- */

.trustSection {
  background: var(--ink);
  color: var(--cream);
  padding: clamp(64px, 9vw, 110px) clamp(20px, 6vw, 56px);
}

.trustInner {
  display: flex;
  flex-wrap: wrap;
  gap: clamp(40px, 6vw, 64px);
}

.trustInner > div {
  flex: 1 1 340px;
  min-width: 280px;
}

.trustEyebrow {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--amber);
  margin: 0 0 14px;
}

.trustEyebrowGreen {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--forest);
  margin: 0 0 14px;
}

.trustHeadline {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: clamp(1.5rem, 2.8vw, 2rem);
  line-height: 1.25;
  margin: 0 0 18px;
}

.trustBody {
  font-size: 14.5px;
  line-height: 1.65;
  color: var(--muted-on-dark-2);
  max-width: 52ch;
  margin: 0;
}

.trustVision {
  font-size: 15.5px;
  line-height: 1.7;
  color: var(--muted-on-dark-2);
  margin: 0 0 16px;
}

.trustVision:last-child {
  margin-bottom: 0;
}

/* ---------- CTA final ---------- */

.ctaSection {
  padding: 0 clamp(20px, 6vw, 56px) clamp(64px, 9vw, 110px);
}

.ctaCard {
  max-width: 720px;
  margin: 0 auto;
  background: var(--tan);
  border-radius: 24px;
  padding: clamp(36px, 5vw, 56px);
  text-align: center;
}

.ctaTitle {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: clamp(1.6rem, 3.2vw, 2.2rem);
  letter-spacing: -0.01em;
  margin: 0 0 12px;
}

.ctaLead {
  font-size: 15.5px;
  color: var(--clay);
  max-width: 48ch;
  margin: 0 auto clamp(28px, 4vw, 36px);
}

.ctaButton {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-body);
  font-weight: 600;
  font-size: 15.5px;
  color: var(--cream);
  background: var(--terracotta);
  padding: 15px 32px;
  border-radius: var(--radius-pill);
  text-decoration: none;
}

.ctaButton:hover {
  background: var(--terracotta-dark);
}

.ctaButton:focus-visible {
  outline: var(--focus-on-light);
  outline-offset: 2px;
}

/* ---------- Footer ---------- */

.footer {
  background: var(--ink);
  color: var(--muted-on-dark-2);
  padding: clamp(40px, 6vw, 56px) clamp(20px, 6vw, 56px) clamp(28px, 4vw, 36px);
}

.footerInner {
  max-width: 1180px;
  margin: 0 auto;
}

.footerTop {
  display: flex;
  flex-wrap: wrap;
  gap: 32px;
  justify-content: space-between;
  padding-bottom: 28px;
  border-bottom: 1px solid rgba(246, 236, 220, 0.12);
}

.footerBrand {
  flex: 1 1 320px;
  min-width: 260px;
}

.footerWordmark {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 18px;
  color: var(--cream);
}

.footerAccent {
  color: var(--terracotta);
}

.footerTagline {
  font-size: 14.5px;
  line-height: 1.6;
  margin: 14px 0 0;
  max-width: 44ch;
}

.footerContact {
  flex: 0 1 220px;
}

.footerContactLabel {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--clay-soft);
  margin: 0 0 12px;
}

.footerLink {
  display: block;
  font-size: 14.5px;
  color: var(--cream);
  text-decoration: none;
}

.footerLink:hover {
  color: var(--amber);
}

.footerDisclaimer {
  font-size: 12.5px;
  line-height: 1.6;
  color: #7a6a56;
  max-width: 76ch;
  margin: 22px 0 0;
}

.footerCopyright {
  font-size: 12px;
  color: #5c4e3e;
  margin: 16px 0 0;
}
```

- [ ] **Step 3: Replace `src/app/page.tsx`**

```tsx
// FE-A04/FE-P01 · Raiz: landing pública sem sessão; redireciona por sessão/role — CLIENTE → /plano; ADMIN → /admin
// Nota: getSession() (lib/auth.ts) é apenas em memória — sem hidratação de cookie/sessão no
// servidor ainda (FE-A03). Como Server Component, esta guarda nunca vê uma sessão real vinda do
// browser, pelo que um utilizador autenticado a aceder a "/" diretamente pode ver a landing por
// breve momento antes de qualquer redirect; é uma limitação aceite do MVP (mesma nota das guardas
// de (cliente)/admin), não um bug a corrigir aqui.
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LandingPage } from "@/components/landing/LandingPage";

export default function Home() {
  const session = getSession();
  if (!session) return <LandingPage />;
  if (session.role === "CLIENTE") redirect("/plano");
  redirect("/admin");
}
```

- [ ] **Step 4: Typecheck and lint**

Run: `cd levesabor/levesabor-web && npm run typecheck && npm run lint`
Expected: both pass with no errors.

- [ ] **Step 5: Manual visual check**

Run: `cd levesabor/levesabor-web && npm run dev`
Open `http://localhost:3000` in a browser. Confirm: nav sticky on scroll, hero renders with quiz, clicking through the quiz (goal → condition) shows a macro ring result matching one of the four `PLANS`, "Como funciona" shows 5 steps with step 5 reading "Encomenda à loja parceira", order example cards render with chips, macros showcase shows the large ring, FAQ first item is open by default, footer/legal disclaimer present. Stop the dev server after checking (Ctrl+C).

- [ ] **Step 6: Commit**

```bash
git add levesabor/levesabor-web/src/components/landing/LandingPage.tsx levesabor/levesabor-web/src/components/landing/LandingPage.module.css levesabor/levesabor-web/src/app/page.tsx
git commit -m "feat(landing): assemble LandingPage and wire it into the root route"
```

---

### Task 5: Vercel deploy baseline config

**Files:**
- Modify: `levesabor/levesabor-web/next.config.mjs`
- Create: `levesabor/levesabor-web/README.md`

**Interfaces:** none (config/docs only).

- [ ] **Step 1: Remove `output: "standalone"` from `next.config.mjs`**

Current `nextConfig` block:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
};

export default withPWA(nextConfig);
```

Replace with:

```js
// "standalone" é para deploys self-hosted/Docker (bundle mínimo com servidor Node próprio).
// A Vercel tem o seu próprio pipeline de build/serve e não usa este modo — mantê-lo ligado não é
// fatal, mas muda como o Next traça/empacota dependências do servidor e é uma fonte conhecida de
// problemas de resolução de assets na Vercel. Reintroduzir só se um alvo de deploy não-Vercel precisar.
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

export default withPWA(nextConfig);
```

- [ ] **Step 2: Create `levesabor/levesabor-web/README.md`**

```markdown
# levesabor-web

Next.js 14 (App Router) frontend for Leve Sabor AI. See `/docs/plano/` at the repo root for the full product/implementation plan.

## Local development

\`\`\`bash
npm install
cp .env.example .env.local
npm run dev
\`\`\`

## Scripts

- `npm run dev` / `npm run build` / `npm run start`
- `npm run lint` / `npm run typecheck`
- `npm run gen:types` — regenerate `src/types/api.d.ts` from `../levesabor-api/openapi.yaml`
- `npm run test:e2e` — Playwright, runs against a local `npm run dev` server with mocks enabled

## Deploying to Vercel

This repo is a monorepo — the Next.js app lives at `levesabor/levesabor-web`, not the repo root. When creating the Vercel project:

1. **Root Directory**: set to `levesabor/levesabor-web` in the Vercel project settings (Settings → General → Root Directory). Without this, Vercel won't find `package.json`/`next.config.mjs`.
2. **Environment variables** (Settings → Environment Variables), both required:
   - `NEXT_PUBLIC_API_URL` — the backend base URL. There is no deployed backend yet (Fase 1 backend hasn't started, see `docs/plano/tasks.md`), so this can point anywhere for now — it's only reached when mocks are off.
   - `NEXT_PUBLIC_USE_MOCKS` — set to `true` for any deployment made before the real backend exists. This starts an MSW worker in the browser (see `src/mocks/`) so every page (not just the public landing) is fully navigable against realistic fixture data. Set to `false` once a real backend is live behind `NEXT_PUBLIC_API_URL`.
3. Build command / output directory / install command: leave the Vercel defaults (Next.js is auto-detected).

No `vercel.json` is needed for this project — Next.js App Router + `next-pwa` both work with Vercel's default build detection.
```

- [ ] **Step 3: Build**

Run: `cd levesabor/levesabor-web && npm run build`
Expected: build succeeds (exit code 0). This validates the `output: "standalone"` removal didn't break anything.

- [ ] **Step 4: Commit**

```bash
git add levesabor/levesabor-web/next.config.mjs levesabor/levesabor-web/README.md
git commit -m "chore(deploy): remove standalone output, add Vercel deployment README"
```

---

### Task 6: MSW browser wiring

**Files:**
- Create: `levesabor/levesabor-web/src/mocks/browser.ts`
- Create: `levesabor/levesabor-web/src/mocks/MockProvider.tsx`
- Modify: `levesabor/levesabor-web/src/app/providers.tsx`
- Modify: `levesabor/levesabor-web/next.config.mjs` (PWA/MSW service-worker scope conflict)
- Modify: `levesabor/levesabor-web/package.json` (move `msw` to `dependencies`)
- Create (generated by CLI): `levesabor/levesabor-web/public/mockServiceWorker.js`

**Interfaces:**
- Consumes: `handlers` (`export const handlers = [...]` from `@/mocks/handlers`, already exists).
- Produces: `worker` (from `@/mocks/browser`) and `MockProvider` (`@/mocks/MockProvider`) — a `"use client"` component wrapping `{ children: React.ReactNode }`, consumed by `providers.tsx`.

**Why this is needed:** `NEXT_PUBLIC_USE_MOCKS` is documented in `.env.example` but nothing in the app ever reads it or starts an MSW worker — `msw` is only used for Playwright tests today. Without this, every page that calls `@/lib/api` (login, plano, admin, ...) fails against a nonexistent backend, both in `npm run dev` and once deployed.

- [ ] **Step 1: Generate the MSW service worker file**

Run: `cd levesabor/levesabor-web && npx msw init public/ --save`
Expected output: `Service Worker generated successfully` (or similar), creates `public/mockServiceWorker.js`, and adds a top-level `"msw": { "workerDirectory": ["public"] }` key to `package.json`. Verify both:

Run: `head -5 public/mockServiceWorker.js` — expect it to look like generated MSW boilerplate (a header comment mentioning "Mock Service Worker").
Run: `grep -A2 '"msw"' package.json` — expect the `workerDirectory` key to be present.

- [ ] **Step 2: Create `src/mocks/browser.ts`**

```ts
// FE-P01 · Browser MSW worker — só arranca quando NEXT_PUBLIC_USE_MOCKS=true (ver MockProvider)
import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

export const worker = setupWorker(...handlers);
```

- [ ] **Step 3: Create `src/mocks/MockProvider.tsx`**

```tsx
"use client";
// FE-P01 · MockProvider — arranca o MSW no browser quando NEXT_PUBLIC_USE_MOCKS=true, e só
// renderiza os filhos depois do worker estar pronto a intercetar pedidos (evita a corrida em que
// o primeiro fetch/query dispara antes do service worker ficar ativo). Import dinâmico de "./browser"
// para que `msw` não entre no bundle inicial quando os mocks estão desligados.
import { useEffect, useState } from "react";

const MOCKS_ENABLED = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

export function MockProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(!MOCKS_ENABLED);

  useEffect(() => {
    if (!MOCKS_ENABLED) return;
    let cancelled = false;
    import("./browser").then(({ worker }) => {
      worker.start({ onUnhandledRequest: "bypass" }).then(() => {
        if (!cancelled) setReady(true);
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) return null;
  return <>{children}</>;
}
```

- [ ] **Step 4: Wire `MockProvider` into `providers.tsx`**

Current `providers.tsx`:

```tsx
"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/api";
import { ToastProvider } from "@/components/ui/Toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}
```

Replace with:

```tsx
"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/api";
import { ToastProvider } from "@/components/ui/Toast";
import { MockProvider } from "@/mocks/MockProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MockProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>{children}</ToastProvider>
      </QueryClientProvider>
    </MockProvider>
  );
}
```

- [ ] **Step 5: Avoid a PWA/MSW service-worker scope conflict in `next.config.mjs`**

Both `next-pwa` (production caching SW) and MSW (`mockServiceWorker.js`) register a service worker at the same origin scope (`/`) — only one can control the page reliably. Since mock-mode deployments are for demoing against fixtures (not real offline caching of a real backend), disable the PWA service worker whenever mocks are enabled.

Current `withPWAInit` call in `next.config.mjs`:

```js
const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
```

Replace the `disable` line with:

```js
const withPWA = withPWAInit({
  dest: "public",
  // Desligado em dev (comportamento original) e sempre que os mocks MSW estão ativos — os dois
  // service workers (next-pwa e mockServiceWorker.js) disputariam o mesmo scope "/" (FE-P01).
  disable: process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_USE_MOCKS === "true",
  workboxOptions: {
```

- [ ] **Step 6: Move `msw` to `dependencies` in `package.json`**

Current:

```json
  "dependencies": {
    "@ducanh2912/next-pwa": "^10.2.9",
    "@tanstack/react-query": "^5.51.0",
    "next": "^14.2.5",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-hook-form": "^7.52.0",
    "zod": "^3.23.8",
    "lucide-react": "^0.417.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.45.0",
    "@types/node": "^20.14.0",
    "@types/react": "^18.3.3",
    "eslint": "^8.57.0",
    "eslint-config-next": "^14.2.5",
    "msw": "^2.3.0",
    "openapi-typescript": "^7.0.0",
    "typescript": "^5.5.3"
  }
```

Replace with (`msw` moved up, everything else unchanged):

```json
  "dependencies": {
    "@ducanh2912/next-pwa": "^10.2.9",
    "@tanstack/react-query": "^5.51.0",
    "msw": "^2.3.0",
    "next": "^14.2.5",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-hook-form": "^7.52.0",
    "zod": "^3.23.8",
    "lucide-react": "^0.417.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.45.0",
    "@types/node": "^20.14.0",
    "@types/react": "^18.3.3",
    "eslint": "^8.57.0",
    "eslint-config-next": "^14.2.5",
    "openapi-typescript": "^7.0.0",
    "typescript": "^5.5.3"
  }
```

`msw`'s import in `browser.ts` is now production application code (runs in the deployed browser bundle whenever `NEXT_PUBLIC_USE_MOCKS=true`), not just a test tool, so it belongs in `dependencies`.

- [ ] **Step 7: Reinstall and verify**

Run: `cd levesabor/levesabor-web && npm install`
Expected: lockfile updates to match the `dependencies`/`devDependencies` move, no errors.

Run: `npm run typecheck && npm run lint`
Expected: both pass.

- [ ] **Step 8: Manual check with mocks on**

Run (from `levesabor/levesabor-web`):
```bash
echo "NEXT_PUBLIC_USE_MOCKS=true" >> .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1" >> .env.local
npm run dev
```
Open `http://localhost:3000/login` in a browser, open devtools → Network tab, and confirm requests to `/api/v1/auth/login` on submit are intercepted by the service worker (Network tab shows the request with a "(ServiceWorker)" size/type indicator, or check the console for MSW's `[MSW] Mocking enabled` log). Stop the dev server after checking (Ctrl+C). Leave `.env.local` as-is (it's gitignored, not part of the commit).

- [ ] **Step 9: Commit**

```bash
git add levesabor/levesabor-web/src/mocks/browser.ts levesabor/levesabor-web/src/mocks/MockProvider.tsx levesabor/levesabor-web/src/app/providers.tsx levesabor/levesabor-web/next.config.mjs levesabor/levesabor-web/package.json levesabor/levesabor-web/package-lock.json levesabor/levesabor-web/public/mockServiceWorker.js
git commit -m "feat(mocks): wire MSW into the browser via NEXT_PUBLIC_USE_MOCKS"
```

---

### Task 7: Playwright config + landing E2E test

**Files:**
- Create: `levesabor/levesabor-web/playwright.config.ts`
- Create: `levesabor/levesabor-web/e2e/landing.spec.ts`

**Interfaces:** none (test-only).

- [ ] **Step 1: Create `playwright.config.ts`**

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    env: {
      NEXT_PUBLIC_USE_MOCKS: "true",
      NEXT_PUBLIC_API_URL: "http://localhost:8080/api/v1",
    },
  },
});
```

- [ ] **Step 2: Write the failing test — create `e2e/landing.spec.ts`**

```ts
import { test, expect } from "@playwright/test";

test.describe("Landing pública", () => {
  test("mostra a landing e completa o quiz do hero", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "O teu plano alimentar, feito para a tua vida." }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Perder peso" }).click();
    await page.getByRole("button", { name: "Diabetes tipo 2" }).click();

    await expect(
      page.getByText("Matapa de amendoim com peixe grelhado e batata-doce (porção controlada)"),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Criar a minha conta" })).toHaveAttribute("href", "/registo");
  });

  test("reinicia o quiz", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Ganhar massa" }).click();
    await page.getByRole("button", { name: "Nenhuma" }).click();
    await page.getByRole("button", { name: "↺ Experimentar outra vez" }).click();
    await expect(page.getByText("Qual é o teu objetivo?")).toBeVisible();
  });

  test("acordeão do FAQ abre e fecha", async ({ page }) => {
    await page.goto("/");
    const question = page.getByRole("button", { name: "Funciona com pouco dado móvel ou internet instável?" });
    await question.click();
    await expect(page.getByText(/pesar pouco em dados/)).toBeVisible();
    await question.click();
    await expect(page.getByText(/pesar pouco em dados/)).not.toBeVisible();
  });

  test("CTAs de navegação apontam para /registo", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Criar conta" })).toHaveAttribute("href", "/registo");
    await expect(page.getByRole("link", { name: "Criar a minha conta grátis" })).toHaveAttribute("href", "/registo");
  });
});
```

- [ ] **Step 3: Install Playwright browsers if needed, then run to verify it passes**

Run: `cd levesabor/levesabor-web && npx playwright install --with-deps chromium` (only needed once, if not already installed)
Run: `npm run test:e2e`
Expected: 4 passed. If any fail, re-check the exact button/heading text against `LandingPage.tsx`/`HeroQuiz.tsx`/`FaqAccordion.tsx` from Tasks 2–4 (test selectors must match the rendered text exactly, including accents/punctuation).

- [ ] **Step 4: Commit**

```bash
git add levesabor/levesabor-web/playwright.config.ts levesabor/levesabor-web/e2e/landing.spec.ts
git commit -m "test(landing): add Playwright config and landing page E2E coverage"
```

---

### Task 8: Documentation updates

**Files:**
- Modify: `docs/plano/tasks.md`
- Modify: `docs/plano/01-functional-plan.md`
- Modify: `docs/plano/05-implementation-roadmap.md`

**Interfaces:** none (docs only).

- [ ] **Step 1: Add the `FE-P` section to `tasks.md`**

Find this line (end of the `FE-L` section, right before `### FE-E — Qualidade frontend`):

```
- [ ] **FE-L04 · T-26/T-27 Encomendas da loja** — Lista (DataTable, filtro por estado) + detalhe com botões de transição de estado válidos. `[deps: FE-B03, B07, FE-L01]` `[ref: 01 F3-LOJ-03]`

### FE-E — Qualidade frontend
```

Replace with:

```
- [ ] **FE-L04 · T-26/T-27 Encomendas da loja** — Lista (DataTable, filtro por estado) + detalhe com botões de transição de estado válidos. `[deps: FE-B03, B07, FE-L01]` `[ref: 01 F3-LOJ-03]`

### FE-P — Landing pública (antecipada do backlog FUT-04, fora da cotação — ver `01-functional-plan.md`)

- [x] **FE-P01 · Landing page pública** — Réplica de `project/Leve Sabor AI.dc.html` (hero com mini-quiz interativo, como funciona, exemplos de pedido, showcase de macros, para quem é, confiança, FAQ, CTA final, footer), com CTAs para `/registo` em vez da waitlist original do design; MSW ligado ao browser (`NEXT_PUBLIC_USE_MOCKS`) para toda a app ficar navegável em preview/deploy. `[deps: FE-A02, FE-B02, FE-B05]` `[ref: 01 FUT-04, docs/superpowers/specs/2026-07-14-landing-page-design.md]`

### FE-E — Qualidade frontend
```

- [ ] **Step 2: Add `FE-P01` to the "Concluído" list at the bottom of `tasks.md`**

Find:

```
- **FE-C07** · T-08 Perfil
```

(the last line of the `## Concluído` list) and add a new line right after it:

```
- **FE-C07** · T-08 Perfil
- **FE-P01** · Landing page pública
```

- [ ] **Step 3: Update `01-functional-plan.md`'s FUT-04 entry**

Find:

```
| **FUT-04** | Landing page pública + lista de espera (implementação do design `project/Leve Sabor AI.dc.html` como página pública do Next.js) | O design existe no repo; a cotação cobre os dois portais, não a landing | Nenhuma técnica; decidir se a waitlist persiste na BD |
```

Replace with:

```
| ~~FUT-04~~ | ~~Landing page pública + lista de espera~~ — **antecipada e implementada como `FE-P01`** (fora da cotação original, em paralelo à Fase 1; ver `tasks.md` e `docs/superpowers/specs/2026-07-14-landing-page-design.md`). Sem waitlist — os CTAs apontam para `/registo`, já que o registo/onboarding reais já existem. | O design existe no repo; a cotação cobre os dois portais, não a landing | — |
```

- [ ] **Step 4: Update `05-implementation-roadmap.md`'s backlog list**

Find:

```
Backlog priorizado para depois da Fase 3: FUT-05 (recuperação de password), FUT-02 (notificações WhatsApp), FUT-04 (landing pública + waitlist), FUT-06 (históricos), FUT-03 (custeio comparativo "onde é mais barato" entre lojas — agora com dados reais de F3-LOJ-01), FUT-01 (entrega ao domicílio + pagamento in-app — automatizar o que hoje, na Fase 3, é combinado diretamente entre cliente e loja). Ver detalhes no fim do `01-functional-plan.md`.
```

Replace with:

```
Backlog priorizado para depois da Fase 3: FUT-05 (recuperação de password), FUT-02 (notificações WhatsApp), FUT-06 (históricos), FUT-03 (custeio comparativo "onde é mais barato" entre lojas — agora com dados reais de F3-LOJ-01), FUT-01 (entrega ao domicílio + pagamento in-app — automatizar o que hoje, na Fase 3, é combinado diretamente entre cliente e loja). FUT-04 (landing pública) foi antecipada para fora da cotação, ver `FE-P01` em `tasks.md`. Ver detalhes no fim do `01-functional-plan.md`.
```

- [ ] **Step 5: Commit**

```bash
git add docs/plano/tasks.md docs/plano/01-functional-plan.md docs/plano/05-implementation-roadmap.md
git commit -m "docs: mark FE-P01 landing page complete, retire FUT-04 from backlog"
```

---

### Task 9: Final verification

**Files:** none (verification only).

- [ ] **Step 1: Full clean build**

Run: `cd levesabor/levesabor-web && rm -rf .next && npm run build`
Expected: build succeeds with no errors or warnings about the new files.

- [ ] **Step 2: Typecheck and lint the whole project**

Run: `npm run typecheck && npm run lint`
Expected: both clean.

- [ ] **Step 3: Full E2E suite**

Run: `npm run test:e2e`
Expected: all tests pass (the 4 from Task 7).

- [ ] **Step 4: Manual smoke test of the whole app with mocks on**

Run: `npm run dev` (with `.env.local` from Task 6 Step 8 still set: `NEXT_PUBLIC_USE_MOCKS=true`).
Visit `/` (landing renders), click "Criar conta" (goes to `/registo`), register a test account, confirm it lands on `/onboarding` or `/plano`. Then visit `/` again in the same browser session — with the note from Task 4 Step 3 in mind, this may or may not redirect depending on whether the session round-tripped through the server module (a pre-existing, accepted limitation, not something to fix here). Stop the dev server (Ctrl+C).

- [ ] **Step 5: Lighthouse note (manual, not automated here)**

Run Chrome DevTools → Lighthouse → Mobile, throttled, against `/` while `npm run dev` (or better, `npm run build && npm run start`) is running. Record the Performance score in the commit message or a follow-up note if it's below ~90 — no code change required by this plan if it's reasonable, this is a checkpoint for awareness per `FE-E02`'s bundle-size goal, not a blocking gate for this feature.

- [ ] **Step 6: Report**

No commit for this task — it's verification only. Summarize the final state to the user: what was built, confirm nothing is committed beyond the 8 commits made in Tasks 1–8 (check with `git log --oneline -10`), and confirm the Vercel setup instructions in `levesabor/levesabor-web/README.md` are ready for the user to act on (they need to create the Vercel project and set env vars themselves — no Vercel credentials were used or available during this plan).

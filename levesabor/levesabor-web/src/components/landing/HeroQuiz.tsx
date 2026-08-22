"use client";
// FE-P03 · HeroQuiz v2 — demo interativa do hero, em dois modos:
// "quiz" (2 perguntas, como na v1) e "freeform" (campo de texto + chips de exemplo, estilo
// DishGen). Ambos passam por um beat de "a compor…" (BrandIllustration "generating") antes do
// resultado, e reagem às DUAS respostas: o prato-base vem da condição de saúde (mais
// determinante clinicamente), o objetivo ajusta kcal/proteína — nunca inventa 16 pratos
// desconexos, ajusta um prato real de forma que faça sentido nutricionalmente.
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { MacroRing, type Macros } from "@/components/macro-ring/MacroRing";
import { BrandIllustration } from "@/components/ui/BrandIllustration";
import { useCountUp } from "./useCountUp";
import styles from "./HeroQuiz.module.css";

type Goal = "perda" | "manter" | "massa" | "condicao";
type Condition = "nenhuma" | "diabetes" | "hipertensao" | "celiaca";

const GOAL_LABELS: Record<Goal, string> = {
  perda: "Emagrecer",
  manter: "Comer melhor no dia a dia",
  massa: "Ganhar massa muscular",
  condicao: "Controlar uma condição de saúde",
};

const GOAL_ORDER: Goal[] = ["perda", "manter", "massa", "condicao"];

const GOAL_INTROS: Record<Goal, string> = {
  perda: "Para emagrecer, a Ottimizo sugere:",
  manter: "Para o teu dia a dia, a Ottimizo sugere:",
  massa: "Para ganhar massa, a Ottimizo sugere:",
  condicao: "Para gerir a tua condição, a Ottimizo sugere:",
};

const CONDITION_OPTIONS: { key: Condition; label: string }[] = [
  { key: "nenhuma", label: "Nenhuma" },
  { key: "diabetes", label: "Diabetes tipo 2" },
  { key: "hipertensao", label: "Hipertensão" },
  { key: "celiaca", label: "Doença celíaca" },
];

type BasePlan = { dish: string; note: string; kcal: number; macros: Macros };

const BASE_PLANS: Record<Condition, BasePlan> = {
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

type GoalAdjustment = { kcalDelta: number; proteinaBoost: number; extraNote: string };

const GOAL_ADJUSTMENTS: Record<Goal, GoalAdjustment> = {
  perda: { kcalDelta: -80, proteinaBoost: 3, extraNote: "Porção ajustada para perder peso sem passar fome." },
  manter: { kcalDelta: 0, proteinaBoost: 0, extraNote: "" },
  massa: { kcalDelta: 140, proteinaBoost: 8, extraNote: "Porção maior e mais proteína para ganhar massa." },
  condicao: { kcalDelta: 0, proteinaBoost: 0, extraNote: "" },
};

type Plan = BasePlan;

function buildPlan(goal: Goal, condition: Condition): Plan {
  const base = BASE_PLANS[condition];
  const adjustment = GOAL_ADJUSTMENTS[goal];
  const proteina = base.macros.proteina + adjustment.proteinaBoost;
  const carbs = Math.max(base.macros.carbs - adjustment.proteinaBoost, 12);
  return {
    dish: base.dish,
    note: adjustment.extraNote ? `${base.note} ${adjustment.extraNote}` : base.note,
    kcal: Math.max(base.kcal + adjustment.kcalDelta, 300),
    macros: { ...base.macros, proteina, carbs },
  };
}

function matchPrompt(text: string): { goal: Goal; condition: Condition } {
  const t = text.toLowerCase();

  let condition: Condition = "nenhuma";
  if (t.includes("diabet")) condition = "diabetes";
  else if (t.includes("hipertens") || t.includes("pressão") || t.includes("sal a menos") || t.includes("sem sal"))
    condition = "hipertensao";
  else if (t.includes("celíac") || t.includes("celiac") || t.includes("glúten") || t.includes("gluten"))
    condition = "celiaca";

  let goal: Goal = "manter";
  if (condition !== "nenhuma") goal = "condicao";
  else if (t.includes("perder") || t.includes("peso") || t.includes("emagre") || t.includes("leve"))
    goal = "perda";
  else if (t.includes("massa") || t.includes("muscul") || t.includes("ganhar")) goal = "massa";

  return { goal, condition };
}

const PROMPT_EXAMPLES = [
  "almoços baratos para a semana",
  "jantar sem açúcar",
  "matapa mais leve",
  "ganhar massa com 3 refeições",
];

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);
  return reduced;
}

function GeneratingBeat() {
  return (
    <div className={styles.generating}>
      <BrandIllustration variant="generating" size={96} />
      <p className={styles.generatingText}>A compor o teu prato…</p>
    </div>
  );
}

function ResultCard({ intro, plan, onReset }: { intro: string; plan: Plan; onReset: () => void }) {
  const kcal = useCountUp(plan.kcal, 700);
  return (
    <div className={styles.riseResult}>
      <p className={styles.subtext}>{intro}</p>
      <div className={styles.resultRow}>
        <MacroRing macros={plan.macros} kcal={plan.kcal} size="md" />
        <div className={styles.resultText}>
          <p className={styles.dish}>{plan.dish}</p>
          <p className={styles.kcalStat}>{kcal} kcal</p>
          <p className={styles.note}>{plan.note}</p>
        </div>
      </div>
      <p className={styles.planTeaser}>No teu plano completo: 7 dias, 21 refeições, lista de compras.</p>
      <div className={styles.resultActions}>
        <button type="button" className={styles.resetButton} onClick={onReset}>
          ↺ Experimentar outra vez
        </button>
        <Link href="/registo" className={styles.ctaButton}>
          Criar a minha conta
        </Link>
      </div>
    </div>
  );
}

type QuizStep = "goal" | "condition" | "generating" | "result";

function QuizFlow() {
  const [step, setStep] = useState<QuizStep>("goal");
  const [goal, setGoal] = useState<Goal | null>(null);
  const [condition, setCondition] = useState<Condition | null>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (step !== "generating") return;
    if (reducedMotion) {
      setStep("result");
      return;
    }
    const timer = setTimeout(() => setStep("result"), 900);
    return () => clearTimeout(timer);
  }, [step, reducedMotion]);

  function selectGoal(next: Goal) {
    setGoal(next);
    setStep("condition");
  }

  function selectCondition(next: Condition) {
    setCondition(next);
    setStep("generating");
  }

  function reset() {
    setStep("goal");
    setGoal(null);
    setCondition(null);
  }

  return (
    <>
      {step === "goal" && (
        <div className={styles.rise}>
          <p className={styles.question}>Qual é o teu objectivo?</p>
          <div className={styles.optionGrid}>
            {GOAL_ORDER.map((key) => (
              <button key={key} type="button" className={styles.option} onClick={() => selectGoal(key)}>
                {GOAL_LABELS[key]}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "condition" && goal && (
        <div className={styles.rise}>
          <p className={styles.subtext}>
            Objectivo: <span className={styles.subtextAccent}>{GOAL_LABELS[goal]}</span>
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

      {step === "generating" && <GeneratingBeat />}

      {step === "result" && goal && condition && (
        <ResultCard intro={GOAL_INTROS[goal]} plan={buildPlan(goal, condition)} onReset={reset} />
      )}
    </>
  );
}

type PromptStep = "idle" | "generating" | "result";

function FreeformFlow() {
  const [draft, setDraft] = useState("");
  const [submittedText, setSubmittedText] = useState("");
  const [step, setStep] = useState<PromptStep>("idle");
  const [match, setMatch] = useState<{ goal: Goal; condition: Condition } | null>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (step !== "generating") return;
    if (reducedMotion) {
      setStep("result");
      return;
    }
    const timer = setTimeout(() => setStep("result"), 900);
    return () => clearTimeout(timer);
  }, [step, reducedMotion]);

  function submit(text: string) {
    if (!text.trim()) return;
    setSubmittedText(text);
    setMatch(matchPrompt(text));
    setStep("generating");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submit(draft);
  }

  function reset() {
    setStep("idle");
    setDraft("");
    setSubmittedText("");
    setMatch(null);
  }

  return (
    <>
      {step === "idle" && (
        <div className={styles.rise}>
          <p className={styles.question}>Escreve o que te apetece comer</p>
          <form className={styles.promptForm} onSubmit={handleSubmit}>
            <input
              type="text"
              className={styles.promptInput}
              placeholder="ex.: um jantar leve sem açúcar"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              aria-label="Escreve o que te apetece comer"
            />
            <button type="submit" className={styles.promptSubmit}>
              Gerar →
            </button>
          </form>
          <div className={styles.chipRow}>
            {PROMPT_EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                className={styles.exampleChip}
                onClick={() => submit(example)}
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "generating" && <GeneratingBeat />}

      {step === "result" && match && (
        <ResultCard
          intro={`Para "${submittedText}", a Ottimizo sugere:`}
          plan={buildPlan(match.goal, match.condition)}
          onReset={reset}
        />
      )}
    </>
  );
}

export function HeroQuiz() {
  const [mode, setMode] = useState<"quiz" | "freeform">("quiz");

  return (
    <div id="demo" className={styles.card}>
      <p className={styles.eyebrow}>Experimenta agora</p>
      <div className={styles.modeSwitch} role="tablist" aria-label="Como queres experimentar">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "quiz"}
          className={[styles.modeTab, mode === "quiz" ? styles.modeTabActive : ""].filter(Boolean).join(" ")}
          onClick={() => setMode("quiz")}
        >
          2 perguntas
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "freeform"}
          className={[styles.modeTab, mode === "freeform" ? styles.modeTabActive : ""].filter(Boolean).join(" ")}
          onClick={() => setMode("freeform")}
        >
          Escreve o teu pedido
        </button>
      </div>
      {mode === "quiz" ? <QuizFlow /> : <FreeformFlow />}
    </div>
  );
}

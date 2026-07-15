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

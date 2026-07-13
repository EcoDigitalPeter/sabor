// FE-B08 · Wizard — contentor genérico multi-passo (progresso + Continuar/Voltar)
//
// API escolhida: CONTROLADA. O índice do passo atual vive no consumidor
// (`currentStepIndex` + `onNext`/`onBack`), não neste componente — este componente
// não guarda estado de navegação próprio. Isto deixa quem usa (ex.: FE-C02, o wizard
// de onboarding) dono das respostas/rascunho e livre para decidir QUANDO avançar
// (ex.: só depois de validar a resposta do passo atual, ou para persistir o rascunho
// localmente antes/depois de mudar de passo). Um `onStepChange` interno foi
// deliberadamente omitido: como o próprio consumidor decide chamar `onNext`/`onBack`,
// já sabe exatamente quando o passo muda — expor mais um callback seria redundante.
//
// Shape dos passos: `steps: WizardStep[]` (array simples, não `children`). Escolhido
// em vez de `React.Children` porque (a) cada passo já precisa de um `id` estável para
// key/analytics/testes, e um array de objetos é o local natural para o transportar;
// (b) evita a consumidor ter de tipar/filtrar `children` com `React.Children.toArray`.
// O Wizard renderiza sempre exactamente `steps[currentStepIndex].content` — nenhum
// outro passo é montado, pelo que cada passo pode assumir montagem/desmontagem no
// próprio ciclo de vida (útil para reset de formulário por passo).
//
// Este componente é apenas apresentação + navegação: não sabe nada sobre perguntas,
// respostas ou onboarding. Não importa `Button` de `./Button` propositadamente —
// estilos de botão próprios, sem dependências cruzadas com outros cartões em curso.
"use client";

import type { ReactNode } from "react";
import styles from "./Wizard.module.css";

export type WizardStep = {
  /** Identificador estável do passo — usado como key de render e útil para analytics/testes. */
  id: string;
  /** Conteúdo do passo (a pergunta/ecrã em si); da responsabilidade do consumidor. */
  content: ReactNode;
};

export type WizardProps = {
  /** Passos, por ordem. Apenas `steps[currentStepIndex]` é renderizado. */
  steps: WizardStep[];
  /** Índice do passo atual (0-based). Controlado pelo consumidor. */
  currentStepIndex: number;
  /** Chamado ao premir o botão de avançar (Continuar / `nextLabel`). */
  onNext: () => void;
  /** Chamado ao premir o botão de recuar (Voltar). Nunca é invocado no passo 0. */
  onBack: () => void;
  /** Desativa o botão de avançar — ex.: pergunta obrigatória ainda por responder. Default: true. */
  canGoNext?: boolean;
  /** Rótulo do botão de avançar; sobrepor no último passo (ex.: "Confirmar"). Default: "Continuar". */
  nextLabel?: string;
  /** Rótulo do botão de recuar. Default: "Voltar". */
  backLabel?: string;
  /** Gera o texto do indicador de progresso. Default: "Passo {n} de {total}". */
  stepLabel?: (current: number, total: number) => string;
  /** Classe extra para o contentor raiz, para integração no layout da página que o usa. */
  className?: string;
};

export function Wizard({
  steps,
  currentStepIndex,
  onNext,
  onBack,
  canGoNext = true,
  nextLabel = "Continuar",
  backLabel = "Voltar",
  stepLabel,
  className,
}: WizardProps) {
  const total = steps.length;
  const maxIndex = Math.max(total - 1, 0);
  const safeIndex = Math.min(Math.max(currentStepIndex, 0), maxIndex);
  const step = steps[safeIndex];
  const isFirstStep = safeIndex === 0;
  const progressPct = total > 1 ? (safeIndex / (total - 1)) * 100 : 100;
  const label = stepLabel ? stepLabel(safeIndex + 1, total) : `Passo ${safeIndex + 1} de ${total}`;

  return (
    <div className={className ? `${styles.wizard} ${className}` : styles.wizard}>
      <div className={styles.progressHeader}>
        <span className={styles.stepLabel}>{label}</span>
        <div
          className={styles.progressTrack}
          role="progressbar"
          aria-valuenow={safeIndex + 1}
          aria-valuemin={1}
          aria-valuemax={total}
        >
          <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      <div className={styles.content} key={step?.id ?? safeIndex}>
        {step?.content}
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.backButton}
          onClick={onBack}
          disabled={isFirstStep}
        >
          {backLabel}
        </button>
        <button
          type="button"
          className={styles.nextButton}
          onClick={onNext}
          disabled={!canGoNext}
        >
          {nextLabel}
        </button>
      </div>
    </div>
  );
}

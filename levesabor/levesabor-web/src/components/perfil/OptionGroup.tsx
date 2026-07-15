// FE-C07 · T-08 Perfil — grupo de opções "1 de N" (objetivo, condição, orçamento, refeições/dia)
// Componente local ao ecrã de Perfil — não reaproveitado do onboarding (isolamento entre cartões
// concorrentes do board), embora a linguagem visual (pílula, 1 seleção) seja intencionalmente parecida.
"use client";

import styles from "./OptionGroup.module.css";

export type OptionGroupOption<T extends string> = {
  value: T;
  label: string;
};

export type OptionGroupProps<T extends string> = {
  /** Usado apenas em aria-label do grupo (ex.: "Objetivo"). */
  name: string;
  options: OptionGroupOption<T>[];
  value: T | undefined;
  onChange: (value: T) => void;
  disabled?: boolean;
};

export function OptionGroup<T extends string>({
  name,
  options,
  value,
  onChange,
  disabled = false,
}: OptionGroupProps<T>) {
  return (
    <div className={styles.group} role="radiogroup" aria-label={name}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            className={[styles.option, selected ? styles.selected : ""].filter(Boolean).join(" ")}
            onClick={() => onChange(option.value)}
            disabled={disabled}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

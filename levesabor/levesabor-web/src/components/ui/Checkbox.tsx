// FE-B01 · Checkbox — caixa custom terracotta ao marcar, label adjacente, foco visível (docs/plano/02-ui-ux-plan.md §1)
import { forwardRef } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import styles from "./Checkbox.module.css";

export interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, className, disabled, ...rest },
  ref
) {
  const wrapperClassNames = [
    styles.wrapper,
    disabled ? styles.disabled : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <label className={wrapperClassNames}>
      <input
        ref={ref}
        type="checkbox"
        disabled={disabled}
        className={styles.input}
        {...rest}
      />
      <span className={styles.box} aria-hidden="true" />
      <span className={styles.label}>{label}</span>
    </label>
  );
});

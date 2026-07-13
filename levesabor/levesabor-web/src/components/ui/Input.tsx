// FE-B01 · Input — radius-input, cream-card-alt, foco terracotta, estado de erro (docs/plano/02-ui-ux-plan.md §1)
import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import styles from "./Input.module.css";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { error = false, className, ...rest },
  ref
) {
  const classNames = [styles.input, error ? styles.error : "", className ?? ""]
    .filter(Boolean)
    .join(" ");

  return (
    <input
      ref={ref}
      className={classNames}
      aria-invalid={error || undefined}
      {...rest}
    />
  );
});

// FE-B01 · Select — mesmo idioma visual do Input (radius-input, cream-card-alt, foco terracotta) (docs/plano/02-ui-ux-plan.md §1)
import { forwardRef } from "react";
import type { SelectHTMLAttributes } from "react";
import styles from "./Select.module.css";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  error?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { options, error = false, className, ...rest },
  ref
) {
  const classNames = [styles.select, error ? styles.error : "", className ?? ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={styles.wrapper}>
      <select
        ref={ref}
        className={classNames}
        aria-invalid={error || undefined}
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className={styles.chevron} aria-hidden="true" />
    </div>
  );
});

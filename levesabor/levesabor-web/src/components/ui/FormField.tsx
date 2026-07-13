// FE-B06 · FormField — wrapper visual para campos de formulário (label + campo + erro inline)
// Usa react-hook-form + zod (implementados por cada ecrã); este componente é puramente
// apresentacional e não sabe nada sobre validação.
//
// Convenção de acessibilidade (o campo é opaco — chega via `children`, ex. um <input>/<select>
// ou um componente irmão `Input`/`Select`/`Checkbox` de outra tarefa paralela — por isso
// FormField NÃO clona/injeta props no filho):
//   1. O autor do campo deve dar ao seu <input>/<select> o mesmo id passado em `htmlFor`
//      (liga o <label for="…"> ao campo).
//   2. FormField gera o id da mensagem de erro como `${htmlFor}-error` (ver `formFieldErrorId`).
//      O autor do campo deve apontar `aria-describedby` do seu input para esse mesmo id
//      quando houver erro (e, se quiser, também para um eventual id de hint).
//   3. Quando `error` estiver presente, o autor do campo deve também marcar
//      `aria-invalid="true"` no seu input.
//
// Exemplo de uso com react-hook-form:
//
//   const { register, formState: { errors } } = useForm<FormValues>();
//   <FormField label="Email" htmlFor="email" required error={fieldError({ error: errors.email })}>
//     <input
//       id="email"
//       aria-invalid={!!errors.email}
//       aria-describedby={errors.email ? formFieldErrorId("email") : undefined}
//       {...register("email")}
//     />
//   </FormField>
//
// Ou com useController/Controller, cujo `fieldState` já tem o formato `{ error?: { message } }`:
//
//   const { field, fieldState } = useController({ name: "email", control });
//   <FormField label="Email" htmlFor="email" error={fieldError(fieldState)}>…</FormField>

import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import styles from "./FormField.module.css";

export type FormFieldProps = {
  /** Texto do <label>. */
  label: string;
  /** Deve corresponder ao `id` do campo passado em `children` (liga label + erro ao campo). */
  htmlFor?: string;
  /** Mensagem de erro em português claro; quando presente, sobrepõe `hint` e assinala o campo. */
  error?: string;
  /** Mostra um indicador visual "*" junto ao label. */
  required?: boolean;
  /** Texto de ajuda mostrado quando não há erro (ex. "mínimo 8 caracteres"). */
  hint?: string;
  /** O próprio campo (input/select/etc.) — renderizado tal como recebido. */
  children: ReactNode;
};

/** id da mensagem de erro gerada para um dado `htmlFor` — usar em `aria-describedby` do campo. */
export function formFieldErrorId(htmlFor: string): string {
  return `${htmlFor}-error`;
}

/**
 * Extrai a mensagem de erro de um `FieldError`-like do react-hook-form para passar a `FormField`.
 * Aceita tanto `fieldState` de `useController`/`Controller` (`{ error?: { message } }`)
 * como `{ error: errors.fieldName }` construído manualmente a partir de `formState.errors`.
 */
export function fieldError(fieldState: { error?: { message?: string } }): string | undefined {
  return fieldState.error?.message;
}

export function FormField({ label, htmlFor, error, required, hint, children }: FormFieldProps) {
  const errorId = htmlFor ? formFieldErrorId(htmlFor) : undefined;
  const fieldClassName = error ? `${styles.field} ${styles.fieldError}` : styles.field;

  return (
    <div className={fieldClassName}>
      <label htmlFor={htmlFor} className={styles.label}>
        <span>{label}</span>
        {required && (
          <>
            <span className={styles.required} aria-hidden="true">
              *
            </span>
            <span className={styles.srOnly}>(obrigatório)</span>
          </>
        )}
      </label>

      <div className={styles.control}>{children}</div>

      {error ? (
        <span id={errorId} className={styles.errorText} role="alert">
          <AlertCircle size={14} className={styles.errorIcon} aria-hidden="true" />
          {error}
        </span>
      ) : hint ? (
        <span className={styles.hint}>{hint}</span>
      ) : null}
    </div>
  );
}

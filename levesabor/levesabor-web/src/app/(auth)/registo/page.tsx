// FE-C01 · T-02 Registo — ver docs/plano/02-ui-ux-plan.md (T-02) e 01-functional-plan.md (F1-VIS-01)
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { z } from "zod";
import { register } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
import { FormField, fieldError, formFieldErrorId } from "@/components/ui/FormField";
import { ErrorState } from "@/components/ui/ErrorState";

// Espelha as regras de F1-VIS-01: nome 2-120, email válido, password >= 8 chars com
// >= 1 letra e >= 1 dígito, confirmação igual, checkbox de disclaimer obrigatória.
const registoSchema = z
  .object({
    name: z
      .string()
      .min(2, "O nome deve ter entre 2 e 120 caracteres.")
      .max(120, "O nome deve ter entre 2 e 120 caracteres."),
    email: z.string().min(1, "Indica o teu email.").email("Indica um email válido."),
    password: z
      .string()
      .min(8, "A password deve ter pelo menos 8 caracteres.")
      .regex(/(?=.*[A-Za-z])(?=.*\d)/, "A password deve ter pelo menos 1 letra e 1 dígito."),
    confirmPassword: z.string().min(1, "Confirma a password."),
    disclaimerAccepted: z.literal(true, {
      errorMap: () => ({
        message: "Tens de aceitar o aviso para continuar.",
      }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As passwords não coincidem.",
    path: ["confirmPassword"],
  });

type RegistoFormValues = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  disclaimerAccepted: boolean;
};

type RegistoFieldErrors = Partial<Record<keyof RegistoFormValues, { message: string }>>;

const GENERIC_ERROR_MESSAGE = "Não foi possível criar a conta. Tenta novamente.";

export default function RegistoPage() {
  const router = useRouter();
  const [values, setValues] = useState<RegistoFormValues>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    disclaimerAccepted: false,
  });
  const [fieldErrors, setFieldErrors] = useState<RegistoFieldErrors>({});
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBannerMessage(null);

    const result = registoSchema.safeParse(values);
    if (!result.success) {
      const nextErrors: RegistoFieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof RegistoFormValues;
        if (!nextErrors[key]) nextErrors[key] = { message: issue.message };
      }
      setFieldErrors(nextErrors);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      await register(
        result.data.name,
        result.data.email,
        result.data.password,
        result.data.confirmPassword,
        result.data.disclaimerAccepted
      );
      // Nova conta de cliente aterra sempre no onboarding (F1-VIS-01).
      router.push("/onboarding");
    } catch (err) {
      if (err instanceof ApiError && err.code === "LSA006_DUPLICATE") {
        // 409 de email duplicado é erro de campo (inline no email), não banner.
        setFieldErrors((prev) => ({ ...prev, email: { message: err.message } }));
      } else {
        setBannerMessage(err instanceof ApiError ? err.message : GENERIC_ERROR_MESSAGE);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "var(--cream)",
      }}
    >
      <div style={{ width: "100%", maxWidth: "420px" }}>
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "1.5rem",
              color: "var(--ink)",
            }}
          >
            Leve Sabor AI
          </span>
        </div>

        <Card>
          <form onSubmit={handleSubmit} noValidate>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.25rem",
                fontWeight: 700,
                margin: "0 0 16px",
                color: "var(--ink)",
              }}
            >
              Criar conta
            </h1>

            {bannerMessage ? (
              <div style={{ marginBottom: "16px" }}>
                <ErrorState message={bannerMessage} />
              </div>
            ) : null}

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <FormField
                label="Nome"
                htmlFor="registo-name"
                required
                error={fieldError({ error: fieldErrors.name })}
              >
                <Input
                  id="registo-name"
                  type="text"
                  autoComplete="name"
                  value={values.name}
                  disabled={submitting}
                  error={!!fieldErrors.name}
                  aria-invalid={!!fieldErrors.name}
                  aria-describedby={fieldErrors.name ? formFieldErrorId("registo-name") : undefined}
                  onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
                />
              </FormField>

              <FormField
                label="Email"
                htmlFor="registo-email"
                required
                error={fieldError({ error: fieldErrors.email })}
              >
                <Input
                  id="registo-email"
                  type="email"
                  autoComplete="email"
                  value={values.email}
                  disabled={submitting}
                  error={!!fieldErrors.email}
                  aria-invalid={!!fieldErrors.email}
                  aria-describedby={fieldErrors.email ? formFieldErrorId("registo-email") : undefined}
                  onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
                />
              </FormField>

              <FormField
                label="Password"
                htmlFor="registo-password"
                required
                hint="Mínimo 8 caracteres, com pelo menos 1 letra e 1 número."
                error={fieldError({ error: fieldErrors.password })}
              >
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <Input
                    id="registo-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={values.password}
                    disabled={submitting}
                    error={!!fieldErrors.password}
                    aria-invalid={!!fieldErrors.password}
                    aria-describedby={
                      fieldErrors.password ? formFieldErrorId("registo-password") : undefined
                    }
                    onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
                    style={{ width: "100%", paddingRight: "40px" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? "Ocultar password" : "Mostrar password"}
                    style={{
                      position: "absolute",
                      right: "10px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "none",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      color: "var(--clay)",
                    }}
                  >
                    {showPassword ? (
                      <EyeOff size={18} aria-hidden="true" />
                    ) : (
                      <Eye size={18} aria-hidden="true" />
                    )}
                  </button>
                </div>
              </FormField>

              <FormField
                label="Confirmar password"
                htmlFor="registo-confirm-password"
                required
                error={fieldError({ error: fieldErrors.confirmPassword })}
              >
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <Input
                    id="registo-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={values.confirmPassword}
                    disabled={submitting}
                    error={!!fieldErrors.confirmPassword}
                    aria-invalid={!!fieldErrors.confirmPassword}
                    aria-describedby={
                      fieldErrors.confirmPassword
                        ? formFieldErrorId("registo-confirm-password")
                        : undefined
                    }
                    onChange={(e) =>
                      setValues((v) => ({ ...v, confirmPassword: e.target.value }))
                    }
                    style={{ width: "100%", paddingRight: "40px" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((s) => !s)}
                    aria-label={showConfirmPassword ? "Ocultar password" : "Mostrar password"}
                    style={{
                      position: "absolute",
                      right: "10px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "none",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      color: "var(--clay)",
                    }}
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={18} aria-hidden="true" />
                    ) : (
                      <Eye size={18} aria-hidden="true" />
                    )}
                  </button>
                </div>
              </FormField>

              <FormField
                label="Aviso médico"
                htmlFor="registo-disclaimer"
                required
                error={fieldError({ error: fieldErrors.disclaimerAccepted })}
              >
                <Checkbox
                  id="registo-disclaimer"
                  checked={values.disclaimerAccepted}
                  disabled={submitting}
                  aria-invalid={!!fieldErrors.disclaimerAccepted}
                  aria-describedby={
                    fieldErrors.disclaimerAccepted
                      ? formFieldErrorId("registo-disclaimer")
                      : undefined
                  }
                  onChange={(e) =>
                    setValues((v) => ({ ...v, disclaimerAccepted: e.target.checked }))
                  }
                  label="Compreendo que a Leve Sabor não substitui o meu médico ou nutricionista"
                />
              </FormField>

              <Button type="submit" loading={submitting} disabled={submitting}>
                Criar conta
              </Button>
            </div>
          </form>
        </Card>

        <p
          style={{
            textAlign: "center",
            marginTop: "20px",
            color: "var(--clay)",
            fontSize: "0.9rem",
          }}
        >
          Já tens conta?{" "}
          <Link href="/login" style={{ color: "var(--terracotta)", fontWeight: 600 }}>
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}

// FE-C01 · T-01 Login — ver docs/plano/02-ui-ux-plan.md (T-01) e 01-functional-plan.md (F1-VIS-02)
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { z } from "zod";
import { login } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FormField, fieldError, formFieldErrorId } from "@/components/ui/FormField";
import { ErrorState } from "@/components/ui/ErrorState";

// Validação client-side espelha F1-VIS-02: email formato válido; password apenas não-vazia
// (a força da password — 8 chars, letra+dígito — é regra de REGISTO, não de login).
const loginSchema = z.object({
  email: z.string().min(1, "Indica o teu email.").email("Indica um email válido."),
  password: z.string().min(1, "Indica a tua password."),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type LoginFieldErrors = Partial<Record<keyof LoginFormValues, { message: string }>>;

const GENERIC_ERROR_MESSAGE = "Não foi possível entrar. Verifica o email e a password.";

export default function LoginPage() {
  const router = useRouter();
  const [values, setValues] = useState<LoginFormValues>({ email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBannerMessage(null);

    const result = loginSchema.safeParse(values);
    if (!result.success) {
      const nextErrors: LoginFieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof LoginFormValues;
        if (!nextErrors[key]) nextErrors[key] = { message: issue.message };
      }
      setFieldErrors(nextErrors);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      const session = await login(result.data.email, result.data.password);
      if (session?.role === "ADMIN") {
        router.push("/admin");
      } else {
        router.push("/inicio");
      }
    } catch (err) {
      // Mensagem nunca distingue "email não existe" de "password errada" (F1-VIS-02) —
      // apenas LSA003_ACCOUNT_SUSPENDED tem texto próprio; qualquer outro erro (credenciais
      // inválidas, rede) mostra a mesma mensagem genérica.
      if (err instanceof ApiError && err.code === "LSA003_ACCOUNT_SUSPENDED") {
        setBannerMessage(err.message);
      } else {
        setBannerMessage(GENERIC_ERROR_MESSAGE);
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
              Entrar
            </h1>

            {bannerMessage ? (
              <div style={{ marginBottom: "16px" }}>
                <ErrorState message={bannerMessage} />
              </div>
            ) : null}

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <FormField
                label="Email"
                htmlFor="login-email"
                required
                error={fieldError({ error: fieldErrors.email })}
              >
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={values.email}
                  disabled={submitting}
                  error={!!fieldErrors.email}
                  aria-invalid={!!fieldErrors.email}
                  aria-describedby={fieldErrors.email ? formFieldErrorId("login-email") : undefined}
                  onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
                />
              </FormField>

              <FormField
                label="Password"
                htmlFor="login-password"
                required
                error={fieldError({ error: fieldErrors.password })}
              >
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={values.password}
                    disabled={submitting}
                    error={!!fieldErrors.password}
                    aria-invalid={!!fieldErrors.password}
                    aria-describedby={
                      fieldErrors.password ? formFieldErrorId("login-password") : undefined
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

              <Button type="submit" loading={submitting} disabled={submitting}>
                Entrar
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
          Ainda não tens conta?{" "}
          <Link href="/registo" style={{ color: "var(--terracotta)", fontWeight: 600 }}>
            Criar conta
          </Link>
        </p>
      </div>
    </main>
  );
}

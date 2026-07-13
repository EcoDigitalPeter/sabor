// FE-A03/FE-A04 · Sessão e guards — roles CLIENTE | ADMIN (docs/plano/03-backend-plan.md §4)
import { api, ApiError, setAccessToken } from "./api";
import type { components } from "@/types/api";

export type Role = "CLIENTE" | "ADMIN";
export type Session = { userId: number; role: Role; name: string } | null;

type AuthResult = components["schemas"]["AuthResult"];

// Sessão: apenas em memória, tal como o access token (nunca localStorage/sessionStorage).
let session: Session = null;

export function getSession(): Session {
  return session;
}

export function setSession(next: Session): void {
  session = next;
}

export function clearSession(): void {
  session = null;
}

function applyAuthResult(result: AuthResult): Session {
  setAccessToken(result.accessToken ?? null);
  const user = result.user;
  if (!user || user.id === undefined || user.role === undefined || user.name === undefined) {
    throw new ApiError("Resposta de autenticação incompleta.");
  }
  const next: Session = { userId: user.id, role: user.role, name: user.name };
  setSession(next);
  return next;
}

export async function login(email: string, password: string): Promise<Session> {
  const result = await api<AuthResult>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return applyAuthResult(result);
}

export async function register(
  name: string,
  email: string,
  password: string,
  confirmPassword: string,
  disclaimerAccepted: boolean,
): Promise<Session> {
  const result = await api<AuthResult>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password, confirmPassword, disclaimerAccepted }),
  });
  return applyAuthResult(result);
}

export async function logout(): Promise<void> {
  try {
    await api("/auth/logout", { method: "POST" });
  } catch {
    // best-effort — a sessão local é sempre limpa mesmo que o pedido ao servidor falhe.
  }
  setAccessToken(null);
  clearSession();
  // Navegação após logout é responsabilidade de quem chama (componente de UI).
}

export function hasRole(role: Role): boolean {
  return session?.role === role;
}

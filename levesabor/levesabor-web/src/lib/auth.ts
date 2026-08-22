// INT-01 · Sessão e guards — roles CLIENTE | ADMIN | LOJISTA. Reescrito para
// falar directamente com o Supabase Auth via supabase-js (decisão BE-B01,
// 2026-08-15) — o backend só expõe POST /auth/register (bootstrap
// idempotente do AppUser local a partir de um JWT Supabase já válido), sem
// login/refresh/logout próprios (esses existiam só do lado do mock/contrato
// antigo, nunca no backend real).
//
// NEXT_PUBLIC_USE_MOCKS=true mantém o caminho antigo (/auth/login etc. via
// MSW) — não há Supabase real nesse modo, e os handlers de mock continuam a
// existir para dev frontend-only sem backend nenhum.
import { api, ApiError, setAccessToken } from "./api";
import { getSupabase } from "./supabase";
import type { components } from "@/types/api";

export type Role = "CLIENTE" | "ADMIN" | "LOJISTA";
// storeId só vem preenchido quando role === "LOJISTA" (FE-L01).
export type Session = { userId: number; role: Role; name: string; storeId?: number | null } | null;

type AuthResult = components["schemas"]["AuthResult"];

// Forma de POST /auth/register no backend real (com.ottimizo.users.AppUserResponse)
// — hand-editado como FE-S01/FE-T01 (ainda não regenerado de /v3/api-docs, ver
// INT-01 workstream 4).
type AppUserResponse = {
  id: number;
  authUserId: string;
  name: string;
  email: string;
  role: Role;
  status: "ACTIVE" | "SUSPENDED";
  storeId?: number | null;
};

function isMockMode(): boolean {
  return process.env.NEXT_PUBLIC_USE_MOCKS === "true";
}

// Sessão: apenas em memória (nunca localStorage/sessionStorage) — em modo real,
// quem persiste entre reloads é o próprio SDK Supabase (a sessão dele, não esta).
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
  const next: Session = { userId: user.id, role: user.role, name: user.name, storeId: user.storeId };
  setSession(next);
  return next;
}

/**
 * Hidrata a sessão da aplicação a partir de uma sessão Supabase já válida:
 * chama o bootstrap idempotente do backend (`POST /auth/register`) para
 * resolver `sub` (auth.uid()) → `AppUser` local (id/role/name/storeId).
 * Seguro chamar em todo sign-in (login, registo, refresh, restauro num
 * reload) — não só no primeiro registo.
 */
async function bootstrapSession(name?: string): Promise<Session> {
  const user = await api<AppUserResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(name ? { name } : {}),
  });
  const next: Session = { userId: user.id, role: user.role, name: user.name, storeId: user.storeId };
  setSession(next);
  return next;
}

export async function login(email: string, password: string): Promise<Session> {
  if (isMockMode()) {
    const result = await api<AuthResult>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    return applyAuthResult(result);
  }
  const { error } = await getSupabase().auth.signInWithPassword({ email, password });
  if (error) {
    throw new ApiError(error.message);
  }
  return bootstrapSession();
}

export async function register(
  name: string,
  email: string,
  password: string,
  confirmPassword: string,
): Promise<Session> {
  if (isMockMode()) {
    const result = await api<AuthResult>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password, confirmPassword }),
    });
    return applyAuthResult(result);
  }
  const { error } = await getSupabase().auth.signUp({ email, password, options: { data: { name } } });
  if (error) {
    throw new ApiError(error.message);
  }
  return bootstrapSession(name);
}

export async function logout(): Promise<void> {
  if (isMockMode()) {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {
      // best-effort — a sessão local é sempre limpa mesmo que o pedido ao servidor falhe.
    }
  } else {
    await getSupabase().auth.signOut();
  }
  setAccessToken(null);
  clearSession();
  // Navegação após logout é responsabilidade de quem chama (componente de UI).
}

export function hasRole(role: Role): boolean {
  return session?.role === role;
}

/**
 * Regista o listener que mantém a sessão da aplicação sincronizada com o
 * SDK Supabase — hidrata em `SIGNED_IN`/`INITIAL_SESSION` (inclui o restauro
 * automático num reload/nova aba, a partir da sessão persistida pelo SDK) e
 * limpa em `SIGNED_OUT`. Chamar uma única vez, perto do topo da árvore (ver
 * `src/app/providers.tsx`); nunca em modo mocks (não há Supabase real).
 */
export function initAuthListener(): () => void {
  const { data } = getSupabase().auth.onAuthStateChange((_event, authSession) => {
    setAccessToken(authSession?.access_token ?? null);
    if (authSession) {
      bootstrapSession().catch(() => {
        // Token Supabase válido mas bootstrap falhou (backend em baixo, etc.) — não força
        // logout aqui; o próximo pedido autenticado que falhar trata disso via redirectToLogin.
      });
    } else {
      clearSession();
    }
  });
  return () => data.subscription.unsubscribe();
}

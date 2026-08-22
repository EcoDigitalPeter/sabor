// FE-A03 · Cliente HTTP — injeta Bearer, refresh automático em 401, desembrulha ApiResponse<T>
// Contrato: docs/plano/03-backend-plan.md §3 e §8 (OpenAPI = fonte de verdade, cartão MOCK-01)
import { QueryClient } from "@tanstack/react-query";

export type ApiResponse<T> = {
  status: "success" | "error";
  code?: string;    // LSAxxx em erro
  message?: string; // mensagem pt-PT pronta a mostrar
  data: T;
};

const BASE_URL =
  process.env.NEXT_PUBLIC_USE_MOCKS === "true"
    ? "/api/v1"
    : (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1");

// Access token: apenas em memória, nunca em localStorage/sessionStorage (docs/plano/03-backend-plan.md §4).
// auth.ts lê/escreve através de getAccessToken/setAccessToken — nunca guarda a sua própria cópia.
let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export class ApiError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

// Singleton para FE-A04 envolver em <QueryClientProvider> no layout raiz — não criar outra instância.
export const queryClient = new QueryClient();

async function doFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (init?.body && typeof init.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  // credentials: "include" — a API corre noutra origem (porta) do frontend em dev; necessário
  // para o cookie httpOnly de refresh ser recebido/enviado. Chamadas individuais podem substituir.
  return fetch(`${BASE_URL}${path}`, {
    credentials: "include",
    ...init,
    headers,
  });
}

async function refreshAccessToken(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return false;
    const body = (await res.json()) as ApiResponse<{ accessToken?: string }>;
    if (body.status === "error" || !body.data?.accessToken) return false;
    setAccessToken(body.data.accessToken);
    return true;
  } catch {
    return false;
  }
}

function redirectToLogin(): void {
  setAccessToken(null);
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

async function request<T>(path: string, init: RequestInit | undefined, isRetry: boolean): Promise<T> {
  const res = await doFetch(path, init);

  if (res.status === 401 && !isRetry) {
    // Em modo real (Supabase) nao ha /auth/refresh no backend — o SDK Supabase ja renova o
    // token proactivamente (autoRefreshToken), por isso um 401 aqui significa mesmo sessao
    // invalida/expirada: vai direito para o login, sem tentar a dança de refresh do mock.
    if (process.env.NEXT_PUBLIC_USE_MOCKS === "true") {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return request<T>(path, init, true);
      }
    }
    redirectToLogin();
    throw new ApiError("Sessão expirada. Inicie sessão novamente.");
  }

  const body = (await res.json()) as ApiResponse<T>;
  if (body.status === "error") {
    throw new ApiError(body.message ?? "Ocorreu um erro inesperado.", body.code);
  }
  return body.data;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  return request<T>(path, init, false);
}

// FE-L03 · para endpoints que devolvem o ficheiro em bruto (não o envelope ApiResponse<T>) —
// hoje só /loja/products/export e /loja/products/import-template (mock: blob text/csv).
export async function apiBlob(path: string): Promise<Blob> {
  const res = await doFetch(path);
  if (!res.ok) throw new ApiError("Não foi possível descarregar o ficheiro.");
  return res.blob();
}

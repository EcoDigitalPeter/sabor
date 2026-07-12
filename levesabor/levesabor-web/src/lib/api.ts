// FE-A03 · Cliente HTTP — injeta Bearer, refresh automático em 401, desembrulha ApiResponse<T>
// Contrato: docs/plano/03-backend-plan.md §3 e §8 (OpenAPI = fonte de verdade, cartão MOCK-01)

export type ApiResponse<T> = {
  status: "success" | "error";
  code?: string;    // LSAxxx em erro
  message?: string; // mensagem pt-PT pronta a mostrar
  data: T;
};

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  // TODO FE-A03:
  //  1. anexar Authorization: Bearer <access token em memória>
  //  2. em 401 → POST /auth/refresh (cookie httpOnly) e repetir 1x; se falhar → logout + redirect /login
  //  3. desembrulhar ApiResponse: status==="error" → throw ApiError(code, message)
  const res = await fetch(`${BASE_URL}${path}`, init);
  const body = (await res.json()) as ApiResponse<T>;
  if (body.status === "error") throw new Error(body.message);
  return body.data;
}

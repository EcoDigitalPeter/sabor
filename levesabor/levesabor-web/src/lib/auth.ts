// FE-A03/FE-A04 · Sessão e guards — roles CLIENTE | ADMIN (docs/plano/03-backend-plan.md §4)
export type Role = "CLIENTE" | "ADMIN";
export type Session = { userId: number; role: Role; name: string } | null;

// TODO FE-A03: access token só em memória; refresh em cookie httpOnly gerido pelo backend.
// TODO FE-A04: guards de layout — sem sessão → /login; role errado → portal próprio.
export function getSession(): Session {
  return null;
}

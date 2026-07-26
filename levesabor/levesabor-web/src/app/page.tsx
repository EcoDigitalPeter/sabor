// FE-A04/FE-P01 · Raiz: landing pública sem sessão; redireciona por sessão/role — CLIENTE → /inicio; ADMIN → /admin
// Nota: getSession() (lib/auth.ts) é apenas em memória — sem hidratação de cookie/sessão no
// servidor ainda (FE-A03). Como Server Component, esta guarda nunca vê uma sessão real vinda do
// browser, pelo que um utilizador autenticado a aceder a "/" diretamente pode ver a landing por
// breve momento antes de qualquer redirect; é uma limitação aceite do MVP (mesma nota das guardas
// de (cliente)/admin), não um bug a corrigir aqui.
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LandingPage } from "@/components/landing/LandingPage";

export default function Home() {
  const session = getSession();
  if (!session) return <LandingPage />;
  if (session.role === "CLIENTE") redirect("/inicio");
  redirect("/admin");
}

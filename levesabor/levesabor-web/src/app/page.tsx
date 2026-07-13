// FE-A04 · Raiz: redireciona por sessão/role — sem sessão → /login; CLIENTE → /plano; ADMIN → /admin
// Nota: getSession() (lib/auth.ts) é apenas em memória — sem hidratação de cookie/sessão no
// servidor ainda (FE-A03). Como Server Component, esta guarda nunca vê uma sessão real vinda do
// browser, pelo que um utilizador autenticado a aceder a "/" diretamente cairá em /login; é uma
// limitação aceite do MVP (mesma nota das guardas de (cliente)/admin), não um bug a corrigir aqui.
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default function Home() {
  const session = getSession();
  if (!session) redirect("/login");
  if (session.role === "CLIENTE") redirect("/plano");
  redirect("/admin");
}

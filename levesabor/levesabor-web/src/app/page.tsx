// FE-A04 · Raiz: redireciona por sessão/role — sem sessão → /login; CLIENTE → /plano; ADMIN → /admin
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/login"); // TODO FE-A03: decidir destino com base na sessão (lib/auth.ts)
}

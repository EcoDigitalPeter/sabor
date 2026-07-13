// FE-A04 · Layout do portal cliente — bottom-nav Plano/Compras/Perfil + guarda de role CLIENTE
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/auth";
import { BottomNav } from "@/components/plan/BottomNav";

// Guarda de sessão implementada como Client Component (em vez de verificação no Server
// Component): lib/auth.ts's getSession() só reflete o estado em memória definido por login()
// no browser — ainda não existe hidratação de sessão a partir de um cookie/token no servidor
// (FE-A03). Uma guarda em Server Component veria sempre "sem sessão" e redirecionaria mesmo
// utilizadores autenticados, portanto esta guarda corre no cliente (useEffect) para refletir
// a sessão real durante testes manuais/navegação client-side. TODO futuro: mover para guarda
// server-side quando existir leitura de sessão persistida (ex.: cookie httpOnly).
export default function ClienteLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const session = getSession();
  const isAuthorized = !!session && session.role === "CLIENTE";

  useEffect(() => {
    if (!isAuthorized) {
      router.replace("/login");
    }
  }, [isAuthorized, router]);

  if (!isAuthorized) {
    return null;
  }

  return (
    <div style={{ minHeight: "100dvh", paddingBottom: "80px" }}>
      {children}
      <BottomNav />
    </div>
  );
}

// FE-A04/FE-L01 · Layout do portal da loja — guarda de role LOJISTA + chrome de navegação
// (sidebar + topbar, LojaShell) à volta de {children}. Mesmo padrão de src/app/admin/layout.tsx.
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LojaShell } from "@/components/loja/LojaShell";

// Mesma limitação/decisão da guarda de (cliente)/layout.tsx e admin/layout.tsx: Client Component +
// useEffect porque getSession() só reflete sessão em memória do browser (sem hidratação
// server-side ainda).
export default function LojaLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const session = getSession();
  const isAuthorized = !!session && session.role === "LOJISTA";

  useEffect(() => {
    if (!isAuthorized) {
      router.replace("/login");
    }
  }, [isAuthorized, router]);

  if (!isAuthorized) {
    return null;
  }

  return <LojaShell>{children}</LojaShell>;
}

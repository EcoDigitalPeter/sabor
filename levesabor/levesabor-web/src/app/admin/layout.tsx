// FE-A04 · Layout do portal admin — guarda de role ADMIN (sidebar/topbar são Fase 2 / FE-D, fora de âmbito aqui)
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/auth";

// Mesma limitação/decisão da guarda de (cliente)/layout.tsx: Client Component + useEffect
// porque getSession() só reflete sessão em memória do browser (sem hidratação server-side
// ainda). Ver comentário completo em src/app/(cliente)/layout.tsx.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const session = getSession();
  const isAuthorized = !!session && session.role === "ADMIN";

  useEffect(() => {
    if (!isAuthorized) {
      router.replace("/login");
    }
  }, [isAuthorized, router]);

  if (!isAuthorized) {
    return null;
  }

  // Sem Sidebar/Topbar aqui de propósito — layout de navegação admin é a Fase 2 (FE-D).
  return <>{children}</>;
}

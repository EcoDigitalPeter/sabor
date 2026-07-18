// FE-D01 · AdminTopbar — nome do admin autenticado + logout. session.name vem de getSession()
// (src/lib/auth.ts); logout() é best-effort e não navega — quem chama decide (mesmo padrão do
// botão "Terminar sessão" em src/app/(cliente)/perfil/page.tsx).
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { getSession, logout } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import styles from "./AdminTopbar.module.css";

export function AdminTopbar() {
  const router = useRouter();
  const session = getSession();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      router.replace("/login");
    }
  }

  return (
    <header className={styles.topbar}>
      <span className={styles.name}>{session?.name ?? "Admin"}</span>
      <Button variant="secondary" size="sm" onClick={handleLogout} loading={loggingOut} disabled={loggingOut}>
        <LogOut size={16} aria-hidden="true" style={{ verticalAlign: "-3px", marginRight: 6 }} />
        Terminar sessão
      </Button>
    </header>
  );
}

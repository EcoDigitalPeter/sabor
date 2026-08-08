// FE-L01 · LojaTopbar — nome da loja autenticada + logout. Mesmo padrão de
// src/components/admin/AdminTopbar.tsx.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { getSession, logout } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import styles from "./LojaTopbar.module.css";

export function LojaTopbar() {
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
      <span className={styles.name}>{session?.name ?? "Loja"}</span>
      <Button variant="secondary" size="sm" onClick={handleLogout} loading={loggingOut} disabled={loggingOut}>
        <LogOut size={16} aria-hidden="true" style={{ verticalAlign: "-3px", marginRight: 6 }} />
        Terminar sessão
      </Button>
    </header>
  );
}

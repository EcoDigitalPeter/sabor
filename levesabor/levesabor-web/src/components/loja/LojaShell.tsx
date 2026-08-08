// FE-L01 · LojaShell — chrome de navegação do Portal da Loja (sidebar + topbar), montado à volta
// de {children} em src/app/loja/layout.tsx. Mesmo padrão de src/components/admin/AdminShell.tsx.
"use client";

import type { ReactNode } from "react";
import { LojaSidebar } from "./LojaSidebar";
import { LojaTopbar } from "./LojaTopbar";
import styles from "./LojaShell.module.css";

export function LojaShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <LojaSidebar />
      <div className={styles.contentColumn}>
        <LojaTopbar />
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}

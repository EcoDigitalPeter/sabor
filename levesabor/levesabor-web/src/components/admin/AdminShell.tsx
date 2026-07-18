// FE-D01 · AdminShell — chrome de navegação do portal admin (sidebar esquerda + topbar),
// montado à volta de {children} em src/app/admin/layout.tsx. Sidebar e Topbar são componentes
// separados (AdminSidebar/AdminTopbar) para as tarefas seguintes poderem reutilizá-los
// isoladamente se precisarem, mas normalmente basta compor a página dentro de <AdminShell>.
"use client";

import type { ReactNode } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopbar } from "./AdminTopbar";
import styles from "./AdminShell.module.css";

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <AdminSidebar />
      <div className={styles.contentColumn}>
        <AdminTopbar />
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}

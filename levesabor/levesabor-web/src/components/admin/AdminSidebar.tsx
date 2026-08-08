// FE-D01 · AdminSidebar — navegação esquerda do portal admin (Dashboard/Utilizadores/Lojas/
// Receitas/Ingredientes). Mesmo padrão de active-route de src/components/plan/BottomNav.tsx
// (usePathname + next/link), mas como lista vertical fixa em vez de bottom bar.
//
// ADMIN_NAV_ITEMS é exportado de propósito: as tarefas seguintes (FE-D02 Utilizadores, FE-D03
// Lojas, FE-D06 Receitas, FE-D07 Ingredientes) já têm aqui a rota para o seu ecrã — não devem
// precisar de tocar neste ficheiro, só confirmar que o link ativo para a sua rota já funciona.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Carrot, ChefHat, LayoutDashboard, Store, Users, type LucideIcon } from "lucide-react";
import styles from "./AdminSidebar.module.css";

export type AdminNavItem = {
  href: "/admin" | "/admin/utilizadores" | "/admin/lojas" | "/admin/receitas" | "/admin/ingredientes";
  label: string;
  Icon: LucideIcon;
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: "/admin", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/admin/utilizadores", label: "Utilizadores", Icon: Users },
  { href: "/admin/lojas", label: "Lojas", Icon: Store },
  { href: "/admin/receitas", label: "Receitas", Icon: ChefHat },
  { href: "/admin/ingredientes", label: "Ingredientes", Icon: Carrot },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <nav aria-label="Navegação admin" className={styles.sidebar}>
      <div className={styles.brand}>Ottimizo</div>

      <ul className={styles.list}>
        {ADMIN_NAV_ITEMS.map(({ href, label, Icon }) => {
          // "/admin" só ativa em correspondência exata — senão ficaria sempre ativo, já que
          // todas as rotas admin começam por "/admin". As restantes ativam também em sub-rotas
          // (ex.: /admin/utilizadores/42 mantém "Utilizadores" ativo).
          const active =
            href === "/admin" ? pathname === href : pathname === href || (pathname?.startsWith(`${href}/`) ?? false);

          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={[styles.link, active ? styles.active : ""].filter(Boolean).join(" ")}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 2} aria-hidden="true" />
                <span className={styles.label}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

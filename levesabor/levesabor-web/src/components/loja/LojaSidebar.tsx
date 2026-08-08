// FE-L01 · LojaSidebar — navegação esquerda do Portal da Loja (Produtos/Encomendas). Mesmo
// padrão de src/components/admin/AdminSidebar.tsx (usePathname + next/link, active-route).
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Package, type LucideIcon } from "lucide-react";
import styles from "./LojaSidebar.module.css";

export type LojaNavItem = {
  href: "/loja/produtos" | "/loja/encomendas";
  label: string;
  Icon: LucideIcon;
};

export const LOJA_NAV_ITEMS: LojaNavItem[] = [
  { href: "/loja/produtos", label: "Produtos", Icon: Package },
  { href: "/loja/encomendas", label: "Encomendas", Icon: ClipboardList },
];

export function LojaSidebar() {
  const pathname = usePathname();

  return (
    <nav aria-label="Navegação da loja" className={styles.sidebar}>
      <div className={styles.brand}>Ottimizo</div>

      <ul className={styles.list}>
        {LOJA_NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = pathname === href || (pathname?.startsWith(`${href}/`) ?? false);

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

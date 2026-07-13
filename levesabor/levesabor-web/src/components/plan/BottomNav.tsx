// FE-A04 · Navegação inferior do portal cliente — Plano / Compras / Perfil
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ShoppingCart, User, type LucideIcon } from "lucide-react";

type NavItem = {
  href: "/plano" | "/compras" | "/perfil";
  label: string;
  Icon: LucideIcon;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/plano", label: "Plano", Icon: CalendarDays },
  { href: "/compras", label: "Compras", Icon: ShoppingCart },
  { href: "/perfil", label: "Perfil", Icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        height: "64px",
        paddingBottom: "env(safe-area-inset-bottom)",
        background: "var(--cream-card)",
        borderTop: `1px solid var(--tan)`,
        zIndex: 10,
      }}
    >
      {NAV_ITEMS.map(({ href, label, Icon }) => {
        const active = pathname === href || (pathname?.startsWith(`${href}/`) ?? false);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
              fontFamily: "var(--font-body)",
              fontSize: "12px",
              textDecoration: "none",
              color: active ? "var(--terracotta)" : "var(--clay-soft)",
            }}
          >
            <Icon size={22} strokeWidth={active ? 2.5 : 2} aria-hidden="true" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

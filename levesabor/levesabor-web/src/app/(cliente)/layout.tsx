// FE-A04 · Layout do portal cliente — bottom-nav Plano/Compras/Perfil + guarda de role CLIENTE
export default function ClienteLayout({ children }: { children: React.ReactNode }) {
  // TODO FE-A04: guard de sessão (lib/auth.ts) + <BottomNav />
  return <div>{children}</div>;
}

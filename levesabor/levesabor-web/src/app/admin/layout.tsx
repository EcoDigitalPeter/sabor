// FE-A04 · Layout do portal admin — sidebar + topbar + guarda de role ADMIN (excluído do service worker)
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // TODO FE-A04: guard ADMIN (lib/auth.ts) + <Sidebar /> (Dashboard/Utilizadores/Lojas/Produtos/Receitas/Ingredientes)
  return <div>{children}</div>;
}

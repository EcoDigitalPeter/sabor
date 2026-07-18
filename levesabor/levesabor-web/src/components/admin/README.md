# components/admin — componentes do portal admin (FE-A04, FE-D01, FE-B07, FE-B09)

- `AdminSidebar.tsx` / `AdminTopbar.tsx` / `AdminShell.tsx` (FE-D01) — chrome de navegação do
  admin: sidebar esquerda (Dashboard/Utilizadores/Lojas/Receitas/Ingredientes, active-state via
  `usePathname`) + topbar (nome do admin + logout). `AdminShell` compõe os dois e é montado em
  `src/app/admin/layout.tsx` à volta de `{children}`. `AdminSidebar` exporta `ADMIN_NAV_ITEMS` —
  as tarefas seguintes (FE-D02/D03/D06/D07) não devem precisar de o editar, só confirmar que o
  link da sua rota fica ativo.
- `DataTable.tsx`, `KpiCard.tsx`, `LineChart.tsx` — apesar do nome deste diretório, estes três
  vivem em `src/components/ui/` (convenção real do codebase: componentes genéricos/reutilizáveis
  ficam em `ui/`, não em `admin/`). `DataTable` (FE-B07) é a tabela paginada server-side base de
  T-10..T-19; `KpiCard` + `LineChart` (FE-B09) alimentam o dashboard de métricas (T-09).
- `ExcelDropzone.tsx` / `ImportPreviewTable.tsx` — import Excel (FE-D05), ainda por construir.

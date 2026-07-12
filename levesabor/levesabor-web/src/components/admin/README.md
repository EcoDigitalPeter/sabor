# components/admin — componentes do portal admin (FE-B07, FE-B09)

- `DataTable.tsx` (FE-B07) — tabela paginada **server-side** reutilizável: pesquisa, filtros, ordenação e paginação por URL (`?page=&size=&sort=&q=`), estados loading/empty. Base de TODAS as listas admin (T-10..T-19).
- `KpiCard.tsx` + `LineChart.tsx` (FE-B09) — dashboard de métricas (T-09); gráfico leve (SVG próprio; evitar libs pesadas — orçamento de JS).
- `Sidebar.tsx` / `Topbar.tsx` — layout admin (FE-A04).
- `ExcelDropzone.tsx` / `ImportPreviewTable.tsx` — import Excel (FE-D05).

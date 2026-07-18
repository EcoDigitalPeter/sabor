# hooks — TanStack Query sobre lib/api.ts

- `useActivePlan.ts` (FE-C03) · `useShoppingList.ts` (FE-C06) · `usePlanGeneration.ts` (FE-C04, polling 2–3s)
- `useProfile.ts` (FE-C02/C07) · `useFeedback.ts` + `useSwap.ts` (FE-C05, otimistas com rollback)
- `useOnlineStatus.ts` (FE-C08, sem TanStack Query — espelha `navigator.onLine` via eventos `online`/`offline`)
- Admin: `useAdminTable.ts` (genérico p/ DataTable, FE-B07) · `useImportJob.ts` (FE-D05) · `useMetrics.ts` (FE-D01)

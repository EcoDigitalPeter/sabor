# e2e — Playwright (FE-E01)

Correm no CI **contra os mocks MSW** (sem backend); em INT-01/INT-03 correm contra o backend real.

Fluxos a cobrir (checklist de entrega do `docs/plano/05-implementation-roadmap.md §4`):
- `cliente.spec.ts` — registo → onboarding → gerar plano → dashboard → receita → feedback/troca → lista de compras
- `admin.spec.ts` — login admin → CRUD loja → CRUD produto → import Excel (validar → confirmar) → métricas
- `auth.spec.ts` — guards por role, refresh de sessão, conta suspensa

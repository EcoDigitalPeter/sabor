// FE-C06 · T-06 Lista de compras — grupos por categoria (ícones P-06), checkboxes otimistas (F1-CLI-06)
"use client";

import Link from "next/link";
import { ApiError } from "@/lib/api";
import {
  useShoppingList,
  useShoppingSync,
  useToggleShoppingItem,
  type ShoppingListItem,
} from "@/hooks/useShoppingList";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { ShoppingGroup } from "@/components/plan/ShoppingGroup";
import type { ShoppingCategory } from "@/components/ui/CategoryIcon";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { BrandIllustration } from "@/components/ui/BrandIllustration";
import { OfflineBanner } from "@/components/ui/OfflineBanner";

const PAGE_MAX_WIDTH = 640;

// Ordem fixa das categorias na lista (docs/plano/02-ui-ux-plan.md §3 T-06)
const CATEGORY_ORDER: ShoppingCategory[] = [
  "CEREAIS_E_FARINHAS",
  "PROTEINA",
  "VEGETAIS_E_FOLHAS",
  "LEGUMINOSAS",
  "TEMPEROS_E_OLEOS",
  "OUTROS",
];

const primaryPillLinkStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "12px 28px",
  borderRadius: "var(--radius-pill)",
  background: "var(--terracotta)",
  color: "#FFFFFF",
  fontFamily: "var(--font-body)",
  fontWeight: 600,
  fontSize: "1rem",
  textDecoration: "none",
} as const;

// FE-C08 · badge "por sincronizar" / "syncing" (T-06) — mesma linguagem visual do StatusBadge
// (pílula, texto a branco), mas usado inline aqui por a página não ter CSS module próprio.
const syncBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "4px 12px",
  borderRadius: "var(--radius-pill)",
  fontFamily: "var(--font-body)",
  fontWeight: 600,
  fontSize: "0.78rem",
  color: "#FFFFFF",
  whiteSpace: "nowrap",
} as const;

function groupByCategory(items: ShoppingListItem[]): Partial<Record<ShoppingCategory, ShoppingListItem[]>> {
  const groups: Partial<Record<ShoppingCategory, ShoppingListItem[]>> = {};
  for (const item of items) {
    const category: ShoppingCategory = item.category ?? "OUTROS";
    const bucket = groups[category] ?? [];
    bucket.push(item);
    groups[category] = bucket;
  }
  return groups;
}

export default function ComprasPage() {
  const isOnline = useOnlineStatus();
  const { data, isLoading, isError, error, refetch } = useShoppingList();
  const toggleMutation = useToggleShoppingItem();
  const { pendingCount, isSyncing } = useShoppingSync();

  function handleToggle(id: number, checked: boolean) {
    toggleMutation.mutate({ id, checked });
  }

  if (isLoading) {
    return (
      <main style={{ maxWidth: PAGE_MAX_WIDTH, margin: "0 auto", padding: "24px 20px 40px" }}>
        <Skeleton variant="text" width="55%" height="20px" style={{ marginBottom: 10 }} />
        <Skeleton variant="text" width="35%" height="16px" style={{ marginBottom: 28 }} />
        {[0, 1, 2].map((i) => (
          <Skeleton
            key={i}
            variant="rect"
            height="132px"
            borderRadius="var(--radius-card)"
            style={{ marginBottom: 16 }}
          />
        ))}
      </main>
    );
  }

  if (isError) {
    if (error instanceof ApiError && error.code === "LSA005_NOT_FOUND") {
      return (
        <main style={{ maxWidth: PAGE_MAX_WIDTH, margin: "0 auto", padding: "24px 20px 40px" }}>
          <EmptyState
            illustration={<BrandIllustration variant="empty-shopping" />}
            title="Ainda sem lista de compras"
            description="Gera o teu plano da semana para veres aqui o rancho todo, já organizado por categoria."
            action={
              <Link href="/plano" style={primaryPillLinkStyle}>
                Ir para o meu plano
              </Link>
            }
          />
        </main>
      );
    }

    return (
      <main style={{ maxWidth: PAGE_MAX_WIDTH, margin: "0 auto", padding: "24px 20px 40px" }}>
        <ErrorState
          message={error instanceof ApiError ? error.message : "Não foi possível carregar a lista de compras."}
          onRetry={() => refetch()}
        />
      </main>
    );
  }

  if (!data) {
    return null;
  }

  const totalItems = data.totalItems ?? data.items?.length ?? 0;
  const checkedItems = data.checkedItems ?? 0;
  const groups = groupByCategory(data.items ?? []);
  const hasAnyItem = (data.items?.length ?? 0) > 0;

  return (
    <main style={{ maxWidth: PAGE_MAX_WIDTH, margin: "0 auto", padding: "24px 20px 40px" }}>
      {!isOnline ? (
        <div style={{ marginBottom: 16 }}>
          <OfflineBanner message="Estás offline — a mostrar a última lista guardada." />
        </div>
      ) : null}
      <h1
        style={{
          margin: "0 0 6px",
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontSize: "clamp(1.4rem, 1.15rem + 1vw, 1.75rem)",
          color: "var(--ink)",
        }}
      >
        Lista de compras
      </h1>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <p style={{ margin: 0, color: "var(--clay)", fontSize: "0.95rem" }}>
            {checkedItems} de {totalItems} comprados
          </p>
          {/* FE-C08 · T-06 estados "offline (badge 'por sincronizar')" e "syncing" — toggles feitos
              offline ficam na fila local (lib/offline.ts) e sincronizam ao voltar a rede. */}
          {isSyncing ? (
            <span style={{ ...syncBadgeStyle, background: "var(--clay-soft)" }}>A sincronizar…</span>
          ) : pendingCount > 0 ? (
            <span style={{ ...syncBadgeStyle, background: "var(--amber)" }}>
              {pendingCount} por sincronizar
            </span>
          ) : null}
        </div>
        <p style={{ margin: 0, fontFamily: "var(--font-mono)", fontSize: "0.95rem", color: "var(--ink)" }}>
          {data.estimatedCostMt != null ? `${data.estimatedCostMt} MT` : "—"}
          {data.costIsPartial ? (
            <span style={{ fontFamily: "var(--font-body)", color: "var(--clay-soft)", fontSize: "0.8rem" }}>
              {" "}
              — estimativa parcial
            </span>
          ) : null}
        </p>
      </div>

      {!hasAnyItem ? (
        <EmptyState
          illustration={<BrandIllustration variant="empty-shopping" />}
          title="Ainda sem lista de compras"
          description="Gera o teu plano da semana para veres aqui o rancho todo, já organizado por categoria."
          action={
            <Link href="/plano" style={primaryPillLinkStyle}>
              Ir para o meu plano
            </Link>
          }
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {CATEGORY_ORDER.filter((category) => (groups[category]?.length ?? 0) > 0).map((category) => (
            <ShoppingGroup
              key={category}
              category={category}
              items={groups[category] ?? []}
              onToggleItem={handleToggle}
            />
          ))}
        </div>
      )}
    </main>
  );
}

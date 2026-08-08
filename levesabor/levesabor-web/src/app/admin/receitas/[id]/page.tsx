// FE-D06 · T-18 Formulário de receita (edição) — publish com checklist de bloqueios LSA023 (F2-ADM-05)
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, X } from "lucide-react";
import { ApiError } from "@/lib/api";
import {
  useAdminRecipe,
  useDeleteRecipe,
  useRecentSwapReasons,
  useSetRecipeStatus,
} from "@/hooks/useAdminRecipes";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { RecipeForm } from "../RecipeForm";
import styles from "./page.module.css";

// Mesmos 4 critérios já aplicados server-side em src/mocks/fixtures.ts setAdminRecipeStatus —
// aqui só refletidos como checklist em vez de um único erro de toast.
function checklistFor(recipe: { ingredients?: unknown[]; steps?: unknown[]; kcal?: number; healthTags?: string[] }) {
  return [
    { label: "Pelo menos 1 ingrediente", done: (recipe.ingredients?.length ?? 0) >= 1 },
    { label: "Pelo menos 2 passos", done: (recipe.steps?.length ?? 0) >= 2 },
    { label: "Kcal definido", done: Boolean(recipe.kcal) },
    { label: "Pelo menos 1 tag de saúde", done: (recipe.healthTags?.length ?? 0) >= 1 },
  ];
}

export default function ReceitaDetalhePage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const router = useRouter();
  const { showToast } = useToast();

  const { data: recipe, isLoading, isError, refetch } = useAdminRecipe(id);
  const setStatus = useSetRecipeStatus();
  const deleteRecipe = useDeleteRecipe();
  const swapReasons = useRecentSwapReasons(id);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  function handleTogglePublish() {
    if (!recipe?.id || !recipe.status) return;
    const nextStatus = recipe.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    setStatus.mutate(
      { id: recipe.id, status: nextStatus },
      {
        onSuccess: () => {
          showToast(nextStatus === "PUBLISHED" ? "Receita publicada." : "Receita voltou a rascunho.");
        },
        onError: (error) => {
          showToast(
            error instanceof ApiError ? error.message : "Não foi possível mudar o estado da receita.",
            "error",
          );
        },
      },
    );
  }

  function handleDelete() {
    deleteRecipe.mutate(id, {
      onSuccess: () => {
        showToast("Receita eliminada.");
        router.push("/admin/receitas");
      },
      onError: (error) => {
        showToast(error instanceof ApiError ? error.message : "Não foi possível eliminar a receita.", "error");
        setDeleteDialogOpen(false);
      },
    });
  }

  if (isLoading) {
    return (
      <div className={styles.page}>
        <Skeleton variant="text" width="40%" height={28} />
        <Skeleton variant="rect" height={300} />
      </div>
    );
  }

  if (isError || !recipe) {
    return (
      <div className={styles.page}>
        <Link href="/admin/receitas" className={styles.backLink}>
          <ArrowLeft size={16} aria-hidden="true" />
          Voltar às receitas
        </Link>
        <ErrorState message="Não foi possível carregar esta receita." onRetry={() => refetch()} />
      </div>
    );
  }

  const checklist = checklistFor(recipe);
  const canPublish = checklist.every((item) => item.done);

  return (
    <div className={styles.page}>
      <Link href="/admin/receitas" className={styles.backLink}>
        <ArrowLeft size={16} aria-hidden="true" />
        Voltar às receitas
      </Link>

      <header className={styles.header}>
        <h1 className={styles.title}>{recipe.name}</h1>
        {recipe.status ? <StatusBadge status={recipe.status} /> : null}
      </header>

      <RecipeForm mode="edit" recipe={recipe} onSaved={() => refetch()} />

      <Card className={styles.section}>
        <h2 className={styles.sectionTitle}>Publicação</h2>
        <ul className={styles.checklist}>
          {checklist.map((item) => (
            <li key={item.label} className={styles.checklistItem}>
              {item.done ? (
                <Check size={16} className={styles.checkIcon} aria-hidden="true" />
              ) : (
                <X size={16} className={styles.crossIcon} aria-hidden="true" />
              )}
              {item.label}
            </li>
          ))}
        </ul>
        <Button
          type="button"
          variant={recipe.status === "PUBLISHED" ? "secondary" : "primary"}
          disabled={recipe.status !== "PUBLISHED" && !canPublish}
          loading={setStatus.isPending}
          onClick={handleTogglePublish}
        >
          {recipe.status === "PUBLISHED" ? "Voltar a rascunho" : "Publicar"}
        </Button>
      </Card>

      <Card className={styles.section}>
        <h2 className={styles.sectionTitle}>Feedback</h2>
        <p className={styles.feedbackLine}>
          👍 {recipe.likeCount ?? 0} · 👎 {recipe.dislikeCount ?? 0}
        </p>

        <h3 className={styles.sectionTitle}>Motivos de troca recentes</h3>
        {swapReasons.isLoading ? (
          <Skeleton variant="text" width="60%" />
        ) : swapReasons.data && swapReasons.data.length > 0 ? (
          <ul className={styles.swapList}>
            {swapReasons.data.map((entry, index) => (
              // eslint-disable-next-line react/no-array-index-key -- lista só de leitura, sem reordenação
              <li key={index} className={styles.swapItem}>
                “{entry.reason}”
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.emptyHint}>Sem trocas recentes.</p>
        )}
      </Card>

      <Card className={styles.section}>
        <h2 className={styles.sectionTitle}>Eliminar receita</h2>
        <Button type="button" variant="secondary" onClick={() => setDeleteDialogOpen(true)}>
          Eliminar receita
        </Button>
      </Card>

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Eliminar receita"
        message={`Tens a certeza que queres eliminar "${recipe.name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    </div>
  );
}

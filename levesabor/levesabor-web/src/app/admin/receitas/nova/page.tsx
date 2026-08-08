// FE-D06 · T-18 Formulário de receita (criação) — F2-ADM-05
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { RecipeForm } from "../RecipeForm";
import styles from "./page.module.css";

export default function NovaReceitaPage() {
  const router = useRouter();

  return (
    <div className={styles.page}>
      <Link href="/admin/receitas" className={styles.backLink}>
        <ArrowLeft size={16} aria-hidden="true" />
        Voltar às receitas
      </Link>

      <h1 className={styles.title}>Nova receita</h1>

      <RecipeForm mode="create" onSaved={(recipe) => router.push(`/admin/receitas/${recipe.id}`)} />
    </div>
  );
}

// FE-W05 · RecipeGridCard — cartão de receita da grelha do catálogo (T-28, F1-CLI-08).
// Mesmo padrão visual do cartão de prato da landing (DishGallery): foto 16:9 (ou fallback em
// ícone) + nome + chips de kcal/tempo — não o layout em linha do MealCard (esse é feito para
// listas verticais compactas do plano, não para uma grelha).
"use client";

import Image from "next/image";
import { UtensilsCrossed } from "lucide-react";
import { Chip } from "@/components/ui/Chip";
import { resolveRecipePhoto } from "@/data/recipe-photos";
import type { Recipe } from "@/hooks/useRecipeCatalog";
import styles from "./RecipeGridCard.module.css";

export type RecipeGridCardProps = {
  recipe: Recipe;
  onClick: () => void;
};

export function RecipeGridCard({ recipe, onClick }: RecipeGridCardProps) {
  const photoSrc = resolveRecipePhoto(recipe.imageUrl, recipe.id);
  const name = recipe.name ?? "Receita";

  return (
    <button type="button" className={styles.card} onClick={onClick}>
      <div className={styles.photoWrap}>
        {photoSrc ? (
          <Image
            src={photoSrc}
            alt=""
            fill
            sizes="(max-width: 640px) 50vw, 240px"
            className={styles.photo}
          />
        ) : (
          <div className={styles.fallback} aria-hidden="true">
            <UtensilsCrossed size={26} strokeWidth={1.5} />
          </div>
        )}
      </div>
      <div className={styles.info}>
        <p className={styles.name}>{name}</p>
        <div className={styles.chips}>
          <Chip variant="tan">{`${recipe.kcal ?? 0} kcal`}</Chip>
          <Chip variant="cream">{`${recipe.prepMinutes ?? 0} min`}</Chip>
        </div>
      </div>
    </button>
  );
}

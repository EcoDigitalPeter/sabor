// FE-C03/FE-Q10 · MealCard — layout único compacto: miniatura + texto + MacroRing sm (T-04, F1-CLI-03).
// Com foto (getRecipePhoto) a miniatura mostra a foto; sem foto cai num placeholder simples —
// nunca bloqueado por imagens em falta. Ver docs/superpowers/specs/2026-07-19-mealcard-compacto-stitch-design.md.
"use client";

import Link from "next/link";
import Image from "next/image";
import { Clock } from "lucide-react";
import { MacroRing } from "@/components/macro-ring/MacroRing";
import { getRecipePhoto } from "@/data/recipe-photos";
import type { components } from "@/types/api";
import styles from "./MealCard.module.css";

type MealPlanEntry = components["schemas"]["MealPlanEntry"];
type MealSlot = NonNullable<MealPlanEntry["mealSlot"]>;

const SLOT_LABEL: Record<MealSlot, string> = {
  PEQUENO_ALMOCO: "Pequeno-almoço",
  ALMOCO: "Almoço",
  JANTAR: "Jantar",
  LANCHE: "Lanche",
};

export type MealCardProps = {
  entry: MealPlanEntry;
  /** Caminho para /plano/refeicao/{entryId} — quando fornecido, o cartão navega como <Link>. */
  href?: string;
  /** Alternativa a `href` para navegação via handler (ex.: useRouter().push). Ignorado se `href` for passado. */
  onClick?: () => void;
  className?: string;
};

export function MealCard({ entry, href, onClick, className }: MealCardProps) {
  const recipe = entry.recipe;
  const kcal = recipe?.kcal ?? 0;
  const prepMinutes = recipe?.prepMinutes ?? 0;
  const macros = {
    proteina: recipe?.macros?.proteina ?? 0,
    carbs: recipe?.macros?.carbs ?? 0,
    gordura: recipe?.macros?.gordura ?? 0,
    fibra: recipe?.macros?.fibra ?? 0,
  };
  const slotLabel = entry.mealSlot ? SLOT_LABEL[entry.mealSlot] : undefined;
  const photoSrc = getRecipePhoto(recipe?.recipeId);

  const content = (
    <>
      <div className={styles.thumb}>
        {photoSrc ? (
          <Image src={photoSrc} alt="" fill sizes="84px" className={styles.thumbImage} />
        ) : null}
      </div>
      <div className={styles.info}>
        {slotLabel ? <span className={styles.slot}>{slotLabel}</span> : null}
        <h3 className={styles.name}>{recipe?.name ?? "Refeição"}</h3>
        <span className={styles.meta}>
          <Clock size={14} aria-hidden="true" />
          {`${prepMinutes} min`}
        </span>
      </div>
      <MacroRing macros={macros} kcal={kcal} size="sm" />
    </>
  );

  const classes = [styles.card, className].filter(Boolean).join(" ");

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={classes} onClick={onClick}>
      {content}
    </button>
  );
}

// FE-C03/FE-Q10 · MealCard — layout único compacto: miniatura + texto + MacroRing sm (T-04, F1-CLI-03).
// Com foto (getRecipePhoto) a miniatura mostra a foto; sem foto cai num placeholder simples —
// nunca bloqueado por imagens em falta. Ver docs/superpowers/specs/2026-07-19-mealcard-compacto-stitch-design.md.
"use client";

import Link from "next/link";
import Image from "next/image";
import { Check, Clock } from "lucide-react";
import { MacroRing } from "@/components/macro-ring/MacroRing";
import { getRecipePhoto } from "@/data/recipe-photos";
import type { components } from "@/types/api";
import styles from "./MealCard.module.css";

// FE-Y05 (ago/2026) · kcal/gramas de proteína "à vista" no cartão, a pedido do cliente ("o
// utilizador não precisa de abrir a receita"). `RecipeSnapshot.macros.proteina` é uma percentagem
// das kcal totais (não gramas) — não há campo de gramas no backend, por isso convertemos aqui pela
// aproximação nutricional padrão de 4 kcal por grama de proteína.
const KCAL_PER_GRAM_PROTEIN = 4;

function estimateProteinGrams(kcal: number, proteinPercent: number): number {
  return Math.round((kcal * (proteinPercent / 100)) / KCAL_PER_GRAM_PROTEIN);
}

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
  /**
   * Handler do toggle "Comi isto" (T-04) — quando omitido, o cartão não mostra a affordance.
   * Não interfere com o feedback 👍/👎, que vive só no detalhe da receita.
   */
  onToggleCompleted?: (next: boolean) => void;
  /** FE-Y05 · destaca visualmente o cartão como a refeição "actual" (ver lib/planStats.ts currentMealSlot). */
  current?: boolean;
  className?: string;
};

export function MealCard({ entry, href, onClick, onToggleCompleted, current, className }: MealCardProps) {
  const recipe = entry.recipe;
  const completed = entry.completed ?? false;
  const kcal = recipe?.kcal ?? 0;
  const prepMinutes = recipe?.prepMinutes ?? 0;
  const macros = {
    proteina: recipe?.macros?.proteina ?? 0,
    carbs: recipe?.macros?.carbs ?? 0,
    gordura: recipe?.macros?.gordura ?? 0,
    fibra: recipe?.macros?.fibra ?? 0,
  };
  const proteinGrams = estimateProteinGrams(kcal, macros.proteina);
  const slotLabel = entry.mealSlot ? SLOT_LABEL[entry.mealSlot] : undefined;
  const photoSrc = getRecipePhoto(recipe?.name);

  const content = (
    <>
      <div className={styles.thumb}>
        {photoSrc ? (
          <Image src={photoSrc} alt="" fill sizes="84px" className={styles.thumbImage} />
        ) : null}
        {onToggleCompleted ? (
          // `span role="button"` em vez de `<button>` real: quando `href` está definido, este
          // cartão inteiro é um `<Link>` (renderiza `<a>`) — aninhar um `<button>` dentro de um
          // `<a>` é HTML inválido e causava navegação intermitente (o browser corrige a árvore de
          // forma imprevisível, ora intercetando o clique, ora deixando passar). `span` dentro de
          // `<a>` é válido; a semântica de botão fica via role/tabIndex/aria-pressed + handlers.
          <span
            role="button"
            tabIndex={0}
            aria-pressed={completed}
            aria-label={completed ? 'Desmarcar "Comi isto"' : 'Marcar "Comi isto"'}
            className={[styles.completeButton, completed ? styles.completeButtonActive : ""]
              .filter(Boolean)
              .join(" ")}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onToggleCompleted(!completed);
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              event.stopPropagation();
              onToggleCompleted(!completed);
            }}
          >
            <Check size={14} aria-hidden="true" />
          </span>
        ) : null}
      </div>
      <div className={styles.info}>
        {slotLabel ? <span className={styles.slot}>{slotLabel}</span> : null}
        <h3 className={styles.name}>{recipe?.name ?? "Refeição"}</h3>
        {/* FE-Y05 · etiqueta separada (ex.: "Pequeno-almoço reforçado", "🌙 Jantar leve") em vez
            de descrição entre parênteses no nome. */}
        {recipe?.mealTag ? <span className={styles.tag}>{recipe.mealTag}</span> : null}
        {/* FE-Y05 · kcal + proteína "à vista" — o utilizador não precisa de abrir a receita. */}
        <span className={styles.meta}>
          {`${kcal} kcal • ${proteinGrams} g proteína • `}
          <Clock size={12} aria-hidden="true" className={styles.metaIcon} />
          {`${prepMinutes} min`}
        </span>
      </div>
      <MacroRing macros={macros} kcal={kcal} size="sm" />
    </>
  );

  const classes = [styles.card, current ? styles.cardCurrent : "", className].filter(Boolean).join(" ");

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

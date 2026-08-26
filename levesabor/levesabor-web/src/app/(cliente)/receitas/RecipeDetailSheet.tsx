// FE-W05 · RecipeDetailSheet — detalhe de receita em bottom-sheet, modo só-leitura (T-28, F1-CLI-08)
// Decisão de engenharia: a rota /plano/refeicao/[entryId] existente é indexada por entryId (uma
// entrada real do plano do cliente) e não por recipeId — não serve receitas fora desse contexto
// sem reestruturar essa rota. Em vez disso, reaproveitam-se aqui os MESMOS componentes visuais já
// usados nesse detalhe (RecipeHero, RecipeStatCard, MacroRing lg, lista de ingredientes/passos),
// mostrados inline num BottomSheet — mais simples do que criar uma rota irmã /receitas/[recipeId]
// só para replicar o mesmo layout, e evita duplicar o padrão de fetch por id. Sem 👍/👎 nem
// "Trocar este prato": esta receita não pertence a nenhuma entrada de plano.
"use client";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { MacroRing } from "@/components/macro-ring/MacroRing";
import { RecipeHero } from "@/components/plan/RecipeHero";
import { RecipeStatCard } from "@/components/plan/RecipeStatCard";
import { resolveRecipePhoto } from "@/data/recipe-photos";
import type { Recipe } from "@/hooks/useRecipeCatalog";
import styles from "./RecipeDetailSheet.module.css";

export type RecipeDetailSheetProps = {
  recipe: Recipe | null;
  onClose: () => void;
};

export function RecipeDetailSheet({ recipe, onClose }: RecipeDetailSheetProps) {
  const costLabel = recipe?.estimatedCostMt != null ? `${recipe.estimatedCostMt} MT` : "—";
  const photoSrc = resolveRecipePhoto(recipe?.imageUrl, recipe?.id);

  return (
    <BottomSheet open={recipe !== null} onClose={onClose}>
      {recipe ? (
        <div className={styles.content}>
          <RecipeHero photoSrc={photoSrc} alt={recipe.name ?? "Receita"} />

          <h2 className={styles.title}>{recipe.name ?? "Receita"}</h2>
          {recipe.description ? <p className={styles.description}>{recipe.description}</p> : null}

          <div className={styles.statsRow}>
            <RecipeStatCard label="Tempo de preparação" value={`${recipe.prepMinutes ?? 0} min`} tone="amber" />
            <RecipeStatCard label="Custo estimado" value={costLabel} tone="forest" />
          </div>

          <div className={styles.ringRow}>
            <MacroRing
              size="lg"
              kcal={recipe.kcal ?? 0}
              macros={{
                proteina: recipe.macros?.proteina ?? 0,
                carbs: recipe.macros?.carbs ?? 0,
                gordura: recipe.macros?.gordura ?? 0,
                fibra: recipe.macros?.fibra ?? 0,
              }}
            />
          </div>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Ingredientes</h3>
            <ul className={styles.ingredientList}>
              {(recipe.ingredients ?? []).map((line, index) => (
                <li key={index} className={styles.ingredientItem}>
                  <span className={styles.ingredientQty}>
                    {line.quantity} {line.unit}
                  </span>
                  <span>{line.name}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.sectionSteps}>
            <h3 className={styles.sectionTitle}>Modo de preparação</h3>
            <ol className={styles.stepList}>
              {(recipe.steps ?? []).map((step, index) => (
                <li key={index} className={styles.stepItem}>
                  <span className={styles.stepNumber}>{String(step.order ?? index + 1).padStart(2, "0")}</span>
                  <p className={styles.stepText}>{step.text}</p>
                </li>
              ))}
            </ol>
          </section>

          <p className={styles.disclaimer}>Esta receita não substitui aconselhamento médico ou nutricional.</p>
        </div>
      ) : null}
    </BottomSheet>
  );
}

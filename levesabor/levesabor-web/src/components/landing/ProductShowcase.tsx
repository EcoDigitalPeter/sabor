"use client";
// FE-P05 · ProductShowcase — "Vê o que vais receber": 3 blocos alternados com os componentes
// REAIS do portal (MealCard, DayTabs, MacroRing, ShoppingGroup) dentro de uma moldura CSS,
// preenchidos com fixtures tipadas (showcase-fixtures.ts). Nunca fica desatualizado e não
// depende de nenhuma imagem — ao contrário de um screenshot estático.
import { useState } from "react";
import { MealCard } from "@/components/plan/MealCard";
import { DayTabs } from "@/components/plan/DayTabs";
import { ShoppingGroup } from "@/components/plan/ShoppingGroup";
import { MacroRing } from "@/components/macro-ring/MacroRing";
import { Chip } from "@/components/ui/Chip";
import { Reveal } from "./Reveal";
import {
  SHOWCASE_DAYS,
  SHOWCASE_SELECTED_DAY_INDEX,
  SHOWCASE_MEAL_ENTRIES,
  SHOWCASE_RECIPE,
  SHOWCASE_SHOPPING_ITEMS,
} from "./showcase-fixtures";
import styles from "./ProductShowcase.module.css";

function PlanFrame() {
  const [selectedIndex, setSelectedIndex] = useState(SHOWCASE_SELECTED_DAY_INDEX);
  return (
    <div className={styles.frame}>
      <DayTabs days={SHOWCASE_DAYS} selectedIndex={selectedIndex} onSelect={setSelectedIndex} />
      <div className={styles.mealList}>
        {SHOWCASE_MEAL_ENTRIES.map((entry) => (
          <MealCard key={entry.id} entry={entry} className={styles.mealCard} />
        ))}
      </div>
    </div>
  );
}

function RecipeFrame() {
  return (
    <div className={styles.frame}>
      <div className={styles.recipeHead}>
        <MacroRing macros={SHOWCASE_RECIPE.macros} kcal={SHOWCASE_RECIPE.kcal} size="lg" />
      </div>
      <p className={styles.recipeName}>{SHOWCASE_RECIPE.name}</p>
      <div className={styles.recipeChips}>
        {SHOWCASE_RECIPE.ingredients.map((ingredient) => (
          <Chip key={ingredient} variant="tan">
            {ingredient}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function ShoppingFrame() {
  const [items, setItems] = useState(SHOWCASE_SHOPPING_ITEMS);

  function toggle(id: number, checked: boolean) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, checked } : item)));
  }

  const byCategory = items.reduce<Record<string, typeof items>>((acc, item) => {
    const key = item.category ?? "OUTROS";
    (acc[key] ??= []).push(item);
    return acc;
  }, {});

  return (
    <div className={styles.frame}>
      {Object.entries(byCategory).map(([category, groupItems]) => (
        <ShoppingGroup
          key={category}
          category={category as NonNullable<(typeof items)[number]["category"]>}
          items={groupItems}
          onToggleItem={toggle}
          onChangeHaveQuantity={() => {}}
        />
      ))}
    </div>
  );
}

const BLOCKS = [
  {
    title: "O teu plano da semana, dia a dia.",
    body: "Sete dias, refeição a refeição, com kcal e macros sempre à vista — sem abrir uma folha de cálculo.",
    Frame: PlanFrame,
  },
  {
    title: "Cada receita com macros claros e passos simples.",
    body: "Ingredientes comuns, passos diretos, e o teu perfil de saúde sempre em conta.",
    Frame: RecipeFrame,
  },
  {
    title: "A lista de compras faz-se sozinha.",
    body: "Organizada por categoria, com o que já tens marcado — e pronta para levar à loja.",
    Frame: ShoppingFrame,
  },
] as const;

export function ProductShowcase() {
  return (
    <div className={styles.stack}>
      {BLOCKS.map(({ title, body, Frame }, index) => (
        <Reveal key={title} delay={index * 80}>
          <div className={[styles.row, index % 2 === 1 ? styles.rowReverse : ""].filter(Boolean).join(" ")}>
            <div className={styles.text}>
              <p className={styles.title}>{title}</p>
              <p className={styles.body}>{body}</p>
            </div>
            <div className={styles.frameWrap}>
              <Frame />
            </div>
          </div>
        </Reveal>
      ))}
      <p className={styles.honestNote}>Imagens do produto real, em desenvolvimento.</p>
    </div>
  );
}

// FE-P05 · showcase-fixtures — dados fictícios, tipados contra src/types/api.d.ts, usados SÓ
// na landing (ProductShowcase) para renderizar os componentes REAIS do portal sem backend.
import type { components } from "@/types/api";
import type { DayTabItem } from "@/components/plan/DayTabs";

type MealPlanEntry = components["schemas"]["MealPlanEntry"];
type ShoppingListItem = components["schemas"]["ShoppingListItem"];

export const SHOWCASE_DAYS: DayTabItem[] = [
  { date: "2026-07-13", weekday: "segunda-feira" },
  { date: "2026-07-14", weekday: "terça-feira" },
  { date: "2026-07-15", weekday: "quarta-feira" },
  { date: "2026-07-16", weekday: "quinta-feira" },
  { date: "2026-07-17", weekday: "sexta-feira" },
];

export const SHOWCASE_SELECTED_DAY_INDEX = 2;

export const SHOWCASE_MEAL_ENTRIES: MealPlanEntry[] = [
  {
    id: 1,
    mealSlot: "PEQUENO_ALMOCO",
    feedback: "NONE",
    recipe: {
      recipeId: 101,
      name: "Papas de milho com amendoim",
      kcal: 320,
      prepMinutes: 15,
      macros: { proteina: 10, carbs: 58, gordura: 12, fibra: 6 },
    },
  },
  {
    id: 2,
    mealSlot: "ALMOCO",
    feedback: "LIKE",
    recipe: {
      recipeId: 102,
      name: "Matapa de amendoim com xima",
      kcal: 610,
      prepMinutes: 40,
      macros: { proteina: 22, carbs: 48, gordura: 26, fibra: 11 },
    },
  },
  {
    id: 3,
    mealSlot: "JANTAR",
    feedback: "NONE",
    recipe: {
      recipeId: 103,
      name: "Caril de peixe com arroz integral",
      kcal: 560,
      prepMinutes: 35,
      macros: { proteina: 32, carbs: 44, gordura: 18, fibra: 7 },
    },
  },
];

export const SHOWCASE_RECIPE = {
  name: "Matapa de amendoim com xima",
  kcal: 610,
  macros: { proteina: 22, carbs: 48, gordura: 26, fibra: 11 },
  ingredients: ["Folhas de mandioca", "Amendoim torrado", "Leite de coco", "Alho", "Xima de milho"],
};

export const SHOWCASE_SHOPPING_ITEMS: ShoppingListItem[] = [
  {
    id: 1,
    ingredientName: "Folhas de mandioca",
    category: "VEGETAIS_E_FOLHAS",
    quantity: 2,
    unit: "molhos",
    checked: true,
  },
  {
    id: 2,
    ingredientName: "Amendoim torrado",
    category: "LEGUMINOSAS",
    quantity: 500,
    unit: "g",
    checked: true,
  },
  {
    id: 3,
    ingredientName: "Farinha de milho",
    category: "CEREAIS_E_FARINHAS",
    quantity: 1,
    unit: "kg",
    checked: false,
  },
  {
    id: 4,
    ingredientName: "Peixe fresco",
    category: "PROTEINA",
    quantity: 1,
    unit: "kg",
    checked: false,
  },
  {
    id: 5,
    ingredientName: "Óleo de palma",
    category: "TEMPEROS_E_OLEOS",
    quantity: 1,
    unit: "garrafa",
    checked: false,
  },
];

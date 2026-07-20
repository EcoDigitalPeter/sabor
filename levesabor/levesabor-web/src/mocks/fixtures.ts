// MOCK-02 · Fixtures — dados e "serviço" em memória usados por handlers.ts (MSW)
// Fonte de verdade: levesabor-api/openapi.yaml + docs/plano/01-functional-plan.md (F1-CLI-01..06)
// Todo o estado aqui é mutável a propósito (let/arrays) e vive apenas durante a sessão do mock
// (recarregar a app/worker reinicia tudo). Isto é suficiente para o frontend iterar sem backend real.
import type { components } from "@/types/api";

type ErrorCode = components["schemas"]["ErrorCode"];
type Profile = components["schemas"]["Profile"];
type Goal = components["schemas"]["Goal"];
type Macros = components["schemas"]["Macros"];
type RecipeSnapshot = components["schemas"]["RecipeSnapshot"];
type MealPlanEntry = components["schemas"]["MealPlanEntry"];
type MealPlanDay = components["schemas"]["MealPlanDay"];
type MealPlan = components["schemas"]["MealPlan"];
type ShoppingList = components["schemas"]["ShoppingList"];
type ShoppingListItem = components["schemas"]["ShoppingListItem"];
type AuthResult = components["schemas"]["AuthResult"];
type User = components["schemas"]["User"];
type Store = components["schemas"]["Store"];
type Product = components["schemas"]["Product"];
type Ingredient = components["schemas"]["Ingredient"];
type Recipe = components["schemas"]["Recipe"];
type MetricsSummary = components["schemas"]["MetricsSummary"];
type MealSlot = NonNullable<MealPlanEntry["mealSlot"]>;
type AdHocRecipeRequest = components["schemas"]["AdHocRecipeRequest"];
type AdHocRecipeHandle = components["schemas"]["AdHocRecipeHandle"];

// Resultado uniforme para as funções de "serviço" abaixo — handlers.ts traduz para HttpResponse.
export type MockResult<T> =
  | { ok: true; data: T; status?: number }
  | { ok: false; code: ErrorCode; message: string; status: number };

const okResult = <T,>(data: T, status?: number): MockResult<T> => ({ ok: true, data, status });
const errResult = (code: ErrorCode, message: string, status: number): MockResult<never> => ({
  ok: false,
  code,
  message,
  status,
});

// ─────────────────────────────────────────────────────────────────────────
// Catálogo de receitas (pratos moçambicanos reais) — 5 pequenos-almoços,
// 7 almoços, 6 jantares. IDs: 1-5 pequeno-almoço · 6-12 almoço · 13-18 jantar.
// Macros (proteína/carbs/gordura/fibra) somam sempre 100.
// ─────────────────────────────────────────────────────────────────────────
export const RECIPE_CATALOG: Record<number, RecipeSnapshot> = {
  1: {
    recipeId: 1,
    name: "Papinha de amendoim com banana",
    kcal: 320,
    prepMinutes: 10,
    estimatedCostMt: 45,
    macros: { proteina: 12, carbs: 58, gordura: 24, fibra: 6 },
    healthTags: ["vegetariana", "sem_gluten", "acucar_controlado"],
    healthNote: null,
    ingredients: [
      { ingredientId: 1, name: "Amendoim moído", quantity: 40, unit: "g" },
      { ingredientId: 2, name: "Banana", quantity: 1, unit: "unidade" },
      { ingredientId: 3, name: "Água", quantity: 200, unit: "ml" },
    ],
    steps: [
      { order: 1, text: "Tosta o amendoim moído numa panela seca por 2 minutos." },
      { order: 2, text: "Junta a água aos poucos, mexendo até engrossar." },
      { order: 3, text: "Corta a banana em rodelas e serve por cima." },
    ],
  },
  2: {
    recipeId: 2,
    name: "Pão com ovo estrelado e chá de limão",
    kcal: 380,
    prepMinutes: 12,
    estimatedCostMt: null,
    macros: { proteina: 18, carbs: 42, gordura: 32, fibra: 8 },
    healthTags: [],
    healthNote: null,
    ingredients: [
      { ingredientId: 4, name: "Pão", quantity: 1, unit: "unidade" },
      { ingredientId: 5, name: "Ovo", quantity: 1, unit: "unidade" },
      { ingredientId: 6, name: "Óleo de cozinha", quantity: 5, unit: "ml" },
      { ingredientId: 7, name: "Chá (folhas ou saqueta)", quantity: 1, unit: "saqueta" },
      { ingredientId: 8, name: "Limão", quantity: 0.5, unit: "unidade" },
    ],
    steps: [
      { order: 1, text: "Aquece o óleo numa frigideira e estrela o ovo." },
      { order: 2, text: "Corta o pão ao meio e coloca o ovo lá dentro." },
      { order: 3, text: "Ferve água para o chá e espreme o limão antes de servir." },
    ],
  },
  3: {
    recipeId: 3,
    name: "Mingau de milho branco com canela",
    kcal: 290,
    prepMinutes: 15,
    estimatedCostMt: 35,
    macros: { proteina: 8, carbs: 66, gordura: 16, fibra: 10 },
    healthTags: ["vegetariana", "sem_gluten", "acucar_controlado"],
    healthNote: null,
    ingredients: [
      { ingredientId: 9, name: "Farinha de milho (fuba)", quantity: 60, unit: "g" },
      { ingredientId: 3, name: "Água", quantity: 300, unit: "ml" },
      { ingredientId: 10, name: "Canela em pau", quantity: 1, unit: "unidade" },
    ],
    steps: [
      { order: 1, text: "Dissolve a fuba num pouco de água fria." },
      { order: 2, text: "Leva o resto da água a ferver com a canela." },
      { order: 3, text: "Junta a mistura de fuba, mexendo sempre até engrossar." },
    ],
  },
  4: {
    recipeId: 4,
    name: "Omeleta de vegetais com fatia de pão integral",
    kcal: 350,
    prepMinutes: 10,
    estimatedCostMt: 55,
    macros: { proteina: 20, carbs: 38, gordura: 34, fibra: 8 },
    healthTags: ["baixo_sodio"],
    healthNote: "Baixo em sódio — recomendado para hipertensão, sempre com acompanhamento médico.",
    ingredients: [
      { ingredientId: 5, name: "Ovo", quantity: 2, unit: "unidade" },
      { ingredientId: 11, name: "Tomate", quantity: 50, unit: "g" },
      { ingredientId: 12, name: "Cebola", quantity: 30, unit: "g" },
      { ingredientId: 13, name: "Pão integral", quantity: 1, unit: "fatia" },
      { ingredientId: 6, name: "Óleo de cozinha", quantity: 5, unit: "ml" },
    ],
    steps: [
      { order: 1, text: "Bate os ovos e tempera sem sal, apenas ervas." },
      { order: 2, text: "Refoga o tomate e a cebola em pouco óleo." },
      { order: 3, text: "Junta os ovos batidos e deixa cozinhar em lume brando." },
      { order: 4, text: "Serve com a fatia de pão integral." },
    ],
  },
  5: {
    recipeId: 5,
    name: "Xima suave com feijão nhemba (pequeno-almoço reforçado)",
    kcal: 400,
    prepMinutes: 20,
    estimatedCostMt: 50,
    macros: { proteina: 16, carbs: 52, gordura: 14, fibra: 18 },
    healthTags: ["sem_gluten", "vegetariana"],
    healthNote: null,
    ingredients: [
      { ingredientId: 9, name: "Farinha de milho (fuba)", quantity: 80, unit: "g" },
      { ingredientId: 14, name: "Feijão nhemba cozido", quantity: 100, unit: "g" },
      { ingredientId: 3, name: "Água", quantity: 200, unit: "ml" },
    ],
    steps: [
      { order: 1, text: "Prepara a xima cozendo a fuba com água até ficar consistente." },
      { order: 2, text: "Aquece o feijão nhemba já cozido." },
      { order: 3, text: "Serve a xima com o feijão por cima." },
    ],
  },
  6: {
    recipeId: 6,
    name: "Xima com matapa e camarão",
    kcal: 620,
    prepMinutes: 40,
    estimatedCostMt: 180,
    macros: { proteina: 24, carbs: 48, gordura: 22, fibra: 6 },
    healthTags: ["sem_gluten"],
    healthNote: null,
    ingredients: [
      { ingredientId: 9, name: "Farinha de milho (fuba)", quantity: 120, unit: "g" },
      { ingredientId: 15, name: "Folhas de mandioca (matapa)", quantity: 150, unit: "g" },
      { ingredientId: 16, name: "Camarão", quantity: 100, unit: "g" },
      { ingredientId: 17, name: "Leite de coco", quantity: 100, unit: "ml" },
      { ingredientId: 18, name: "Alho", quantity: 5, unit: "g" },
    ],
    steps: [
      { order: 1, text: "Cozinha as folhas de matapa trituradas em lume brando." },
      { order: 2, text: "Junta o leite de coco, o alho e o camarão, deixa apurar 15 minutos." },
      { order: 3, text: "Prepara a xima à parte com a fuba e água." },
      { order: 4, text: "Serve a xima acompanhada da matapa." },
    ],
  },
  7: {
    recipeId: 7,
    name: "Feijão nhemba com arroz e couve",
    kcal: 560,
    prepMinutes: 35,
    estimatedCostMt: 90,
    macros: { proteina: 20, carbs: 56, gordura: 16, fibra: 8 },
    healthTags: ["sem_gluten", "vegetariana"],
    healthNote: null,
    ingredients: [
      { ingredientId: 14, name: "Feijão nhemba", quantity: 120, unit: "g" },
      { ingredientId: 19, name: "Arroz", quantity: 100, unit: "g" },
      { ingredientId: 20, name: "Couve", quantity: 80, unit: "g" },
      { ingredientId: 12, name: "Cebola", quantity: 30, unit: "g" },
    ],
    steps: [
      { order: 1, text: "Coze o feijão nhemba até ficar macio." },
      { order: 2, text: "Coze o arroz em água com uma pitada de sal." },
      { order: 3, text: "Refoga a couve com a cebola." },
      { order: 4, text: "Serve os três juntos no prato." },
    ],
  },
  8: {
    recipeId: 8,
    name: "Caril de peixe (garoupa) com arroz",
    kcal: 640,
    prepMinutes: 45,
    estimatedCostMt: 220,
    macros: { proteina: 28, carbs: 44, gordura: 22, fibra: 6 },
    healthTags: ["sem_gluten"],
    healthNote: null,
    ingredients: [
      { ingredientId: 21, name: "Peixe (garoupa)", quantity: 150, unit: "g" },
      { ingredientId: 19, name: "Arroz", quantity: 100, unit: "g" },
      { ingredientId: 17, name: "Leite de coco", quantity: 80, unit: "ml" },
      { ingredientId: 11, name: "Tomate", quantity: 60, unit: "g" },
      { ingredientId: 22, name: "Piripiri", quantity: 2, unit: "g" },
    ],
    steps: [
      { order: 1, text: "Tempera o peixe e deixa marinar 10 minutos." },
      { order: 2, text: "Refoga o tomate, junta o leite de coco e o piripiri." },
      { order: 3, text: "Adiciona o peixe e deixa cozinhar em lume brando 15 minutos." },
      { order: 4, text: "Serve com arroz branco." },
    ],
  },
  9: {
    recipeId: 9,
    name: "Frango à zambeziana com arroz e salada",
    kcal: 700,
    prepMinutes: 50,
    estimatedCostMt: 240,
    macros: { proteina: 30, carbs: 42, gordura: 22, fibra: 6 },
    healthTags: ["sem_gluten"],
    healthNote: null,
    ingredients: [
      { ingredientId: 23, name: "Frango", quantity: 200, unit: "g" },
      { ingredientId: 17, name: "Leite de coco", quantity: 60, unit: "ml" },
      { ingredientId: 8, name: "Limão", quantity: 1, unit: "unidade" },
      { ingredientId: 18, name: "Alho", quantity: 8, unit: "g" },
      { ingredientId: 19, name: "Arroz", quantity: 100, unit: "g" },
    ],
    steps: [
      { order: 1, text: "Marina o frango com limão e alho por 30 minutos." },
      { order: 2, text: "Grelha o frango, pincelando com leite de coco." },
      { order: 3, text: "Serve com arroz branco e salada fresca." },
    ],
  },
  10: {
    recipeId: 10,
    name: "Arroz de coco com feijão jugo",
    kcal: 610,
    prepMinutes: 35,
    estimatedCostMt: 140,
    macros: { proteina: 16, carbs: 60, gordura: 18, fibra: 6 },
    healthTags: ["sem_gluten", "vegetariana"],
    healthNote: null,
    ingredients: [
      { ingredientId: 19, name: "Arroz", quantity: 120, unit: "g" },
      { ingredientId: 17, name: "Leite de coco", quantity: 100, unit: "ml" },
      { ingredientId: 24, name: "Feijão jugo", quantity: 100, unit: "g" },
    ],
    steps: [
      { order: 1, text: "Coze o feijão jugo até amaciar." },
      { order: 2, text: "Cozinha o arroz com leite de coco em vez de água." },
      { order: 3, text: "Mistura o feijão jugo ao arroz antes de servir." },
    ],
  },
  11: {
    recipeId: 11,
    name: "Mandioca cozida com molho de amendoim e folhas",
    kcal: 580,
    prepMinutes: 40,
    estimatedCostMt: 110,
    macros: { proteina: 14, carbs: 58, gordura: 22, fibra: 6 },
    healthTags: ["sem_gluten", "vegetariana"],
    healthNote: null,
    ingredients: [
      { ingredientId: 25, name: "Mandioca", quantity: 250, unit: "g" },
      { ingredientId: 1, name: "Amendoim moído", quantity: 40, unit: "g" },
      { ingredientId: 15, name: "Folhas de mandioca (matapa)", quantity: 100, unit: "g" },
    ],
    steps: [
      { order: 1, text: "Coze a mandioca até ficar macia." },
      { order: 2, text: "Prepara o molho de amendoim com um pouco de água." },
      { order: 3, text: "Refoga as folhas e junta ao molho." },
      { order: 4, text: "Serve a mandioca com o molho por cima." },
    ],
  },
  12: {
    recipeId: 12,
    name: "Salada de quiabo com xima e ovo",
    kcal: 480,
    prepMinutes: 30,
    estimatedCostMt: 95,
    macros: { proteina: 18, carbs: 52, gordura: 20, fibra: 10 },
    healthTags: ["sem_gluten", "baixo_sodio"],
    healthNote: "Baixo em sódio — adequado para hipertensão, sempre com acompanhamento médico.",
    ingredients: [
      { ingredientId: 26, name: "Quiabo", quantity: 150, unit: "g" },
      { ingredientId: 9, name: "Farinha de milho (fuba)", quantity: 80, unit: "g" },
      { ingredientId: 5, name: "Ovo", quantity: 1, unit: "unidade" },
      { ingredientId: 11, name: "Tomate", quantity: 40, unit: "g" },
    ],
    steps: [
      { order: 1, text: "Coze o quiabo em água sem sal." },
      { order: 2, text: "Prepara a xima à parte." },
      { order: 3, text: "Cozinha o ovo e corta o tomate em cubos." },
      { order: 4, text: "Monta o prato com xima, quiabo, ovo e tomate." },
    ],
  },
  13: {
    recipeId: 13,
    name: "Caril de galinha com batata-doce",
    kcal: 560,
    prepMinutes: 45,
    estimatedCostMt: 200,
    macros: { proteina: 26, carbs: 46, gordura: 22, fibra: 6 },
    healthTags: ["sem_gluten"],
    healthNote: null,
    ingredients: [
      { ingredientId: 23, name: "Frango", quantity: 180, unit: "g" },
      { ingredientId: 27, name: "Batata-doce", quantity: 150, unit: "g" },
      { ingredientId: 17, name: "Leite de coco", quantity: 80, unit: "ml" },
      { ingredientId: 12, name: "Cebola", quantity: 30, unit: "g" },
    ],
    steps: [
      { order: 1, text: "Refoga a cebola e junta o frango em pedaços." },
      { order: 2, text: "Adiciona o leite de coco e deixa apurar." },
      { order: 3, text: "Junta a batata-doce cozida e serve quente." },
    ],
  },
  14: {
    recipeId: 14,
    name: "Peixe grelhado com legumes salteados",
    kcal: 500,
    prepMinutes: 30,
    estimatedCostMt: 210,
    macros: { proteina: 32, carbs: 34, gordura: 24, fibra: 10 },
    healthTags: ["sem_gluten", "baixo_sodio"],
    healthNote: "Baixo em sódio — recomendado para hipertensão, sempre com acompanhamento médico.",
    ingredients: [
      { ingredientId: 21, name: "Peixe (garoupa)", quantity: 180, unit: "g" },
      { ingredientId: 20, name: "Couve", quantity: 80, unit: "g" },
      { ingredientId: 11, name: "Tomate", quantity: 50, unit: "g" },
      { ingredientId: 8, name: "Limão", quantity: 0.5, unit: "unidade" },
    ],
    steps: [
      { order: 1, text: "Tempera o peixe apenas com limão e ervas." },
      { order: 2, text: "Grelha o peixe dos dois lados." },
      { order: 3, text: "Salteia a couve e o tomate em pouco óleo." },
      { order: 4, text: "Serve o peixe com os legumes salteados." },
    ],
  },
  15: {
    recipeId: 15,
    name: "Feijão jugo com arroz e tomate",
    kcal: 540,
    prepMinutes: 35,
    estimatedCostMt: 100,
    macros: { proteina: 18, carbs: 58, gordura: 16, fibra: 8 },
    healthTags: ["sem_gluten", "vegetariana"],
    healthNote: null,
    ingredients: [
      { ingredientId: 24, name: "Feijão jugo", quantity: 120, unit: "g" },
      { ingredientId: 19, name: "Arroz", quantity: 90, unit: "g" },
      { ingredientId: 11, name: "Tomate", quantity: 60, unit: "g" },
    ],
    steps: [
      { order: 1, text: "Coze o feijão jugo até ficar macio." },
      { order: 2, text: "Cozinha o arroz em água com uma pitada de sal." },
      { order: 3, text: "Refoga o tomate e junta ao feijão." },
      { order: 4, text: "Serve o feijão sobre o arroz." },
    ],
  },
  16: {
    recipeId: 16,
    name: "Matapa com xima (jantar leve)",
    kcal: 470,
    prepMinutes: 35,
    estimatedCostMt: 130,
    macros: { proteina: 16, carbs: 48, gordura: 26, fibra: 10 },
    healthTags: ["sem_gluten"],
    healthNote: null,
    ingredients: [
      { ingredientId: 15, name: "Folhas de mandioca (matapa)", quantity: 150, unit: "g" },
      { ingredientId: 17, name: "Leite de coco", quantity: 80, unit: "ml" },
      { ingredientId: 9, name: "Farinha de milho (fuba)", quantity: 70, unit: "g" },
      { ingredientId: 1, name: "Amendoim moído", quantity: 20, unit: "g" },
    ],
    steps: [
      { order: 1, text: "Cozinha as folhas de matapa trituradas com o leite de coco." },
      { order: 2, text: "Junta o amendoim moído e deixa apurar." },
      { order: 3, text: "Prepara a xima à parte e serve com a matapa." },
    ],
  },
  17: {
    recipeId: 17,
    name: "Sopa de mandioca com legumes e frango desfiado",
    kcal: 430,
    prepMinutes: 40,
    estimatedCostMt: 120,
    macros: { proteina: 22, carbs: 50, gordura: 16, fibra: 12 },
    healthTags: ["sem_gluten", "baixo_sodio"],
    healthNote: "Baixo em sódio — recomendado para hipertensão, sempre com acompanhamento médico.",
    ingredients: [
      { ingredientId: 25, name: "Mandioca", quantity: 150, unit: "g" },
      { ingredientId: 23, name: "Frango", quantity: 100, unit: "g" },
      { ingredientId: 12, name: "Cebola", quantity: 30, unit: "g" },
      { ingredientId: 20, name: "Couve", quantity: 50, unit: "g" },
    ],
    steps: [
      { order: 1, text: "Coze o frango e desfia-o." },
      { order: 2, text: "Coze a mandioca e a cebola até amaciarem." },
      { order: 3, text: "Junta a couve e o frango desfiado, deixa apurar 5 minutos." },
    ],
  },
  18: {
    recipeId: 18,
    name: "Frango grelhado com salada de repolho",
    kcal: 480,
    prepMinutes: 30,
    estimatedCostMt: 190,
    macros: { proteina: 34, carbs: 32, gordura: 24, fibra: 10 },
    healthTags: ["sem_gluten"],
    healthNote: null,
    ingredients: [
      { ingredientId: 23, name: "Frango", quantity: 180, unit: "g" },
      { ingredientId: 28, name: "Repolho", quantity: 100, unit: "g" },
      { ingredientId: 11, name: "Tomate", quantity: 40, unit: "g" },
      { ingredientId: 8, name: "Limão", quantity: 0.5, unit: "unidade" },
    ],
    steps: [
      { order: 1, text: "Tempera o frango com limão e grelha até dourar." },
      { order: 2, text: "Corta o repolho e o tomate em tiras finas." },
      { order: 3, text: "Tempera a salada com um fio de azeite e serve com o frango." },
    ],
  },
};

function slotOf(recipeId: number): MealSlot {
  if (recipeId <= 5) return "PEQUENO_ALMOCO";
  if (recipeId <= 12) return "ALMOCO";
  return "JANTAR";
}

function cloneRecipe(recipeId: number): RecipeSnapshot {
  const def = RECIPE_CATALOG[recipeId];
  return {
    ...def,
    macros: def.macros ? { ...def.macros } : undefined,
    ingredients: def.ingredients?.map((line) => ({ ...line })),
    steps: def.steps?.map((step) => ({ ...step })),
  };
}

function averageMacros(entries: MealPlanEntry[]): Macros {
  const totalKcal = entries.reduce((sum, e) => sum + (e.recipe?.kcal ?? 0), 0) || 1;
  const weighted = (key: keyof Macros): number =>
    entries.reduce((sum, e) => sum + (e.recipe?.macros?.[key] ?? 0) * (e.recipe?.kcal ?? 0), 0) / totalKcal;
  const rounded: Required<Macros> = {
    proteina: Math.round(weighted("proteina")),
    carbs: Math.round(weighted("carbs")),
    gordura: Math.round(weighted("gordura")),
    fibra: Math.round(weighted("fibra")),
  };
  // Corrige o arredondamento para a soma dar sempre 100 (ajusta na fatia dos carboidratos).
  const diff = 100 - (rounded.proteina + rounded.carbs + rounded.gordura + rounded.fibra);
  rounded.carbs += diff;
  return rounded;
}

// ─────────────────────────────────────────────────────────────────────────
// Plano semanal ativo — Seg 2026-07-13 a Dom 2026-07-19, 3 refeições/dia.
// ─────────────────────────────────────────────────────────────────────────
export const ACTIVE_PLAN_ID = 1001;

const WEEKDAYS_PT = [
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
  "domingo",
];
const WEEK_DATES = [
  "2026-07-13",
  "2026-07-14",
  "2026-07-15",
  "2026-07-16",
  "2026-07-17",
  "2026-07-18",
  "2026-07-19",
];
const WEEK_MENU: Array<{ breakfast: number; lunch: number; dinner: number }> = [
  { breakfast: 1, lunch: 6, dinner: 13 },
  { breakfast: 2, lunch: 7, dinner: 14 },
  { breakfast: 3, lunch: 8, dinner: 15 },
  { breakfast: 4, lunch: 9, dinner: 16 },
  { breakfast: 5, lunch: 10, dinner: 17 },
  { breakfast: 2, lunch: 11, dinner: 18 },
  { breakfast: 3, lunch: 12, dinner: 13 },
];

function buildEntries(menu: { breakfast: number; lunch: number; dinner: number }, dayIndex: number): MealPlanEntry[] {
  const base = dayIndex * 3;
  return [
    { id: base + 1, mealSlot: "PEQUENO_ALMOCO", recipe: cloneRecipe(menu.breakfast), feedback: "NONE" },
    { id: base + 2, mealSlot: "ALMOCO", recipe: cloneRecipe(menu.lunch), feedback: "NONE" },
    { id: base + 3, mealSlot: "JANTAR", recipe: cloneRecipe(menu.dinner), feedback: "NONE" },
  ];
}

function buildInitialPlan(): MealPlan {
  const days: MealPlanDay[] = WEEK_MENU.map((menu, index) => {
    const entries = buildEntries(menu, index);
    return {
      date: WEEK_DATES[index],
      weekday: WEEKDAYS_PT[index],
      totalKcal: entries.reduce((sum, e) => sum + (e.recipe?.kcal ?? 0), 0),
      macros: averageMacros(entries),
      entries,
    };
  });
  return { id: ACTIVE_PLAN_ID, weekStart: WEEK_DATES[0], status: "ACTIVE", days };
}

// eslint-disable-next-line prefer-const -- mutado pelos handlers de swap/feedback
let activePlan: MealPlan = buildInitialPlan();

export function getActivePlan(): MealPlan {
  const size = getHouseholdSize();
  if (size === 1) return activePlan;
  return {
    ...activePlan,
    days: activePlan.days?.map((day) => ({
      ...day,
      entries: day.entries?.map((entry) => ({ ...entry, recipe: scaleRecipeSnapshot(entry.recipe) })),
    })),
  };
}

export function findMealPlanEntry(entryId: number): MealPlanEntry | undefined {
  for (const day of activePlan.days ?? []) {
    const entry = day.entries?.find((e) => e.id === entryId);
    if (entry) return entry;
  }
  return undefined;
}

/** Variante de findMealPlanEntry para respostas ao cliente — ingredientes escalados por householdSize. */
export function getMealPlanEntryForResponse(entryId: number): MealPlanEntry | undefined {
  const entry = findMealPlanEntry(entryId);
  if (!entry) return undefined;
  return { ...entry, recipe: scaleRecipeSnapshot(entry.recipe) };
}

// Entrada 21 = Domingo/Jantar. Usa este id para acionar sempre o 409 LSA014_NO_ALTERNATIVE
// em POST /me/meal-plans/entries/21/swap (com ou sem confirm=true) — cenário de teste do FE-C05.
export const NO_ALTERNATIVE_ENTRY_ID = 21;

function pickAlternative(entry: MealPlanEntry): RecipeSnapshot | null {
  const currentRecipeId = entry.recipe?.recipeId;
  const slot = entry.mealSlot;
  const candidateId = Object.keys(RECIPE_CATALOG)
    .map(Number)
    .find((id) => id !== currentRecipeId && slotOf(id) === slot);
  return candidateId === undefined ? null : cloneRecipe(candidateId);
}

// FE-T02: mutação partilhada entre o swap (confirm=true) e "guardar num dia" (receita avulsa) —
// ambos substituem a receita de uma entrada do plano ativo da mesma forma.
function applyRecipeToEntry(entry: MealPlanEntry, recipe: RecipeSnapshot): void {
  entry.recipe = recipe;
  entry.feedback = "NONE";
}

export function proposeOrApplySwap(
  entryId: number,
  confirm: boolean,
): MockResult<{ state: "proposed" | "applied"; alternative: { recipe: RecipeSnapshot } }> {
  if (entryId === NO_ALTERNATIVE_ENTRY_ID) {
    return errResult("LSA014_NO_ALTERNATIVE", "Sem alternativa disponível para as tuas restrições.", 409);
  }
  const entry = findMealPlanEntry(entryId);
  if (!entry) {
    return errResult("LSA005_NOT_FOUND", "Refeição não encontrada.", 404);
  }
  const alternative = pickAlternative(entry);
  if (!alternative) {
    return errResult("LSA014_NO_ALTERNATIVE", "Sem alternativa disponível para as tuas restrições.", 409);
  }
  if (confirm) {
    applyRecipeToEntry(entry, alternative);
    return okResult({ state: "applied", alternative: { recipe: cloneRecipe(alternative.recipeId!) } });
  }
  return okResult({ state: "proposed", alternative: { recipe: alternative } });
}

export function applyRecipeFeedback(recipeId: number, value: "LIKE" | "DISLIKE" | "NONE"): MockResult<null> {
  let matched = false;
  for (const day of activePlan.days ?? []) {
    for (const entry of day.entries ?? []) {
      if (entry.recipe?.recipeId === recipeId) {
        entry.feedback = value;
        matched = true;
      }
    }
  }
  if (!matched && !RECIPE_CATALOG[recipeId]) {
    return errResult("LSA005_NOT_FOUND", "Receita não encontrada.", 404);
  }
  return okResult(null);
}

// FE-T02: "guardar num dia" — mesma mutação do swap confirmado, mas com o recipeId escolhido
// pelo cliente (a receita avulsa) em vez de uma alternativa escolhida pelo servidor.
export function replaceMealPlanEntry(entryId: number, recipeId: number): MockResult<MealPlanEntry> {
  const entry = findMealPlanEntry(entryId);
  if (!entry) {
    return errResult("LSA005_NOT_FOUND", "Refeição não encontrada.", 404);
  }
  if (!RECIPE_CATALOG[recipeId]) {
    return errResult("LSA005_NOT_FOUND", "Receita não encontrada.", 404);
  }
  applyRecipeToEntry(entry, cloneRecipe(recipeId));
  return okResult({ ...entry, recipe: scaleRecipeSnapshot(entry.recipe) });
}

// ─────────────────────────────────────────────────────────────────────────
// Perfil (F1-CLI-01) — começa completo para não bloquear o resto do portal;
// PUT atualiza in-memory. Enums alinhados com docs/plano/01-functional-plan.md.
// ─────────────────────────────────────────────────────────────────────────
let profile: Profile = {
  goal: "COMER_MELHOR",
  healthCondition: "NENHUMA",
  allergies: [],
  budgetBand: "MEDIO",
  mealsPerDay: 3,
  householdSize: 1,
};

export function getProfile(): Profile {
  return profile;
}

export function updateProfile(patch: Profile): MockResult<Profile> {
  if (patch.mealsPerDay !== undefined && (patch.mealsPerDay < 2 || patch.mealsPerDay > 5)) {
    return errResult("LSA001_VALIDATION", "O número de refeições por dia deve ser entre 2 e 5.", 400);
  }
  if (patch.allergies !== undefined && patch.allergies.length > 20) {
    return errResult("LSA001_VALIDATION", "Máximo de 20 alergias/exclusões.", 400);
  }
  if (patch.householdSize !== undefined && (patch.householdSize < 1 || patch.householdSize > 8)) {
    return errResult("LSA001_VALIDATION", "O número de pessoas em casa deve ser entre 1 e 8.", 400);
  }
  profile = { ...profile, ...patch };
  return okResult(profile);
}

// FE-S04: ponto único de escala por "pessoas em casa" — as quantidades/custos a comprar e os
// ingredientes das receitas escalam com o householdSize do perfil; kcal/macros nunca escalam
// (ver docs/superpowers/specs/2026-07-19-controlo-porcoes-design.md §4).
function getHouseholdSize(): number {
  return profile.householdSize ?? 1;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function scaleRecipeSnapshot(recipe: RecipeSnapshot | undefined): RecipeSnapshot | undefined {
  if (!recipe) return recipe;
  const size = getHouseholdSize();
  if (size === 1) return recipe;
  return {
    ...recipe,
    ingredients: recipe.ingredients?.map((line) => ({
      ...line,
      quantity: line.quantity != null ? round2(line.quantity * size) : line.quantity,
    })),
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Geração assíncrona de plano (F1-CLI-02) — POST devolve 202 + id; GET faz
// polling. Após ~2 chamadas de GET passa a READY. Limite de 3 gerações por
// sessão do mock aciona o LSA012 (não reseta — reinicia o worker para testar
// de novo). Uma 2ª geração enquanto a anterior está "GENERATING" dá LSA011.
// ─────────────────────────────────────────────────────────────────────────
const generationPolls = new Map<number, number>();
let inFlightGenerationId: number | null = null;
let dailyGenerationCount = 0;
let nextGenerationId = 5000;

export function requestMealPlanGeneration(): MockResult<{ id: number; status: "GENERATING" }> {
  if (inFlightGenerationId !== null) {
    return errResult("LSA011_GENERATION_IN_PROGRESS", "Já existe uma geração em curso.", 409);
  }
  if (dailyGenerationCount >= 3) {
    return errResult("LSA012_GENERATION_LIMIT", "Atingiste o limite diário de 3 gerações. Tenta novamente amanhã.", 429);
  }
  dailyGenerationCount += 1;
  const id = nextGenerationId++;
  generationPolls.set(id, 0);
  inFlightGenerationId = id;
  return okResult({ id, status: "GENERATING" }, 202);
}

export function pollMealPlanGeneration(
  id: number,
): MockResult<{ id: number; status: "GENERATING" | "READY" | "FAILED"; mealPlanId: number | null }> {
  if (!generationPolls.has(id)) {
    return errResult("LSA005_NOT_FOUND", "Geração não encontrada.", 404);
  }
  const polls = (generationPolls.get(id) ?? 0) + 1;
  generationPolls.set(id, polls);
  if (polls < 2) {
    return okResult({ id, status: "GENERATING", mealPlanId: null });
  }
  if (inFlightGenerationId === id) inFlightGenerationId = null;
  return okResult({ id, status: "READY", mealPlanId: ACTIVE_PLAN_ID });
}

// ─────────────────────────────────────────────────────────────────────────
// "Pedir receita agora" (FE-T) — receita avulsa fora do plano semanal. Mesmo padrão
// 202+polling da geração do plano, mas com contador diário próprio (não partilha o
// dailyGenerationCount da geração semanal — pedir uma receita avulsa não deve bloquear
// nem ser bloqueado por gerar um plano novo).
// ─────────────────────────────────────────────────────────────────────────
const adHocPolls = new Map<number, { polls: number; mealSlot: MealSlot; goal?: Goal; note?: string }>();
let dailyAdHocCount = 0;
let nextAdHocId = 9000;

function dislikedRecipeIds(): Set<number> {
  const ids = new Set<number>();
  for (const day of activePlan.days ?? []) {
    for (const entry of day.entries ?? []) {
      if (entry.feedback === "DISLIKE" && entry.recipe?.recipeId !== undefined) {
        ids.add(entry.recipe.recipeId);
      }
    }
  }
  return ids;
}

function pickAdHocRecipe(mealSlot: MealSlot): RecipeSnapshot {
  const disliked = dislikedRecipeIds();
  const allIds = Object.keys(RECIPE_CATALOG).map(Number);
  // slotOf() só mapeia para PEQUENO_ALMOCO/ALMOCO/JANTAR — a semente de RECIPE_CATALOG não tem
  // receitas dedicadas a LANCHE. Pedido de LANCHE cai no catálogo inteiro como fallback,
  // preferindo sempre receitas que o cliente não tenha marcado 👎.
  const bySlot = allIds.filter((id) => slotOf(id) === mealSlot);
  const pool = bySlot.length > 0 ? bySlot : allIds;
  const preferredId = pool.find((id) => !disliked.has(id));
  const chosenId = preferredId ?? pool[0];
  return cloneRecipe(chosenId);
}

export function requestAdHocRecipe(input: AdHocRecipeRequest): MockResult<{ id: number; status: "GENERATING" }> {
  if (dailyAdHocCount >= 3) {
    return errResult(
      "LSA015_ADHOC_LIMIT",
      "Atingiste o limite diário de 3 pedidos avulsos. Tenta novamente amanhã.",
      429,
    );
  }
  dailyAdHocCount += 1;
  const id = nextAdHocId++;
  adHocPolls.set(id, { polls: 0, mealSlot: input.mealSlot, goal: input.goal, note: input.note });
  return okResult({ id, status: "GENERATING" }, 202);
}

export function pollAdHocRecipe(id: number): MockResult<AdHocRecipeHandle> {
  const record = adHocPolls.get(id);
  if (!record) {
    return errResult("LSA005_NOT_FOUND", "Pedido não encontrado.", 404);
  }
  record.polls += 1;
  if (record.polls < 2) {
    return okResult({ id, status: "GENERATING", recipe: null });
  }
  const recipe = pickAdHocRecipe(record.mealSlot);
  return okResult({ id, status: "READY", recipe: scaleRecipeSnapshot(recipe) ?? recipe });
}

// ─────────────────────────────────────────────────────────────────────────
// Lista de compras (F1-CLI-06) — agregada a partir das receitas da semana
// acima (nomes de ingredientes consistentes com o catálogo). Alguns itens
// sem preço de referência → costIsPartial = true (nota de "estimativa parcial").
// ─────────────────────────────────────────────────────────────────────────
const SHOPPING_ITEMS_SEED: Array<Omit<ShoppingListItem, "id" | "checked">> = [
  // CEREAIS_E_FARINHAS
  { ingredientName: "Farinha de milho (fuba)", category: "CEREAIS_E_FARINHAS", quantity: 2, unit: "kg", estimatedCostMt: 120 },
  { ingredientName: "Arroz", category: "CEREAIS_E_FARINHAS", quantity: 3, unit: "kg", estimatedCostMt: 225 },
  { ingredientName: "Pão", category: "CEREAIS_E_FARINHAS", quantity: 10, unit: "unidade", estimatedCostMt: 150 },
  // PROTEINA
  { ingredientName: "Peixe (garoupa)", category: "PROTEINA", quantity: 1.5, unit: "kg", estimatedCostMt: 420 },
  { ingredientName: "Frango", category: "PROTEINA", quantity: 2, unit: "kg", estimatedCostMt: 440 },
  { ingredientName: "Camarão", category: "PROTEINA", quantity: 0.4, unit: "kg", estimatedCostMt: 140 },
  { ingredientName: "Ovo", category: "PROTEINA", quantity: 12, unit: "unidade", estimatedCostMt: 144 },
  // VEGETAIS_E_FOLHAS
  { ingredientName: "Folhas de mandioca (matapa)", category: "VEGETAIS_E_FOLHAS", quantity: 1, unit: "kg", estimatedCostMt: 70 },
  { ingredientName: "Quiabo", category: "VEGETAIS_E_FOLHAS", quantity: 0.5, unit: "kg", estimatedCostMt: 25 },
  { ingredientName: "Tomate", category: "VEGETAIS_E_FOLHAS", quantity: 1, unit: "kg", estimatedCostMt: 45 },
  { ingredientName: "Cebola", category: "VEGETAIS_E_FOLHAS", quantity: 1, unit: "kg", estimatedCostMt: 40 },
  { ingredientName: "Repolho", category: "VEGETAIS_E_FOLHAS", quantity: 1, unit: "kg", estimatedCostMt: 35 },
  { ingredientName: "Batata-doce", category: "VEGETAIS_E_FOLHAS", quantity: 1.5, unit: "kg", estimatedCostMt: null },
  // LEGUMINOSAS
  { ingredientName: "Feijão nhemba", category: "LEGUMINOSAS", quantity: 1, unit: "kg", estimatedCostMt: 90 },
  { ingredientName: "Feijão jugo", category: "LEGUMINOSAS", quantity: 1, unit: "kg", estimatedCostMt: 85 },
  { ingredientName: "Amendoim moído", category: "LEGUMINOSAS", quantity: 0.3, unit: "kg", estimatedCostMt: null },
  // TEMPEROS_E_OLEOS
  { ingredientName: "Óleo de cozinha", category: "TEMPEROS_E_OLEOS", quantity: 1, unit: "l", estimatedCostMt: 90 },
  { ingredientName: "Alho", category: "TEMPEROS_E_OLEOS", quantity: 0.2, unit: "kg", estimatedCostMt: null },
  { ingredientName: "Sal", category: "TEMPEROS_E_OLEOS", quantity: 0.5, unit: "kg", estimatedCostMt: 20 },
  { ingredientName: "Folha de louro", category: "TEMPEROS_E_OLEOS", quantity: 1, unit: "unidade", estimatedCostMt: null },
  { ingredientName: "Piripiri", category: "TEMPEROS_E_OLEOS", quantity: 0.05, unit: "kg", estimatedCostMt: null },
  // OUTROS
  { ingredientName: "Mandioca", category: "OUTROS", quantity: 1.5, unit: "kg", estimatedCostMt: 53 },
  { ingredientName: "Leite de coco", category: "OUTROS", quantity: 0.5, unit: "l", estimatedCostMt: null },
  { ingredientName: "Banana", category: "OUTROS", quantity: 1, unit: "kg", estimatedCostMt: 60 },
  { ingredientName: "Chá (saquetas)", category: "OUTROS", quantity: 7, unit: "unidade", estimatedCostMt: null },
];

function buildShoppingList(): ShoppingList {
  const items: ShoppingListItem[] = SHOPPING_ITEMS_SEED.map((seed, index) => ({
    ...seed,
    id: index + 1,
    checked: false,
    // FE-R01: reinicia sempre que a lista é reconstruída (plano novo/troca) — "já tenho" não
    // persiste entre semanas, ver docs/superpowers/specs/2026-07-19-lista-compras-ja-tenho-design.md.
    haveQuantity: 0,
  }));
  return {
    id: 5001,
    totalItems: items.length,
    checkedItems: 0,
    estimatedCostMt: remainingTotalCost(items),
    costIsPartial: items.some((item) => item.estimatedCostMt == null),
    items,
  };
}

// FE-R01: custo "a comprar" de um item — pro-rata pela quantidade em falta, quando há preço de
// referência; sem preço, mantém-se null (a UI já trata isso como "estimativa parcial").
function remainingCost(item: ShoppingListItem): number | null {
  if (item.estimatedCostMt == null) return null;
  const quantity = item.quantity ?? 0;
  if (quantity <= 0) return item.estimatedCostMt;
  const remaining = Math.max(0, quantity - (item.haveQuantity ?? 0));
  return item.estimatedCostMt * (remaining / quantity);
}

function remainingTotalCost(items: ShoppingListItem[]): number {
  return items.reduce((sum, item) => sum + (remainingCost(item) ?? 0), 0);
}

// eslint-disable-next-line prefer-const -- mutado pelo PATCH de checked/haveQuantity
let shoppingList: ShoppingList = buildShoppingList();

// FE-S04: base guardada representa sempre 1 pessoa; quantity/estimatedCostMt escalam só na
// resposta (haveQuantity/checked ficam como estão — é quanto o cliente já tem fisicamente,
// não depende de para quantas pessoas está a cozinhar).
function scaleShoppingItem(item: ShoppingListItem): ShoppingListItem {
  const size = getHouseholdSize();
  if (size === 1) return item;
  return {
    ...item,
    quantity: item.quantity != null ? round2(item.quantity * size) : item.quantity,
    estimatedCostMt: item.estimatedCostMt == null ? null : round2(item.estimatedCostMt * size),
  };
}

export function getShoppingList(): ShoppingList {
  const items = (shoppingList.items ?? []).map(scaleShoppingItem);
  return {
    ...shoppingList,
    checkedItems: items.filter((item) => item.checked).length,
    estimatedCostMt: remainingTotalCost(items),
    costIsPartial: items.some((item) => item.estimatedCostMt == null),
    items,
  };
}

export type ShoppingListItemPatch = { checked?: boolean; haveQuantity?: number };

export function updateShoppingListItem(itemId: number, patch: ShoppingListItemPatch): MockResult<ShoppingListItem> {
  const item = shoppingList.items?.find((i) => i.id === itemId);
  if (!item) {
    return errResult("LSA005_NOT_FOUND", "Item não encontrado na lista de compras.", 404);
  }
  if (patch.checked !== undefined) {
    item.checked = patch.checked;
  }
  if (patch.haveQuantity !== undefined) {
    item.haveQuantity = Math.max(0, patch.haveQuantity);
  }
  return okResult(scaleShoppingItem(item));
}

// ─────────────────────────────────────────────────────────────────────────
// Auth (F1-VIS-01/02) — utilizadores fixos + gatilhos de erro documentados.
// ─────────────────────────────────────────────────────────────────────────
const DEFAULT_CLIENT_USER: NonNullable<AuthResult["user"]> = {
  id: 1,
  name: "Amélia Cossa",
  email: "amelia@levesabor.mz",
  role: "CLIENTE",
};
const DEFAULT_ADMIN_USER: NonNullable<AuthResult["user"]> = {
  id: 2,
  name: "Equipa Leve Sabor",
  email: "admin@levesabor.mz",
  role: "ADMIN",
};

// Email já registado — usa este valor em /auth/register para testar o 409 LSA006_DUPLICATE.
export const DUPLICATE_REGISTER_EMAIL = "existente@levesabor.mz";
// Credenciais para acionar os erros de login documentados em /auth/login:
//  - email "erro@levesabor.mz"      → 401 LSA002_INVALID_CREDENTIALS
//  - email "suspensa@levesabor.mz"  → 403 LSA003_ACCOUNT_SUSPENDED
//  - email "admin@levesabor.mz"     → entra como ADMIN
//  - qualquer outro email/password  → entra como o cliente fixture (sucesso)
export const INVALID_CREDENTIALS_EMAIL = "erro@levesabor.mz";
export const SUSPENDED_ACCOUNT_EMAIL = "suspensa@levesabor.mz";

export function registerAccount(body: {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  disclaimerAccepted?: boolean;
}): MockResult<AuthResult> {
  if (!body.name || body.name.length < 2) {
    return errResult("LSA001_VALIDATION", "Nome deve ter pelo menos 2 caracteres.", 400);
  }
  if (!body.password || body.password.length < 8) {
    return errResult("LSA001_VALIDATION", "A password deve ter pelo menos 8 caracteres.", 400);
  }
  if (body.password !== body.confirmPassword) {
    return errResult("LSA001_VALIDATION", "A confirmação de password não coincide.", 400);
  }
  if (!body.disclaimerAccepted) {
    return errResult("LSA001_VALIDATION", "É necessário aceitar o aviso antes de continuar.", 400);
  }
  if (body.email?.toLowerCase() === DUPLICATE_REGISTER_EMAIL) {
    return errResult("LSA006_DUPLICATE", "Já existe uma conta com este email.", 409);
  }
  return okResult({
    accessToken: "mock-access-token-" + Date.now(),
    user: { id: 100, name: body.name, email: body.email ?? "", role: "CLIENTE" },
  });
}

export function login(body: { email?: string; password?: string }): MockResult<AuthResult> {
  const email = body.email?.toLowerCase();
  if (email === INVALID_CREDENTIALS_EMAIL) {
    return errResult("LSA002_INVALID_CREDENTIALS", "Credenciais inválidas.", 401);
  }
  if (email === SUSPENDED_ACCOUNT_EMAIL) {
    return errResult("LSA003_ACCOUNT_SUSPENDED", "Esta conta está suspensa.", 403);
  }
  const user = email === DEFAULT_ADMIN_USER.email ? DEFAULT_ADMIN_USER : DEFAULT_CLIENT_USER;
  return okResult({ accessToken: "mock-access-token-" + Date.now(), user });
}

export function refreshSession(): AuthResult {
  return { accessToken: "mock-access-token-refreshed-" + Date.now(), user: DEFAULT_CLIENT_USER };
}

// ─────────────────────────────────────────────────────────────────────────
// Admin (Fase 2) — fixtures rasas, só para as listas + métricas + 1 patch
// de estado de receita (para o gatilho de LSA023). Ecrãs admin ficam para
// o card de implementação da Fase 2; isto só evita 404 no MOCK-02.
// ─────────────────────────────────────────────────────────────────────────
export const ADMIN_USERS: User[] = [
  {
    id: 1,
    name: "Amélia Cossa",
    email: "amelia@levesabor.mz",
    role: "CLIENTE",
    status: "ACTIVE",
    createdAt: "2026-05-02T08:12:00Z",
    lastLoginAt: "2026-07-12T19:41:00Z",
    mealPlanCount: 6,
  },
  {
    id: 2,
    name: "Equipa Leve Sabor",
    email: "admin@levesabor.mz",
    role: "ADMIN",
    status: "ACTIVE",
    createdAt: "2026-01-10T09:00:00Z",
    lastLoginAt: "2026-07-13T07:05:00Z",
    mealPlanCount: 0,
  },
  {
    id: 3,
    name: "Carlos Muianga",
    email: "carlos.muianga@exemplo.mz",
    role: "CLIENTE",
    status: "ACTIVE",
    createdAt: "2026-06-01T10:00:00Z",
    lastLoginAt: "2026-07-10T18:20:00Z",
    mealPlanCount: 2,
  },
  {
    id: 4,
    name: "Fátima Nhaca",
    email: "fatima.nhaca@exemplo.mz",
    role: "CLIENTE",
    status: "SUSPENDED",
    createdAt: "2026-04-15T14:30:00Z",
    lastLoginAt: null,
    mealPlanCount: 1,
  },
];

export const ADMIN_STORES: Store[] = [
  { id: 1, name: "Mercado Central", city: "Maputo", neighborhood: "Baixa", contact: "+258 84 111 2233", status: "ACTIVE", productCount: 48 },
  { id: 2, name: "Shoprite Matola", city: "Matola", neighborhood: "Fomento", contact: "+258 82 222 3344", status: "ACTIVE", productCount: 120 },
  { id: 3, name: "Mercado do Povo", city: "Beira", neighborhood: "Centro", contact: null, status: "SUSPENDED", productCount: 15 },
];

export const LOJA_PRODUCTS: Product[] = [
  { id: 1, name: "Farinha de milho (fuba) 1kg", category: "CEREAIS", unitLabel: "1 kg", priceMt: 60, ingredientId: 9, status: "ACTIVE" },
  { id: 2, name: "Arroz agulha 1kg", category: "CEREAIS", unitLabel: "1 kg", priceMt: 75, ingredientId: 19, status: "ACTIVE" },
  { id: 3, name: "Feijão nhemba 1kg", category: "LEGUMINOSAS", unitLabel: "1 kg", priceMt: 90, ingredientId: 14, status: "ACTIVE" },
  { id: 4, name: "Óleo de cozinha 1L", category: "TEMPEROS", unitLabel: "1 L", priceMt: 145, ingredientId: null, status: "ACTIVE" },
];

export const ADMIN_INGREDIENTS: Ingredient[] = [
  { id: 9, name: "Farinha de milho (fuba)", category: "Cereais e Farinhas", baseUnit: "kg", kcalPer100g: 365, proteinPer100g: 9, carbsPer100g: 76, fatPer100g: 3.5, fiberPer100g: 7, referencePriceMt: 60, active: true },
  { id: 19, name: "Arroz", category: "Cereais e Farinhas", baseUnit: "kg", kcalPer100g: 360, proteinPer100g: 7, carbsPer100g: 79, fatPer100g: 0.6, fiberPer100g: 1.3, referencePriceMt: 75, active: true },
  { id: 14, name: "Feijão nhemba", category: "Leguminosas", baseUnit: "kg", kcalPer100g: 340, proteinPer100g: 24, carbsPer100g: 60, fatPer100g: 1.5, fiberPer100g: 15, referencePriceMt: 90, active: true },
  { id: 21, name: "Peixe (garoupa)", category: "Proteína", baseUnit: "kg", kcalPer100g: 105, proteinPer100g: 21, carbsPer100g: 0, fatPer100g: 2, fiberPer100g: 0, referencePriceMt: 280, active: true },
  { id: 23, name: "Frango", category: "Proteína", baseUnit: "kg", kcalPer100g: 165, proteinPer100g: 31, carbsPer100g: 0, fatPer100g: 3.6, fiberPer100g: 0, referencePriceMt: 220, active: true },
];

function toAdminRecipe(
  recipeId: number,
  overrides: {
    id: number;
    description: string;
    servings: number;
    status: "DRAFT" | "PUBLISHED";
    likeCount: number;
    dislikeCount: number;
  },
): Recipe {
  const def = RECIPE_CATALOG[recipeId];
  return {
    id: overrides.id,
    name: def.name,
    description: overrides.description,
    prepMinutes: def.prepMinutes,
    servings: overrides.servings,
    estimatedCostMt: def.estimatedCostMt ?? null,
    healthTags: def.healthTags,
    kcal: def.kcal,
    macros: def.macros,
    status: overrides.status,
    likeCount: overrides.likeCount,
    dislikeCount: overrides.dislikeCount,
    ingredients: def.ingredients,
    steps: def.steps,
  };
}

// Receita 9999 é propositadamente incompleta (0 ingredientes, 1 passo, sem tags de saúde).
// PATCH /admin/recipes/9999/status { "status": "PUBLISHED" } devolve 409 LSA023_RECIPE_INCOMPLETE.
export const ADMIN_RECIPES: Recipe[] = [
  toAdminRecipe(6, { id: 6, description: "Prato tradicional do sul de Moçambique com camarão e leite de coco.", servings: 1, status: "PUBLISHED", likeCount: 34, dislikeCount: 3 }),
  toAdminRecipe(9, { id: 9, description: "Frango marinado em limão e alho, assado à moda da Zambézia.", servings: 1, status: "PUBLISHED", likeCount: 51, dislikeCount: 2 }),
  toAdminRecipe(14, { id: 14, description: "Peixe grelhado simples com legumes salteados, baixo em sódio.", servings: 1, status: "PUBLISHED", likeCount: 22, dislikeCount: 5 }),
  toAdminRecipe(7, { id: 7, description: "Feijão nhemba com arroz e couve, opção vegetariana e económica.", servings: 1, status: "DRAFT", likeCount: 0, dislikeCount: 0 }),
  {
    id: 9999,
    name: "Bolo de arroz (rascunho)",
    description: null,
    prepMinutes: 0,
    servings: 1,
    estimatedCostMt: null,
    healthTags: [],
    kcal: 0,
    macros: { proteina: 0, carbs: 0, gordura: 0, fibra: 0 },
    status: "DRAFT",
    likeCount: 0,
    dislikeCount: 0,
    ingredients: [],
    steps: [{ order: 1, text: "Rascunho por completar." }],
  },
];

export function setAdminRecipeStatus(id: number, status: "DRAFT" | "PUBLISHED"): MockResult<Recipe> {
  const recipe = ADMIN_RECIPES.find((r) => r.id === id);
  if (!recipe) {
    return errResult("LSA005_NOT_FOUND", "Receita não encontrada.", 404);
  }
  if (status === "PUBLISHED") {
    const incomplete =
      (recipe.ingredients?.length ?? 0) < 1 ||
      (recipe.steps?.length ?? 0) < 2 ||
      !recipe.kcal ||
      (recipe.healthTags?.length ?? 0) < 1;
    if (incomplete) {
      return errResult(
        "LSA023_RECIPE_INCOMPLETE",
        "Receita incompleta — define ingredientes, passos, macros e pelo menos uma tag de saúde antes de publicar.",
        409,
      );
    }
  }
  recipe.status = status;
  return okResult(recipe);
}

export const METRICS_SUMMARY: MetricsSummary = {
  totalUsers: 128,
  newUsersInPeriod: 17,
  mealPlansGenerated: 342,
  aiSuccessRate: 0.97,
  estimatedAiCostUsd: 18.42,
  plansPerDay: WEEK_DATES.map((date, i) => ({ date, count: [6, 9, 7, 11, 8, 14, 5][i] })),
  topRecipes: [
    { recipeId: 9, name: "Frango à zambeziana com arroz e salada", likeCount: 51, dislikeCount: 2 },
    { recipeId: 6, name: "Xima com matapa e camarão", likeCount: 34, dislikeCount: 3 },
    { recipeId: 14, name: "Peixe grelhado com legumes salteados", likeCount: 22, dislikeCount: 5 },
  ],
  bottomRecipes: [
    { recipeId: 2, name: "Pão com ovo estrelado e chá de limão", likeCount: 3, dislikeCount: 12 },
    { recipeId: 11, name: "Mandioca cozida com molho de amendoim e folhas", likeCount: 5, dislikeCount: 9 },
    { recipeId: 4, name: "Omeleta de vegetais com fatia de pão integral", likeCount: 6, dislikeCount: 7 },
  ],
};

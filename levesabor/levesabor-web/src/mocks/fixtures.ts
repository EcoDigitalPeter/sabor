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
type ProductRequest = components["schemas"]["ProductRequest"];
type ImportJob = components["schemas"]["ImportJob"];
type Ingredient = components["schemas"]["Ingredient"];
type Recipe = components["schemas"]["Recipe"];
type MetricsSummary = components["schemas"]["MetricsSummary"];
type MealSlot = NonNullable<MealPlanEntry["mealSlot"]>;
type AdHocRecipeRequest = components["schemas"]["AdHocRecipeRequest"];
type AdHocRecipeHandle = components["schemas"]["AdHocRecipeHandle"];
type CreateShoppingListItemRequest = components["schemas"]["CreateShoppingListItemRequest"];

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
// Plano mensal ativo — 2026-07-13 a 2026-08-11 (30 dias), 3 refeições/dia.
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

const MONTH_LENGTH_DAYS = 30;
const MONTH_START_DATE = "2026-07-13";

// 30 datas ISO consecutivas a partir de MONTH_START_DATE (mesmo dia de início da antiga
// semana-piloto, agora estendido a um mês inteiro).
function buildMonthDates(): string[] {
  const [y, m, d] = MONTH_START_DATE.split("-").map(Number);
  const start = new Date(y, m - 1, d);
  return Array.from({ length: MONTH_LENGTH_DAYS }, (_, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });
}
const MONTH_DATES = buildMonthDates();

const BREAKFAST_IDS = [1, 2, 3, 4, 5];
const LUNCH_IDS = [6, 7, 8, 9, 10, 11, 12];
const DINNER_IDS = [13, 14, 15, 16, 17, 18];

// Round-robin determinístico pelos 18 pratos do catálogo — o mock não tem IA real para variar
// o menu, isto só evita repetir a mesma refeição em dias consecutivos ao longo do mês.
const MONTH_MENU: Array<{ breakfast: number; lunch: number; dinner: number }> = Array.from(
  { length: MONTH_LENGTH_DAYS },
  (_, i) => ({
    breakfast: BREAKFAST_IDS[i % BREAKFAST_IDS.length],
    lunch: LUNCH_IDS[i % LUNCH_IDS.length],
    dinner: DINNER_IDS[i % DINNER_IDS.length],
  }),
);

function buildEntries(menu: { breakfast: number; lunch: number; dinner: number }, dayIndex: number): MealPlanEntry[] {
  const base = dayIndex * 3;
  return [
    { id: base + 1, mealSlot: "PEQUENO_ALMOCO", recipe: cloneRecipe(menu.breakfast), feedback: "NONE", completed: false },
    { id: base + 2, mealSlot: "ALMOCO", recipe: cloneRecipe(menu.lunch), feedback: "NONE", completed: false },
    { id: base + 3, mealSlot: "JANTAR", recipe: cloneRecipe(menu.dinner), feedback: "NONE", completed: false },
  ];
}

function buildInitialPlan(): MealPlan {
  const days: MealPlanDay[] = MONTH_MENU.map((menu, index) => {
    const entries = buildEntries(menu, index);
    return {
      date: MONTH_DATES[index],
      weekday: WEEKDAYS_PT[index % WEEKDAYS_PT.length],
      totalKcal: entries.reduce((sum, e) => sum + (e.recipe?.kcal ?? 0), 0),
      macros: averageMacros(entries),
      entries,
    };
  });
  return { id: ACTIVE_PLAN_ID, monthStart: MONTH_DATES[0], status: "ACTIVE", days };
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

// FE-W03: pré-filtro por dietaryPreferences do perfil — mesmo padrão "preferir, com fallback"
// já usado em pickAdHocRecipe; sem preferências definidas, comportamento inalterado (primeira
// receita do mesmo mealSlot, id diferente do atual).
function pickAlternative(entry: MealPlanEntry): RecipeSnapshot | null {
  const currentRecipeId = entry.recipe?.recipeId;
  const slot = entry.mealSlot;
  const bySlotPool = Object.keys(RECIPE_CATALOG)
    .map(Number)
    .filter((id) => id !== currentRecipeId && slotOf(id) === slot);
  const preferences = getProfile().dietaryPreferences ?? [];
  const preferredId =
    preferences.length > 0
      ? bySlotPool.find((id) => (RECIPE_CATALOG[id].healthTags ?? []).some((tag) => preferences.includes(tag)))
      : undefined;
  const candidateId = preferredId ?? bySlotPool[0];
  return candidateId === undefined ? null : cloneRecipe(candidateId);
}

// FE-T02: mutação partilhada entre o swap (confirm=true) e "guardar num dia" (receita avulsa) —
// ambos substituem a receita de uma entrada do plano ativo da mesma forma.
function applyRecipeToEntry(entry: MealPlanEntry, recipe: RecipeSnapshot): void {
  entry.recipe = recipe;
  entry.feedback = "NONE";
}

// FE-Q06: `reason` é o motivo livre e opcional escrito pelo cliente ("Porque queres trocar?").
// O mock não tem IA real para o interpretar — não filtra a alternativa escolhida, só é aceite
// no contrato (sem persistência entre pedidos, à semelhança do `note` do FE-T pedido avulso).
export function proposeOrApplySwap(
  entryId: number,
  confirm: boolean,
  reason?: string,
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
    // FE-D06: regista o motivo contra a receita que estava a ser trocada (a "de saída") — é essa
    // que o admin quer perceber porque perdeu preferência. Antes disto o reason era descartado.
    recordSwapReason(entry.recipe?.recipeId, reason);
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

// "Comi isto" (F1-CLI-04) — marca/desmarca uma entrada do plano ativo como concluída.
export function setMealPlanEntryCompleted(entryId: number, completed: boolean): MockResult<MealPlanEntry> {
  const entry = findMealPlanEntry(entryId);
  if (!entry) {
    return errResult("LSA005_NOT_FOUND", "Refeição não encontrada.", 404);
  }
  entry.completed = completed;
  return okResult({ ...entry, recipe: scaleRecipeSnapshot(entry.recipe) });
}

// ─────────────────────────────────────────────────────────────────────────
// Perfil (F1-CLI-01) — começa completo para não bloquear o resto do portal;
// PUT atualiza in-memory. Enums alinhados com docs/plano/01-functional-plan.md.
// ─────────────────────────────────────────────────────────────────────────
let profile: Profile = {
  goal: "COMER_MELHOR",
  healthConditions: ["NENHUMA"],
  allergies: [],
  foodExclusions: [],
  budgetBand: "MEDIO",
  mealsPerDay: 3,
  householdSize: 1,
};

export function getProfile(): Profile {
  return profile;
}

// F1-CLI-01: mesmo vocabulário fechado usado nas healthTags das receitas — reaproveitado como
// filtro por defeito do catálogo navegável (F1-CLI-08) e pré-filtro de geração/troca (FE-W03).
const DIETARY_PREFERENCES_VOCAB = [
  "vegetariana",
  "vegan",
  "sem_gluten",
  "sem_lactose",
  "alta_proteina",
  "baixo_calorico",
];

export function updateProfile(patch: Profile): MockResult<Profile> {
  if (patch.mealsPerDay !== undefined && (patch.mealsPerDay < 2 || patch.mealsPerDay > 5)) {
    return errResult("LSA001_VALIDATION", "O número de refeições por dia deve ser entre 2 e 5.", 400);
  }
  if (patch.allergies !== undefined && patch.allergies.length > 20) {
    return errResult("LSA001_VALIDATION", "Máximo de 20 alergias.", 400);
  }
  if (patch.foodExclusions !== undefined && patch.foodExclusions.length > 20) {
    return errResult("LSA001_VALIDATION", "Máximo de 20 alimentos excluídos.", 400);
  }
  if (patch.householdSize !== undefined && (patch.householdSize < 1 || patch.householdSize > 8)) {
    return errResult("LSA001_VALIDATION", "O número de pessoas em casa deve ser entre 1 e 8.", 400);
  }
  if (patch.dietaryPreferences !== undefined) {
    if (patch.dietaryPreferences.length > 6) {
      return errResult("LSA001_VALIDATION", "Máximo de 6 preferências alimentares.", 400);
    }
    if (patch.dietaryPreferences.some((pref) => !DIETARY_PREFERENCES_VOCAB.includes(pref))) {
      return errResult("LSA001_VALIDATION", "Preferência alimentar fora do vocabulário permitido.", 400);
    }
  }
  // FE-Y02 (ago/2026): healthCondition passou de valor único a seleção múltipla — a "OUTRA"
  // exige o texto livre correspondente, senão a condição fica sem significado para a IA.
  if (
    patch.healthConditions !== undefined &&
    patch.healthConditions.includes("OUTRA") &&
    !patch.healthConditionOther?.trim()
  ) {
    return errResult("LSA001_VALIDATION", "Descreve a condição de saúde em \"Outra\".", 400);
  }
  // FE-Y04 (ago/2026): consentimento médico é pedido aqui (resumo do onboarding), não no registo.
  // Só rejeita se vier explicitamente `false` — omitir o campo (ex.: edição posterior do perfil em
  // /perfil, que já foi aceite uma vez) não deve reabrir a exigência.
  if (patch.medicalDisclaimerAccepted === false) {
    return errResult("LSA001_VALIDATION", "É necessário aceitar o aviso antes de gerar o teu plano.", 400);
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
// polling. Após ~2 chamadas de GET passa a READY. Limite de 1 geração por
// sessão do mock aciona o LSA012 (não reseta — reinicia o worker para testar
// de novo). Reduzido de 3 para 1 ao passar de plano semanal para mensal: um
// plano mensal cobre ~4x mais dias/receitas por geração, pelo que o custo de
// IA por pedido é proporcionalmente maior — faz sentido limitar mais.
// Uma 2ª geração enquanto a anterior está "GENERATING" dá LSA011.
// ─────────────────────────────────────────────────────────────────────────
const generationPolls = new Map<number, number>();
let inFlightGenerationId: number | null = null;
let dailyGenerationCount = 0;
const MAX_GENERATIONS_PER_DAY = 1;
let nextGenerationId = 5000;

export function requestMealPlanGeneration(): MockResult<{ id: number; status: "GENERATING" }> {
  if (inFlightGenerationId !== null) {
    return errResult("LSA011_GENERATION_IN_PROGRESS", "Já existe uma geração em curso.", 409);
  }
  if (dailyGenerationCount >= MAX_GENERATIONS_PER_DAY) {
    return errResult(
      "LSA012_GENERATION_LIMIT",
      "Atingiste o limite diário de 1 geração de plano mensal. Tenta novamente amanhã.",
      429,
    );
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
// "Pedir receita agora" (FE-T) — receita avulsa fora do plano mensal. Mesmo padrão
// 202+polling da geração do plano, mas com contador diário próprio (não partilha o
// dailyGenerationCount da geração mensal — pedir uma receita avulsa não deve bloquear
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
  const notDisliked = pool.filter((id) => !disliked.has(id));
  // FE-W03: entre os candidatos sem 👎, prefere os que cruzam dietaryPreferences do perfil;
  // sem correspondência (ou sem preferências definidas), cai no comportamento atual.
  const preferences = getProfile().dietaryPreferences ?? [];
  const preferredId =
    preferences.length > 0
      ? notDisliked.find((id) => (RECIPE_CATALOG[id].healthTags ?? []).some((tag) => preferences.includes(tag)))
      : undefined;
  const chosenId = preferredId ?? notDisliked[0] ?? pool[0];
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
// Catálogo de receitas navegável (F1-CLI-08/FE-W05) — reutiliza RECIPE_CATALOG (o mesmo
// catálogo real usado pelo plano do cliente), mapeado para o formato Recipe já existente
// (hoje usado só pelo admin, F2-ADM-05). Todo o catálogo é implicitamente PUBLISHED aqui.
// ─────────────────────────────────────────────────────────────────────────
function toClientRecipe(snapshot: RecipeSnapshot): Recipe {
  return {
    id: snapshot.recipeId,
    name: snapshot.name,
    description: null,
    prepMinutes: snapshot.prepMinutes,
    servings: 1,
    estimatedCostMt: snapshot.estimatedCostMt ?? null,
    healthTags: snapshot.healthTags,
    kcal: snapshot.kcal,
    macros: snapshot.macros,
    status: "PUBLISHED",
    likeCount: 0,
    dislikeCount: 0,
    ingredients: snapshot.ingredients,
    steps: snapshot.steps,
  };
}

export function listMyRecipes(tags: string[], query: string): Recipe[] {
  const normalizedQuery = query.trim().toLowerCase();
  return Object.values(RECIPE_CATALOG)
    .map(toClientRecipe)
    .filter((recipe) => {
      if (tags.length > 0) {
        const recipeTags = new Set(recipe.healthTags ?? []);
        if (!tags.every((tag) => recipeTags.has(tag))) return false;
      }
      if (normalizedQuery && !(recipe.name ?? "").toLowerCase().includes(normalizedQuery)) return false;
      return true;
    });
}

// ─────────────────────────────────────────────────────────────────────────
// Lista de compras (F1-CLI-06) — esta seed já NÃO alimenta a lista diretamente
// (ver buildShoppingList/buildIngredientLookup abaixo, FE-W01); serve só de tabela de
// referência nome→categoria/preço-por-unidade para os ingredientes reais agregados a
// partir do plano ativo. Ingredientes sem correspondência aqui ficam em "OUTROS" sem
// preço → costIsPartial = true (nota de "estimativa parcial").
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

// FE-W01: nome normalizado (trim/lowercase) para comparar/agregar ingredientes vindos de
// receitas diferentes — o nome "bonito" original é preservado no item de saída.
function normalizeIngredientName(name: string): string {
  return name.trim().toLowerCase();
}

// SHOPPING_ITEMS_SEED deixou de alimentar a lista diretamente (ver buildShoppingList abaixo) e
// passa a servir só de tabela de referência nome→categoria/preço-por-unidade, usada para
// categorizar e custear os ingredientes reais agregados a partir do plano ativo.
function buildIngredientLookup(): Map<string, { category: NonNullable<ShoppingListItem["category"]>; pricePerUnit: number | null }> {
  const lookup = new Map<string, { category: NonNullable<ShoppingListItem["category"]>; pricePerUnit: number | null }>();
  for (const seed of SHOPPING_ITEMS_SEED) {
    if (!seed.ingredientName) continue;
    const pricePerUnit =
      seed.estimatedCostMt != null && seed.quantity ? seed.estimatedCostMt / seed.quantity : null;
    lookup.set(normalizeIngredientName(seed.ingredientName), {
      category: seed.category ?? "OUTROS",
      pricePerUnit,
    });
  }
  return lookup;
}

// FE-W01: deriva a lista de compras somando os ingredientes de todas as receitas do plano
// mensal ativo (30 dias × 3 refeições), em vez da antiga seed estática pré-somada à mão.
// Agrega por nome normalizado + unit (unidades incompatíveis para o mesmo nome ficam em linhas
// separadas — não há conversão g↔kg/ml↔l no mock). Categoria/preço vêm do lookup reproposto de
// SHOPPING_ITEMS_SEED; sem correspondência, o item fica em "OUTROS" sem custo (estimativa parcial).
function buildShoppingList(): ShoppingList {
  const lookup = buildIngredientLookup();
  const aggregates = new Map<string, { displayName: string; unit: string; quantity: number }>();

  for (const day of activePlan.days ?? []) {
    for (const entry of day.entries ?? []) {
      for (const line of entry.recipe?.ingredients ?? []) {
        if (!line.name || line.quantity == null) continue;
        const unit = line.unit ?? "unidade";
        const key = `${normalizeIngredientName(line.name)}|${unit}`;
        const existing = aggregates.get(key);
        if (existing) {
          existing.quantity += line.quantity;
        } else {
          aggregates.set(key, { displayName: line.name, unit, quantity: line.quantity });
        }
      }
    }
  }

  const items: ShoppingListItem[] = Array.from(aggregates.values()).map((agg, index) => {
    const match = lookup.get(normalizeIngredientName(agg.displayName));
    const quantity = round2(agg.quantity);
    return {
      id: index + 1,
      ingredientName: agg.displayName,
      category: match?.category ?? "OUTROS",
      quantity,
      unit: agg.unit,
      checked: false,
      estimatedCostMt: match?.pricePerUnit != null ? round2(match.pricePerUnit * quantity) : null,
      // FE-R01: reinicia sempre que a lista é reconstruída (plano novo/troca) — "já tenho" não
      // persiste entre semanas, ver docs/superpowers/specs/2026-07-19-lista-compras-ja-tenho-design.md.
      haveQuantity: 0,
      origin: "PLANO",
    };
  });

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

// FE-W04/F1-CLI-06B: item manual, independente da agregação automática do plano — sobrevive a
// regenerações do plano porque buildShoppingList() só recria os itens origin: "PLANO".
export function addManualShoppingItem(request: CreateShoppingListItemRequest): MockResult<ShoppingListItem> {
  const name = request.ingredientName?.trim() ?? "";
  if (name.length < 2 || name.length > 80) {
    return errResult("LSA001_VALIDATION", "O nome do item deve ter entre 2 e 80 caracteres.", 400);
  }
  if (!(request.quantity > 0)) {
    return errResult("LSA001_VALIDATION", "A quantidade deve ser maior que zero.", 400);
  }
  const items = shoppingList.items ?? [];
  const nextId = items.reduce((max, item) => Math.max(max, item.id ?? 0), 0) + 1;
  const item: ShoppingListItem = {
    id: nextId,
    ingredientName: name,
    category: request.category,
    quantity: request.quantity,
    unit: request.unit,
    checked: false,
    estimatedCostMt: request.estimatedCostMt ?? null,
    haveQuantity: 0,
    origin: "MANUAL",
  };
  items.push(item);
  shoppingList.items = items;
  shoppingList.totalItems = items.length;
  shoppingList.estimatedCostMt = remainingTotalCost(items);
  shoppingList.costIsPartial = items.some((i) => i.estimatedCostMt == null);
  return okResult(scaleShoppingItem(item));
}

// ─────────────────────────────────────────────────────────────────────────
// Auth (F1-VIS-01/02) — utilizadores fixos + gatilhos de erro documentados.
// ─────────────────────────────────────────────────────────────────────────
const DEFAULT_CLIENT_USER: NonNullable<AuthResult["user"]> = {
  id: 1,
  name: "Amélia Cossa",
  email: "amelia@ottimizo.mz",
  role: "CLIENTE",
};
const DEFAULT_ADMIN_USER: NonNullable<AuthResult["user"]> = {
  id: 2,
  name: "Equipa Ottimizo",
  email: "admin@ottimizo.mz",
  role: "ADMIN",
};
// FE-L01 · conta fixa do lojista — mock de loja única (sem multi-tenancy real), ligada a
// ADMIN_STORES[4] ("Loja Zambézia", id 5, ver mais abaixo). Todos os handlers /loja/** ficam
// hard-scoped a este storeId em vez de resolver a loja a partir da sessão em cada pedido.
export const LOJA_STORE_ID = 5;
const DEFAULT_LOJISTA_USER: NonNullable<AuthResult["user"]> = {
  id: 3,
  name: "Loja Zambézia",
  email: "loja@ottimizo.mz",
  role: "LOJISTA",
  storeId: LOJA_STORE_ID,
};

// Email já registado — usa este valor em /auth/register para testar o 409 LSA006_DUPLICATE.
export const DUPLICATE_REGISTER_EMAIL = "existente@ottimizo.mz";
// Credenciais para acionar os erros de login documentados em /auth/login:
//  - email "erro@ottimizo.mz"      → 401 LSA002_INVALID_CREDENTIALS
//  - email "suspensa@ottimizo.mz"  → 403 LSA003_ACCOUNT_SUSPENDED
//  - email "admin@ottimizo.mz"     → entra como ADMIN
//  - email "loja@ottimizo.mz"      → entra como LOJISTA (FE-L01)
//  - qualquer outro email/password  → entra como o cliente fixture (sucesso)
export const INVALID_CREDENTIALS_EMAIL = "erro@ottimizo.mz";
export const SUSPENDED_ACCOUNT_EMAIL = "suspensa@ottimizo.mz";

export function registerAccount(body: {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
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
  // FE-Y04 (ago/2026): o consentimento médico saiu do registo — passou a ser pedido no resumo do
  // onboarding, validado em updateProfile() (medicalDisclaimerAccepted), não aqui.
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
  const user =
    email === DEFAULT_ADMIN_USER.email
      ? DEFAULT_ADMIN_USER
      : email === DEFAULT_LOJISTA_USER.email
        ? DEFAULT_LOJISTA_USER
        : DEFAULT_CLIENT_USER;
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
    email: "amelia@ottimizo.mz",
    role: "CLIENTE",
    status: "ACTIVE",
    createdAt: "2026-05-02T08:12:00Z",
    lastLoginAt: "2026-07-12T19:41:00Z",
    mealPlanCount: 6,
  },
  {
    id: 2,
    name: "Equipa Ottimizo",
    email: "admin@ottimizo.mz",
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
  { id: 4, name: "Mercearia Central", city: "Maputo", neighborhood: "Polana", contact: "+258 84 333 4455", status: "ACTIVE", productCount: 32 },
  { id: 5, name: "Loja Zambézia", city: "Quelimane", neighborhood: "Chabeco", contact: "+258 86 555 6677", status: "ACTIVE", productCount: 20 },
];

// ─────────────────────────────────────────────────────────────────────────
// Encomendas (F3-CLI-07) — "encomendar rancho a uma loja". Estado em memória,
// só um cliente (fixture), snapshot dos itens da lista de compras no momento
// do pedido (alterações posteriores à lista não afetam encomendas já criadas).
// ─────────────────────────────────────────────────────────────────────────
type OrderStatus = components["schemas"]["OrderStatus"];
type OrderItem = components["schemas"]["OrderItem"];
type Order = components["schemas"]["Order"];
type OrderRequest = components["schemas"]["OrderRequest"];

// FE-L04 · 2 encomendas seed para LOJA_STORE_ID, para o ecrã /loja/encomendas não nascer vazio
// na demo (mesmo espírito de ADMIN_USERS já ter a Fátima SUSPENDED de propósito).
const orders: Order[] = [
  {
    id: 7001,
    storeId: LOJA_STORE_ID,
    storeName: "Loja Zambézia",
    storeContact: "+258 86 555 6677",
    customerName: DEFAULT_CLIENT_USER.name,
    customerContact: DEFAULT_CLIENT_USER.email,
    status: "PENDENTE",
    note: null,
    // Nomes têm de bater certo com LOJA_PRODUCTS (ver mais abaixo) — Order.items é um snapshot
    // por nome (OrderItem.ingredientName), usado por activeOrdersReferencingProduct() para
    // bloquear a eliminação de um produto em encomenda ativa.
    items: [
      { ingredientName: "Farinha de milho (fuba) 1kg", quantity: 2, unit: "kg", priceMt: 120 },
      { ingredientName: "Feijão nhemba 1kg", quantity: 1, unit: "kg", priceMt: 90 },
    ],
    createdAt: "2026-07-30T09:15:00Z",
  },
  {
    id: 7002,
    storeId: LOJA_STORE_ID,
    storeName: "Loja Zambézia",
    storeContact: "+258 86 555 6677",
    customerName: DEFAULT_CLIENT_USER.name,
    customerContact: DEFAULT_CLIENT_USER.email,
    status: "ACEITE",
    note: "Passo a buscar ao fim da tarde.",
    items: [{ ingredientName: "Arroz agulha 1kg", quantity: 3, unit: "kg", priceMt: 225 }],
    createdAt: "2026-07-29T14:02:00Z",
  },
];
let nextOrderId = 7003;

function findStore(storeId: number): Store | undefined {
  return ADMIN_STORES.find((s) => s.id === storeId);
}

export function listActiveStores(): Store[] {
  return ADMIN_STORES.filter((s) => s.status === "ACTIVE");
}

export function listOrders(): Order[] {
  // Mais recentes primeiro.
  return [...orders].sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
}

export function getOrder(orderId: number): MockResult<Order> {
  const order = orders.find((o) => o.id === orderId);
  if (!order) {
    return errResult("LSA005_NOT_FOUND", "Encomenda não encontrada.", 404);
  }
  return okResult(order);
}

export function createOrder(body: OrderRequest): MockResult<Order> {
  const store = findStore(body.storeId);
  if (!store) {
    return errResult("LSA005_NOT_FOUND", "Loja não encontrada.", 404);
  }
  if (store.status !== "ACTIVE") {
    return errResult("LSA016_STORE_INACTIVE", "Esta loja não está disponível para encomendas.", 409);
  }
  if (!body.items || body.items.length === 0) {
    return errResult("LSA001_VALIDATION", "Escolhe pelo menos um item para encomendar.", 400);
  }
  const currentList = getShoppingList();
  const snapshotItems: OrderItem[] = [];
  for (const requested of body.items) {
    const listItem = currentList.items?.find((i) => i.id === requested.itemId);
    if (!listItem) continue;
    const quantity = requested.quantity;
    const unitPrice =
      listItem.estimatedCostMt != null && listItem.quantity ? listItem.estimatedCostMt / listItem.quantity : null;
    snapshotItems.push({
      ingredientName: listItem.ingredientName,
      quantity,
      unit: listItem.unit,
      priceMt: unitPrice != null ? round2(unitPrice * quantity) : null,
    });
  }
  if (snapshotItems.length === 0) {
    return errResult("LSA001_VALIDATION", "Nenhum item válido da lista de compras foi encontrado.", 400);
  }
  const order: Order = {
    id: nextOrderId++,
    storeId: store.id,
    storeName: store.name,
    storeContact: store.contact ?? null,
    // Snapshot do cliente que fez o pedido — só há 1 fixture de cliente neste mock, e o sistema
    // não recolhe telefone em lado nenhum, por isso o email serve de "contacto" (usado por FE-L04).
    customerName: DEFAULT_CLIENT_USER.name,
    customerContact: DEFAULT_CLIENT_USER.email,
    status: "PENDENTE",
    note: body.note ?? null,
    items: snapshotItems,
    createdAt: new Date().toISOString(),
  };
  orders.push(order);
  return okResult(order);
}

const CANCELABLE_ORDER_STATUSES: OrderStatus[] = ["PENDENTE", "ACEITE"];

export function cancelOrder(orderId: number): MockResult<Order> {
  const order = orders.find((o) => o.id === orderId);
  if (!order) {
    return errResult("LSA005_NOT_FOUND", "Encomenda não encontrada.", 404);
  }
  if (!order.status || !CANCELABLE_ORDER_STATUSES.includes(order.status)) {
    return errResult("LSA017_ORDER_NOT_CANCELABLE", "Esta encomenda já não pode ser cancelada.", 409);
  }
  order.status = "CANCELADA";
  return okResult(order);
}

// ── FE-L04 · Encomendas do lado da loja ─────────────────────────────────
// Hard-scoped a LOJA_STORE_ID (loja única no mock — ver DEFAULT_LOJISTA_USER acima); sem
// resolução de sessão aqui porque só existe 1 conta LOJISTA.
function findLojaOrder(orderId: number): Order | undefined {
  return orders.find((o) => o.id === orderId && o.storeId === LOJA_STORE_ID);
}

export function listLojaOrders(): Order[] {
  return orders.filter((o) => o.storeId === LOJA_STORE_ID).sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
}

export function getLojaOrder(orderId: number): MockResult<Order> {
  const order = findLojaOrder(orderId);
  if (!order) return errResult("LSA005_NOT_FOUND", "Encomenda não encontrada.", 404);
  return okResult(order);
}

// Transições válidas por estado atual (F3-LOJ-03): RECUSADA só a partir de PENDENTE/ACEITE;
// CANCELADA é ação exclusiva do cliente (cancelOrder), não aparece aqui.
const VALID_LOJA_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  PENDENTE: ["ACEITE", "RECUSADA"],
  ACEITE: ["EM_PREPARACAO", "RECUSADA"],
  EM_PREPARACAO: ["PRONTA"],
  PRONTA: ["CONCLUIDA"],
};

export function setLojaOrderStatus(orderId: number, nextStatus: OrderStatus): MockResult<Order> {
  const order = findLojaOrder(orderId);
  if (!order) return errResult("LSA005_NOT_FOUND", "Encomenda não encontrada.", 404);
  const allowed = order.status ? VALID_LOJA_TRANSITIONS[order.status] : undefined;
  if (!allowed || !allowed.includes(nextStatus)) {
    return errResult(
      "LSA001_VALIDATION",
      `Não é possível passar de "${order.status}" para "${nextStatus}".`,
      409,
    );
  }
  order.status = nextStatus;
  return okResult(order);
}

export const LOJA_PRODUCTS: Product[] = [
  { id: 1, name: "Farinha de milho (fuba) 1kg", category: "CEREAIS", unitLabel: "1 kg", priceMt: 60, ingredientId: 9, status: "ACTIVE" },
  { id: 2, name: "Arroz agulha 1kg", category: "CEREAIS", unitLabel: "1 kg", priceMt: 75, ingredientId: 19, status: "ACTIVE" },
  { id: 3, name: "Feijão nhemba 1kg", category: "LEGUMINOSAS", unitLabel: "1 kg", priceMt: 90, ingredientId: 14, status: "ACTIVE" },
  { id: 4, name: "Óleo de cozinha 1L", category: "TEMPEROS", unitLabel: "1 L", priceMt: 145, ingredientId: null, status: "ACTIVE" },
];

// ── FE-L02 · CRUD de produtos da loja (F3-LOJ-01) ───────────────────────
function findLojaProduct(id: number): Product | undefined {
  return LOJA_PRODUCTS.find((p) => p.id === id);
}

export function getLojaProduct(id: number): MockResult<Product> {
  const product = findLojaProduct(id);
  if (!product) return errResult("LSA005_NOT_FOUND", "Produto não encontrado.", 404);
  return okResult(product);
}

function isDuplicateProductName(name: string, excludeId?: number): boolean {
  const n = name.trim().toLowerCase();
  return LOJA_PRODUCTS.some((p) => p.id !== excludeId && (p.name ?? "").trim().toLowerCase() === n);
}

let nextProductId = 100;

export function createLojaProduct(body: ProductRequest): MockResult<Product> {
  const name = body.name?.trim() ?? "";
  if (name.length < 2) {
    return errResult("LSA001_VALIDATION", "O nome do produto deve ter pelo menos 2 caracteres.", 400);
  }
  if (isDuplicateProductName(name)) {
    return errResult("LSA006_DUPLICATE", "Já existe um produto com este nome nesta loja.", 409);
  }
  const product: Product = { ...body, name, id: nextProductId++ };
  LOJA_PRODUCTS.push(product);
  return okResult(product, 201);
}

export function updateLojaProduct(id: number, body: ProductRequest): MockResult<Product> {
  const product = findLojaProduct(id);
  if (!product) return errResult("LSA005_NOT_FOUND", "Produto não encontrado.", 404);
  const name = body.name?.trim() ?? product.name ?? "";
  if (name.length < 2) {
    return errResult("LSA001_VALIDATION", "O nome do produto deve ter pelo menos 2 caracteres.", 400);
  }
  if (isDuplicateProductName(name, id)) {
    return errResult("LSA006_DUPLICATE", "Já existe um produto com este nome nesta loja.", 409);
  }
  Object.assign(product, body, { name });
  return okResult(product);
}

export function setLojaProductStatus(id: number, status: "ACTIVE" | "INACTIVE"): MockResult<Product> {
  const product = findLojaProduct(id);
  if (!product) return errResult("LSA005_NOT_FOUND", "Produto não encontrado.", 404);
  product.status = status;
  return okResult(product);
}

// Encomendas em estado ativo (ainda não concluídas/recusadas/canceladas) que referenciam este
// produto pelo nome — Order.items é um snapshot por nome (OrderItem.ingredientName), sem productId.
const ACTIVE_ORDER_STATUSES: OrderStatus[] = ["PENDENTE", "ACEITE", "EM_PREPARACAO", "PRONTA"];

function activeOrdersReferencingProduct(productName: string): Order[] {
  const name = productName.trim().toLowerCase();
  return orders.filter(
    (o) =>
      o.storeId === LOJA_STORE_ID &&
      o.status &&
      ACTIVE_ORDER_STATUSES.includes(o.status) &&
      o.items?.some((item) => (item.ingredientName ?? "").trim().toLowerCase() === name),
  );
}

export function deleteLojaProduct(id: number): MockResult<null> {
  const product = findLojaProduct(id);
  if (!product) return errResult("LSA005_NOT_FOUND", "Produto não encontrado.", 404);
  const blockedBy = activeOrdersReferencingProduct(product.name ?? "");
  if (blockedBy.length > 0) {
    return errResult(
      "LSA001_VALIDATION",
      `Este produto está em ${blockedBy.length} encomenda(s) ativa(s). Desativa-o em vez de eliminar.`,
      409,
    );
  }
  const index = LOJA_PRODUCTS.findIndex((p) => p.id === id);
  LOJA_PRODUCTS.splice(index, 1);
  return okResult(null);
}

// ── FE-L03 · Import Excel do catálogo da loja (F3-LOJ-02) ───────────────
// Sem lib de parsing/escrita .xlsx instalada no projeto — a validação devolve sempre a mesma
// pré-visualização determinística, ignorando o conteúdo real do ficheiro enviado; só serve para
// exercitar o fluxo idle→uploading→preview→confirming→done da UI (limitação aceite do mock).
let nextImportJobId = 9000;
const pendingImportJobs = new Set<number>();

const CANNED_IMPORT_PREVIEW: { name: string; category: Product["category"]; unitLabel: string; priceMt: number }[] = [
  { name: "Batata-doce 1kg", category: "VEGETAIS", unitLabel: "1 kg", priceMt: 55 },
  { name: "Tomate 1kg", category: "VEGETAIS", unitLabel: "1 kg", priceMt: 65 },
  { name: "Cebola 1kg", category: "VEGETAIS", unitLabel: "1 kg", priceMt: 50 },
  { name: "Sal 500g", category: "TEMPEROS", unitLabel: "500 g", priceMt: 25 },
];

export function validateProductsImport(): MockResult<ImportJob> {
  const jobId = nextImportJobId++;
  pendingImportJobs.add(jobId);
  const job: ImportJob = {
    id: jobId,
    filename: "catalogo.xlsx",
    status: "VALIDATED",
    totalRows: 5,
    validRows: 4,
    errorRows: 1,
    createdCount: 0,
    updatedCount: 0,
    errors: [{ row: 5, message: "Preço em falta ou inválido." }],
  };
  return okResult(job);
}

export function confirmProductsImport(jobId: number): MockResult<ImportJob> {
  if (!pendingImportJobs.has(jobId)) {
    return errResult("LSA005_NOT_FOUND", "Import não encontrado ou já aplicado.", 409);
  }
  pendingImportJobs.delete(jobId);
  let createdCount = 0;
  for (const row of CANNED_IMPORT_PREVIEW) {
    if (isDuplicateProductName(row.name)) continue;
    LOJA_PRODUCTS.push({ ...row, id: nextProductId++, ingredientId: null, status: "ACTIVE" });
    createdCount++;
  }
  return okResult({
    id: jobId,
    filename: "catalogo.xlsx",
    status: "APPLIED",
    totalRows: 5,
    validRows: 4,
    errorRows: 1,
    createdCount,
    updatedCount: 0,
    errors: [{ row: 5, message: "Preço em falta ou inválido." }],
  });
}

// Blob text/csv como stand-in de .xlsx (sem lib de escrita instalada) — só para o download/link
// funcionar; conteúdo é ilustrativo, documentado como limitação do mock.
export function getLojaImportTemplate(): string {
  return "nome,categoria,unidade,preco_mt\nArroz agulha 1kg,CEREAIS,1 kg,75\n";
}

export function exportLojaProducts(): string {
  const header = "nome,categoria,unidade,preco_mt,estado";
  const rows = LOJA_PRODUCTS.map((p) => `${p.name},${p.category},${p.unitLabel},${p.priceMt},${p.status}`);
  return [header, ...rows].join("\n");
}

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
  plansPerDay: MONTH_DATES.slice(0, 7).map((date, i) => ({ date, count: [6, 9, 7, 11, 8, 14, 5][i] })),
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

// FE-X01/X02/X03: estende METRICS_SUMMARY com métricas que F2-ADM-06 não previa (escrito antes de
// FE-T/FE-C09/FE-C10/FE-V existirem). adHocRecipeRequestsCount e ordersInPeriod ligam-se a estado
// real do mock (sobem durante a demo); engagement fica estático — streak é calculado 100%
// client-side a partir de um único cliente fixture (FE-V02), sem equivalente agregável no mock.
export function buildMetricsSummary(): MetricsSummary {
  const byStatus = new Map<string, number>();
  for (const order of orders) {
    const key = order.status ?? "PENDENTE";
    byStatus.set(key, (byStatus.get(key) ?? 0) + 1);
  }
  return {
    ...METRICS_SUMMARY,
    adHocRecipeRequestsCount: dailyAdHocCount,
    ordersInPeriod: {
      total: orders.length,
      byStatus: Array.from(byStatus, ([status, count]) => ({
        status: status as OrderStatus,
        count,
      })),
    },
    engagement: { activeStreakPercent: 0.34, avgCompletedDaysInMonth: 9.2 },
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Admin CRUD (FE-D00) — operações que as telas de FE-D02/03/06/07 precisam e
// que a Fase 2 "rasa" (só listagens + 1 patch) acima não cobria. Mesmo padrão
// MockResult/okResult/errResult do resto do ficheiro.
// ─────────────────────────────────────────────────────────────────────────

// ── Utilizadores (F2-ADM-01) ────────────────────────────────────────────
export function getUser(id: number): MockResult<User> {
  const user = ADMIN_USERS.find((u) => u.id === id);
  if (!user) return errResult("LSA005_NOT_FOUND", "Utilizador não encontrado.", 404);
  return okResult(user);
}

// O mock não tem um perfil de saúde por utilizador (só o cliente demo tem um `profile` real) —
// devolve sempre esse singleton para qualquer utilizador consultado. Suficiente para validar o
// fluxo de reveal auditado contra mocks; um backend real teria um `client_profiles` por utilizador.
export function getUserHealthProfile(id: number): MockResult<Profile> {
  const user = ADMIN_USERS.find((u) => u.id === id);
  if (!user) return errResult("LSA005_NOT_FOUND", "Utilizador não encontrado.", 404);
  return okResult(profile);
}

export function setUserStatus(id: number, status: "ACTIVE" | "SUSPENDED"): MockResult<User> {
  const user = ADMIN_USERS.find((u) => u.id === id);
  if (!user) return errResult("LSA005_NOT_FOUND", "Utilizador não encontrado.", 404);
  if (status === "SUSPENDED" && user.role === "ADMIN") {
    const otherActiveAdmins = ADMIN_USERS.filter((u) => u.id !== id && u.role === "ADMIN" && u.status === "ACTIVE");
    if (otherActiveAdmins.length === 0) {
      return errResult("LSA022_LAST_ADMIN", "Não é possível suspender o último administrador ativo.", 409);
    }
  }
  user.status = status;
  return okResult(user);
}

let nextUserId = 1000;

// Criação de conta de admin a partir do portal. "Criar conta de lojista" (mencionada em
// F2-ADM-01/02) fica para quando o Portal da Loja (FE-L) existir: o role "LOJISTA" ainda não
// está no contrato (`User.role` só tem "CLIENTE"|"ADMIN", src/types/api.d.ts:917) e não faz
// sentido criar uma conta para um portal que ainda não existe.
export function createUser(body: { name?: string; email?: string }): MockResult<User> {
  const name = body.name?.trim() ?? "";
  if (name.length < 2) {
    return errResult("LSA001_VALIDATION", "Nome deve ter pelo menos 2 caracteres.", 400);
  }
  const email = body.email?.trim().toLowerCase() ?? "";
  if (!email.includes("@")) {
    return errResult("LSA001_VALIDATION", "Email inválido.", 400);
  }
  if (ADMIN_USERS.some((u) => u.email?.toLowerCase() === email)) {
    return errResult("LSA006_DUPLICATE", "Já existe uma conta com este email.", 409);
  }
  const user: User = {
    id: nextUserId++,
    name,
    email,
    role: "ADMIN",
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
    mealPlanCount: 0,
  };
  ADMIN_USERS.push(user);
  return okResult(user, 201);
}

// ── Lojas (F2-ADM-02) ───────────────────────────────────────────────────
export function getStore(id: number): MockResult<Store> {
  const store = findStore(id);
  if (!store) return errResult("LSA005_NOT_FOUND", "Loja não encontrada.", 404);
  return okResult(store);
}

type StoreInput = { name?: string; city?: string; neighborhood?: string | null; contact?: string | null };

function isDuplicateStore(name: string, city: string, excludeId?: number): boolean {
  const n = name.trim().toLowerCase();
  const c = city.trim().toLowerCase();
  return ADMIN_STORES.some(
    (s) => s.id !== excludeId && (s.name ?? "").trim().toLowerCase() === n && (s.city ?? "").trim().toLowerCase() === c,
  );
}

let nextStoreId = 1000;

export function createStore(body: StoreInput): MockResult<Store> {
  const name = body.name?.trim() ?? "";
  const city = body.city?.trim() ?? "";
  if (name.length < 2 || name.length > 120) {
    return errResult("LSA001_VALIDATION", "O nome da loja deve ter entre 2 e 120 caracteres.", 400);
  }
  if (city.length < 2) {
    return errResult("LSA001_VALIDATION", "A cidade é obrigatória.", 400);
  }
  if (isDuplicateStore(name, city)) {
    return errResult("LSA006_DUPLICATE", "Já existe uma loja com este nome nesta cidade.", 409);
  }
  const store: Store = {
    id: nextStoreId++,
    name,
    city,
    neighborhood: body.neighborhood ?? null,
    contact: body.contact ?? null,
    status: "ACTIVE",
    productCount: 0,
  };
  ADMIN_STORES.push(store);
  return okResult(store, 201);
}

export function updateStore(id: number, body: StoreInput): MockResult<Store> {
  const store = findStore(id);
  if (!store) return errResult("LSA005_NOT_FOUND", "Loja não encontrada.", 404);
  const name = body.name?.trim() ?? store.name ?? "";
  const city = body.city?.trim() ?? store.city ?? "";
  if (name.length < 2 || name.length > 120) {
    return errResult("LSA001_VALIDATION", "O nome da loja deve ter entre 2 e 120 caracteres.", 400);
  }
  if (city.length < 2) {
    return errResult("LSA001_VALIDATION", "A cidade é obrigatória.", 400);
  }
  if (isDuplicateStore(name, city, id)) {
    return errResult("LSA006_DUPLICATE", "Já existe uma loja com este nome nesta cidade.", 409);
  }
  store.name = name;
  store.city = city;
  store.neighborhood = body.neighborhood ?? null;
  store.contact = body.contact ?? null;
  return okResult(store);
}

export function setStoreStatus(id: number, status: "ACTIVE" | "SUSPENDED"): MockResult<Store> {
  const store = findStore(id);
  if (!store) return errResult("LSA005_NOT_FOUND", "Loja não encontrada.", 404);
  store.status = status;
  return okResult(store);
}

// Eliminação bloqueada quando a loja já tem produtos (productCount > 0) — sem código de erro
// dedicado no contrato (LSA021 é só para ingredientes); a UI já desabilita o botão "Eliminar"
// nesse caso, isto é o cinto-de-segurança do lado do mock.
export function deleteStore(id: number): MockResult<null> {
  const index = ADMIN_STORES.findIndex((s) => s.id === id);
  if (index === -1) return errResult("LSA005_NOT_FOUND", "Loja não encontrada.", 404);
  const store = ADMIN_STORES[index];
  if ((store.productCount ?? 0) > 0) {
    return errResult("LSA001_VALIDATION", "Esta loja tem produtos associados — suspende-a em vez de eliminar.", 409);
  }
  ADMIN_STORES.splice(index, 1);
  return okResult(null);
}

// ── Ingredientes (F2-ADM-05) ────────────────────────────────────────────
function findIngredient(id: number): Ingredient | undefined {
  return ADMIN_INGREDIENTS.find((i) => i.id === id);
}

export function getIngredient(id: number): MockResult<Ingredient> {
  const ingredient = findIngredient(id);
  if (!ingredient) return errResult("LSA005_NOT_FOUND", "Ingrediente não encontrado.", 404);
  return okResult(ingredient);
}

type IngredientInput = Omit<Ingredient, "id">;

function isDuplicateIngredientName(name: string, excludeId?: number): boolean {
  const n = name.trim().toLowerCase();
  return ADMIN_INGREDIENTS.some((i) => i.id !== excludeId && (i.name ?? "").trim().toLowerCase() === n);
}

let nextIngredientId = 1000;

export function createIngredient(body: IngredientInput): MockResult<Ingredient> {
  const name = body.name?.trim() ?? "";
  if (name.length < 2) {
    return errResult("LSA001_VALIDATION", "O nome do ingrediente deve ter pelo menos 2 caracteres.", 400);
  }
  if (isDuplicateIngredientName(name)) {
    return errResult("LSA006_DUPLICATE", "Já existe um ingrediente com este nome.", 409);
  }
  const ingredient: Ingredient = { ...body, id: nextIngredientId++, name };
  ADMIN_INGREDIENTS.push(ingredient);
  return okResult(ingredient, 201);
}

export function updateIngredient(id: number, body: IngredientInput): MockResult<Ingredient> {
  const ingredient = findIngredient(id);
  if (!ingredient) return errResult("LSA005_NOT_FOUND", "Ingrediente não encontrado.", 404);
  const name = body.name?.trim() ?? ingredient.name ?? "";
  if (name.length < 2) {
    return errResult("LSA001_VALIDATION", "O nome do ingrediente deve ter pelo menos 2 caracteres.", 400);
  }
  if (isDuplicateIngredientName(name, id)) {
    return errResult("LSA006_DUPLICATE", "Já existe um ingrediente com este nome.", 409);
  }
  Object.assign(ingredient, body, { name });
  return okResult(ingredient);
}

// Receitas que usam este ingrediente — ADMIN_RECIPES (fonte editável do admin) + RECIPE_CATALOG
// (fonte do plano do cliente) partilham o mesmo `ingredientId` nas linhas de ingrediente.
function recipesUsingIngredient(ingredientId: number): string[] {
  const names = new Set<string>();
  for (const recipe of ADMIN_RECIPES) {
    if (recipe.ingredients?.some((line) => line.ingredientId === ingredientId)) {
      names.add(recipe.name ?? `#${recipe.id}`);
    }
  }
  for (const snapshot of Object.values(RECIPE_CATALOG)) {
    if (snapshot.ingredients?.some((line) => line.ingredientId === ingredientId)) {
      names.add(snapshot.name ?? `#${snapshot.recipeId}`);
    }
  }
  return Array.from(names);
}

export function deleteIngredient(id: number): MockResult<null> {
  const index = ADMIN_INGREDIENTS.findIndex((i) => i.id === id);
  if (index === -1) return errResult("LSA005_NOT_FOUND", "Ingrediente não encontrado.", 404);
  const usedIn = recipesUsingIngredient(id);
  if (usedIn.length > 0) {
    return errResult(
      "LSA021_INGREDIENT_IN_USE",
      `Este ingrediente é usado em ${usedIn.length} receita(s): ${usedIn.join(", ")}. Desativa-o em vez de eliminar.`,
      409,
    );
  }
  ADMIN_INGREDIENTS.splice(index, 1);
  return okResult(null);
}

// ── Receitas (F2-ADM-05) ────────────────────────────────────────────────
export function getRecipe(id: number): MockResult<Recipe> {
  const recipe = ADMIN_RECIPES.find((r) => r.id === id);
  if (!recipe) return errResult("LSA005_NOT_FOUND", "Receita não encontrada.", 404);
  return okResult(recipe);
}

type RecipeIngredientLine = NonNullable<Recipe["ingredients"]>[number];
type RecipeStepInput = NonNullable<Recipe["steps"]>[number];
type RecipeInput = {
  name?: string;
  description?: string | null;
  prepMinutes?: number;
  servings?: number;
  estimatedCostMt?: number | null;
  healthTags?: string[];
  macrosOverride?: Macros;
  ingredients: RecipeIngredientLine[];
  steps: RecipeStepInput[];
};

// Macros derivadas dos ingredientes × nutrição de ADMIN_INGREDIENTS (kcalPer100g etc. tratados
// como "por 100 unidades de quantity" no mock — sem conversão de unidades); macrosOverride do
// pedido tem sempre prioridade sobre as percentagens calculadas, kcal nunca é sobreposto (o
// contrato só permite override de Macros, não de kcal).
function computeMacrosFromIngredients(lines: RecipeIngredientLine[]): { kcal: number; macros: Macros } {
  let kcal = 0;
  const totals = { proteina: 0, carbs: 0, gordura: 0, fibra: 0 };
  for (const line of lines) {
    if (line.ingredientId == null || line.quantity == null) continue;
    const ingredient = findIngredient(line.ingredientId);
    if (!ingredient) continue;
    const factor = line.quantity / 100;
    kcal += (ingredient.kcalPer100g ?? 0) * factor;
    totals.proteina += (ingredient.proteinPer100g ?? 0) * factor;
    totals.carbs += (ingredient.carbsPer100g ?? 0) * factor;
    totals.gordura += (ingredient.fatPer100g ?? 0) * factor;
    totals.fibra += (ingredient.fiberPer100g ?? 0) * factor;
  }
  const totalMacroGrams = totals.proteina + totals.carbs + totals.gordura + totals.fibra || 1;
  const toPercent = (grams: number) => Math.round((grams / totalMacroGrams) * 100);
  return {
    kcal: Math.round(kcal),
    macros: {
      proteina: toPercent(totals.proteina),
      carbs: toPercent(totals.carbs),
      gordura: toPercent(totals.gordura),
      fibra: toPercent(totals.fibra),
    },
  };
}

function isDuplicateRecipeName(name: string, excludeId?: number): boolean {
  const n = name.trim().toLowerCase();
  return ADMIN_RECIPES.some((r) => r.id !== excludeId && (r.name ?? "").trim().toLowerCase() === n);
}

let nextRecipeId = 1000;

export function createRecipe(body: RecipeInput): MockResult<Recipe> {
  const name = body.name?.trim() ?? "";
  if (name.length < 2) {
    return errResult("LSA001_VALIDATION", "O nome da receita deve ter pelo menos 2 caracteres.", 400);
  }
  if (isDuplicateRecipeName(name)) {
    return errResult("LSA006_DUPLICATE", "Já existe uma receita com este nome.", 409);
  }
  const computed = computeMacrosFromIngredients(body.ingredients ?? []);
  const recipe: Recipe = {
    id: nextRecipeId++,
    name,
    description: body.description ?? null,
    prepMinutes: body.prepMinutes ?? 0,
    servings: body.servings ?? 1,
    estimatedCostMt: body.estimatedCostMt ?? null,
    healthTags: body.healthTags ?? [],
    kcal: computed.kcal,
    macros: body.macrosOverride ?? computed.macros,
    status: "DRAFT",
    likeCount: 0,
    dislikeCount: 0,
    ingredients: body.ingredients ?? [],
    steps: body.steps ?? [],
  };
  ADMIN_RECIPES.push(recipe);
  return okResult(recipe, 201);
}

export function updateRecipe(id: number, body: RecipeInput): MockResult<Recipe> {
  const recipe = ADMIN_RECIPES.find((r) => r.id === id);
  if (!recipe) return errResult("LSA005_NOT_FOUND", "Receita não encontrada.", 404);
  const name = body.name?.trim() ?? recipe.name ?? "";
  if (name.length < 2) {
    return errResult("LSA001_VALIDATION", "O nome da receita deve ter pelo menos 2 caracteres.", 400);
  }
  if (isDuplicateRecipeName(name, id)) {
    return errResult("LSA006_DUPLICATE", "Já existe uma receita com este nome.", 409);
  }
  const ingredients = body.ingredients ?? recipe.ingredients ?? [];
  const computed = computeMacrosFromIngredients(ingredients);
  recipe.name = name;
  recipe.description = body.description ?? null;
  recipe.prepMinutes = body.prepMinutes ?? recipe.prepMinutes;
  recipe.servings = body.servings ?? recipe.servings;
  recipe.estimatedCostMt = body.estimatedCostMt ?? null;
  recipe.healthTags = body.healthTags ?? [];
  recipe.kcal = computed.kcal;
  recipe.macros = body.macrosOverride ?? computed.macros;
  recipe.ingredients = ingredients;
  recipe.steps = body.steps ?? recipe.steps ?? [];
  return okResult(recipe);
}

export function deleteRecipe(id: number): MockResult<null> {
  const index = ADMIN_RECIPES.findIndex((r) => r.id === id);
  if (index === -1) return errResult("LSA005_NOT_FOUND", "Receita não encontrada.", 404);
  ADMIN_RECIPES.splice(index, 1);
  return okResult(null);
}

// FE-D06: guarda os últimos motivos de troca (FE-Q06) por receita substituída, para o admin ver
// "motivos de troca mais recentes" — antes disto, `reason` era recebido e imediatamente descartado
// em proposeOrApplySwap.
const recentSwapReasons = new Map<number, { reason: string; at: string }[]>();
const MAX_SWAP_REASONS_PER_RECIPE = 5;

function recordSwapReason(recipeId: number | undefined, reason: string | undefined): void {
  if (recipeId === undefined || !reason?.trim()) return;
  const list = recentSwapReasons.get(recipeId) ?? [];
  list.unshift({ reason: reason.trim(), at: new Date().toISOString() });
  recentSwapReasons.set(recipeId, list.slice(0, MAX_SWAP_REASONS_PER_RECIPE));
}

export function getRecentSwapReasons(recipeId: number): { reason: string; at: string }[] {
  return recentSwapReasons.get(recipeId) ?? [];
}

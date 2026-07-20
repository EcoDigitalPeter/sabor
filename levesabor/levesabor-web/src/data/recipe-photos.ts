// FE-Q01 · recipe-photos — lookup presentacional entre RecipeSnapshot.recipeId (fonte:
// RECIPE_CATALOG, src/mocks/fixtures.ts) e a foto gerada em public/images/receitas/<slug>/photo.webp.
// NÃO faz parte do contrato OpenAPI (RecipeSnapshot não tem campo de imagem) — mesmo padrão
// presentacional do DishGallery/dish-gallery-data.ts na landing. Chave por recipeId (estável,
// já existe em MealPlanEntry.recipe.recipeId) em vez de nome (texto, mais frágil a edições de copy).
// Só entram aqui as receitas com foto já gerada — as restantes caem no fallback em MealCard/RecipeHero.
// FE-Q07: as 18 receitas de RECIPE_CATALOG (src/mocks/fixtures.ts) têm foto.
export const RECIPE_PHOTOS: Partial<Record<number, string>> = {
  1: "/images/receitas/papinha-de-amendoim-com-banana/photo.webp",
  2: "/images/receitas/pao-com-ovo-estrelado-e-cha-de-limao/photo.webp",
  3: "/images/receitas/mingau-de-milho-branco-com-canela/photo.webp",
  4: "/images/receitas/omeleta-de-vegetais-com-pao-integral/photo.webp",
  5: "/images/receitas/xima-suave-com-feijao-nhemba/photo.webp",
  6: "/images/receitas/xima-com-matapa-e-camarao/photo.webp",
  7: "/images/receitas/feijao-nhemba-com-arroz-e-couve/photo.webp",
  8: "/images/receitas/caril-de-peixe-garoupa-com-arroz/photo.webp",
  9: "/images/receitas/frango-a-zambeziana-com-arroz-e-salada/photo.webp",
  10: "/images/receitas/arroz-de-coco-com-feijao-jugo/photo.webp",
  11: "/images/receitas/mandioca-cozida-com-molho-de-amendoim/photo.webp",
  12: "/images/receitas/salada-de-quiabo-com-xima-e-ovo/photo.webp",
  13: "/images/receitas/caril-de-galinha-com-batata-doce/photo.webp",
  14: "/images/receitas/peixe-grelhado-com-legumes-salteados/photo.webp",
  15: "/images/receitas/feijao-jugo-com-arroz-e-tomate/photo.webp",
  16: "/images/receitas/matapa-com-xima-jantar-leve/photo.webp",
  17: "/images/receitas/sopa-de-mandioca-com-frango-desfiado/photo.webp",
  18: "/images/receitas/frango-grelhado-com-salada-de-repolho/photo.webp",
};

export function getRecipePhoto(recipeId: number | undefined): string | undefined {
  return recipeId !== undefined ? RECIPE_PHOTOS[recipeId] : undefined;
}

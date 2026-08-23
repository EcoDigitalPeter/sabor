// FE-Q01 · recipe-photos — lookup presentacional entre o nome da receita (RecipeSnapshot.name /
// RecipeSummary.name, sempre presente independentemente do backend) e a foto gerada em
// public/images/receitas/<slug>/photo.webp.
// NÃO faz parte do contrato OpenAPI (RecipeSnapshot não tem campo de imagem) — mesmo padrão
// presentacional do DishGallery/dish-gallery-data.ts na landing.
// Chave por slug do NOME (não pelo id numérico) — o id é uma PK gerada pela BD (SERIAL no
// backend real), não garantidamente igual à ordem de RECIPE_CATALOG do mock; o nome da receita
// é o único identificador estável entre mock, seed SQL e qualquer reseed futuro (docs/superpowers/
// plans/2026-08-23-frontend-sem-hardcoded-consumir-backend-real.md, Tarefa 2).
// Só entram aqui as receitas com foto já gerada — as restantes caem no fallback em MealCard/RecipeHero.
// FE-Q07: as 18 receitas de RECIPE_CATALOG (src/mocks/fixtures.ts) têm foto.
export const RECIPE_PHOTOS: Partial<Record<string, string>> = {
  "papinha-de-amendoim-com-banana": "/images/receitas/papinha-de-amendoim-com-banana/photo.webp",
  "pao-com-ovo-estrelado-e-cha-de-limao": "/images/receitas/pao-com-ovo-estrelado-e-cha-de-limao/photo.webp",
  "mingau-de-milho-branco-com-canela": "/images/receitas/mingau-de-milho-branco-com-canela/photo.webp",
  "omeleta-de-vegetais-com-pao-integral": "/images/receitas/omeleta-de-vegetais-com-pao-integral/photo.webp",
  "xima-suave-com-feijao-nhemba": "/images/receitas/xima-suave-com-feijao-nhemba/photo.webp",
  "xima-com-matapa-e-camarao": "/images/receitas/xima-com-matapa-e-camarao/photo.webp",
  "feijao-nhemba-com-arroz-e-couve": "/images/receitas/feijao-nhemba-com-arroz-e-couve/photo.webp",
  "caril-de-peixe-garoupa-com-arroz": "/images/receitas/caril-de-peixe-garoupa-com-arroz/photo.webp",
  "frango-a-zambeziana-com-arroz-e-salada": "/images/receitas/frango-a-zambeziana-com-arroz-e-salada/photo.webp",
  "arroz-de-coco-com-feijao-jugo": "/images/receitas/arroz-de-coco-com-feijao-jugo/photo.webp",
  "mandioca-cozida-com-molho-de-amendoim": "/images/receitas/mandioca-cozida-com-molho-de-amendoim/photo.webp",
  "salada-de-quiabo-com-xima-e-ovo": "/images/receitas/salada-de-quiabo-com-xima-e-ovo/photo.webp",
  "caril-de-galinha-com-batata-doce": "/images/receitas/caril-de-galinha-com-batata-doce/photo.webp",
  "peixe-grelhado-com-legumes-salteados": "/images/receitas/peixe-grelhado-com-legumes-salteados/photo.webp",
  "feijao-jugo-com-arroz-e-tomate": "/images/receitas/feijao-jugo-com-arroz-e-tomate/photo.webp",
  "matapa-com-xima-jantar-leve": "/images/receitas/matapa-com-xima-jantar-leve/photo.webp",
  "sopa-de-mandioca-com-frango-desfiado": "/images/receitas/sopa-de-mandioca-com-frango-desfiado/photo.webp",
  "frango-grelhado-com-salada-de-repolho": "/images/receitas/frango-grelhado-com-salada-de-repolho/photo.webp",
};

// Mesma normalização usada para gerar os nomes de pasta em public/images/receitas/ a partir do
// nome da receita: minúsculas, acentos removidos (NFD + strip de diacríticos), tudo o que não for
// letra/número vira "-", travessões duplicados/nas pontas colapsados.
function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getRecipePhoto(name: string | undefined): string | undefined {
  return name ? RECIPE_PHOTOS[slugify(name)] : undefined;
}

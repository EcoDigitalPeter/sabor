-- DB-06 · Ingredientes de desenvolvimento — copiados de
-- levesabor/levesabor-web/src/mocks/fixtures.ts.
--
-- Os IDs sao preservados (OVERRIDING SYSTEM VALUE) para corresponderem exactamente aos
-- ingredientId usados dentro de RECIPE_CATALOG no mesmo ficheiro, que V9004 referencia
-- directamente em recipe_ingredients.
--
-- Nutricao/categoria/preco REAIS (copiados de ADMIN_INGREDIENTS no mock): ids 9, 14, 19, 21, 23.
-- Para os restantes 23 ingredientes, o mock só define nome e unidade (dentro das linhas de
-- ingredientes de cada receita em RECIPE_CATALOG) — nao ha nutricao/preco mockados para eles.
-- Em vez de inventar valores nutricionais plausiveis, ficam com o default de coluna (0) e
-- reference_price_mt a NULL; category é uma classificacao alimentar generica (nao inventa
-- dados de produto, so agrupa por tipo) para o catalogo dev nao ficar com 23 linhas
-- "sem categoria".
insert into ingredients (id, name, category, base_unit, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, reference_price_mt, active)
overriding system value
values
    (1,  'Amendoim moído', 'Leguminosas e Oleaginosas', 'g', 0, 0, 0, 0, 0, null, true),
    (2,  'Banana', 'Fruta', 'unidade', 0, 0, 0, 0, 0, null, true),
    (3,  'Água', 'Bebidas', 'ml', 0, 0, 0, 0, 0, null, true),
    (4,  'Pão', 'Padaria', 'unidade', 0, 0, 0, 0, 0, null, true),
    (5,  'Ovo', 'Proteína', 'unidade', 0, 0, 0, 0, 0, null, true),
    (6,  'Óleo de cozinha', 'Gorduras e Óleos', 'ml', 0, 0, 0, 0, 0, null, true),
    (7,  'Chá (folhas ou saqueta)', 'Bebidas', 'saqueta', 0, 0, 0, 0, 0, null, true),
    (8,  'Limão', 'Fruta', 'unidade', 0, 0, 0, 0, 0, null, true),
    (9,  'Farinha de milho (fuba)', 'Cereais e Farinhas', 'kg', 365, 9, 76, 3.5, 7, 60, true),
    (10, 'Canela em pau', 'Especiarias', 'unidade', 0, 0, 0, 0, 0, null, true),
    (11, 'Tomate', 'Legumes', 'g', 0, 0, 0, 0, 0, null, true),
    (12, 'Cebola', 'Legumes', 'g', 0, 0, 0, 0, 0, null, true),
    (13, 'Pão integral', 'Padaria', 'fatia', 0, 0, 0, 0, 0, null, true),
    (14, 'Feijão nhemba', 'Leguminosas', 'kg', 340, 24, 60, 1.5, 15, 90, true),
    (15, 'Folhas de mandioca (matapa)', 'Legumes', 'g', 0, 0, 0, 0, 0, null, true),
    (16, 'Camarão', 'Proteína', 'g', 0, 0, 0, 0, 0, null, true),
    (17, 'Leite de coco', 'Gorduras e Óleos', 'ml', 0, 0, 0, 0, 0, null, true),
    (18, 'Alho', 'Especiarias', 'g', 0, 0, 0, 0, 0, null, true),
    (19, 'Arroz', 'Cereais e Farinhas', 'kg', 360, 7, 79, 0.6, 1.3, 75, true),
    (20, 'Couve', 'Legumes', 'g', 0, 0, 0, 0, 0, null, true),
    (21, 'Peixe (garoupa)', 'Proteína', 'kg', 105, 21, 0, 2, 0, 280, true),
    (22, 'Piripiri', 'Especiarias', 'g', 0, 0, 0, 0, 0, null, true),
    (23, 'Frango', 'Proteína', 'kg', 165, 31, 0, 3.6, 0, 220, true),
    (24, 'Feijão jugo', 'Leguminosas', 'g', 0, 0, 0, 0, 0, null, true),
    (25, 'Mandioca', 'Tubérculos', 'g', 0, 0, 0, 0, 0, null, true),
    (26, 'Quiabo', 'Legumes', 'g', 0, 0, 0, 0, 0, null, true),
    (27, 'Batata-doce', 'Tubérculos', 'g', 0, 0, 0, 0, 0, null, true),
    (28, 'Repolho', 'Legumes', 'g', 0, 0, 0, 0, 0, null, true);

-- Reposiciona a sequencia da identity coluna depois dos inserts com id explicito, para que a
-- proxima receita/ingrediente criado pela app (via API) nao colida com estes IDs.
select setval(pg_get_serial_sequence('ingredients', 'id'), (select max(id) from ingredients));

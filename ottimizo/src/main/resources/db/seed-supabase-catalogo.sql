-- Seed de catálogo (ingredientes + receitas) para correr DIRECTAMENTE contra a Supabase
-- (dev ou prod) via SQL Editor do dashboard ou psql — NÃO é uma migração Flyway
-- (não fica em db/migration nem em db/dev-seed) e não corre automaticamente no arranque
-- da app. Corre-se manualmente, uma vez, quando o catálogo estiver vazio.
--
-- Dados: reaproveitados de db/dev-seed/V9003__dev_seed_ingredients.sql e
-- V9004__dev_seed_recipes.sql (por sua vez copiados de
-- levesabor/levesabor-web/src/mocks/fixtures.ts — RECIPE_CATALOG/ADMIN_INGREDIENTS).
-- Mesma curadoria: nutrição real só nos 5 ingredientes que a têm no mock (os
-- restantes 23 ficam a 0/null, documentado lá); receita 2 fica DRAFT por não ter
-- healthTags no mock; receita 7 fica DRAFT por decisão editorial do mock
-- (ADMIN_RECIPES); a receita de teste 9999 ("Bolo de arroz, rascunho") é
-- propositadamente incompleta no mock e não é semeada aqui.
--
-- Idempotente: usa ON CONFLICT (ingredientes, que têm índice único em lower(name))
-- e WHERE NOT EXISTS (receitas/recipe_ingredients/recipe_steps, sem índice único de
-- nome) — corre em segurança mais do que uma vez sem duplicar linhas. Não assume IDs
-- explícitos: usa sempre o identity da BD e faz join por nome, para funcionar tanto
-- numa base vazia como numa já parcialmente semeada.

begin;

-- ============================================================================
-- 1) Ingredientes (28)
-- ============================================================================
insert into ingredients (name, category, base_unit, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, reference_price_mt, active)
values
    ('Amendoim moído', 'Leguminosas e Oleaginosas', 'g', 0, 0, 0, 0, 0, null, true),
    ('Banana', 'Fruta', 'unidade', 0, 0, 0, 0, 0, null, true),
    ('Água', 'Bebidas', 'ml', 0, 0, 0, 0, 0, null, true),
    ('Pão', 'Padaria', 'unidade', 0, 0, 0, 0, 0, null, true),
    ('Ovo', 'Proteína', 'unidade', 0, 0, 0, 0, 0, null, true),
    ('Óleo de cozinha', 'Gorduras e Óleos', 'ml', 0, 0, 0, 0, 0, null, true),
    ('Chá (folhas ou saqueta)', 'Bebidas', 'saqueta', 0, 0, 0, 0, 0, null, true),
    ('Limão', 'Fruta', 'unidade', 0, 0, 0, 0, 0, null, true),
    ('Farinha de milho (fuba)', 'Cereais e Farinhas', 'kg', 365, 9, 76, 3.5, 7, 60, true),
    ('Canela em pau', 'Especiarias', 'unidade', 0, 0, 0, 0, 0, null, true),
    ('Tomate', 'Legumes', 'g', 0, 0, 0, 0, 0, null, true),
    ('Cebola', 'Legumes', 'g', 0, 0, 0, 0, 0, null, true),
    ('Pão integral', 'Padaria', 'fatia', 0, 0, 0, 0, 0, null, true),
    ('Feijão nhemba', 'Leguminosas', 'kg', 340, 24, 60, 1.5, 15, 90, true),
    ('Folhas de mandioca (matapa)', 'Legumes', 'g', 0, 0, 0, 0, 0, null, true),
    ('Camarão', 'Proteína', 'g', 0, 0, 0, 0, 0, null, true),
    ('Leite de coco', 'Gorduras e Óleos', 'ml', 0, 0, 0, 0, 0, null, true),
    ('Alho', 'Especiarias', 'g', 0, 0, 0, 0, 0, null, true),
    ('Arroz', 'Cereais e Farinhas', 'kg', 360, 7, 79, 0.6, 1.3, 75, true),
    ('Couve', 'Legumes', 'g', 0, 0, 0, 0, 0, null, true),
    ('Peixe (garoupa)', 'Proteína', 'kg', 105, 21, 0, 2, 0, 280, true),
    ('Piripiri', 'Especiarias', 'g', 0, 0, 0, 0, 0, null, true),
    ('Frango', 'Proteína', 'kg', 165, 31, 0, 3.6, 0, 220, true),
    ('Feijão jugo', 'Leguminosas', 'g', 0, 0, 0, 0, 0, null, true),
    ('Mandioca', 'Tubérculos', 'g', 0, 0, 0, 0, 0, null, true),
    ('Quiabo', 'Legumes', 'g', 0, 0, 0, 0, 0, null, true),
    ('Batata-doce', 'Tubérculos', 'g', 0, 0, 0, 0, 0, null, true),
    ('Repolho', 'Legumes', 'g', 0, 0, 0, 0, 0, null, true)
on conflict (lower(name)) do nothing;

-- ============================================================================
-- 2) Receitas (18)
-- ============================================================================
insert into recipes (name, description, meal_tag, health_note, prep_minutes, servings, estimated_cost_mt, health_tags, kcal, protein_pct, carbs_pct, fat_pct, fiber_pct, macros_override, status)
select v.name, v.description, v.meal_tag, v.health_note, v.prep_minutes, v.servings, v.estimated_cost_mt, v.health_tags, v.kcal, v.protein_pct, v.carbs_pct, v.fat_pct, v.fiber_pct, true, v.status
from (values
    ('Papinha de amendoim com banana', null::text, 'Pequeno-almoço', null::text, 10, 1, 45::numeric, array['vegetariana','sem_gluten','acucar_controlado']::text[], 320::numeric, 12, 58, 24, 6, 'PUBLISHED'),
    ('Pão com ovo estrelado e chá de limão', null, 'Pequeno-almoço', null, 12, 1, null, array[]::text[], 380, 18, 42, 32, 8, 'DRAFT'),
    ('Mingau de milho branco com canela', null, 'Pequeno-almoço', null, 15, 1, 35, array['vegetariana','sem_gluten','acucar_controlado'], 290, 8, 66, 16, 10, 'PUBLISHED'),
    ('Omeleta de vegetais com fatia de pão integral', null, 'Pequeno-almoço', 'Baixo em sódio — recomendado para hipertensão, sempre com acompanhamento médico.', 10, 1, 55, array['baixo_sodio'], 350, 20, 38, 34, 8, 'PUBLISHED'),
    ('Xima suave com feijão nhemba (pequeno-almoço reforçado)', null, 'Pequeno-almoço', null, 20, 1, 50, array['sem_gluten','vegetariana'], 400, 16, 52, 14, 18, 'PUBLISHED'),
    ('Xima com matapa e camarão', 'Prato tradicional do sul de Moçambique com camarão e leite de coco.', 'Almoço', null, 40, 1, 180, array['sem_gluten'], 620, 24, 48, 22, 6, 'PUBLISHED'),
    ('Feijão nhemba com arroz e couve', 'Feijão nhemba com arroz e couve, opção vegetariana e económica.', 'Almoço', null, 35, 1, 90, array['sem_gluten','vegetariana'], 560, 20, 56, 16, 8, 'DRAFT'),
    ('Caril de peixe (garoupa) com arroz', null, 'Almoço', null, 45, 1, 220, array['sem_gluten'], 640, 28, 44, 22, 6, 'PUBLISHED'),
    ('Frango à zambeziana com arroz e salada', 'Frango marinado em limão e alho, assado à moda da Zambézia.', 'Almoço', null, 50, 1, 240, array['sem_gluten'], 700, 30, 42, 22, 6, 'PUBLISHED'),
    ('Arroz de coco com feijão jugo', null, 'Almoço', null, 35, 1, 140, array['sem_gluten','vegetariana'], 610, 16, 60, 18, 6, 'PUBLISHED'),
    ('Mandioca cozida com molho de amendoim e folhas', null, 'Almoço', null, 40, 1, 110, array['sem_gluten','vegetariana'], 580, 14, 58, 22, 6, 'PUBLISHED'),
    ('Salada de quiabo com xima e ovo', null, 'Almoço', 'Baixo em sódio — adequado para hipertensão, sempre com acompanhamento médico.', 30, 1, 95, array['sem_gluten','baixo_sodio'], 480, 18, 52, 20, 10, 'PUBLISHED'),
    ('Caril de galinha com batata-doce', null, 'Jantar', null, 45, 1, 200, array['sem_gluten'], 560, 26, 46, 22, 6, 'PUBLISHED'),
    ('Peixe grelhado com legumes salteados', 'Peixe grelhado simples com legumes salteados, baixo em sódio.', 'Jantar', 'Baixo em sódio — recomendado para hipertensão, sempre com acompanhamento médico.', 30, 1, 210, array['sem_gluten','baixo_sodio'], 500, 32, 34, 24, 10, 'PUBLISHED'),
    ('Feijão jugo com arroz e tomate', null, 'Jantar', null, 35, 1, 100, array['sem_gluten','vegetariana'], 540, 18, 58, 16, 8, 'PUBLISHED'),
    ('Matapa com xima (jantar leve)', null, 'Jantar', null, 35, 1, 130, array['sem_gluten'], 470, 16, 48, 26, 10, 'PUBLISHED'),
    ('Sopa de mandioca com legumes e frango desfiado', null, 'Jantar', 'Baixo em sódio — recomendado para hipertensão, sempre com acompanhamento médico.', 40, 1, 120, array['sem_gluten','baixo_sodio'], 430, 22, 50, 16, 12, 'PUBLISHED'),
    ('Frango grelhado com salada de repolho', null, 'Jantar', null, 30, 1, 190, array['sem_gluten'], 480, 34, 32, 24, 10, 'PUBLISHED')
) as v(name, description, meal_tag, health_note, prep_minutes, servings, estimated_cost_mt, health_tags, kcal, protein_pct, carbs_pct, fat_pct, fiber_pct, status)
where not exists (select 1 from recipes r where r.name = v.name);

-- ============================================================================
-- 3) Ingredientes de cada receita (recipe_ingredients)
-- ============================================================================
insert into recipe_ingredients (recipe_id, ingredient_id, name_snapshot, quantity, unit)
select r.id, i.id, v.name_snapshot, v.quantity, v.unit
from (values
    ('Papinha de amendoim com banana', 'Amendoim moído', 'Amendoim moído', 40::numeric, 'g'),
    ('Papinha de amendoim com banana', 'Banana', 'Banana', 1, 'unidade'),
    ('Papinha de amendoim com banana', 'Água', 'Água', 200, 'ml'),

    ('Pão com ovo estrelado e chá de limão', 'Pão', 'Pão', 1, 'unidade'),
    ('Pão com ovo estrelado e chá de limão', 'Ovo', 'Ovo', 1, 'unidade'),
    ('Pão com ovo estrelado e chá de limão', 'Óleo de cozinha', 'Óleo de cozinha', 5, 'ml'),
    ('Pão com ovo estrelado e chá de limão', 'Chá (folhas ou saqueta)', 'Chá (folhas ou saqueta)', 1, 'saqueta'),
    ('Pão com ovo estrelado e chá de limão', 'Limão', 'Limão', 0.5, 'unidade'),

    ('Mingau de milho branco com canela', 'Farinha de milho (fuba)', 'Farinha de milho (fuba)', 60, 'g'),
    ('Mingau de milho branco com canela', 'Água', 'Água', 300, 'ml'),
    ('Mingau de milho branco com canela', 'Canela em pau', 'Canela em pau', 1, 'unidade'),

    ('Omeleta de vegetais com fatia de pão integral', 'Ovo', 'Ovo', 2, 'unidade'),
    ('Omeleta de vegetais com fatia de pão integral', 'Tomate', 'Tomate', 50, 'g'),
    ('Omeleta de vegetais com fatia de pão integral', 'Cebola', 'Cebola', 30, 'g'),
    ('Omeleta de vegetais com fatia de pão integral', 'Pão integral', 'Pão integral', 1, 'fatia'),
    ('Omeleta de vegetais com fatia de pão integral', 'Óleo de cozinha', 'Óleo de cozinha', 5, 'ml'),

    ('Xima suave com feijão nhemba (pequeno-almoço reforçado)', 'Farinha de milho (fuba)', 'Farinha de milho (fuba)', 80, 'g'),
    ('Xima suave com feijão nhemba (pequeno-almoço reforçado)', 'Feijão nhemba', 'Feijão nhemba cozido', 100, 'g'),
    ('Xima suave com feijão nhemba (pequeno-almoço reforçado)', 'Água', 'Água', 200, 'ml'),

    ('Xima com matapa e camarão', 'Farinha de milho (fuba)', 'Farinha de milho (fuba)', 120, 'g'),
    ('Xima com matapa e camarão', 'Folhas de mandioca (matapa)', 'Folhas de mandioca (matapa)', 150, 'g'),
    ('Xima com matapa e camarão', 'Camarão', 'Camarão', 100, 'g'),
    ('Xima com matapa e camarão', 'Leite de coco', 'Leite de coco', 100, 'ml'),
    ('Xima com matapa e camarão', 'Alho', 'Alho', 5, 'g'),

    ('Feijão nhemba com arroz e couve', 'Feijão nhemba', 'Feijão nhemba', 120, 'g'),
    ('Feijão nhemba com arroz e couve', 'Arroz', 'Arroz', 100, 'g'),
    ('Feijão nhemba com arroz e couve', 'Couve', 'Couve', 80, 'g'),
    ('Feijão nhemba com arroz e couve', 'Cebola', 'Cebola', 30, 'g'),

    ('Caril de peixe (garoupa) com arroz', 'Peixe (garoupa)', 'Peixe (garoupa)', 150, 'g'),
    ('Caril de peixe (garoupa) com arroz', 'Arroz', 'Arroz', 100, 'g'),
    ('Caril de peixe (garoupa) com arroz', 'Leite de coco', 'Leite de coco', 80, 'ml'),
    ('Caril de peixe (garoupa) com arroz', 'Tomate', 'Tomate', 60, 'g'),
    ('Caril de peixe (garoupa) com arroz', 'Piripiri', 'Piripiri', 2, 'g'),

    ('Frango à zambeziana com arroz e salada', 'Frango', 'Frango', 200, 'g'),
    ('Frango à zambeziana com arroz e salada', 'Leite de coco', 'Leite de coco', 60, 'ml'),
    ('Frango à zambeziana com arroz e salada', 'Limão', 'Limão', 1, 'unidade'),
    ('Frango à zambeziana com arroz e salada', 'Alho', 'Alho', 8, 'g'),
    ('Frango à zambeziana com arroz e salada', 'Arroz', 'Arroz', 100, 'g'),

    ('Arroz de coco com feijão jugo', 'Arroz', 'Arroz', 120, 'g'),
    ('Arroz de coco com feijão jugo', 'Leite de coco', 'Leite de coco', 100, 'ml'),
    ('Arroz de coco com feijão jugo', 'Feijão jugo', 'Feijão jugo', 100, 'g'),

    ('Mandioca cozida com molho de amendoim e folhas', 'Mandioca', 'Mandioca', 250, 'g'),
    ('Mandioca cozida com molho de amendoim e folhas', 'Amendoim moído', 'Amendoim moído', 40, 'g'),
    ('Mandioca cozida com molho de amendoim e folhas', 'Folhas de mandioca (matapa)', 'Folhas de mandioca (matapa)', 100, 'g'),

    ('Salada de quiabo com xima e ovo', 'Quiabo', 'Quiabo', 150, 'g'),
    ('Salada de quiabo com xima e ovo', 'Farinha de milho (fuba)', 'Farinha de milho (fuba)', 80, 'g'),
    ('Salada de quiabo com xima e ovo', 'Ovo', 'Ovo', 1, 'unidade'),
    ('Salada de quiabo com xima e ovo', 'Tomate', 'Tomate', 40, 'g'),

    ('Caril de galinha com batata-doce', 'Frango', 'Frango', 180, 'g'),
    ('Caril de galinha com batata-doce', 'Batata-doce', 'Batata-doce', 150, 'g'),
    ('Caril de galinha com batata-doce', 'Leite de coco', 'Leite de coco', 80, 'ml'),
    ('Caril de galinha com batata-doce', 'Cebola', 'Cebola', 30, 'g'),

    ('Peixe grelhado com legumes salteados', 'Peixe (garoupa)', 'Peixe (garoupa)', 180, 'g'),
    ('Peixe grelhado com legumes salteados', 'Couve', 'Couve', 80, 'g'),
    ('Peixe grelhado com legumes salteados', 'Tomate', 'Tomate', 50, 'g'),
    ('Peixe grelhado com legumes salteados', 'Limão', 'Limão', 0.5, 'unidade'),

    ('Feijão jugo com arroz e tomate', 'Feijão jugo', 'Feijão jugo', 120, 'g'),
    ('Feijão jugo com arroz e tomate', 'Arroz', 'Arroz', 90, 'g'),
    ('Feijão jugo com arroz e tomate', 'Tomate', 'Tomate', 60, 'g'),

    ('Matapa com xima (jantar leve)', 'Folhas de mandioca (matapa)', 'Folhas de mandioca (matapa)', 150, 'g'),
    ('Matapa com xima (jantar leve)', 'Leite de coco', 'Leite de coco', 80, 'ml'),
    ('Matapa com xima (jantar leve)', 'Farinha de milho (fuba)', 'Farinha de milho (fuba)', 70, 'g'),
    ('Matapa com xima (jantar leve)', 'Amendoim moído', 'Amendoim moído', 20, 'g'),

    ('Sopa de mandioca com legumes e frango desfiado', 'Mandioca', 'Mandioca', 150, 'g'),
    ('Sopa de mandioca com legumes e frango desfiado', 'Frango', 'Frango', 100, 'g'),
    ('Sopa de mandioca com legumes e frango desfiado', 'Cebola', 'Cebola', 30, 'g'),
    ('Sopa de mandioca com legumes e frango desfiado', 'Couve', 'Couve', 50, 'g'),

    ('Frango grelhado com salada de repolho', 'Frango', 'Frango', 180, 'g'),
    ('Frango grelhado com salada de repolho', 'Repolho', 'Repolho', 100, 'g'),
    ('Frango grelhado com salada de repolho', 'Tomate', 'Tomate', 40, 'g'),
    ('Frango grelhado com salada de repolho', 'Limão', 'Limão', 0.5, 'unidade')
) as v(recipe_name, ingredient_name, name_snapshot, quantity, unit)
join recipes r on r.name = v.recipe_name
join ingredients i on lower(i.name) = lower(v.ingredient_name)
where not exists (
    select 1 from recipe_ingredients ri where ri.recipe_id = r.id and ri.ingredient_id = i.id
);

-- ============================================================================
-- 4) Passos de preparo de cada receita (recipe_steps)
-- ============================================================================
insert into recipe_steps (recipe_id, step_order, text)
select r.id, v.step_order, v.text
from (values
    ('Papinha de amendoim com banana', 1, 'Tosta o amendoim moído numa panela seca por 2 minutos.'),
    ('Papinha de amendoim com banana', 2, 'Junta a água aos poucos, mexendo até engrossar.'),
    ('Papinha de amendoim com banana', 3, 'Corta a banana em rodelas e serve por cima.'),

    ('Pão com ovo estrelado e chá de limão', 1, 'Aquece o óleo numa frigideira e estrela o ovo.'),
    ('Pão com ovo estrelado e chá de limão', 2, 'Corta o pão ao meio e coloca o ovo lá dentro.'),
    ('Pão com ovo estrelado e chá de limão', 3, 'Ferve água para o chá e espreme o limão antes de servir.'),

    ('Mingau de milho branco com canela', 1, 'Dissolve a fuba num pouco de água fria.'),
    ('Mingau de milho branco com canela', 2, 'Leva o resto da água a ferver com a canela.'),
    ('Mingau de milho branco com canela', 3, 'Junta a mistura de fuba, mexendo sempre até engrossar.'),

    ('Omeleta de vegetais com fatia de pão integral', 1, 'Bate os ovos e tempera sem sal, apenas ervas.'),
    ('Omeleta de vegetais com fatia de pão integral', 2, 'Refoga o tomate e a cebola em pouco óleo.'),
    ('Omeleta de vegetais com fatia de pão integral', 3, 'Junta os ovos batidos e deixa cozinhar em lume brando.'),
    ('Omeleta de vegetais com fatia de pão integral', 4, 'Serve com a fatia de pão integral.'),

    ('Xima suave com feijão nhemba (pequeno-almoço reforçado)', 1, 'Prepara a xima cozendo a fuba com água até ficar consistente.'),
    ('Xima suave com feijão nhemba (pequeno-almoço reforçado)', 2, 'Aquece o feijão nhemba já cozido.'),
    ('Xima suave com feijão nhemba (pequeno-almoço reforçado)', 3, 'Serve a xima com o feijão por cima.'),

    ('Xima com matapa e camarão', 1, 'Cozinha as folhas de matapa trituradas em lume brando.'),
    ('Xima com matapa e camarão', 2, 'Junta o leite de coco, o alho e o camarão, deixa apurar 15 minutos.'),
    ('Xima com matapa e camarão', 3, 'Prepara a xima à parte com a fuba e água.'),
    ('Xima com matapa e camarão', 4, 'Serve a xima acompanhada da matapa.'),

    ('Feijão nhemba com arroz e couve', 1, 'Coze o feijão nhemba até ficar macio.'),
    ('Feijão nhemba com arroz e couve', 2, 'Coze o arroz em água com uma pitada de sal.'),
    ('Feijão nhemba com arroz e couve', 3, 'Refoga a couve com a cebola.'),
    ('Feijão nhemba com arroz e couve', 4, 'Serve os três juntos no prato.'),

    ('Caril de peixe (garoupa) com arroz', 1, 'Tempera o peixe e deixa marinar 10 minutos.'),
    ('Caril de peixe (garoupa) com arroz', 2, 'Refoga o tomate, junta o leite de coco e o piripiri.'),
    ('Caril de peixe (garoupa) com arroz', 3, 'Adiciona o peixe e deixa cozinhar em lume brando 15 minutos.'),
    ('Caril de peixe (garoupa) com arroz', 4, 'Serve com arroz branco.'),

    ('Frango à zambeziana com arroz e salada', 1, 'Marina o frango com limão e alho por 30 minutos.'),
    ('Frango à zambeziana com arroz e salada', 2, 'Grelha o frango, pincelando com leite de coco.'),
    ('Frango à zambeziana com arroz e salada', 3, 'Serve com arroz branco e salada fresca.'),

    ('Arroz de coco com feijão jugo', 1, 'Coze o feijão jugo até amaciar.'),
    ('Arroz de coco com feijão jugo', 2, 'Cozinha o arroz com leite de coco em vez de água.'),
    ('Arroz de coco com feijão jugo', 3, 'Mistura o feijão jugo ao arroz antes de servir.'),

    ('Mandioca cozida com molho de amendoim e folhas', 1, 'Coze a mandioca até ficar macia.'),
    ('Mandioca cozida com molho de amendoim e folhas', 2, 'Prepara o molho de amendoim com um pouco de água.'),
    ('Mandioca cozida com molho de amendoim e folhas', 3, 'Refoga as folhas e junta ao molho.'),
    ('Mandioca cozida com molho de amendoim e folhas', 4, 'Serve a mandioca com o molho por cima.'),

    ('Salada de quiabo com xima e ovo', 1, 'Coze o quiabo em água sem sal.'),
    ('Salada de quiabo com xima e ovo', 2, 'Prepara a xima à parte.'),
    ('Salada de quiabo com xima e ovo', 3, 'Cozinha o ovo e corta o tomate em cubos.'),
    ('Salada de quiabo com xima e ovo', 4, 'Monta o prato com xima, quiabo, ovo e tomate.'),

    ('Caril de galinha com batata-doce', 1, 'Refoga a cebola e junta o frango em pedaços.'),
    ('Caril de galinha com batata-doce', 2, 'Adiciona o leite de coco e deixa apurar.'),
    ('Caril de galinha com batata-doce', 3, 'Junta a batata-doce cozida e serve quente.'),

    ('Peixe grelhado com legumes salteados', 1, 'Tempera o peixe apenas com limão e ervas.'),
    ('Peixe grelhado com legumes salteados', 2, 'Grelha o peixe dos dois lados.'),
    ('Peixe grelhado com legumes salteados', 3, 'Salteia a couve e o tomate em pouco óleo.'),
    ('Peixe grelhado com legumes salteados', 4, 'Serve o peixe com os legumes salteados.'),

    ('Feijão jugo com arroz e tomate', 1, 'Coze o feijão jugo até ficar macio.'),
    ('Feijão jugo com arroz e tomate', 2, 'Cozinha o arroz em água com uma pitada de sal.'),
    ('Feijão jugo com arroz e tomate', 3, 'Refoga o tomate e junta ao feijão.'),
    ('Feijão jugo com arroz e tomate', 4, 'Serve o feijão sobre o arroz.'),

    ('Matapa com xima (jantar leve)', 1, 'Cozinha as folhas de matapa trituradas com o leite de coco.'),
    ('Matapa com xima (jantar leve)', 2, 'Junta o amendoim moído e deixa apurar.'),
    ('Matapa com xima (jantar leve)', 3, 'Prepara a xima à parte e serve com a matapa.'),

    ('Sopa de mandioca com legumes e frango desfiado', 1, 'Coze o frango e desfia-o.'),
    ('Sopa de mandioca com legumes e frango desfiado', 2, 'Coze a mandioca e a cebola até amaciarem.'),
    ('Sopa de mandioca com legumes e frango desfiado', 3, 'Junta a couve e o frango desfiado, deixa apurar 5 minutos.'),

    ('Frango grelhado com salada de repolho', 1, 'Tempera o frango com limão e grelha até dourar.'),
    ('Frango grelhado com salada de repolho', 2, 'Corta o repolho e o tomate em tiras finas.'),
    ('Frango grelhado com salada de repolho', 3, 'Tempera a salada com um fio de azeite e serve com o frango.')
) as v(recipe_name, step_order, text)
join recipes r on r.name = v.recipe_name
where not exists (
    select 1 from recipe_steps rs where rs.recipe_id = r.id and rs.step_order = v.step_order
);

commit;

-- Verificação rápida depois de correr:
--   select count(*) from ingredients;      -- esperado: 28 (ou mais, se já havia outros)
--   select count(*) from recipes;          -- esperado: 18 (16 PUBLISHED + 2 DRAFT: ids/nomes 2 e 7)
--   select count(*) from recipe_ingredients;
--   select count(*) from recipe_steps;

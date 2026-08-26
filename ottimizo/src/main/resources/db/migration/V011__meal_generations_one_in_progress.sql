-- Corrida real observada em producao: dois pedidos concorrentes de geracao do
-- mesmo utilizador passavam ambos pela verificacao
-- existsByUserIdAndKindAndStatus (nao atomica -- classico TOCTOU) antes de
-- qualquer um committar, gastando duas chamadas reais a IA so' para um deles
-- falhar mais tarde com "duplicate key value violates unique constraint
-- ux_meal_plans_one_active". Mesmo padrao ja usado ali: indice unico parcial,
-- desta vez em meal_generations, torna a segunda tentativa concorrente
-- impossivel logo no INSERT (falha barata, antes de chamar a IA), em vez de
-- so' depois de todo o trabalho feito.
create unique index ux_meal_generations_one_in_progress
    on meal_generations (user_id, kind)
    where status = 'GENERATING';

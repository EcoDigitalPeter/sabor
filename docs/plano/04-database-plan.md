# 04 — Plano de Base de Dados (PostgreSQL)

> A BD corre no **Supabase usado exclusivamente como PostgreSQL gerido** — acesso por JDBC, schema `public`, gerido a 100% por **migrations Flyway** versionadas no repositório do backend (`src/main/resources/db/migration/`). Não usar Supabase Auth/Storage/Realtime/Edge Functions nem depender de RLS: migrar de fornecedor deve custar apenas trocar a connection string.

## 1. Convenções

- Nomes: tabelas e colunas em `snake_case`, tabelas no plural; PKs `bigint generated always as identity`; FKs `<tabela_singular>_id`.
- Timestamps: `created_at` / `updated_at` (`timestamptz`, default `now()`; `updated_at` mantido pela app via JPA auditing).
- Enums de domínio como `varchar` + `CHECK` (mais simples de evoluir do que tipos enum nativos).
- Dinheiro: `numeric(10,2)` em MT. Texto livre: `text` com `CHECK` de comprimento quando relevante.
- Soft state por coluna `status` (nunca apagar dados com histórico: users, stores suspendem-se).

## 2. Diagrama ER (texto)

```
users 1──1 client_profiles
users 1──* refresh_tokens
users 1──* meal_plans 1──* meal_plan_entries *──1 recipes (referência + snapshot jsonb)
users 1──* meal_feedback *──1 recipes
meal_plans 1──1 shopping_lists 1──* shopping_list_items *──1 ingredients
recipes 1──* recipe_ingredients *──1 ingredients
stores 1──* store_products *──1 products *──?1 ingredients   (Fase 2)
users 1──* import_jobs                                        (Fase 2)
users 1──* ai_generation_log ?──1 meal_plans
audit_log (referências fracas: actor_user_id, entity_type + entity_id)
```

## 3. Migrations Flyway

### `V1__auth_and_audit.sql` — Fase 1

```sql
create table users (
    id                      bigint generated always as identity primary key,
    name                    varchar(120)  not null,
    email                   varchar(160)  not null,
    password_hash           varchar(100)  not null,
    role                    varchar(16)   not null default 'CLIENTE'
                            check (role in ('CLIENTE','ADMIN')),
    status                  varchar(16)   not null default 'ACTIVE'
                            check (status in ('ACTIVE','SUSPENDED')),
    disclaimer_accepted_at  timestamptz,
    last_login_at           timestamptz,
    created_at              timestamptz   not null default now(),
    updated_at              timestamptz   not null default now()
);
create unique index ux_users_email on users (lower(email));
create index ix_users_created_at on users (created_at);

create table refresh_tokens (
    id          bigint generated always as identity primary key,
    user_id     bigint       not null references users(id) on delete cascade,
    token_hash  varchar(64)  not null,            -- sha-256 hex do token opaco
    expires_at  timestamptz  not null,
    revoked_at  timestamptz,
    created_at  timestamptz  not null default now()
);
create unique index ux_refresh_tokens_hash on refresh_tokens (token_hash);
create index ix_refresh_tokens_user on refresh_tokens (user_id);

create table audit_log (
    id             bigint generated always as identity primary key,
    actor_user_id  bigint      references users(id),
    action         varchar(64)  not null,          -- ex.: LOGIN_FAILED, USER_SUSPENDED, HEALTH_PROFILE_VIEWED
    entity_type    varchar(40),
    entity_id      bigint,
    detail         jsonb,
    correlation_id varchar(36),
    created_at     timestamptz  not null default now()
);
create index ix_audit_log_actor on audit_log (actor_user_id, created_at);
create index ix_audit_log_entity on audit_log (entity_type, entity_id);
```

### `V2__profiles_and_catalog.sql` — Fase 1

```sql
create table client_profiles (
    id               bigint generated always as identity primary key,
    user_id          bigint       not null unique references users(id) on delete cascade,
    goal             varchar(24)  not null
                     check (goal in ('PERDER_PESO','COMER_MELHOR','GANHAR_MASSA','GERIR_CONDICAO')),
    health_condition varchar(24)  not null
                     check (health_condition in ('NENHUMA','DIABETES_TIPO_2','HIPERTENSAO','DOENCA_CELIACA')),
    allergies        jsonb        not null default '[]'::jsonb,   -- ["amendoim", ...]
    budget_band      varchar(16)  check (budget_band in ('BAIXO','MEDIO','CONFORTAVEL')),
    meals_per_day    smallint     not null default 3 check (meals_per_day between 2 and 5),
    created_at       timestamptz  not null default now(),
    updated_at       timestamptz  not null default now()
);

create table ingredients (
    id               bigint generated always as identity primary key,
    name             varchar(120) not null,
    category         varchar(24)  not null
                     check (category in ('CEREAIS','PROTEINA','VEGETAIS','LEGUMINOSAS','TEMPEROS','OUTROS')),
    base_unit        varchar(8)   not null check (base_unit in ('G','ML','UN')),
    kcal_per_100     numeric(7,2) not null check (kcal_per_100 between 0 and 900),
    protein_per_100  numeric(6,2) not null default 0 check (protein_per_100 >= 0),
    carbs_per_100    numeric(6,2) not null default 0 check (carbs_per_100 >= 0),
    fat_per_100      numeric(6,2) not null default 0 check (fat_per_100 >= 0),
    fiber_per_100    numeric(6,2) not null default 0 check (fiber_per_100 >= 0),
    reference_price  numeric(10,2) check (reference_price > 0),   -- MT por unidade base ×100; opcional
    status           varchar(16)  not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE')),
    created_at       timestamptz  not null default now(),
    updated_at       timestamptz  not null default now()
);
create unique index ux_ingredients_name on ingredients (lower(name));

create table recipes (
    id              bigint generated always as identity primary key,
    name            varchar(160) not null,
    description     text,
    steps           jsonb        not null default '[]'::jsonb,    -- ["Passo 1...", "Passo 2..."]
    prep_minutes    smallint     check (prep_minutes between 1 and 480),
    servings        smallint     not null default 1 check (servings between 1 and 12),
    est_cost_band   varchar(16)  check (est_cost_band in ('BAIXO','MEDIO','ALTO')),
    health_tags     text[]       not null default '{}',           -- sem_gluten, baixo_sodio, acucar_controlado,
                                                                  -- alto_sodio, alto_acucar, vegetariana, ...
    kcal            numeric(7,2),                                 -- por porção (calculado ou override)
    protein_pct     smallint check (protein_pct between 0 and 100),
    carbs_pct       smallint check (carbs_pct between 0 and 100),
    fat_pct         smallint check (fat_pct between 0 and 100),
    fiber_pct       smallint check (fiber_pct between 0 and 100),
    macros_override boolean      not null default false,
    status          varchar(16)  not null default 'DRAFT' check (status in ('DRAFT','PUBLISHED')),
    created_at      timestamptz  not null default now(),
    updated_at      timestamptz  not null default now()
);
create unique index ux_recipes_name on recipes (lower(name));
create index ix_recipes_status on recipes (status);
create index ix_recipes_health_tags on recipes using gin (health_tags);

create table recipe_ingredients (
    id            bigint generated always as identity primary key,
    recipe_id     bigint      not null references recipes(id) on delete cascade,
    ingredient_id bigint      not null references ingredients(id),   -- sem cascade: bloqueia remoção em uso
    quantity      numeric(8,2) not null check (quantity > 0),
    unit          varchar(8)   not null check (unit in ('G','KG','ML','L','UN','COLHER','CHAVENA')),
    constraint ux_recipe_ingredient unique (recipe_id, ingredient_id)
);
create index ix_recipe_ingredients_ingredient on recipe_ingredients (ingredient_id);
```

### `V3__meal_plans_and_lists.sql` — Fase 1

```sql
create table meal_plans (
    id           bigint generated always as identity primary key,
    user_id      bigint      not null references users(id) on delete cascade,
    week_start   date        not null,
    status       varchar(16) not null default 'GENERATING'
                 check (status in ('GENERATING','READY','FAILED','ARCHIVED')),
    profile_snapshot jsonb   not null,        -- perfil no momento da geração
    failure_reason   text,
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now()
);
create index ix_meal_plans_user_status on meal_plans (user_id, status);
create index ix_meal_plans_created_at on meal_plans (created_at);
-- garante no máx. 1 plano "vivo" (GENERATING/READY) por utilizador
create unique index ux_meal_plans_one_live
    on meal_plans (user_id) where status in ('GENERATING','READY');

create table meal_plan_entries (
    id              bigint generated always as identity primary key,
    meal_plan_id    bigint      not null references meal_plans(id) on delete cascade,
    day_index       smallint    not null check (day_index between 0 and 6),
    meal_slot       varchar(16) not null
                    check (meal_slot in ('PEQUENO_ALMOCO','ALMOCO','JANTAR','LANCHE_1','LANCHE_2')),
    recipe_id       bigint      not null references recipes(id),
    recipe_snapshot jsonb       not null,     -- nome, kcal, macros, ingredientes, passos no momento da geração
    constraint ux_plan_day_slot unique (meal_plan_id, day_index, meal_slot)
);
create index ix_entries_plan on meal_plan_entries (meal_plan_id);

create table meal_feedback (
    id         bigint generated always as identity primary key,
    user_id    bigint      not null references users(id) on delete cascade,
    recipe_id  bigint      not null references recipes(id) on delete cascade,
    value      varchar(8)  not null check (value in ('LIKE','DISLIKE')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint ux_feedback_user_recipe unique (user_id, recipe_id)
);
create index ix_feedback_recipe on meal_feedback (recipe_id);

create table shopping_lists (
    id           bigint generated always as identity primary key,
    meal_plan_id bigint      not null unique references meal_plans(id) on delete cascade,
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now()
);

create table shopping_list_items (
    id               bigint generated always as identity primary key,
    shopping_list_id bigint       not null references shopping_lists(id) on delete cascade,
    ingredient_id    bigint       not null references ingredients(id),
    quantity         numeric(10,2) not null check (quantity > 0),
    unit             varchar(8)    not null,
    category         varchar(24)   not null,   -- desnormalizado p/ agrupar sem join
    checked          boolean       not null default false,
    constraint ux_list_ingredient_unit unique (shopping_list_id, ingredient_id, unit)
);
create index ix_list_items_list on shopping_list_items (shopping_list_id);

create table ai_generation_log (
    id                bigint generated always as identity primary key,
    user_id           bigint      not null references users(id),
    meal_plan_id      bigint      references meal_plans(id) on delete set null,
    model             varchar(60) not null,
    prompt_tokens     integer,
    completion_tokens integer,
    duration_ms       integer,
    outcome           varchar(16) not null check (outcome in ('SUCCESS','INVALID_OUTPUT','TIMEOUT','ERROR')),
    error_detail      text,
    created_at        timestamptz not null default now()
);
create index ix_ai_log_user_day on ai_generation_log (user_id, created_at);  -- p/ limite diário e métricas
```

### `V4__stores_products_imports.sql` — Fase 2

```sql
create table stores (
    id         bigint generated always as identity primary key,
    name       varchar(120) not null,
    city       varchar(80)  not null,
    district   varchar(80),
    contact    varchar(60),
    status     varchar(16)  not null default 'ACTIVE' check (status in ('ACTIVE','SUSPENDED')),
    created_at timestamptz  not null default now(),
    updated_at timestamptz  not null default now()
);
create unique index ux_stores_name_city on stores (lower(name), lower(city));

create table products (
    id            bigint generated always as identity primary key,
    name          varchar(160) not null,
    category      varchar(24)  not null
                  check (category in ('CEREAIS','PROTEINA','VEGETAIS','LEGUMINOSAS','TEMPEROS','OUTROS')),
    unit_label    varchar(40)  not null,          -- ex.: "1 kg", "500 g", "garrafa 750 ml"
    ingredient_id bigint       references ingredients(id) on delete set null,   -- ligação opcional ao domínio nutricional
    created_at    timestamptz  not null default now(),
    updated_at    timestamptz  not null default now()
);
create unique index ux_products_name on products (lower(name));
create index ix_products_ingredient on products (ingredient_id);

create table store_products (
    id         bigint generated always as identity primary key,
    store_id   bigint        not null references stores(id) on delete cascade,
    product_id bigint        not null references products(id) on delete cascade,
    price_mt   numeric(10,2) not null check (price_mt > 0),
    updated_at timestamptz   not null default now(),
    constraint ux_store_product unique (store_id, product_id)
);
create index ix_store_products_product on store_products (product_id);

create table import_jobs (
    id            bigint generated always as identity primary key,
    created_by    bigint      not null references users(id),
    filename      varchar(255) not null,
    status        varchar(16)  not null default 'VALIDATED'
                  check (status in ('VALIDATED','APPLIED','DISCARDED','FAILED')),
    total_rows    integer      not null default 0,
    valid_rows    integer      not null default 0,
    error_rows    integer      not null default 0,
    created_count integer,
    updated_count integer,
    errors        jsonb        not null default '[]'::jsonb,  -- [{row, column, message}]
    payload       jsonb,                                       -- linhas validadas, aplicadas na confirmação
    created_at    timestamptz  not null default now(),
    updated_at    timestamptz  not null default now()
);
create index ix_import_jobs_creator on import_jobs (created_by, created_at);
```

### `V5__seed.sql` — Fase 1

```sql
-- Admin inicial (password definida por placeholder Flyway ${seed_admin_bcrypt}, injetado por env var no arranque;
-- NUNCA um hash de password real versionado no repositório)
insert into users (name, email, password_hash, role, status, disclaimer_accepted_at)
values ('Admin Leve Sabor', 'admin@levesabor.co.mz', '${seed_admin_bcrypt}', 'ADMIN', 'ACTIVE', now());

-- Catálogo mínimo do MVP: ~30 ingredientes + ≥ 40 receitas moçambicanas PUBLISHED com tags e macros.
-- O conteúdo (nomes, nutrição, tags de saúde) é fornecido/validado pelo cliente do projeto — ver risco R2
-- no 05-implementation-roadmap.md. Estrutura dos INSERTs igual às tabelas de V2. Exemplos:
insert into ingredients (name, category, base_unit, kcal_per_100, protein_per_100, carbs_per_100, fat_per_100, fiber_per_100)
values ('Farinha de milho', 'CEREAIS', 'G', 362, 8.1, 76.9, 3.9, 7.3),
       ('Feijão nhemba seco', 'LEGUMINOSAS', 'G', 336, 23.5, 60.0, 1.3, 10.6),
       ('Couve', 'VEGETAIS', 'G', 32, 3.0, 5.4, 0.6, 3.6),
       ('Amendoim', 'LEGUMINOSAS', 'G', 567, 25.8, 16.1, 49.2, 8.5),
       ('Peixe (carapau)', 'PROTEINA', 'G', 114, 21.3, 0, 3.0, 0);
-- … receitas: 'Xima com couve refogada', 'Matapa de amendoim com peixe', 'Feijão nhemba com arroz',
--   'Caril de peixe com pouco sal', 'Frango grelhado com quiabo e xima', … (tags coerentes: sem_gluten,
--   baixo_sodio, acucar_controlado, …) + recipe_ingredients correspondentes.
```

## 4. Decisões de modelação (racional)

| Decisão | Racional |
|---|---|
| `recipe_snapshot` jsonb em `meal_plan_entries` | O plano entregue é imutável: edições do admin às receitas não reescrevem história (consistência + auditabilidade nutricional) |
| Índice parcial `ux_meal_plans_one_live` | Garante na BD (não só na app) que só existe 1 plano ativo/em geração por cliente |
| `recipe_ingredients.ingredient_id` **sem** cascade | Força a regra "ingrediente em uso não se remove" (LSA021) |
| Passos como jsonb (não tabela) | Passos não são pesquisáveis nem relacionais; simplifica o CRUD |
| `health_tags` text[] + GIN | Pré-filtro de segurança rápido (`where health_tags @> '{sem_gluten}'`) |
| `shopping_list_items.category` desnormalizado | Lista agrupa por categoria sem join, num payload só (poupança de dados móveis) |
| `products.ingredient_id` opcional | O catálogo comercial (Fase 2) evolui separado do nutricional; a ligação ativa FUT-03 quando existir |
| `import_jobs.payload` jsonb | O ciclo validar→confirmar não precisa de re-upload nem de re-parse |
| Sem RLS/policies do Supabase | Autorização vive no backend; a BD é portável para qualquer Postgres |

## 5. Volumetria e performance (estimativa inicial)

- Ordem de grandeza no 1.º ano: ≤ 10k users, ≤ 100k meal_plans, ≤ 3M meal_plan_entries — confortável num Postgres pequeno com os índices acima.
- Queries quentes cobertas: plano ativo (`ux_meal_plans_one_live`), lista por plano, limite diário de IA (`ix_ai_log_user_day`), métricas por data (`ix_meal_plans_created_at`, `ix_users_created_at`).
- `audit_log` e `ai_generation_log` crescem sem limite: prever job de arquivo/purga (> 12 meses) — **[Sugestão]** Futuro.

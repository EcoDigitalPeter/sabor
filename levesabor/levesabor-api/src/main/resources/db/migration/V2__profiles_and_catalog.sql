-- DB-02 · V2 perfis + catálogo nutricional — ver docs/plano/04-database-plan.md §3
create table client_profiles (
    id               bigint generated always as identity primary key,
    user_id          bigint       not null unique references users(id) on delete cascade,
    goal             varchar(24)  not null
                     check (goal in ('PERDER_PESO','COMER_MELHOR','GANHAR_MASSA','GERIR_CONDICAO')),
    health_condition varchar(24)  not null
                     check (health_condition in ('NENHUMA','DIABETES_TIPO_2','HIPERTENSAO','DOENCA_CELIACA')),
    allergies        jsonb        not null default '[]'::jsonb,
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
    reference_price  numeric(10,2) check (reference_price > 0),
    status           varchar(16)  not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE')),
    created_at       timestamptz  not null default now(),
    updated_at       timestamptz  not null default now()
);
create unique index ux_ingredients_name on ingredients (lower(name));

create table recipes (
    id              bigint generated always as identity primary key,
    name            varchar(160) not null,
    description     text,
    steps           jsonb        not null default '[]'::jsonb,
    prep_minutes    smallint     check (prep_minutes between 1 and 480),
    servings        smallint     not null default 1 check (servings between 1 and 12),
    est_cost_band   varchar(16)  check (est_cost_band in ('BAIXO','MEDIO','ALTO')),
    health_tags     text[]       not null default '{}',
    kcal            numeric(7,2),
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
    ingredient_id bigint      not null references ingredients(id),   -- sem cascade: bloqueia remoção em uso (LSA021)
    quantity      numeric(8,2) not null check (quantity > 0),
    unit          varchar(8)   not null check (unit in ('G','KG','ML','L','UN','COLHER','CHAVENA')),
    constraint ux_recipe_ingredient unique (recipe_id, ingredient_id)
);
create index ix_recipe_ingredients_ingredient on recipe_ingredients (ingredient_id);

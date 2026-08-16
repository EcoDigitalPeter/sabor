create table client_profiles (
    id bigint generated always as identity primary key,
    user_id bigint not null unique references users(id) on delete cascade,
    goal varchar(24) not null
        check (goal in ('PERDER_PESO', 'COMER_MELHOR', 'GANHAR_MASSA', 'GERIR_CONDICAO')),
    health_conditions text[] not null default '{}',
    health_condition_other varchar(160),
    allergies jsonb not null default '[]'::jsonb,
    food_exclusions jsonb not null default '[]'::jsonb,
    budget_band varchar(16) check (budget_band in ('BAIXO', 'MEDIO', 'CONFORTAVEL')),
    meals_per_day smallint not null default 3 check (meals_per_day between 2 and 5),
    household_size smallint not null default 1 check (household_size between 1 and 8),
    dietary_preferences text[] not null default '{}',
    shopping_province varchar(80),
    shopping_city varchar(80),
    shopping_neighborhood varchar(120),
    shopping_address_description varchar(180),
    medical_disclaimer_accepted boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table ingredients (
    id bigint generated always as identity primary key,
    name varchar(120) not null,
    category varchar(40) not null,
    base_unit varchar(16) not null,
    kcal_per_100g numeric(7,2) not null default 0 check (kcal_per_100g between 0 and 900),
    protein_per_100g numeric(7,2) not null default 0 check (protein_per_100g >= 0),
    carbs_per_100g numeric(7,2) not null default 0 check (carbs_per_100g >= 0),
    fat_per_100g numeric(7,2) not null default 0 check (fat_per_100g >= 0),
    fiber_per_100g numeric(7,2) not null default 0 check (fiber_per_100g >= 0),
    reference_price_mt numeric(10,2) check (reference_price_mt > 0),
    active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index ux_ingredients_name on ingredients (lower(name));

create table recipes (
    id bigint generated always as identity primary key,
    name varchar(160) not null,
    description text,
    meal_tag varchar(80),
    health_note text,
    prep_minutes smallint not null default 0 check (prep_minutes >= 0),
    servings smallint not null default 1 check (servings between 1 and 12),
    estimated_cost_mt numeric(10,2),
    health_tags text[] not null default '{}',
    kcal numeric(7,2),
    protein_pct smallint check (protein_pct between 0 and 100),
    carbs_pct smallint check (carbs_pct between 0 and 100),
    fat_pct smallint check (fat_pct between 0 and 100),
    fiber_pct smallint check (fiber_pct between 0 and 100),
    macros_override boolean not null default false,
    status varchar(16) not null default 'DRAFT' check (status in ('DRAFT', 'PUBLISHED')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index ux_recipes_name on recipes (lower(name));
create index ix_recipes_status on recipes (status);
create index ix_recipes_health_tags on recipes using gin (health_tags);

create table recipe_ingredients (
    id bigint generated always as identity primary key,
    recipe_id bigint not null references recipes(id) on delete cascade,
    ingredient_id bigint not null references ingredients(id),
    name_snapshot varchar(120),
    quantity numeric(10,2) not null check (quantity > 0),
    unit varchar(24) not null
);

create index ix_recipe_ingredients_recipe on recipe_ingredients (recipe_id);
create index ix_recipe_ingredients_ingredient on recipe_ingredients (ingredient_id);

create table recipe_steps (
    id bigint generated always as identity primary key,
    recipe_id bigint not null references recipes(id) on delete cascade,
    step_order smallint not null,
    text text not null,
    unique (recipe_id, step_order)
);

create table meal_feedback (
    id bigint generated always as identity primary key,
    user_id bigint not null references users(id) on delete cascade,
    recipe_id bigint not null references recipes(id) on delete cascade,
    value varchar(8) not null check (value in ('LIKE', 'DISLIKE', 'NONE')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (user_id, recipe_id)
);

create index ix_meal_feedback_recipe on meal_feedback (recipe_id);

create table recipe_swap_reasons (
    id bigint generated always as identity primary key,
    recipe_id bigint not null references recipes(id) on delete cascade,
    user_id bigint references users(id) on delete set null,
    reason varchar(140) not null,
    created_at timestamptz not null default now()
);

create index ix_recipe_swap_reasons_recipe on recipe_swap_reasons (recipe_id, created_at desc);

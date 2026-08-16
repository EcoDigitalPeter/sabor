create table meal_generations (
    id bigint generated always as identity primary key,
    user_id bigint not null references users(id) on delete cascade,
    status varchar(16) not null check (status in ('GENERATING', 'READY', 'FAILED')),
    meal_plan_id bigint,
    kind varchar(24) not null default 'MONTHLY_PLAN'
        check (kind in ('MONTHLY_PLAN', 'ADHOC_RECIPE')),
    error_code varchar(40),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index ix_meal_generations_user on meal_generations (user_id, created_at desc);

create table meal_plans (
    id bigint generated always as identity primary key,
    user_id bigint not null references users(id) on delete cascade,
    month_start date not null,
    status varchar(16) not null default 'ACTIVE' check (status in ('ACTIVE', 'ARCHIVED')),
    profile_snapshot jsonb not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index ix_meal_plans_user_status on meal_plans (user_id, status);
create unique index ux_meal_plans_one_active on meal_plans (user_id) where status = 'ACTIVE';

alter table meal_generations
    add constraint fk_meal_generations_plan foreign key (meal_plan_id) references meal_plans(id) on delete set null;

create table meal_plan_days (
    id bigint generated always as identity primary key,
    meal_plan_id bigint not null references meal_plans(id) on delete cascade,
    date date not null,
    weekday varchar(32),
    total_kcal numeric(7,2),
    target_kcal numeric(7,2),
    protein_pct smallint,
    carbs_pct smallint,
    fat_pct smallint,
    fiber_pct smallint,
    unique (meal_plan_id, date)
);

create table meal_plan_entries (
    id bigint generated always as identity primary key,
    meal_plan_day_id bigint not null references meal_plan_days(id) on delete cascade,
    meal_slot varchar(24) not null check (meal_slot in ('PEQUENO_ALMOCO', 'ALMOCO', 'JANTAR', 'LANCHE')),
    recipe_id bigint references recipes(id),
    recipe_snapshot jsonb not null,
    feedback varchar(8) not null default 'NONE' check (feedback in ('NONE', 'LIKE', 'DISLIKE')),
    completed boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (meal_plan_day_id, meal_slot)
);

create index ix_meal_plan_entries_day on meal_plan_entries (meal_plan_day_id);

create table shopping_lists (
    id bigint generated always as identity primary key,
    user_id bigint not null references users(id) on delete cascade,
    meal_plan_id bigint references meal_plans(id) on delete cascade,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (meal_plan_id)
);

create index ix_shopping_lists_user on shopping_lists (user_id);

create table shopping_list_items (
    id bigint generated always as identity primary key,
    shopping_list_id bigint not null references shopping_lists(id) on delete cascade,
    ingredient_id bigint references ingredients(id),
    ingredient_name varchar(120) not null,
    category varchar(40) not null,
    quantity numeric(10,2) not null check (quantity > 0),
    unit varchar(24) not null,
    checked boolean not null default false,
    have_quantity numeric(10,2) not null default 0 check (have_quantity >= 0),
    estimated_cost_mt numeric(10,2),
    origin varchar(16) not null check (origin in ('PLANO', 'MANUAL')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index ix_shopping_list_items_list on shopping_list_items (shopping_list_id, origin);

create table ad_hoc_recipe_requests (
    id bigint generated always as identity primary key,
    user_id bigint not null references users(id) on delete cascade,
    meal_slot varchar(24) not null check (meal_slot in ('PEQUENO_ALMOCO', 'ALMOCO', 'JANTAR', 'LANCHE')),
    goal varchar(24),
    note varchar(140),
    status varchar(16) not null check (status in ('GENERATING', 'READY', 'FAILED')),
    recipe_snapshot jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index ix_ad_hoc_recipe_requests_user on ad_hoc_recipe_requests (user_id, created_at desc);

create table stores (
    id bigint generated always as identity primary key,
    name varchar(120) not null,
    province varchar(80),
    city varchar(80) not null,
    neighborhood varchar(120),
    address_line varchar(180),
    contact varchar(60),
    status varchar(16) not null default 'ACTIVE' check (status in ('ACTIVE', 'SUSPENDED')),
    rating numeric(3,2) check (rating between 0 and 5),
    opening_hours_text varchar(120),
    delivery_available boolean not null default false,
    average_price_level varchar(16) check (average_price_level in ('BAIXO', 'MEDIO', 'ALTO')),
    latitude numeric(9,6),
    longitude numeric(9,6),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index ux_stores_name_city on stores (lower(name), lower(city));
create index ix_stores_status on stores (status);

alter table users
    add constraint fk_users_store foreign key (store_id) references stores(id);

create table products (
    id bigint generated always as identity primary key,
    store_id bigint not null references stores(id) on delete cascade,
    name varchar(160) not null,
    category varchar(24) not null check (category in ('CEREAIS', 'PROTEINA', 'VEGETAIS', 'LEGUMINOSAS', 'TEMPEROS', 'OUTROS')),
    unit_label varchar(40) not null,
    price_mt numeric(10,2) not null check (price_mt > 0),
    ingredient_id bigint references ingredients(id) on delete set null,
    status varchar(16) not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index ux_products_store_name on products (store_id, lower(name));
create index ix_products_store_status on products (store_id, status);

create table import_jobs (
    id bigint generated always as identity primary key,
    store_id bigint not null references stores(id) on delete cascade,
    created_by bigint not null references users(id),
    filename varchar(255) not null,
    status varchar(16) not null check (status in ('VALIDATED', 'APPLIED', 'DISCARDED', 'FAILED')),
    total_rows integer not null default 0,
    valid_rows integer not null default 0,
    error_rows integer not null default 0,
    created_count integer,
    updated_count integer,
    errors jsonb not null default '[]'::jsonb,
    payload jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index ix_import_jobs_store on import_jobs (store_id, created_at desc);

create table orders (
    id bigint generated always as identity primary key,
    user_id bigint not null references users(id),
    store_id bigint not null references stores(id),
    store_name varchar(120) not null,
    store_contact varchar(60),
    customer_name varchar(120) not null,
    customer_contact varchar(160),
    status varchar(16) not null default 'PENDENTE'
        check (status in ('PENDENTE', 'ACEITE', 'EM_PREPARACAO', 'PRONTA', 'CONCLUIDA', 'RECUSADA', 'CANCELADA')),
    note varchar(300),
    reject_reason varchar(200),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index ix_orders_user on orders (user_id, created_at desc);
create index ix_orders_store_status on orders (store_id, status, created_at desc);

create table order_items (
    id bigint generated always as identity primary key,
    order_id bigint not null references orders(id) on delete cascade,
    shopping_list_item_id bigint references shopping_list_items(id) on delete set null,
    product_id bigint references products(id) on delete set null,
    ingredient_name varchar(160) not null,
    quantity numeric(10,2) not null check (quantity > 0),
    unit varchar(24) not null,
    price_mt numeric(10,2)
);

create index ix_order_items_order on order_items (order_id);

create table store_rankings_cache (
    id bigint generated always as identity primary key,
    user_id bigint not null references users(id) on delete cascade,
    address_hash varchar(64) not null,
    ranking jsonb not null,
    expires_at timestamptz not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (user_id, address_hash)
);

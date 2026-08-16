create table users (
    id bigint generated always as identity primary key,
    auth_user_id uuid not null unique references auth.users(id) on delete cascade,
    name varchar(120) not null,
    email varchar(160) not null,
    role varchar(16) not null default 'CLIENTE'
        check (role in ('CLIENTE', 'ADMIN', 'LOJISTA')),
    status varchar(16) not null default 'ACTIVE'
        check (status in ('ACTIVE', 'SUSPENDED')),
    store_id bigint,
    disclaimer_accepted_at timestamptz,
    last_login_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index ux_users_email on users (lower(email));
create index ix_users_auth_user_id on users (auth_user_id);
create index ix_users_role_status on users (role, status);
create index ix_users_store on users (store_id);

create table audit_log (
    id bigint generated always as identity primary key,
    actor_user_id bigint references users(id),
    action varchar(64) not null,
    entity_type varchar(40),
    entity_id bigint,
    detail jsonb,
    correlation_id varchar(64),
    created_at timestamptz not null default now()
);

create index ix_audit_log_actor on audit_log (actor_user_id, created_at desc);
create index ix_audit_log_entity on audit_log (entity_type, entity_id);

-- DB-01 · V1 auth + audit — ver docs/plano/04-database-plan.md §3
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

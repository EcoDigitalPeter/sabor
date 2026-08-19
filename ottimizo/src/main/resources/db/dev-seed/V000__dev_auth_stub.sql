-- DB-06 · Stub minimo do schema "auth" da Supabase, EXCLUSIVO do perfil "dev".
--
-- Em producao o schema "auth" e criado e gerido pelo GoTrue (Supabase Auth); o Postgres
-- embutido usado em desenvolvimento local (io.zonky.test:embedded-postgres) e um Postgres
-- "nu" e nao inclui esse schema. A tabela users (V001__auth_users_audit.sql) tem uma FK
-- obrigatoria para auth.users(id), por isso este stub cria apenas o minimo necessario para
-- essa FK ser satisfeita e permitir semear dados de desenvolvimento.
--
-- Esta localizacao de migracoes (classpath:db/dev-seed) so e adicionada ao Flyway quando o
-- perfil Spring "dev" esta activo (ver application-dev.yml) — nunca corre contra a base de
-- dados Supabase real de producao/staging.
create schema if not exists auth;

create table if not exists auth.users (
    id uuid primary key,
    email varchar(160)
);

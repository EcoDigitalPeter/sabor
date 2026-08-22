-- BE-B01/INT-01 · Custom Access Token Auth Hook do Supabase.
--
-- SecurityConfig.authoritiesFromClaims (backend Java) le a claim `role` (ou
-- `app_metadata.role`) do JWT para autorizar /admin/**, /loja/**, /me/**.
-- O Supabase Auth, por omissao, nao inclui essa claim -- e' preciso injecta-la
-- no momento de emissao do token, via um "Custom Access Token Auth Hook"
-- (funcao Postgres chamada pelo Supabase Auth antes de assinar o JWT).
--
-- Contrato exigido pelo Supabase: funcao com um unico parametro jsonb
-- (`event`, contem pelo menos `user_id` e `claims`) que devolve jsonb com a
-- forma {"claims": {...}}.
--
-- IMPORTANTE (passo manual, fora desta migracao): criar esta funcao NAO a
-- activa. E' preciso registá-la como o "Custom Access Token" hook activo no
-- dashboard do projecto Supabase (Authentication -> Hooks), em cada
-- ambiente (dev e prod) que usar este schema -- ver plano de integracao
-- INT-01, workstream 2.

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
    claims jsonb;
    local_role text;
    local_store_id bigint;
begin
    claims := event->'claims';

    select role::text, store_id
        into local_role, local_store_id
        from public.users
        where auth_user_id = (event->>'user_id')::uuid;

    if local_role is not null then
        claims := jsonb_set(claims, '{role}', to_jsonb(local_role));
        if local_store_id is not null then
            claims := jsonb_set(claims, '{store_id}', to_jsonb(local_store_id));
        end if;
    end if;

    event := jsonb_set(event, '{claims}', claims);
    return event;
end;
$$;

-- Permissoes exigidas pelo Supabase para o hook correr (ver docs oficiais de
-- "Custom Access Token Auth Hook"): so o role interno de auth pode executar
-- a funcao; ninguem mais (nem authenticated/anon) deve poder chama-la
-- directamente. Guardado com "if exists" (mesmo padrao do bloco
-- supabase_realtime em V005__views_realtime.sql): so os projectos Supabase
-- reais tem os roles supabase_auth_admin/authenticated/anon -- o Postgres
-- vanilla do perfil dev (embedded-postgres, DB-06) nao os tem, e sem esta
-- guarda a migracao falharia logo no arranque local.
revoke execute on function public.custom_access_token_hook from public;

do $$
begin
    if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
        grant execute on function public.custom_access_token_hook to supabase_auth_admin;
        grant select on public.users to supabase_auth_admin;
    end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then
        revoke execute on function public.custom_access_token_hook from authenticated;
    end if;
    if exists (select 1 from pg_roles where rolname = 'anon') then
        revoke execute on function public.custom_access_token_hook from anon;
    end if;
end $$;

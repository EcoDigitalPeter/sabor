-- Corrige a Auth Hook para nao sobrescrever a claim reservada `role` do Supabase.
-- Essa claim deve continuar a apontar para o role Postgres, normalmente `authenticated`.
-- O role aplicacional do Ottimizo fica em `app_metadata.role`, que o backend tambem le.

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
    claims jsonb;
    app_metadata jsonb;
    local_role text;
    local_store_id bigint;
begin
    claims := event->'claims';
    app_metadata := coalesce(claims->'app_metadata', '{}'::jsonb);

    select role::text, store_id
        into local_role, local_store_id
        from public.users
        where auth_user_id = (event->>'user_id')::uuid;

    if local_role is not null then
        app_metadata := jsonb_set(app_metadata, '{role}', to_jsonb(local_role), true);

        if local_store_id is not null then
            app_metadata := jsonb_set(app_metadata, '{store_id}', to_jsonb(local_store_id), true);
        else
            app_metadata := app_metadata - 'store_id';
        end if;

        claims := jsonb_set(claims, '{app_metadata}', app_metadata, true);
    end if;

    event := jsonb_set(event, '{claims}', claims);
    return event;
end;
$$;

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

do $$
begin
    if to_regclass('storage.objects') is not null then
        execute 'drop policy if exists "recipe-images admin insert" on storage.objects';
        execute 'drop policy if exists "recipe-images admin select" on storage.objects';
        execute 'drop policy if exists "recipe-images admin update" on storage.objects';

        execute $policy$
            create policy "recipe-images admin insert"
            on storage.objects
            for insert
            to authenticated
            with check (
                bucket_id = 'recipe-images'
                and (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN'
            )
        $policy$;

        execute $policy$
            create policy "recipe-images admin select"
            on storage.objects
            for select
            to authenticated
            using (
                bucket_id = 'recipe-images'
                and (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN'
            )
        $policy$;

        execute $policy$
            create policy "recipe-images admin update"
            on storage.objects
            for update
            to authenticated
            using (
                bucket_id = 'recipe-images'
                and (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN'
            )
            with check (
                bucket_id = 'recipe-images'
                and (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN'
            )
        $policy$;
    end if;
end $$;

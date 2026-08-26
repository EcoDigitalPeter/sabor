-- Supabase Storage upsert requires SELECT in addition to INSERT/UPDATE.
-- The backend sends x-upsert=true because recipe images are stored at a stable
-- path: recipe-images/receitas/{recipeId}.png.

do $$
begin
    if to_regclass('storage.objects') is not null then
        execute 'drop policy if exists "recipe-images admin select" on storage.objects';

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
    end if;
end $$;

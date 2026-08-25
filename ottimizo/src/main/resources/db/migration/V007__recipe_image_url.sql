-- V007: URL da imagem do prato (gerada por IA, BE-C10/imagens-de-pratos).
alter table public.recipes
    add column if not exists image_url text;

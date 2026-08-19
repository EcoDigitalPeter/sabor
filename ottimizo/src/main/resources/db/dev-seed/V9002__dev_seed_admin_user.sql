-- DB-06 · Utilizador admin inicial para desenvolvimento local.
--
-- O UUID e fixo para ser previsivel em testes manuais/documentacao (ex. gerar um JWT de
-- desenvolvimento com sub = este UUID). Nao corresponde a nenhum utilizador Supabase real.
insert into auth.users (id, email)
values ('00000000-0000-0000-0000-000000000001', 'admin@ottimizo.mz')
on conflict (id) do nothing;

insert into users (auth_user_id, name, email, role, status, disclaimer_accepted_at)
values (
    '00000000-0000-0000-0000-000000000001',
    'Admin Ottimizo',
    'admin@ottimizo.mz',
    'ADMIN',
    'ACTIVE',
    now()
)
on conflict (lower(email)) do nothing;

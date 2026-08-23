# Colecao Postman — Ottimizo Backend

## Importar

1. Postman -> Import -> `Ottimizo.postman_collection.json`.
2. Abre a colecao -> separador **Variables** -> preenche `test_password` com a
   password da conta de teste (`teste.integracao.1787308566098@gmail.com`).
   Nao esta gravada no ficheiro de proposito.
3. Confirma `base_url` (`http://localhost:8080` por omissao — muda se o
   backend correr noutra porta).

## Fluxo de uso

1. Corre **Auth (Supabase) -> Login**. O script em *Tests* desse pedido
   guarda o `access_token` devolvido na variavel de colecao `access_token`
   automaticamente.
2. Todos os outros pedidos usam Bearer Auth herdado da colecao
   (`{{access_token}}`) — nao e preciso copiar o token a mao.
3. O token expira ao fim de ~1h (`exp` do JWT Supabase) — corre o Login de
   novo quando começares a apanhar `401 LSA008_UNAUTHENTICATED`.

## Trocar de role (ADMIN / LOJISTA / CLIENTE)

O `role` vem de uma custom claim injectada no JWT pelo Auth Hook do Supabase
(`custom_access_token_hook`, `V006__supabase_custom_claims.sql`), lida da
tabela `public.users`. Para testar como outra role: actualiza
`users.role`/`users.store_id` directamente na base de dados (Supabase ->
SQL Editor) e corre o **Login** outra vez — o token novo já vem com o role
actualizado.

## Variaveis de colecao

| Variavel | Uso |
|---|---|
| `base_url` | URL do backend Java (local ou noutro ambiente) |
| `supabase_url` / `supabase_anon_key` | Supabase Auth deste projecto (`fdbgtfafynvteakamkuf`) — a anon key é publica por design, não é secreta |
| `test_email` / `test_password` | Credenciais da conta de teste — preenche `test_password` tu mesmo |
| `access_token` | Preenchido automaticamente pelo pedido de Login |
| `recipe_id`, `ingredient_id`, `store_id`, `user_id`, `product_id`, `order_id`, `entry_id`, `item_id`, `adhoc_id`, `import_job_id` | IDs por omissão usados nos pedidos `/{id}` — ajusta conforme os dados que tiveres |

## Notas

- O import/export de produtos da loja (`/api/v1/loja/products/import`) é
  `multipart/form-data` — tens de anexar manualmente o ficheiro `.xlsx` no
  campo `file` (o Postman não guarda o caminho do ficheiro no `.json` da
  colecao).
- `POST /me/meal-plans` e `POST /me/recipes/adhoc` dependem de
  `OPENAI_API_KEY` estar activa no backend.
- A lista de compras (`/me/shopping-list`) só existe presa a um plano
  activo — sem IA activa, fica bloqueada (ver
  `docs/superpowers/plans/2026-08-22-relatorio-testes-integracao-nao-ia-admin-loja.md`).

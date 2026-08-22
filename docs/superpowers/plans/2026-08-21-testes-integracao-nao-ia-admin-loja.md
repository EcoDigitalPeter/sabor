# Plano de Testes de Integração — Fluxos sem IA + Portal Admin + Portal Loja

**Objectivo:** cobrir, contra o backend `ottimizo` real (Supabase prod), tudo o que **não** depende da `OPENAI_API_KEY` — portal Admin (CRUD completo), portal Loja/Lojista (produtos, import/export, encomendas), e os fluxos de cliente que faltam (feedback de receitas, lista de compras, encomendas). Fica registado o que passou, o que falhou, e o que fica bloqueado até a chave OpenAI estar pronta.

**Contexto herdado desta sessão:**
- Backend up em `localhost:8080`, perfil ligado à Supabase prod (`fdbgtfafynvteakamkuf`).
- Catálogo já semeado (`ottimizo/src/main/resources/db/seed-supabase-catalogo.sql`, já correu): 28 ingredientes, 18 receitas (16 `PUBLISHED`).
- Utilizador de teste `teste.integracao.1787308566098@gmail.com` / `Teste12345` — role `CLIENTE`, perfil completo (goal, morada de compras já preenchida).
- Fix aplicado e testado: `PUT /me/profile` já aceita `shoppingProvince/City/Neighborhood/AddressDescription`; `GET /stores` já não dá 409.
- Bloqueado até a chave OpenAI: `POST /me/meal-plans` (geração), swap de refeição via IA, `POST /me/recipes/adhoc`, `StoreRankingService` (tem fallback não-IA, ver Fase 3).
- Login Supabase (password grant): `POST https://fdbgtfafynvteakamkuf.supabase.co/auth/v1/token?grant_type=password` com header `apikey: sb_publishable_FZgyFl-JT1I2weI5XVa4EA_D5IyYKl4`.

**Como usar este plano:** cada fase tem passos com o pedido HTTP exacto e o resultado esperado. Corre sequencialmente — fases posteriores dependem de IDs criados em fases anteriores (guardar `id` de cada resposta). Regista falhas inesperadas como achados, não pares o resto do plano por causa delas (a menos que bloqueiem literalmente o passo seguinte).

---

## Fase 0 — Bootstrap de admin

O utilizador de teste tem de passar a `ADMIN` para as Fases 1-2 (mesma técnica já usada para o seed: promoção temporária + login novo, porque o role vem de um custom claim no JWT gerado no momento do login, não é lido em live da BD).

1. SQL Editor da Supabase (prod):
   ```sql
   update public.users set role = 'ADMIN' where email = 'teste.integracao.1787308566098@gmail.com';
   ```
2. Login novo (password grant) para obter um JWT com a claim `role: ADMIN` — confirmar decodificando o `access_token` (payload em base64url, campo `role`).
3. Guardar este token como `$ADMIN_TOKEN` para toda a Fase 1.

---

## Fase 1 — Portal Admin (CRUD completo)

### 1.1 Utilizadores (`AdminUserController`)
- `GET /api/v1/admin/users` (sem filtro) → esperado: lista com o utilizador de teste (id, role ADMIN agora).
- `GET /api/v1/admin/users?role=CLIENTE` → filtra por role.
- `GET /api/v1/admin/users/{id}` → detalhe do utilizador de teste.
- `GET /api/v1/admin/users/{id}/health-profile` → devolve o `ProfileResponse` (mesmo shape já testado em `/me/profile`).
- `PATCH /api/v1/admin/users/{id}` body `{"status":"SUSPENDED"}` seguido de `{"status":"ACTIVE"}` num **outro** utilizador (não o de teste — não te suspendas a ti próprio) — se não houver outro utilizador, criar um dummy primeiro (ver 1.1b) só para este teste, e reverter no fim.

### 1.1b Criar utilizador ADMIN dummy (para não mexer no utilizador de teste em 1.1, e para ter uma segunda conta ADMIN disponível se for preciso)
- Não é possível via API sem um `authUserId` Supabase real — **não criar Supabase Auth users novos** neste plano (fora de âmbito, exige acesso a service_role ou signup público). Salta este sub-passo; usa antes um segundo `PATCH` no próprio utilizador de teste com reversão imediata (`SUSPENDED` → `ACTIVE` no mesmo pedido de teste), aceitando o risco mínimo de, por 1 pedido, o token ficar tecnicamente inválido (ver nota).
  - **Nota:** se `PATCH .../status {"status":"SUSPENDED"}` no próprio utilizador autenticado invalidar a sessão a meio (via `SupabaseSessionRevoker`), o pedido seguinte de reversão vai falhar por token revogado — nesse caso, faz login de novo antes de reverter.

### 1.2 Lojas (`AdminStoreController`)
- `POST /api/v1/admin/stores`:
  ```json
  {
    "name": "Mercado Central Maputo",
    "province": "Maputo Cidade",
    "city": "Maputo",
    "neighborhood": "Baixa",
    "addressLine": "Av. 25 de Setembro, 1234",
    "contact": "+258 84 123 4567",
    "deliveryAvailable": true,
    "rating": 4.5,
    "openingHoursText": "Seg-Sáb 07:00-19:00",
    "averagePriceLevel": "MEDIO",
    "latitude": -25.9655,
    "longitude": 32.5832
  }
  ```
  Esperado: 201, devolve `id`. Guardar como `$STORE_ID`. (Confirmar valores válidos de `averagePriceLevel` lendo `StorePriceLevel.java` antes de correr — se não for `MEDIO`, ajustar.)
- `GET /api/v1/admin/stores` → lista inclui a loja criada.
- `GET /api/v1/admin/stores/{id}` → detalhe.
- `PUT /api/v1/admin/stores/{id}` → altera `name` para "Mercado Central Maputo (actualizado)", confirma persistência num GET a seguir.
- `PATCH /api/v1/admin/stores/{id}/status` body `{"status":"ACTIVE"}` → confirmar que já nasce `ACTIVE` por omissão ou se precisa deste passo para ficar visível em `GET /stores` do cliente.
- **Não apagar esta loja** — é precisa nas Fases 2 e 3.

### 1.3 Ingredientes (`AdminIngredientController`)
- `GET /api/v1/admin/ingredients?size=50` → confirma os 28 do seed.
- `POST /api/v1/admin/ingredients` com um ingrediente novo de teste (ex. "Ingrediente Teste QA", category "Outros", baseUnit "g", macros a 0, `active:true`) → 201, guardar `id`.
- `PUT /api/v1/admin/ingredients/{id}` → altera `active` para `false`.
- `DELETE /api/v1/admin/ingredients/{id}` → 200/204. Confirmar com GET a seguir (404 esperado) — **só apagar o ingrediente de teste criado agora, nunca os 28 do seed.**

### 1.4 Receitas (`AdminRecipeController`)
- `GET /api/v1/admin/recipes?status=PUBLISHED&size=50` → 16 receitas.
- `GET /api/v1/admin/recipes?status=DRAFT` → 2 receitas (a "Pão com ovo..." e "Feijão nhemba com arroz e couve").
- `GET /api/v1/admin/recipes/{id}` → detalhe completo (confirma ingredients[]/steps[] vieram do seed).
- `GET /api/v1/admin/recipes/{id}/swap-reasons` → lista vazia esperada (sem swaps ainda, IA desligada).
- `POST /api/v1/admin/recipes` com uma receita de teste mínima válida (≥1 ingrediente referenciando um id real do seed, ≥2 steps, ≥1 healthTag, macrosOverride true) → 201, nasce `DRAFT`.
- `PATCH /api/v1/admin/recipes/{id}/status` body `{"status":"PUBLISHED"}` → confirma que passa (tem os requisitos do `RecipePublicationValidator`).
- `PUT /api/v1/admin/recipes/{id}` → edita `name`.
- `DELETE /api/v1/admin/recipes/{id}` → remove a receita de teste (não mexer nas 18 do seed).

### 1.5 Métricas (`AdminMetricsController`)
- `GET /api/v1/admin/metrics/summary` e `?period=7`/`?period=90` → confirma 200 e shape da resposta (não deve rebentar mesmo com poucos dados).

---

## Fase 2 — Bootstrap + Portal Loja (Lojista)

Não é possível criar uma conta Supabase Auth nova por API pública sem passar por signup normal (email real + confirmação) ou pela dashboard. Duas opções — escolhe uma antes de continuar:

**Opção A (mais simples):** reaproveitar a conta de teste já existente. Depois da Fase 1, em vez de reverter para `CLIENTE`, faz:
```sql
update public.users set role = 'LOJISTA', store_id = <STORE_ID da Fase 1.2> where email = 'teste.integracao.1787308566098@gmail.com';
```
Login novo → JWT com `role: LOJISTA`, `store_id` preenchido. Usa este token (`$LOJA_TOKEN`) para toda a Fase 2. No fim, reverte para `CLIENTE`/`store_id = null`.

**Opção B:** criar uma segunda conta Supabase real (signup) só para lojista — mais fiel a um cenário multi-utilizador, mas mais lento e cria mais um registo de teste em produção. Recomendo **Opção A** para este plano, dado que já geriste bem a reversão de role na Fase 0.

### 2.1 Bootstrap
1. `update public.users set role='LOJISTA', store_id=$STORE_ID where email='teste.integracao...'`
2. Login novo → confirmar claim `role: LOJISTA` e `store_id` no JWT decodificado.

### 2.2 Produtos (`LojaProductController`)
- `GET /api/v1/loja/products` → vazio (loja nova, sem produtos).
- `POST /api/v1/loja/products`:
  ```json
  {"name": "Arroz agulha 1kg", "category": "CEREAIS", "unitLabel": "kg", "priceMt": 75.00, "ingredientId": null}
  ```
  → 201, guardar `id`. Repetir para 2-3 produtos variando `category` (`PROTEINA`, `LEGUMINOSAS`).
- `GET /api/v1/loja/products/{id}` → detalhe.
- `PUT /api/v1/loja/products/{id}` → altera `priceMt`.
- `PATCH /api/v1/loja/products/{id}/status` body `{"status":"INACTIVE"}` depois `{"status":"ACTIVE"}`.
- `DELETE /api/v1/loja/products/{id}` → só no produto extra de teste, deixar 1-2 activos para a Fase 3 (encomenda precisa de pelo menos 1 produto activo desta loja, embora `OrderItemRequest` referencie itens da lista de compras, não produtos directamente — confirmar na Fase 3 se o preço é resolvido por nome contra este catálogo).

### 2.3 Import/Export (`LojaProductImportController`)
- `GET /api/v1/loja/products/import-template` → devolve ficheiro `.xlsx` (verificar `Content-Type`/tamanho > 0, não o conteúdo binário).
- `GET /api/v1/loja/products/export` → idem, `.xlsx` com os produtos actuais.
- `POST /api/v1/loja/products/import` multipart com o próprio template exportado (round-trip) → esperado `0 criados / 0 erros` se os produtos já existem (ver critério de aceitação de F3-LOJ-02 no `01-functional-plan.md`).
- `POST /api/v1/loja/products/import/{jobId}/confirm` → confirma o job do passo anterior.

### 2.4 Encomendas da loja (`LojaOrderController`)
- `GET /api/v1/loja/orders` → vazio até à Fase 3 criar uma encomenda de cliente para esta loja.
- Repetir depois da Fase 3: `GET /api/v1/loja/orders` → deve mostrar a encomenda criada pelo cliente; `PATCH /api/v1/loja/orders/{id}/status` body `{"status":"ACEITE"}` → depois `EM_PREPARACAO` → `PRONTA` → `CONCLUIDA`, confirmando a máquina de estados (`OrderStateMachine`) e que transições fora de ordem (ex. `PENDENTE` → `PRONTA` directo) dão erro.

---

## Fase 3 — Fluxos de cliente pendentes (voltar a `CLIENTE`)

Reverte a conta de teste para `CLIENTE` antes desta fase (`role='CLIENTE', store_id=null`), login novo.

### 3.1 Feedback de receita (`RecipeFeedbackController`)
- `PUT /api/v1/me/recipes/{id}/feedback` body `{"value":"LIKE"}` num id de receita `PUBLISHED` do seed → 200.
- Repetir com `"DISLIKE"` e `"NONE"` no mesmo id, confirmar que substitui (não duplica).

### 3.2 Catálogo navegável (`ClientRecipeController`)
- `GET /api/v1/me/recipes?tags=vegetariana` → só as receitas com essa tag.
- `GET /api/v1/me/recipes?q=frango` → pesquisa por nome.

### 3.3 Lista de compras (`ShoppingListController`) — **provável bloqueio**
- `GET /api/v1/me/shopping-list` → **hipótese a confirmar:** `ShoppingListService.getForActivePlan()` provavelmente falha (sem plano activo, geração de IA desligada). Correr e documentar o código de erro exacto recebido — não é um bug se for `LSA0xx` "sem plano activo", é o gap conhecido de IA.
- `POST /api/v1/me/shopping-list/items` (item manual) → correr mesmo assim; se também depender de plano activo, documentar. Se **não** depender (cria lista vazia na hora), é um dado novo a registar — testar antes de assumir.

### 3.4 Encomendas (`OrderController`) — depende de 3.3
- Se `3.3` desbloquear pelo menos 1 `ShoppingListItem` (via item manual): `POST /api/v1/me/orders` body:
  ```json
  {"storeId": <STORE_ID da Fase 1.2>, "note": "Teste QA — ignorar", "items": [{"itemId": <id do item>, "quantity": 1}]}
  ```
  → 201, guardar `id` da encomenda.
- `GET /api/v1/me/orders` → lista inclui a encomenda.
- `GET /api/v1/me/orders/{id}` → detalhe.
- `PATCH /api/v1/me/orders/{id}/cancel` → num **segundo** pedido de teste (não cancelar o primeiro — deixa-o para a Fase 2.4 testar transições do lado da loja); confirma que só cancela em `PENDENTE`/`ACEITE`.
- Se `3.3` bloquear totalmente (sem forma de ter um `ShoppingListItem` sem plano activo), esta fase fica **bloqueada pela IA tal como a geração de plano** — documentar e não forçar dados fictícios directo na BD só para testar (mistura camadas, mascara o gap real).

---

## Fase 4 — Relatório final

Consolidar por fase: passou / falhou / bloqueado (com motivo), e qualquer achado inesperado (como os dois desta sessão: bug do pooler read-only, gap da morada). Actualizar `docs/plano/tasks.md` se algum destes endpoints ainda aparecer como "por fazer" mas já está a funcionar — e sinalizar ao quadro (`especialista-bd`/`desenvolvedor-backend`) qualquer achado que exija código, não só dados.

---

## Riscos/decisões já tomadas neste plano

- **Reutilizar a mesma conta de teste para ADMIN/LOJISTA/CLIENTE** (trocando role via SQL entre fases) em vez de criar múltiplas contas Supabase — mais rápido, mesmo padrão já usado no seed. Custo se errado: um pouco de troca de role/login extra, sem impacto em dados de catálogo.
- **Não criar contas Supabase novas** (Opção B da Fase 2 descartada) — evita poluir a Supabase de produção com mais utilizadores de teste do que o necessário.
- **Não forçar `ShoppingListItem`/`MealPlan` directo na BD** para destravar a Fase 3.4 — se a IA for o único caminho, o plano documenta o bloqueio em vez de mascará-lo com dados fabricados fora do fluxo real da aplicação.

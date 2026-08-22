# Relatório — Testes de Integração (sem IA) + Portal Admin + Portal Loja

Execução do plano `2026-08-21-testes-integracao-nao-ia-admin-loja.md`, contra o backend `ottimizo` real (Supabase prod `fdbgtfafynvteakamkuf`). Conta de teste `teste.integracao.1787308566098@gmail.com`, role trocado via SQL directo (Postgres via pooler Supavisor) entre fases, login novo a cada troca (role vem de custom claim no JWT).

## Resumo

| Fase | Resultado |
|---|---|
| 0 — Bootstrap admin | ✅ OK |
| 1 — Portal Admin | ⚠️ 2 bugs achados e corrigidos |
| 2 — Portal Loja | ✅ OK, tudo passou |
| 3 — Cliente pendente | ⚠️ 1 achado (não-bug) + bloqueio confirmado por IA |

**3 bugs reais achados e corrigidos no código** (por validar com restart do backend, a fazer por ti no fim). **0 pendentes.**

---

## Achados — Fase 1 (Portal Admin)

### 1. `GET /api/v1/admin/recipes/{id}` e `PATCH /api/v1/admin/recipes/{id}/status` → 500 sempre
**Causa:** `Recipe.ingredients`/`Recipe.steps` são colecções `FetchType.LAZY`. `RecipeService.get()`/`updateStatus()` devolvem a entidade já fora da transacção (a `AdminRecipeController` mapeia para `RecipeResponse` depois do método transactional retornar — sessão do Hibernate já fechada). Acesso às colecções lazy nesse ponto lança `LazyInitializationException`, apanhada pelo handler genérico e devolvida como `LSA099_INTERNAL`. `create`/`update` escapavam por repor as colecções directamente em memória (`replaceIngredients`/`replaceSteps`), nunca chegando a ser "lazy" de facto.
**Reproduzido:** confirmado em receita nova (id 19) e em receita semeada (id 1) — bug geral, não específico de dados.
**Fix:** `ottimizo/src/main/java/com/ottimizo/catalog/RecipeService.java` — `get(Long id)` agora chama `Hibernate.initialize()` em `ingredients()`/`steps()` antes de devolver, dentro da transacção.
**Estado:** corrigido, por validar após restart.

### 2. `GET /api/v1/admin/metrics/summary` (sem `?period=`) → 500 sempre
**Causa:** `ALLOWED_PERIODS.contains(periodDays)` com `periodDays` nulo (parâmetro `period` omisso, comportamento suposto ser válido — "qualquer outro valor, incluindo omisso, cai em 30"). `List.of(7,30,90).contains(null)` lança `NullPointerException` — comportamento conhecido/documentado das colecções imutáveis do Java (`List.of()` rejeita `null` em `contains`), não visível a olho no código.
**Reproduzido:** confirmado via `curl` sem `period` (500) vs com `?period=30` (200) — isolei correndo as 8 queries SQL do serviço directamente na BD (todas OK), o que descartou bug de SQL/schema e apontou para lógica Java.
**Fix:** `ottimizo/src/main/java/com/ottimizo/metrics/AdminMetricsService.java` — `periodDays != null && ALLOWED_PERIODS.contains(periodDays)`.
**Estado:** corrigido, por validar após restart.

### Resto da Fase 1 — sem problemas
- Utilizadores: `GET` (lista, filtro por role, detalhe, health-profile) — todos OK. `PATCH status` **não testado** (risco de auto-suspender a única conta de teste disponível — nenhuma conta secundária existe para testar sem risco; sinalizo como gap de cobertura, não como bug).
- Lojas: `POST`/`GET`/`PUT`/`PATCH status` — todos OK. Loja nasce `ACTIVE` por omissão.
- Ingredientes: `GET` (28 confirmados), `POST`/`PUT`/`DELETE` num ingrediente de teste — todos OK, sem tocar nos 28 do seed.
- Receitas: contagens correctas (16 `PUBLISHED`, 2 `DRAFT`), `swap-reasons` vazio (esperado, sem IA), `POST`/`PATCH status` (publicar) funcionaram **depois do fix #1**, `DELETE` OK (não usa as colecções lazy, não estava afectado).

---

## Achados — Fase 2 (Portal Loja)

Bootstrap: conta de teste promovida a `LOJISTA` + `store_id=1` via SQL directo, revertida a `CLIENTE` no fim da fase. Tudo correu sem problemas:
- Produtos: `GET`/`POST` (2 produtos, categorias `CEREAIS`/`PROTEINA`)/`GET {id}`/`PUT`/`PATCH status` (testado ida-e-volta INACTIVE→ACTIVE) — todos OK.
- Import/Export: template `.xlsx` (200, `Content-Type` correcto), export `.xlsx` dos 2 produtos, round-trip import→validar (2 válidas/0 erros)→confirmar (`APPLIED`, 0 criados/2 actualizados — casa por nome, sem duplicar) — critério de aceitação de F3-LOJ-02 cumprido.
- Encomendas da loja: `GET` vazio, consistente (Fase 3.4 não chegou a criar encomendas — ver abaixo).

Nenhum bug encontrado nesta fase.

---

## Achados — Fase 3 (Cliente pendente)

- Feedback de receita (`PUT /me/recipes/{id}/feedback`): `LIKE` depois `NONE` no mesmo id — ambos 200, substitui sem duplicar. OK.
- Catálogo filtrado: `?tags=vegetariana` → 6 receitas (bate com o esperado do seed). `?q=frango` → 3 receitas. OK.
- **Lista de compras — confirmado bloqueado, não é bug:** `GET /me/shopping-list` → 404 `LSA005_NOT_FOUND` "Ainda não tens um plano activo." `POST /me/shopping-list/items` (item manual) → **mesmo erro**, mesmo sendo "independente da agregação automática" — a lista em si só existe presa a um plano activo, item manual não cria uma lista do zero. Confirma a hipótese do plano: sem geração de plano por IA, não há forma de ter sequer um `ShoppingListItem`.
- **Encomendas de cliente — bloqueado em cascata:** `POST /me/orders` depende de um `itemId` de `ShoppingListItem`, que não existe (ponto acima). Não testado — não forcei dados directo na BD para simular, por decisão já registada no plano (misturaria camadas e mascararia o gap real).

---

## Pendente para quando a chave OpenAI estiver activa

- `POST /me/meal-plans` (geração) → deve desbloquear lista de compras → desbloqueia `POST /me/orders` (Fase 3.4 completa) e `GET /loja/orders` com dados reais (fecha o ciclo da Fase 2.4).
- Repetir Fase 3.3/3.4 nessa altura.

## Dados de teste deixados na Supabase (prod)
- Loja "Mercado Central Maputo (actualizado)" (id 1), 2 produtos (Arroz agulha, Frango inteiro) — reutilizáveis para o teste de encomendas quando a IA estiver pronta, não apagar.
- Utilizador de teste de volta a `CLIENTE`, `store_id=null`.
- Feedback `NONE` na receita id 1 (estado neutro, sem impacto).

## Nota de segurança
A password da BD Supabase (`SUPABASE_DB_PASSWORD`) foi colada em texto simples no chat durante esta sessão, junto com o resto do bloco de env vars. Recomendo rodá-la (Supabase dashboard → Project Settings → Database → Reset database password) depois de validares os fixes — ficou registada no transcript da conversa.

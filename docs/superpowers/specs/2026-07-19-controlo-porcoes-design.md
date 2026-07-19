# Controlo de porções — "Pessoas em casa"

**Data:** 2026-07-19
**Estado:** aprovado, pronto para plano de implementação

## Contexto

Extraído do ecrã "T-04 Dashboard Gamificado & Porções" gerado pelo Stitch MCP (mesmo projeto "Solution Prototype Development"). Esse ecrã tem elementos explicitamente contra o `descricao.md` §1 (streaks, níveis, XP, emblemas — "não gamificado com troféus/confetti/emojis exagerados"), rejeitados por inteiro. Mas continha uma ideia genuína, que sobreviveu também na versão "limpa" seguinte do Stitch ("T-04 Dashboard do Cliente — Versão Final"): um controlo de "para quantas pessoas estás a cozinhar", que ajusta as quantidades a comprar/cozinhar.

Isto é uma funcionalidade nova (não polimento visual) — afeta o modelo de dados e o cálculo da lista de compras. O backend real (`BE-A`..`BE-C`, `DB-*`) ainda não existe (tudo `[ ]` em `tasks.md`); hoje tudo corre contra mocks MSW e o contrato OpenAPI (`MOCK-01`) já "congelado". Por isso, mexer no contrato agora é uma alteração de mock, não uma migração em produção.

## Decisões de escopo (confirmadas)

- **Onde vive:** campo do perfil (`Profile.householdSize`), preenchido no onboarding, editável no ecrã de Perfil — não é um controlo ad-hoc por visita ao dashboard.
- **O que escala:** quantidades a comprar/cozinhar (lista de compras) **e** as quantidades de ingredientes no detalhe da receita (T-05). Custo estimado escala junto (é proporcional à quantidade).
- **O que NÃO escala:** kcal e macros — representam a nutrição da pessoa do perfil (quem gera o plano), não da casa toda. Um prato de "540 kcal" continua a ser 540 kcal por pessoa, independentemente de se estar a cozinhar para 1 ou para 5.

## 1. Contrato — `Profile.householdSize`

**Ficheiros:** OpenAPI (`MOCK-01`), `src/types/api.d.ts` (regenerado via `openapi-typescript`, `MOCK-03`).

- Novo campo opcional em `Profile`: `householdSize?: number` — inteiro, intervalo 1–8, default 1 quando ausente.
- Mesmo padrão de `mealsPerDay`: `UpdateProfileRequest` é o próprio `Profile`, PUT substitui o recurso inteiro (convenção já usada em `PerfilPage.save`).

## 2. Onboarding (T-03) — novo passo do wizard

**Ficheiros:** `(cliente)/onboarding/page.tsx`.

- Novo passo (`Wizard`/`Stepper`, `FE-B08`), "Quantas pessoas moram contigo?" — stepper -/N/+ (padrão do mock Stitch), mínimo 1, máximo 8, default 1. Posição no fluxo: depois de "refeições por dia" (ambos são inputs numéricos pequenos de contexto doméstico), antes do resumo final.

## 3. Perfil (T-08) — nova secção editável

**Ficheiros:** `(cliente)/perfil/page.tsx`.

- Nova `ProfileSectionCard` "Pessoas em casa", mesmo padrão de edição por secção das restantes (`editingSection`, draft local, `save("pessoas", { householdSize: draft })`). Componente do stepper: reaproveitar ou criar um `PersonStepper` pequeno (o `OptionGroup` atual não serve bem para um intervalo 1–8 — é para listas curtas de opções nomeadas).
- Mesmo aviso "as alterações valem a partir do próximo plano" já existente na página aplica-se — mas como o escalar é aplicado em leitura (não gravado no snapshot do plano), a mudança de `householdSize` afeta a lista de compras e receitas do plano **ativo** imediatamente, não só planos futuros. Isto é uma exceção ao aviso genérico da página — quando este passo for implementado, o texto do aviso ou um texto específico junto desta secção deve deixar isso claro.

## 4. Mock — ponto único de escala

**Ficheiros:** `src/mocks/handlers.ts` (e o que `src/mocks/fixtures.ts` expõe para os handlers lerem).

- Os handlers que respondem a `GET /me/shopping-list` e aos endpoints que devolvem `RecipeSnapshot` (`GET /me/meal-plans/entries/{id}`, `GET /me/meal-plans/active`) passam a ler o `householdSize` do perfil do cliente autenticado e multiplicar:
  - `ShoppingListItem.quantity` e `ShoppingListItem.estimatedCostMt` (quando não nulo);
  - `RecipeIngredientLine.quantity` dentro de cada `RecipeSnapshot.ingredients`.
- `RecipeSnapshot.kcal`, `.macros`, `MealPlanDay.totalKcal`/`.macros` — **inalterados**.
- Os dados-base em `fixtures.ts` (`SHOPPING_ITEMS_SEED`, ingredientes das receitas) continuam a representar 1 pessoa — a multiplicação acontece só na resposta do handler, nunca nos dados-base.
- Este é o mesmo ponto que o futuro `ShoppingListService` real (`BE-C06`, ainda por construir) terá de replicar — este spec documenta o comportamento esperado para quando esse trabalho começar.

## 5. UI de leitura — sem alterações de código

- `MealCard`, a página de detalhe da receita (T-05, `plano/refeicao/[entryId]/page.tsx`) e a lista de compras (T-06) já mostram o `quantity`/`estimatedCostMt` que vem da API — não precisam de mudança, porque passam a receber os valores já escalados do mock.

## Fora de escopo

- "Pedir receita agora" (botão de acesso rápido no dashboard) — ideia extraída do mesmo mock do Stitch, mas é uma funcionalidade separada (endpoint de geração ad-hoc); não faz parte desta spec.
- Qualquer alteração ao `ShoppingListService`/backend real — ainda não existe; este spec só cobre o comportamento do mock e do contrato.
- Validação/limites diferentes de 1–8 pessoas, ou UI de "porções por refeição individual" (algumas receitas podem ter porções diferentes) — mantém-se um único `householdSize` global por perfil.

## Critérios de verificação

- `Profile.householdSize` aparece no schema gerado (`src/types/api.d.ts`) e é opcional (perfis existentes sem o campo tratam como 1).
- Onboarding: o novo passo aparece na posição certa, guarda no rascunho local do wizard como os outros passos, e é enviado no `POST` final de criação do perfil.
- Perfil: a secção "Pessoas em casa" segue o mesmo padrão de loading/edição/saving/erro das restantes secções.
- Mock: alterar `householdSize` (via `PUT /me/profile`) e voltar a pedir `GET /me/shopping-list` e `GET /me/meal-plans/active` devolve quantidades/custos multiplicados corretamente; `kcal`/`macros` mantêm-se inalterados nas mesmas respostas.
- `npm run build`/`typecheck`/`lint` sem erros novos; teste manual no browser (onboarding → perfil → dashboard → lista de compras) antes de dar como concluído.

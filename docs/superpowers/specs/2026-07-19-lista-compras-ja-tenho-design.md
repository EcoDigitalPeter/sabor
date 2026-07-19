# Lista de compras — "já tenho isto" (despensa por item) — design

**Data:** 2026-07-19
**Estado:** aprovado, pronto para plano de implementação

## Contexto e motivação

Pedido do utilizador: no portal do cliente, em `/compras`, o cliente deve poder indicar que produtos já tem em casa (geleira/despensa), para que a lista de compras se ajuste ao que falta comprar de facto, em vez de mostrar sempre a quantidade total exigida pelas receitas da semana.

Hoje `ShoppingListItem` (`src/types/api.d.ts`) só tem `quantity` (total exigido pela semana) e `checked` (comprado ou não) — não existe nenhum conceito de "já tinha em casa". A lista é construída por `buildShoppingList()` em `src/mocks/fixtures.ts` a partir de um seed estático (`SHOPPING_ITEMS_SEED`) — nota à parte: esta função **não** agrega de facto os ingredientes do plano ativo gerado (o `01-functional-plan.md` §F1-CLI-06 descreve essa agregação como regra de negócio, mas a implementação mock atual usa sempre o mesmo seed fixo, independente do plano gerado). Esta é uma limitação pré-existente, não introduzida por esta feature, e fica fora do âmbito corrigir aqui.

Não existe backend real neste repositório em `master` (só existem resíduos de `levesabor-api`/`openapi.yaml` em worktrees de agentes antigos, não integrados) — `src/types/api.d.ts` é o contrato mantido à mão que a MSW (`src/mocks/`) usa para simular a API. Esta feature, tal como o resto do frontend, avança mock-first.

## Decisões (via brainstorming com o utilizador)

1. **Quantidade exata, não binário.** O cliente indica *quanto* já tem (ex.: "tenho 1 kg" de um total de "3 kg"), não um simples sim/não. A quantidade a comprar mostrada passa a ser `quantity − haveQuantity` (nunca negativa).
2. **Só a partir da lista já gerada.** Não há ecrã novo de "despensa"/catálogo de ingredientes para pesquisar e adicionar itens fora da lista atual (ex.: sal ou óleo que o cliente sabe que sempre tem, mas que não aparece esta semana). Cada item da lista atual ganha o seu próprio campo "já tenho".
3. **Reinicia a cada plano novo.** `haveQuantity` não persiste de semana para semana — não há forma fiável de saber quanto sobrou de facto (o cliente pode não ter cozinhado exatamente como planeado). Cada vez que o plano é regenerado ou uma refeição é trocada, a lista é reconstruída do zero com `haveQuantity: 0`.

**Consequência feliz:** a regra de negócio já existente de agregação de unidades ("soma por `ingredient_id` convertendo unidades compatíveis; unidades incompatíveis geram linhas separadas" — `01-functional-plan.md` §F1-CLI-06) garante que cada `ShoppingListItem` já chega ao cliente com uma única `unit`. O campo "já tenho" nunca precisa de conversão de unidades — é só um número na mesma `unit` já mostrada na linha.

## Âmbito

**Dentro do âmbito:**
- Campo `haveQuantity` em `ShoppingListItem` (contrato mock).
- `PATCH /me/shopping-list/items/{id}` passa a aceitar `haveQuantity` além de `checked`.
- UI em `/compras`: por item, um campo para indicar "já tenho X", quantidade "a comprar" recalculada, custo recalculado pro-rata.
- Extensão do hook `useShoppingList.ts` (mutação otimista + fila offline, mesmo padrão já usado para `checked`).

**Fora do âmbito (não fazer nesta feature):**
- Catálogo de ingredientes pesquisável / ecrã de despensa dedicado (decisão nº2 acima).
- Persistência entre planos/semanas (decisão nº3 acima).
- Corrigir `buildShoppingList()` para agregar de facto a partir do plano ativo em vez do seed estático — limitação pré-existente, não relacionada.
- Conversão de unidades — não é necessária (ver "Consequência feliz" acima).
- Qualquer alteração ao checkbox "comprado" existente — são dois conceitos independentes (já tinha vs. já comprei); marcar "já tenho o suficiente" não marca `checked` automaticamente.

## Modelo de dados

`src/types/api.d.ts` — `ShoppingListItem` ganha um campo opcional:

```ts
ShoppingListItem: {
  id?: number;
  ingredientName?: string;
  category?: "CEREAIS_E_FARINHAS" | "PROTEINA" | "VEGETAIS_E_FOLHAS" | "LEGUMINOSAS" | "TEMPEROS_E_OLEOS" | "OUTROS";
  quantity?: number;
  unit?: string;
  checked?: boolean;
  estimatedCostMt?: number | null;
  haveQuantity?: number;   // NOVO — quantidade que o cliente já diz ter, na mesma `unit`; default 0
};
```

`ShoppingList` (totais) não muda de schema — os totais no topo da página continuam a ser derivados dos items, agora usando os valores "a comprar" já ajustados em vez do total bruto.

## Contrato / mock

`src/mocks/fixtures.ts`:
- `setShoppingListItemChecked(itemId, checked)` generaliza para `updateShoppingListItem(itemId, patch: { checked?: boolean; haveQuantity?: number })`, aplicando o patch ao item em memória.
- `buildShoppingList()` continua a criar cada item com `haveQuantity: 0` — não precisa de nenhuma lógica extra de "reset": como a lista inteira é reconstruída do zero sempre que o plano é gerado/trocado, o reset acontece por construção.
- Custo "a comprar": quando `estimatedCostMt` não é `null`, recalcula-se pro-rata a partir da quantidade em falta: `custoRestante = estimatedCostMt * max(0, quantity − haveQuantity) / quantity`. Quando `estimatedCostMt` é `null`, mantém-se `null` (comportamento "estimativa parcial" inalterado).

`src/mocks/handlers.ts`:
- `http.patch("*/api/v1/me/shopping-list/items/:id", ...)` passa a ler `{ checked?, haveQuantity? }` do body e chamar `updateShoppingListItem`.

## Hook (`src/hooks/useShoppingList.ts`)

`useToggleShoppingItem` generaliza para `useUpdateShoppingItem`, aceitando `{ id, checked }` OU `{ id, haveQuantity }` (mutação por campo, não as duas de uma vez). Mesmo padrão já existente:
- Atualização otimista do cache (`shoppingListQueryKey`).
- Erro de rede → `enqueueShoppingToggle` (generalizado para qualquer patch, não só `checked`) + fila local, sincroniza ao voltar rede (`lib/offline.ts`).
- Erro de servidor → reverte para o estado anterior.

`useToggleShoppingItem` mantém-se como wrapper fino sobre `useUpdateShoppingItem` para não obrigar a alterar todas as chamadas existentes (`checked`) — só `compras/page.tsx` ganha a chamada nova para `haveQuantity`.

## UI

`src/components/plan/ShoppingGroup.tsx` — a linha por item (hoje só `<Checkbox>` + quantidade) cresce; extrair `ShoppingItemRow` como componente próprio dentro do mesmo ficheiro ou num novo `ShoppingItemRow.tsx`, mantendo `ShoppingGroup` focado em agrupar/colapsar.

Por item:
- Por baixo do nome, um link discreto **"Já tenho um pouco"**. Ao tocar, revela um `<input type="number" min="0">` inline com a `unit` do item ao lado (ex.: "tenho ___ kg"), guardado em blur/debounce via `useUpdateShoppingItem`.
- Quando `haveQuantity > 0`, o link é substituído pelo valor já preenchido (editável) e aparece uma linha secundária pequena: "de 3 kg, já tens 1 kg".
- A quantidade à direita da linha (hoje sempre `quantity unit`) passa a mostrar a quantidade **a comprar**: `max(0, quantity − haveQuantity) unit`.
- Quando `haveQuantity >= quantity`, a linha mostra "0 kg — já tens o suficiente" e fica visualmente esbatida (mesma linguagem visual usada para items `checked`) — mas o checkbox "comprado" continua independente, não se marca sozinho.

`src/app/(cliente)/compras/page.tsx` — o contador "X de Y comprados" e o "custo estimado" no topo continuam a somar a partir dos items (sem mudar a fórmula), agora usando `quantity − haveQuantity` e o custo pro-rata em vez do bruto.

## Casos de erro/borda

- `haveQuantity` negativo: bloqueado no input (`min="0"`) e clampado no hook antes de enviar.
- `haveQuantity > quantity`: permitido guardar (ex.: sobrou mais do que a receita desta semana precisa) — só a quantidade **a comprar** é clampada a 0, o valor guardado em si não.
- Offline: mesmo comportamento já existente do checkbox — fica otimista, enfileira o patch, sincroniza ao voltar a rede.
- `estimatedCostMt: null` (sem preço de referência): "a comprar" em quantidade ajusta-se na mesma; custo mantém-se `null`/"estimativa parcial", sem tentar estimar.

## Documentação a atualizar (fora desta spec, no plano de implementação)

- `docs/plano/tasks.md` — nova wave `FE-R` (feature funcional, distinta do redesign visual de `FE-Q`) para esta feature.
- `docs/plano/01-functional-plan.md` §F1-CLI-06 — acrescentar a regra de negócio "já tenho" e o novo campo `haveQuantity` ao contrato descrito.

# Seed do Catálogo (Ingredientes + Receitas) na Supabase — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Popular a base de dados Supabase (prod, DB-07) com ingredientes e receitas reais, reutilizando os dados já curados em `levesabor/levesabor-web/src/mocks/fixtures.ts`, para desbloquear a geração de plano alimentar (actualmente falha com `LSA018_INSUFFICIENT_CATALOG` — catálogo vazio, confirmado em teste de integração de 2026-08-21).

**Architecture:** Um script Node/TypeScript (`scripts/seed-catalog.ts`, em `levesabor-web/`) importa directamente `RECIPE_CATALOG`, `ADMIN_INGREDIENTS` e `ADMIN_RECIPES` de `src/mocks/fixtures.ts` — zero duplicação de dados — e reproduz cada item via chamadas HTTP autenticadas aos endpoints Admin já existentes e testados (`POST /api/v1/admin/ingredients`, `POST /api/v1/admin/recipes`, `PATCH /api/v1/admin/recipes/{id}/status`), em vez de INSERT SQL directo. Isto garante que os dados passam pelas mesmas regras de negócio da app real (`RecipePublicationValidator`, cálculo/override de macros) e ficam auditados (`audit_log`), evitando duplicar/discordar da lógica Java numa segunda implementação em SQL. O script é idempotente (verifica por nome antes de criar) para poder correr em segurança contra o perfil `dev` local (que já tem `V9003`/`V9004` semeados) como ensaio antes de correr contra a Supabase real.

**Tech Stack:** Node.js + TypeScript (`tsx` para execução directa), `@supabase/supabase-js` (já dependência do projecto, para o login por password grant), `fetch` nativo para chamar a API do `ottimizo`.

**Spec:** Não existe spec dedicada para esta tarefa de seed. Referências informais usadas como fonte da verdade:
- `levesabor/levesabor-web/src/mocks/fixtures.ts` (dados reais: `RECIPE_CATALOG`, `ADMIN_INGREDIENTS`, `ADMIN_RECIPES`) — fonte primária, é o que se está a reutilizar.
- `ottimizo/src/main/resources/db/dev-seed/V9003__dev_seed_ingredients.sql` e `V9004__dev_seed_recipes.sql` — curadoria já feita (categorias de ingredientes sem nutrição real, regra `meal_tag`, quais receitas ficam `DRAFT`) para o perfil `dev`; este plano **reaproveita essa curadoria**, não a reinventa.
- `docs/plano/01-functional-plan.md` (F1-CLI-01/02, F2-ADM-05) — regras de negócio do catálogo/plano.
- `CLAUDE.md` (raiz) — nomes de enums/labels têm de ser byte-idênticos ao resto da app; PT-PT pré-AO90 em qualquer texto novo.

## Global Constraints

- Todo o texto (nomes, descrições, mensagens de log do script) em Português Europeu pré-Acordo Ortográfico de 1990.
- Nunca inventar dados nutricionais plausíveis para ingredientes sem nutrição real no mock — seguir exactamente a decisão já tomada em `V9003` (0 / `null` explícito, com o motivo documentado).
- A receita `9999` (`"Bolo de arroz (rascunho)"`) em `ADMIN_RECIPES` é propositadamente incompleta (fixture de teste do erro `LSA023_RECIPE_INCOMPLETE`) — **nunca semear**.
- O script nunca aceita nem passa um `userId`/`id` explícito às APIs Admin — os IDs reais (Postgres `IDENTITY`) são atribuídos no `POST` e capturados da resposta.
- Este catálogo vai para a Supabase de **produção** (DB-07, já confirmada/configurada — ver `docs/plano/tasks.md` linha 231). Não é uma base de dados descartável: os dados são conteúdo real de lançamento, não lixo de teste — mas o passo de promoção a `ADMIN` (Task 5) é temporário e tem de ser revertido no fim.

---

## Contexto técnico descoberto (para quem for implementar)

- **Autorização Admin depende de um custom claim no JWT**, não só da coluna `users.role`: `ottimizo/src/main/java/com/ottimizo/common/security/SecurityConfig.java:93-100` lê a claim `role` do JWT (`hasRole(Role.ADMIN.name())` em `/api/v1/admin/**`). Essa claim é injectada por um hook Postgres (`ottimizo/src/main/resources/db/migration/V006__supabase_custom_claims.sql`, função `public.custom_access_token_hook`) que lê `public.users.role` **no momento em que o Supabase Auth emite o token**. Confirmei que o hook está activo nesta Supabase de prod — descodifiquei o JWT do utilizador de teste e a claim `"role": "CLIENTE"` está presente. Consequência prática: **mudar `users.role` no Postgres não muda tokens já emitidos** — é preciso fazer login de novo (ou `refresh_token`) depois do `UPDATE` para obter um JWT com a claim `role: ADMIN` actualizada.
- **Tabela `users`** (não `app_users`): `id bigint identity`, `auth_user_id uuid unique references auth.users`, `role varchar check in ('CLIENTE','ADMIN','LOJISTA')` default `CLIENTE` (`ottimizo/src/main/resources/db/migration/V001__auth_users_audit.sql:1-15`).
- **`POST /api/v1/admin/ingredients`** (`IngredientRequest`): `name`, `category`, `baseUnit` (`@NotBlank`), `kcalPer100g`/`proteinPer100g`/`carbsPer100g`/`fatPer100g`/`fiberPer100g` (`@NotNull`, `BigDecimal`, `kcalPer100g` máx. 900), `referencePriceMt` (opcional, `@Positive` só valida se presente), `active` (bool).
- **`POST /api/v1/admin/recipes`** (`RecipeRequest`): `name`, `description` (opcional), `mealTag`, `healthNote` (opcional), `prepMinutes`, `servings` (1-12), `estimatedCostMt` (opcional), `healthTags` (lista, pode ser vazia — mas então a receita não pode ser publicada), `ingredients: [{ingredientId, quantity, unit}]`, `steps: [{text}]` (**sem** campo `order` — a ordem é a posição na lista), `macrosOverride` (bool), e se `true`: `kcal`, `proteinPct`, `carbsPct`, `fatPct`, `fiberPct`. Toda receita nasce em `DRAFT` — publicar é sempre um `PATCH /api/v1/admin/recipes/{id}/status` à parte.
- **`RecipePublicationValidator`** (`ottimizo/.../catalog/RecipePublicationValidator.java`) bloqueia publicação (`LSA023_RECIPE_INCOMPLETE`) se faltar: ≥1 ingrediente, ≥2 passos, `kcal`, os 4 macros, ou ≥1 `healthTag`. A receita `2` do mock (`"Pão com ovo estrelado..."`) tem `healthTags: []` — **fica sempre em `DRAFT`**, tal como já decidido em `V9004`. A receita `7` fica `DRAFT` por curadoria editorial explícita em `ADMIN_RECIPES`, não por regra de validação.
- `RECIPE_CATALOG` em `fixtures.ts` já tem `steps` com texto real de preparo (que `V9004` não usa, por ser SQL directo) — isto é uma vantagem de ir pela API: a receita fica completa (publicável) sem trabalho extra.

---

### Task 1: Scaffold do script de seed + autenticação

**Files:**
- Create: `levesabor/levesabor-web/scripts/seed-catalog.ts`
- Create: `levesabor/levesabor-web/scripts/.env.seed.example`
- Modify: `levesabor/levesabor-web/package.json` (novo script `seed:catalog`, nova devDependency `tsx`)

**Interfaces:**
- Produces: `loginAdmin(): Promise<string>` — devolve o `access_token` JWT de um utilizador com claim `role=ADMIN`. `apiUrl: string` (de `process.env.SEED_API_URL`). `dryRun: boolean` (de `process.argv.includes("--dry-run")`).

- [ ] **Step 1: Criar o template de variáveis de ambiente do script**

```bash
# levesabor/levesabor-web/scripts/.env.seed.example
# Copiar para scripts/.env.seed (nunca versionar) e preencher antes de correr `npm run seed:catalog`.
SEED_API_URL=http://localhost:8080/api/v1
SEED_SUPABASE_URL=
SEED_SUPABASE_ANON_KEY=
SEED_ADMIN_EMAIL=
SEED_ADMIN_PASSWORD=
```

- [ ] **Step 2: Adicionar `tsx` e o script npm**

Em `levesabor/levesabor-web/package.json`, adicionar à secção `"scripts"`:

```json
"seed:catalog": "tsx scripts/seed-catalog.ts"
```

E à `"devDependencies"`:

```json
"tsx": "^4.19.0"
```

Depois correr:

```bash
cd levesabor/levesabor-web
npm install
```

- [ ] **Step 3: Escrever o scaffold do script com login**

```typescript
// levesabor/levesabor-web/scripts/seed-catalog.ts
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvFile(path: string): void {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(resolve(__dirname, ".env.seed"));

const DRY_RUN = process.argv.includes("--dry-run");

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável de ambiente em falta: ${name} (ver scripts/.env.seed.example)`);
  }
  return value;
}

async function loginAdmin(): Promise<string> {
  const supabaseUrl = requireEnv("SEED_SUPABASE_URL");
  const supabaseAnonKey = requireEnv("SEED_SUPABASE_ANON_KEY");
  const email = requireEnv("SEED_ADMIN_EMAIL");
  const password = requireEnv("SEED_ADMIN_PASSWORD");

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new Error(`Falha no login Supabase: ${error?.message ?? "sem sessão"}`);
  }

  const payload = JSON.parse(
    Buffer.from(data.session.access_token.split(".")[1], "base64url").toString("utf-8"),
  );
  if (payload.role !== "ADMIN") {
    throw new Error(
      `Utilizador ${email} não tem claim role=ADMIN neste token (tem "${payload.role}"). ` +
        `Promove-o em users.role e faz login de novo antes de correr o seed — ver Task 5 do plano.`,
    );
  }

  return data.session.access_token;
}

async function main() {
  const apiUrl = requireEnv("SEED_API_URL");
  console.log(`A autenticar contra ${process.env.SEED_SUPABASE_URL}...`);
  const token = await loginAdmin();
  console.log(`Login OK, role=ADMIN confirmado. Alvo da API: ${apiUrl}${DRY_RUN ? " (--dry-run)" : ""}`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
```

- [ ] **Step 4: Verificar login contra o backend local (perfil dev)**

Com o backend `ottimizo` a correr localmente (perfil `dev`, embedded Postgres — o mesmo que já usaste nos testes de integração), preenche `scripts/.env.seed` com as credenciais do utilizador admin **dev** (`V9002__dev_seed_admin_user.sql`) e o `SEED_SUPABASE_URL`/`SEED_SUPABASE_ANON_KEY` de `.env.local`.

Run: `cd levesabor/levesabor-web && npm run seed:catalog -- --dry-run`
Expected: imprime `Login OK, role=ADMIN confirmado.` sem erros.

- [ ] **Step 5: Commit**

```bash
cd levesabor/levesabor-web
git add scripts/seed-catalog.ts scripts/.env.seed.example package.json package-lock.json
git commit -m "feat(seed): scaffold do script de seed de catálogo com login admin"
```

---

### Task 2: Dataset e criação idempotente de ingredientes

**Files:**
- Create: `levesabor/levesabor-web/scripts/seed-data/ingredients.ts`
- Modify: `levesabor/levesabor-web/scripts/seed-catalog.ts`

**Interfaces:**
- Consumes: `loginAdmin(): Promise<string>`, `DRY_RUN: boolean` (Task 1).
- Produces: `INGREDIENTS: IngredientSeed[]` (de `seed-data/ingredients.ts`). `seedIngredients(apiUrl, token): Promise<Map<number, number>>` — devolve o mapa `mockIngredientId -> idRealCriadoNaBD`, usado pela Task 3.

- [ ] **Step 1: Transcrever o dataset de ingredientes (reaproveitado de `V9003`)**

Os 28 ingredientes e as suas categorias/nutrição já foram curados a partir do mock em `V9003__dev_seed_ingredients.sql` (ver comentário nesse ficheiro: 5 têm nutrição real copiada de `ADMIN_INGREDIENTS`, os restantes 23 só têm nome/unidade no mock, nutrição fica a 0/`null` por decisão documentada). Este passo só transcreve essa mesma curadoria para TypeScript — não reinventa categorias.

```typescript
// levesabor/levesabor-web/scripts/seed-data/ingredients.ts
export interface IngredientSeed {
  mockId: number;
  name: string;
  category: string;
  baseUnit: string;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g: number;
  referencePriceMt: number | null;
  active: boolean;
}

// Reaproveitado de ottimizo/src/main/resources/db/dev-seed/V9003__dev_seed_ingredients.sql —
// mesma curadoria (nutrição real só para os 5 ingredientes que a têm no mock; category é
// classificação alimentar genérica para os restantes, não dado de produto inventado).
export const INGREDIENTS: IngredientSeed[] = [
  { mockId: 1, name: "Amendoim moído", category: "Leguminosas e Oleaginosas", baseUnit: "g", kcalPer100g: 0, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 0, fiberPer100g: 0, referencePriceMt: null, active: true },
  { mockId: 2, name: "Banana", category: "Fruta", baseUnit: "unidade", kcalPer100g: 0, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 0, fiberPer100g: 0, referencePriceMt: null, active: true },
  { mockId: 3, name: "Água", category: "Bebidas", baseUnit: "ml", kcalPer100g: 0, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 0, fiberPer100g: 0, referencePriceMt: null, active: true },
  { mockId: 4, name: "Pão", category: "Padaria", baseUnit: "unidade", kcalPer100g: 0, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 0, fiberPer100g: 0, referencePriceMt: null, active: true },
  { mockId: 5, name: "Ovo", category: "Proteína", baseUnit: "unidade", kcalPer100g: 0, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 0, fiberPer100g: 0, referencePriceMt: null, active: true },
  { mockId: 6, name: "Óleo de cozinha", category: "Gorduras e Óleos", baseUnit: "ml", kcalPer100g: 0, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 0, fiberPer100g: 0, referencePriceMt: null, active: true },
  { mockId: 7, name: "Chá (folhas ou saqueta)", category: "Bebidas", baseUnit: "saqueta", kcalPer100g: 0, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 0, fiberPer100g: 0, referencePriceMt: null, active: true },
  { mockId: 8, name: "Limão", category: "Fruta", baseUnit: "unidade", kcalPer100g: 0, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 0, fiberPer100g: 0, referencePriceMt: null, active: true },
  { mockId: 9, name: "Farinha de milho (fuba)", category: "Cereais e Farinhas", baseUnit: "kg", kcalPer100g: 365, proteinPer100g: 9, carbsPer100g: 76, fatPer100g: 3.5, fiberPer100g: 7, referencePriceMt: 60, active: true },
  { mockId: 10, name: "Canela em pau", category: "Especiarias", baseUnit: "unidade", kcalPer100g: 0, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 0, fiberPer100g: 0, referencePriceMt: null, active: true },
  { mockId: 11, name: "Tomate", category: "Legumes", baseUnit: "g", kcalPer100g: 0, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 0, fiberPer100g: 0, referencePriceMt: null, active: true },
  { mockId: 12, name: "Cebola", category: "Legumes", baseUnit: "g", kcalPer100g: 0, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 0, fiberPer100g: 0, referencePriceMt: null, active: true },
  { mockId: 13, name: "Pão integral", category: "Padaria", baseUnit: "fatia", kcalPer100g: 0, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 0, fiberPer100g: 0, referencePriceMt: null, active: true },
  { mockId: 14, name: "Feijão nhemba", category: "Leguminosas", baseUnit: "kg", kcalPer100g: 340, proteinPer100g: 24, carbsPer100g: 60, fatPer100g: 1.5, fiberPer100g: 15, referencePriceMt: 90, active: true },
  { mockId: 15, name: "Folhas de mandioca (matapa)", category: "Legumes", baseUnit: "g", kcalPer100g: 0, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 0, fiberPer100g: 0, referencePriceMt: null, active: true },
  { mockId: 16, name: "Camarão", category: "Proteína", baseUnit: "g", kcalPer100g: 0, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 0, fiberPer100g: 0, referencePriceMt: null, active: true },
  { mockId: 17, name: "Leite de coco", category: "Gorduras e Óleos", baseUnit: "ml", kcalPer100g: 0, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 0, fiberPer100g: 0, referencePriceMt: null, active: true },
  { mockId: 18, name: "Alho", category: "Especiarias", baseUnit: "g", kcalPer100g: 0, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 0, fiberPer100g: 0, referencePriceMt: null, active: true },
  { mockId: 19, name: "Arroz", category: "Cereais e Farinhas", baseUnit: "kg", kcalPer100g: 360, proteinPer100g: 7, carbsPer100g: 79, fatPer100g: 0.6, fiberPer100g: 1.3, referencePriceMt: 75, active: true },
  { mockId: 20, name: "Couve", category: "Legumes", baseUnit: "g", kcalPer100g: 0, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 0, fiberPer100g: 0, referencePriceMt: null, active: true },
  { mockId: 21, name: "Peixe (garoupa)", category: "Proteína", baseUnit: "kg", kcalPer100g: 105, proteinPer100g: 21, carbsPer100g: 0, fatPer100g: 2, fiberPer100g: 0, referencePriceMt: 280, active: true },
  { mockId: 22, name: "Piripiri", category: "Especiarias", baseUnit: "g", kcalPer100g: 0, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 0, fiberPer100g: 0, referencePriceMt: null, active: true },
  { mockId: 23, name: "Frango", category: "Proteína", baseUnit: "kg", kcalPer100g: 165, proteinPer100g: 31, carbsPer100g: 0, fatPer100g: 3.6, fiberPer100g: 0, referencePriceMt: 220, active: true },
  { mockId: 24, name: "Feijão jugo", category: "Leguminosas", baseUnit: "g", kcalPer100g: 0, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 0, fiberPer100g: 0, referencePriceMt: null, active: true },
  { mockId: 25, name: "Mandioca", category: "Tubérculos", baseUnit: "g", kcalPer100g: 0, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 0, fiberPer100g: 0, referencePriceMt: null, active: true },
  { mockId: 26, name: "Quiabo", category: "Legumes", baseUnit: "g", kcalPer100g: 0, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 0, fiberPer100g: 0, referencePriceMt: null, active: true },
  { mockId: 27, name: "Batata-doce", category: "Tubérculos", baseUnit: "g", kcalPer100g: 0, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 0, fiberPer100g: 0, referencePriceMt: null, active: true },
  { mockId: 28, name: "Repolho", category: "Legumes", baseUnit: "g", kcalPer100g: 0, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 0, fiberPer100g: 0, referencePriceMt: null, active: true },
];
```

- [ ] **Step 2: Função idempotente de criação (skip por nome já existente)**

Adicionar a `scripts/seed-catalog.ts`:

```typescript
import { INGREDIENTS, type IngredientSeed } from "./seed-data/ingredients";

interface AdminListItem {
  id: number;
  name: string;
}

async function fetchExistingNames(apiUrl: string, token: string, path: string): Promise<Map<string, number>> {
  const existing = new Map<string, number>();
  let page = 0;
  for (;;) {
    const res = await fetch(`${apiUrl}${path}?page=${page}&size=100`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Falha a listar ${path}: HTTP ${res.status}`);
    const body = await res.json();
    const items: AdminListItem[] = body.data.items;
    for (const item of items) existing.set(item.name, item.id);
    if (page >= body.data.totalPages - 1) break;
    page += 1;
  }
  return existing;
}

async function seedIngredients(apiUrl: string, token: string): Promise<Map<number, number>> {
  const existing = await fetchExistingNames(apiUrl, token, "/admin/ingredients");
  const idMap = new Map<number, number>();
  let created = 0;
  let skipped = 0;

  for (const ing of INGREDIENTS) {
    const existingId = existing.get(ing.name);
    if (existingId !== undefined) {
      idMap.set(ing.mockId, existingId);
      skipped += 1;
      continue;
    }
    if (DRY_RUN) {
      console.log(`[dry-run] criaria ingrediente "${ing.name}"`);
      continue;
    }
    const res = await fetch(`${apiUrl}/admin/ingredients`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: ing.name,
        category: ing.category,
        baseUnit: ing.baseUnit,
        kcalPer100g: ing.kcalPer100g,
        proteinPer100g: ing.proteinPer100g,
        carbsPer100g: ing.carbsPer100g,
        fatPer100g: ing.fatPer100g,
        fiberPer100g: ing.fiberPer100g,
        referencePriceMt: ing.referencePriceMt,
        active: ing.active,
      } satisfies Record<string, unknown>),
    });
    if (!res.ok) {
      throw new Error(`Falha a criar ingrediente "${ing.name}": HTTP ${res.status} ${await res.text()}`);
    }
    const body = await res.json();
    idMap.set(ing.mockId, body.data.id);
    created += 1;
  }

  console.log(`Ingredientes: ${created} criados, ${skipped} já existiam.`);
  return idMap;
}
```

E no `main()`:

```typescript
async function main() {
  const apiUrl = requireEnv("SEED_API_URL");
  console.log(`A autenticar contra ${process.env.SEED_SUPABASE_URL}...`);
  const token = await loginAdmin();
  console.log(`Login OK, role=ADMIN confirmado. Alvo da API: ${apiUrl}${DRY_RUN ? " (--dry-run)" : ""}`);

  const ingredientIdMap = await seedIngredients(apiUrl, token);
  console.log(`Mapa de IDs de ingredientes: ${ingredientIdMap.size} entradas.`);
}
```

- [ ] **Step 3: Verificar contra o backend dev local (idempotência)**

Com o backend `dev` a correr (já tem `V9003` semeado com os mesmos 28 nomes), corre:

Run: `npm run seed:catalog`
Expected: `Ingredientes: 0 criados, 28 já existiam.`

Isto prova que a detecção por nome funciona e que o payload é aceite pela API (senão a criação teria falhado antes de chegar a "já existiam" nalguma corrida anterior vazia — se for a primeira vez a correr contra esta base dev, espera-se antes `28 criados, 0 já existiam` na primeira corrida e `0/28` na segunda).

- [ ] **Step 4: Commit**

```bash
cd levesabor/levesabor-web
git add scripts/seed-data/ingredients.ts scripts/seed-catalog.ts
git commit -m "feat(seed): dataset de ingredientes + criação idempotente via admin API"
```

---

### Task 3: Dataset de receitas (reutilizando `RECIPE_CATALOG` do mock) + criação e publicação

**Files:**
- Create: `levesabor/levesabor-web/scripts/seed-data/recipes.ts`
- Modify: `levesabor/levesabor-web/scripts/seed-catalog.ts`

**Interfaces:**
- Consumes: `INGREDIENTS`, `seedIngredients` (Task 2). `Map<number, number>` (mockIngredientId → idReal).
- Produces: `seedRecipes(apiUrl, token, ingredientIdMap): Promise<void>`.

- [ ] **Step 1: Overlay de metadados admin (reutilizado de `ADMIN_RECIPES`) e regra de `mealTag`**

```typescript
// levesabor/levesabor-web/scripts/seed-data/recipes.ts
// Reaproveita RECIPE_CATALOG directamente do mock do frontend — zero duplicação de
// nome/kcal/macros/healthTags/healthNote/ingredientes/passos.
import { RECIPE_CATALOG } from "../../src/mocks/fixtures";

// Overlay de description/servings/status por receita — reaproveitado de ADMIN_RECIPES em
// fixtures.ts (a receita 9999, propositadamente incompleta, NUNCA entra aqui).
const ADMIN_OVERLAY: Record<number, { description: string | null; servings: number; publish: boolean }> = {
  6: { description: "Prato tradicional do sul de Moçambique com camarão e leite de coco.", servings: 1, publish: true },
  9: { description: "Frango marinado em limão e alho, assado à moda da Zambézia.", servings: 1, publish: true },
  14: { description: "Peixe grelhado simples com legumes salteados, baixo em sódio.", servings: 1, publish: true },
  // Receita 7 tem healthTags válidas mas fica DRAFT por decisão editorial explícita no mock
  // (ADMIN_RECIPES), tal como já reproduzido em V9004__dev_seed_recipes.sql.
  7: { description: "Feijão nhemba com arroz e couve, opção vegetariana e económica.", servings: 1, publish: false },
};

// Mesma regra que a função slotOf() do mock usa (ver comentário em V9004__dev_seed_recipes.sql):
// id<=5 pequeno-almoço, id<=12 almoço, resto jantar.
function mealTagFor(recipeId: number): string {
  if (recipeId <= 5) return "Pequeno-almoço";
  if (recipeId <= 12) return "Almoço";
  return "Jantar";
}

export interface RecipeSeed {
  mockId: number;
  name: string;
  description: string | null;
  mealTag: string;
  healthNote: string | null;
  prepMinutes: number;
  servings: number;
  estimatedCostMt: number | null;
  healthTags: string[];
  ingredients: { ingredientMockId: number; quantity: number; unit: string }[];
  steps: string[];
  kcal: number;
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
  fiberPct: number;
  publish: boolean;
}

// As 18 receitas reais do catálogo (ids 1-18). A 9999 não está em RECIPE_CATALOG, só em
// ADMIN_RECIPES — por isso já fica de fora automaticamente.
export const RECIPES: RecipeSeed[] = Object.values(RECIPE_CATALOG).map((r) => {
  const overlay = ADMIN_OVERLAY[r.recipeId];
  const canPublish = r.healthTags.length > 0;
  return {
    mockId: r.recipeId,
    name: r.name,
    description: overlay?.description ?? null,
    mealTag: mealTagFor(r.recipeId),
    healthNote: r.healthNote,
    prepMinutes: r.prepMinutes,
    servings: overlay?.servings ?? 1,
    estimatedCostMt: r.estimatedCostMt,
    healthTags: r.healthTags,
    ingredients: r.ingredients.map((i) => ({
      ingredientMockId: i.ingredientId,
      quantity: i.quantity,
      unit: i.unit,
    })),
    steps: r.steps.map((s) => s.text),
    kcal: r.kcal,
    proteinPct: r.macros.proteina,
    carbsPct: r.macros.carbs,
    fatPct: r.macros.gordura,
    fiberPct: r.macros.fibra,
    // Publica por omissão, excepto se o overlay disser explicitamente que não (receita 7),
    // ou se não tiver healthTags (receita 2 — RecipePublicationValidator exige >=1).
    publish: (overlay?.publish ?? true) && canPublish,
  };
});
```

- [ ] **Step 2: Criação + publicação idempotente**

Adicionar a `scripts/seed-catalog.ts`:

```typescript
import { RECIPES } from "./seed-data/recipes";

async function seedRecipes(
  apiUrl: string,
  token: string,
  ingredientIdMap: Map<number, number>,
): Promise<void> {
  const existing = await fetchExistingNames(apiUrl, token, "/admin/recipes");
  let created = 0;
  let skipped = 0;
  let published = 0;

  for (const recipe of RECIPES) {
    if (existing.has(recipe.name)) {
      skipped += 1;
      continue;
    }
    if (DRY_RUN) {
      console.log(`[dry-run] criaria receita "${recipe.name}" (publish=${recipe.publish})`);
      continue;
    }

    const ingredients = recipe.ingredients.map((i) => {
      const ingredientId = ingredientIdMap.get(i.ingredientMockId);
      if (ingredientId === undefined) {
        throw new Error(
          `Receita "${recipe.name}" referencia ingredientMockId=${i.ingredientMockId} sem id real mapeado — corre seedIngredients primeiro.`,
        );
      }
      return { ingredientId, quantity: i.quantity, unit: i.unit };
    });

    const res = await fetch(`${apiUrl}/admin/recipes`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: recipe.name,
        description: recipe.description,
        mealTag: recipe.mealTag,
        healthNote: recipe.healthNote,
        prepMinutes: recipe.prepMinutes,
        servings: recipe.servings,
        estimatedCostMt: recipe.estimatedCostMt,
        healthTags: recipe.healthTags,
        ingredients,
        steps: recipe.steps.map((text) => ({ text })),
        macrosOverride: true,
        kcal: recipe.kcal,
        proteinPct: recipe.proteinPct,
        carbsPct: recipe.carbsPct,
        fatPct: recipe.fatPct,
        fiberPct: recipe.fiberPct,
      }),
    });
    if (!res.ok) {
      throw new Error(`Falha a criar receita "${recipe.name}": HTTP ${res.status} ${await res.text()}`);
    }
    const body = await res.json();
    const recipeId = body.data.id;
    created += 1;

    if (recipe.publish) {
      const publishRes = await fetch(`${apiUrl}/admin/recipes/${recipeId}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PUBLISHED" }),
      });
      if (!publishRes.ok) {
        throw new Error(
          `Falha a publicar receita "${recipe.name}" (id=${recipeId}): HTTP ${publishRes.status} ${await publishRes.text()}`,
        );
      }
      published += 1;
    }
  }

  console.log(`Receitas: ${created} criadas (${published} publicadas), ${skipped} já existiam.`);
}
```

E no `main()`, depois de `seedIngredients`:

```typescript
  await seedRecipes(apiUrl, token, ingredientIdMap);
```

- [ ] **Step 3: Verificar contra o backend dev local (idempotência)**

Run: `npm run seed:catalog`
Expected (backend `dev`, `V9004` já semeado com os mesmos 18 nomes): `Receitas: 0 criadas (0 publicadas), 18 já existiam.`

Se esta for a primeira corrida contra uma base vazia, espera-se antes `Receitas: 18 criadas (16 publicadas), 0 já existiam.` (16 = 18 - receita 2 sem healthTags - receita 7 com `publish: false`).

- [ ] **Step 4: Commit**

```bash
cd levesabor/levesabor-web
git add scripts/seed-data/recipes.ts scripts/seed-catalog.ts
git commit -m "feat(seed): dataset de receitas reutilizando RECIPE_CATALOG do mock + publicação"
```

---

### Task 4: Promover utilizador a ADMIN na Supabase de produção (passo manual)

**Files:** nenhum (SQL executado directamente na Supabase; sem alterações no repositório).

Este passo é manual porque não existe (propositadamente — ver `docs/plano/tasks.md` DB-07/INT-01) nenhum endpoint self-service para criar o primeiro admin: promover o primeiro `ADMIN` exige acesso directo à base de dados.

- [ ] **Step 1: Confirmar quem vai ser o admin do seed**

Reutiliza a conta de teste já criada e usada nos testes de integração (`teste.integracao.1787308566098@gmail.com`) — evita criar mais uma conta Supabase só para isto. A promoção é temporária.

- [ ] **Step 2: Promover no dashboard da Supabase (SQL Editor) da base de PRODUÇÃO**

```sql
update public.users
set role = 'ADMIN'
where email = 'teste.integracao.1787308566098@gmail.com';

-- confirmar:
select id, email, role from public.users where email = 'teste.integracao.1787308566098@gmail.com';
-- esperado: role = 'ADMIN'
```

- [ ] **Step 3: Preencher `scripts/.env.seed` para o alvo de produção**

```bash
SEED_API_URL=<url do backend ottimizo em produção>/api/v1
SEED_SUPABASE_URL=https://fdbgtfafynvteakamkuf.supabase.co
SEED_SUPABASE_ANON_KEY=sb_publishable_FZgyFl-JT1I2weI5XVa4EA_D5IyYKl4
SEED_ADMIN_EMAIL=teste.integracao.1787308566098@gmail.com
SEED_ADMIN_PASSWORD=Teste12345
```

- [ ] **Step 4: Confirmar que o novo login já traz a claim `role=ADMIN`**

O token antigo (já obtido antes da promoção) **não** serve — foi assinado com `role=CLIENTE`. O script faz sempre login de novo (`loginAdmin()`), por isso um novo `access_token` já vem com a claim actualizada (o hook `custom_access_token_hook` lê `users.role` no momento da emissão).

Run: `npm run seed:catalog -- --dry-run`
Expected: `Login OK, role=ADMIN confirmado.` (se ainda disser CLIENTE, confirma o `UPDATE` do Step 2 e tenta de novo — não há caching a limpar, é sempre um login novo).

- [ ] **Step 5: nada para commit** (passo operacional, sem alterações de código).

---

### Task 5: Correr o seed contra produção e reverter a promoção

**Files:** nenhum (execução + SQL de reversão).

**Interfaces:**
- Consumes: script completo das Tasks 1-3, admin promovido na Task 4.

- [ ] **Step 1: Correr o seed real contra a Supabase de produção**

Run: `cd levesabor/levesabor-web && npm run seed:catalog`
Expected: `Ingredientes: 28 criados, 0 já existiam.` seguido de `Receitas: 18 criadas (16 publicadas), 0 já existiam.`

- [ ] **Step 2: Verificar o catálogo pela API pública (perspectiva do cliente)**

Reutilizando o token do utilizador de teste (papel `CLIENTE` — depois de reverter a promoção no Step 4, ou com um segundo login antes de reverter):

Run: `curl -s "$API_URL/me/recipes?size=50" -H "Authorization: Bearer $TOKEN"`
Expected: `totalItems` não pode ser 0 — deve devolver as 16 receitas `PUBLISHED` (as 18 menos a 2 e a 7, que ficam `DRAFT`).

- [ ] **Step 3: Repetir o teste de integração da geração de plano (o que tinha falhado com `LSA018_INSUFFICIENT_CATALOG`)**

```bash
curl -s -X POST "$API_URL/me/meal-plans" -H "Authorization: Bearer $TOKEN" -w "\nHTTP %{http_code}\n"
# guardar o "id" da resposta, depois:
curl -s "$API_URL/me/meal-plans/<id>" -H "Authorization: Bearer $TOKEN" -w "\nHTTP %{http_code}\n"
```

Expected: `status` deixa de ser `FAILED` — passa a `GENERATING` e depois `COMPLETED` (ou o nome de estado terminal equivalente em `MealGenerationResponse`/`GenerationStatus`), com `mealPlanId` preenchido.

- [ ] **Step 4: Reverter a promoção temporária a ADMIN**

```sql
update public.users
set role = 'CLIENTE'
where email = 'teste.integracao.1787308566098@gmail.com';
```

- [ ] **Step 5: nada para commit** (execução + SQL, sem alterações de código).

---

## Fora de âmbito (mencionar, não implementar aqui)

- **Lojas/produtos** (`ADMIN_STORES`, `LOJA_PRODUCTS` em `fixtures.ts`) para desbloquear o fluxo de encomendas fim-a-fim — o mesmo padrão deste plano (script idempotente reutilizando o mock, via `POST /api/v1/admin/stores` + `POST /api/v1/loja/products` ou o import de catálogo) serviria, mas é um cartão à parte (`INT-05` já cobre "loja + encomendas ao backend real").
- **Limpeza dos dados de teste já criados em produção** durante os testes de integração de hoje (utilizador `teste.integracao...`, `ClientProfile`, geração de plano `id=1` `FAILED`) — não bloqueia este seed, mas vale a pena decidir com o Peter se ficam (é uma conta de teste legítima) ou se há um ambiente de staging Supabase separado a criar para não misturar dados de teste com o catálogo real de lançamento.

## Self-Review

- **Cobertura da spec informal:** `RECIPE_CATALOG` (18/18 receitas) ✓, `ADMIN_INGREDIENTS` (5/5 com nutrição real) ✓ + os 23 restantes do mock (via `V9003`) ✓, `ADMIN_RECIPES` overlay (description/status para 6,7,9,14) ✓, exclusão da receita `9999` ✓, regra `mealTag` ✓, regra "receita 2 fica DRAFT por falta de healthTags" ✓.
- **Placeholders:** nenhum `TODO`/"implementar depois" — todo o código dos steps está completo e executável.
- **Consistência de tipos:** `IngredientSeed.mockId` (Task 2) é o mesmo campo usado em `RecipeSeed.ingredients[].ingredientMockId` (Task 3) e no `Map<number, number>` devolvido por `seedIngredients` e consumido por `seedRecipes` — nomes e tipos alinhados em todas as tasks.

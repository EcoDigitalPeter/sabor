# Frontend sem dados hardcoded — consumir o backend real (extensão de INT-01/03/05)

> **Para quem for executar:** este plano complementa, não substitui, `docs/plano/tasks.md` §INT-*. As tarefas `INT-01/03/05` ("ligar FE ao backend real") já existiam como cartões vazios — este documento é o conteúdo concreto que faltava para os fechar. Usar `superpowers:subagent-driven-development` ou `superpowers:executing-plans` para executar tarefa a tarefa.

**Objectivo:** o backend Java (`ottimizo/`) está com todos os domínios implementados (`BE-A` a `BE-L`, confirmado em `tasks.md` — só falta a faixa `INT-*`). O frontend já tem a abstracção certa para consumir isso (`src/lib/api.ts` alterna mock↔real via `NEXT_PUBLIC_USE_MOCKS`, usada de forma consistente em toda a app). O que falta não é "ligar API" — é eliminar os pontos onde o frontend assume uma forma de dados específica do mock que **não é garantida pelo backend real**, e confirmar/testar sistematicamente contra o backend real antes de cada fase de deploy.

**Contexto herdado (23/08/2026):** validação end-to-end feita nesta sessão — Vercel (`levesabor-web-pi.vercel.app`) → Railway (`ottimizo-production.up.railway.app`) → Supabase prod funciona (login, CORS, dados reais do seed confirmados em `/admin/ingredientes`). `APP_CORS_ORIGINS` no Railway já inclui o domínio Vercel; faltava incluir `http://localhost:3000` para dev local (acção pendente do utilizador no dashboard Railway).

**Arquitectura:** não há refactor de camada de dados a fazer — `lib/api.ts` já é o único caminho real de fetch (confirmado por investigação: zero componentes fazem `fetch` directo ou importam `src/mocks/` fora do `MockProvider`). O trabalho é (1) corrigir divergências de contrato **confirmadas por leitura cruzada do código Java vs TypeScript**, (2) eliminar dados de UI acoplados a identificadores específicos do mock, e (3) construir uma rede de testes que apanhe isto automaticamente em vez de descobrir em produção.

**Convenção do projecto a respeitar (CLAUDE.md):** não existe módulo central de i18n/copy — cada ecrã mantém os seus próprios arrays locais, de propósito. **Este plano não introduz uma camada de constantes partilhada** para os enums de domínio (`Goal`/`HealthCondition`/`BudgetBand`/etc.) — isso contrariaria a convenção estabelecida. O alvo é sempre "o valor que o frontend envia/espera bate certo com o que o backend aceita/devolve", não "só existe um sítio onde o array está escrito".

---

## Achados desta análise (evidência, não suposição)

Investigação cruzada: agente `Explore` sobre `levesabor-web/src` (inventário completo de dados hardcoded) + leitura directa dos enums/validators Java em `ottimizo/src/main/java`.

### 🔴 Bug confirmado — `dietaryPreferences: ["sem_preferencia"]` rejeitado pelo backend real

- Frontend (`src/app/(cliente)/onboarding/page.tsx:295-296` e `src/app/(cliente)/perfil/page.tsx:252-253`): ao escolher "Sem preferência", grava literalmente `dietaryPreferences: ["sem_preferencia"]` no estado que depois é enviado por `PUT /me/profile`.
- Backend (`ottimizo/src/main/java/com/ottimizo/profile/ProfileService.java:37-39,110-120`): `DIETARY_PREFERENCES_VOCAB` tem só 6 valores (`vegetariana`, `vegan`, `sem_gluten`, `sem_lactose`, `alta_proteina`, `baixo_calorico`) — **não inclui `"sem_preferencia"`**. Qualquer valor fora do vocabulário lança `ServiceException(LSA001_VALIDATION)`.
- **Resultado contra o backend real:** qualquer cliente que escolha "Sem preferência" no onboarding ou perfil recebe erro 400/`LSA001_VALIDATION` ao gravar o perfil. Contra os mocks isto nunca aparece (o handler mock aceita qualquer string). É o achado mais concreto e mais alto risco desta análise — bloqueia uma opção legítima do wizard para qualquer utilizador real.

### 🟡 Risco não confirmado — `recipe-photos.ts` acoplado a IDs do mock

- `src/data/recipe-photos.ts:8-27` — `RECIPE_PHOTOS` é um lookup `Record<number, string>` chaveado pelos IDs 1-18 de `RECIPE_CATALOG` (`src/mocks/fixtures.ts`). Consumido por 5 componentes reais: `MealCard`, `pedir-agora/page.tsx`, `RecipeDetailSheet`, `RecipeGridCard`, `plano/refeicao/[entryId]/page.tsx`.
- `RecipeSnapshot` no contrato OpenAPI **não tem campo de imagem** — isto é um hack presentational deliberado (comentário no próprio ficheiro reconhece isto), não um bug de arquitectura.
- **O risco:** os IDs reais das 18 receitas em Supabase prod vêm do `INSERT` do seed (`ottimizo/src/main/resources/db/seed-supabase-catalogo.sql`) via `SERIAL`, não são garantidamente 1-18 na mesma ordem do array `RECIPE_CATALOG` do mock — mesmo que hoje coincidam (não verificado nesta sessão — tentativa de confirmar por login falhou a meio, sessão expirou), isto é frágil: qualquer reseed, qualquer receita nova inserida antes das 18, ou qualquer divergência de ordem entre o script SQL e o array mock quebra o lookup silenciosamente (fica sem foto, cai no fallback — não crasha, mas degrada visualmente sem aviso).
- **Não tratar como "confirmado quebrado"** — tratar como "não deve depender de coincidência". Task 2 abaixo resolve isto pela raiz (chave estável) em vez de só verificar se por acaso ainda bate certo hoje.

### 🟢 Verificado, sem acção necessária

- `Goal`, `HealthCondition`, `BudgetBand` — enums Java (`ottimizo/src/main/java/com/ottimizo/profile/{Goal,HealthCondition,BudgetBand}.java`) **byte-idênticos** aos arrays do frontend (`onboarding/page.tsx`, `perfil/page.tsx`, `pedir-agora/page.tsx`). `HealthCondition.java` até tem comentário explícito a documentar o requisito de paridade. Duplicação entre ecrãs é convenção aceite do projecto (ver CLAUDE.md), não um problema a corrigir aqui.
- `ProductCategory` (loja, `CEREAIS/PROTEINA/VEGETAIS/LEGUMINOSAS/TEMPEROS/OUTROS`) vs `ShoppingCategory` (cliente, `CEREAIS_E_FARINHAS/…`) — **não é bug**, são dois enums legitimamente diferentes (categoria de produto da loja vs categoria de ingrediente da lista de compras), confirmado no Java (`ottimizo/src/main/java/com/ottimizo/loja/ProductCategory.java`). O agente de investigação tinha sinalizado isto como risco a confirmar — está descartado.
- Componentes que importam de `src/mocks/` fora do `MockProvider` — zero encontrados. O seam está limpo.
- `HeroQuiz.tsx` (landing) usa vocabulário próprio (`"perda"/"manter"/"massa"/"condicao"`) diferente do enum real — **sem risco**, é conteúdo de demonstração na landing pública, nunca submete ao backend.
- `src/data/health-tags.ts` (vocabulário de 10 tags) — duplicação **documentada e deliberada** no próprio ficheiro; confirmar apenas que os 6 valores partilhados com `dietaryPreferences` continuam a bater com `ProfileService.DIETARY_PREFERENCES_VOCAB` (Task 1 já cobre isto).

---

## Tarefas

### Tarefa 1 — Corrigir `dietaryPreferences` para nunca enviar `"sem_preferencia"` ao backend

**Ficheiros:**
- `levesabor-web/src/app/(cliente)/onboarding/page.tsx` (submissão do perfil no fim do wizard)
- `levesabor-web/src/app/(cliente)/perfil/page.tsx` (submissão da secção de preferências)

**O que fazer:** `"sem_preferencia"` continua a existir como valor de UI (chip seleccionável, estado local) — só não pode chegar ao `PUT /me/profile`. No ponto onde o payload é montado para a chamada `api()`, mapear `dietaryPreferences: ["sem_preferencia"]` → `dietaryPreferences: []` antes de enviar (array vazio = "sem preferências", que é semanticamente o que "sem preferência" significa e passa a validação do backend sem alterar nada no Java). Fazer o mesmo tratamento nos dois ficheiros — não centralizar num helper novo (convenção do projecto), mas manter o mesmo padrão de comentário nas duas ocorrências a explicar o porquê (referenciar `ProfileService.DIETARY_PREFERENCES_VOCAB`).

**Como testar:** com `NEXT_PUBLIC_USE_MOCKS=false` contra o backend real (local `:8080` ou Railway), completar onboarding escolhendo "Sem preferência" → gravar → confirmar 200 (hoje dá `LSA001_VALIDATION`). Repetir em `/perfil`. Depois voltar a escolher uma preferência real e confirmar que ainda funciona (não partir o caminho feliz).

**Nota para quem implementar:** ver se o mock (`src/mocks/fixtures.ts`) precisa do mesmo ajuste por simetria — hoje aceita qualquer valor, incluindo `"sem_preferencia"`, o que é o motivo deste bug nunca ter aparecido em testes E2E contra mocks. Ajustar o mock a rejeitar `"sem_preferencia"` da mesma forma tornaria os testes E2E capazes de apanhar isto sozinhos (ver Tarefa 4).

---

### Tarefa 2 — Desacoplar `recipe-photos.ts` de IDs numéricos do mock

**Ficheiros:**
- `levesabor-web/src/data/recipe-photos.ts`
- 5 consumidores: `src/components/plan/MealCard.tsx`, `src/app/(cliente)/plano/pedir-agora/page.tsx`, `src/app/(cliente)/receitas/RecipeDetailSheet.tsx`, `src/app/(cliente)/receitas/RecipeGridCard.tsx`, `src/app/(cliente)/plano/refeicao/[entryId]/page.tsx`

**Decisão a tomar antes de codar (escolher uma, documentar a escolha no próprio ficheiro):**
- **Opção A (recomendada):** trocar a chave do lookup de `id: number` para `slug` derivado do nome da receita (ex. normalizar `name` → `papinha-de-amendoim-com-banana`), gerado da mesma forma nos dois lados (script de import das fotos + qualquer sítio que precise de bater a receita à foto). Estável a qualquer reseed/reordenação, porque não depende de PK gerada pela BD.
- **Opção B:** backend passa a devolver um campo de imagem no `RecipeSnapshot`/`RecipeResponse` (ficha nova para `desenvolvedor-backend`, fora do âmbito deste plano de frontend — só escolher esta opção se se decidir mover a gestão de fotos para o admin/backend a prazo).
- **Não escolher:** manter chave por `id` numérico "porque hoje parece bater certo" — é exactamente o padrão frágil que este plano existe para eliminar.

**Como testar:** contra o backend real, abrir `/receitas`, detalhe de receita, `MealCard` no dashboard, "pedir agora" — confirmar que as fotos aparecem para as 18 receitas do seed independentemente da ordem/IDs reais devolvidos pela BD. Um teste útil: truncar e re-correr o seed SQL numa BD de teste com uma ordem de INSERT diferente e confirmar que as fotos não desaparecem.

---

### Tarefa 3 — Checklist de ambiente por portal (CORS + env vars), documentado

**Ficheiro novo:** `docs/plano/10-checklist-ambientes-deploy.md` (ou secção nova em `docs/plano/README.md`, decidir ao escrever)

**Porquê:** esta sessão já tropeçou duas vezes em CORS mal configurado (localhost bloqueado, depois confirmado OK para Vercel só depois de o utilizador configurar `APP_CORS_ORIGINS` manualmente na Railway). Isto vai voltar a acontecer em cada novo ambiente (preview do Vercel, ambiente de staging, etc.) se não ficar escrito.

**Conteúdo mínimo:**
- Tabela: ambiente (local / Vercel preview / Vercel prod) × `NEXT_PUBLIC_API_URL` esperado × origin que tem de estar em `APP_CORS_ORIGINS` no Railway.
- Nota explícita: `APP_CORS_ORIGINS` aceita lista separada por vírgulas (`SecurityConfig.java:86-90`), sem wildcard — cada novo domínio de preview do Vercel tem de ser adicionado à mão, ou fixar um único domínio de produção em Vercel → Settings → Domains e testar sempre contra esse.
- Passo a passo de diagnóstico rápido (o `curl -X OPTIONS` com `Origin`/`Access-Control-Request-*` usado nesta sessão) para não ter de redescobrir o comando da próxima vez.

---

### Tarefa 4 — Rede de segurança: smoke test automatizado contra o backend real

**Contexto:** hoje só existe `docs/plano/09-plano-testes-feedback-cliente.md` (Playwright contra MSW — bom para regressão de UI/copy, mas nunca detecta divergência de contrato como a da Tarefa 1) e `docs/superpowers/plans/2026-08-21-testes-integracao-nao-ia-admin-loja.md` (curl manual contra o backend real — detecta divergências de contrato, mas é manual, mexe em dados de produção Supabase, e não corre em CI).

**O que fazer:** não reescrever os 34 testes Playwright existentes para correr contra o backend real (ficariam lentos/instáveis e a mexer em dados reais a cada corrida de CI). Em vez disso:
1. Extrair do plano de integração manual (`2026-08-21-testes-integracao-nao-ia-admin-loja.md`) um subconjunto pequeno e **idempotente** (login, `GET` de listas, sem `POST`/`PATCH` que mutam estado) como script de smoke — ex. `scripts/smoke-real-backend.sh` ou um spec Playwright novo `e2e/smoke-real-backend.spec.ts` com um `NEXT_PUBLIC_USE_MOCKS=false` próprio, correndo à parte da suite principal.
2. Este smoke corre manualmente antes de cada deploy (`INT-02/04/06` em `tasks.md`) — não precisa de estar no CI normal (que continua contra mocks), mas precisa de existir como comando repetível, não como sequência de `curl` reconstruída de memória cada vez.
3. Ajustar o mock de `dietaryPreferences` (nota da Tarefa 1) — isto sozinho já teria apanhado o bug da Tarefa 1 num teste E2E normal, sem precisar do smoke contra backend real. É a correcção de maior alavancagem deste plano: fecha a mesma classe de bug para o futuro, não só a instância encontrada agora.

---

### Tarefa 5 — Fechar os cartões `INT-01/03/05` em `tasks.md`

**Ficheiro:** `docs/plano/tasks.md`

Depois das Tarefas 1-4 verificadas contra o backend real (local ou Railway) para os três portais (Cliente/Admin/Loja), marcar `INT-01`/`INT-03`/`INT-05` como `[x]` com nota do que foi verificado e quando — seguindo o padrão já usado noutras entradas da secção "Concluído" (ex. `BE-L01..L04`). Isto desbloqueia formalmente `INT-02/04/06` (deploy) no quadro.

---

## Fora de âmbito (decisão explícita)

- Centralizar os enums de domínio (`Goal`/`HealthCondition`/etc.) num módulo partilhado — contraria convenção explícita do CLAUDE.md.
- Reescrever a suite Playwright completa para correr contra o backend real — custo/instabilidade não compensa (ver Tarefa 4).
- Mover gestão de fotos de receitas para o backend (Opção B da Tarefa 2) — decisão de produto/roadmap, não uma correcção de bug; só entra em âmbito se explicitamente escolhida ao executar a Tarefa 2.

---

## Execução

Duas opções, como de costume:

1. **Subagent-driven (recomendado)** — subagente novo por tarefa (1-5), revisão entre tarefas. Tarefas 1 e 2 são as únicas com mudança de código; 3 e 5 são documentação; 4 é scripting leve.
2. **Execução inline** — nesta sessão, sequencial, com checkpoints.

Qual preferes?
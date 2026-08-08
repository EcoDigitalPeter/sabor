# 05 — Roadmap de Implementação

> Faseamento: **Fase 1 — Portal do Cliente (MVP), ≈ 2 semanas** · **Fase 2 — Portal Admin, ≈ 2 semanas** · **Fase 3 — Portal da Loja + Encomendas, ≈ 2 semanas (estimativa; investimento a acordar)**. Três equipas em paralelo (frontend / backend / base de dados) com pontos de integração explícitos.
>
> **Mudança de plano:** a Fase 2 deixou de incluir gestão de produtos/preços (movida para a Fase 3, agora responsabilidade de cada loja no seu próprio portal); o cliente passa a poder encomendar o rancho a uma loja (F3-CLI-07). Entrega e pagamento continuam fora do sistema.

## 1. Ordem de implementação e dependências técnicas

```
Fundações ──▶ Auth ──▶ Perfil ──▶ Catálogo seed ──▶ Motor IA ──▶ Plano/Receita ──▶ Lista ──▶ Entrega F1
(Next.js,     (F1-VIS   (F1-CLI    (V2+V5: dados     (F1-CLI-02)   (F1-CLI-03/04/05)  (F1-CLI-06)
 CI, Prisma    01/02)     01)        p/ grounding)
 V1)

F2: Admin shell/RBAC ──▶ Utilizadores ──▶ Lojas ──▶ Receitas/Ingredientes UI ──▶ Métricas ──▶ Entrega F2
                          (F2-ADM-01)     (-02)        (-05)                    (-06)

F3: Role LOJISTA ──▶ Catálogo da loja ──▶ Excel loja ──▶ Encomendar (cliente) ──▶ Gerir encomendas (loja) ──▶ Entrega F3
    (users.store_id)   (F3-LOJ-01)         (F3-LOJ-02)     (F3-CLI-07)              (F3-LOJ-03)
```

Dependências críticas:

| Dependência | Porquê | Quando resolver |
|---|---|---|
| **Catálogo seed de receitas (V5)** antes do motor de IA | Sem grounding não há geração testável | Início da Sprint 1.2 — conteúdo pedido ao cliente no dia 1 |
| Chave OpenAI + projeto Supabase criados | Bloqueiam integração e BD | Dia 1 da Fase 1 (setup) |
| Contrato OpenAPI (endpoints §8 do plano de backend) congelado no fim da S1.1 | FE e BE avançam em paralelo contra mocks | Fim da Sprint 1.1 |
| Enum de tags de saúde fechado (V2) | Usado por BD, backend (filtros duros) e admin UI | Sprint 1.1 |
| F2-ADM-05 (UI de receitas) não bloqueia o MVP | O MVP vive do seed V5; a UI de manutenção chega na F2 | — |
| Extensão do RBAC com `LOJISTA` (`users.store_id`) antes de qualquer ecrã da Fase 3 | Todo o Portal da Loja depende de autenticação/ownership por loja | Início da Sprint 3.1 |

## 2. Sprints

### Fase 1 — Portal do Cliente (MVP) · 15.000 MT · ≈ 2 semanas

**Sprint 1.1 (semana 1) — Fundações + Auth + Perfil**

| Equipa | Entregas |
|---|---|
| BD | Projeto Supabase criado; Prisma configurado (`schema.prisma`); migrations **V1, V2**; convenções documentadas |
| Backend | Camada de API no Next.js (§2 do plano de backend): Route Handlers `src/app/api/v1/**`, `ApiResponse`/`ErrorCodes`/`withErrorHandling`; JWT completo com `jose` (register/login/refresh/logout); `GET/PUT /me/profile`; OpenAPI publicado; CI a correr lint + typecheck + testes |
| Frontend | Projeto Next.js + PWA base (manifest, service worker, shell precache); design tokens (§1 do plano de UI/UX); T-01 Login, T-02 Registo, T-03 Onboarding, T-08 Perfil; interceptor de auth com refresh |
| Integração | Fim da semana: registo→login→onboarding→perfil a funcionar ponta-a-ponta em ambiente dev |

**Sprint 1.2 (semana 2) — Motor IA + Plano + Receitas + Lista**

| Equipa | Entregas |
|---|---|
| BD | Migrations **V3, V5** (seed: ≥ 40 receitas validadas pelo cliente); índices verificados com dados de teste |
| Backend | `recipeCatalogService` (pré-filtros duros de saúde/alergias); `openAiMealPlanService` (structured outputs + validação + retries + `ai_generation_log` + limite diário); geração **síncrona** (`maxDuration` alargado); plano ativo; swap + feedback; agregação da lista de compras; testes de integração (OpenAI mockada com nock/msw, Postgres efémero) |
| Frontend | T-04 Dashboard (com anéis de macros), T-07 Geração, T-05 Receita (+feedback/troca), T-06 Lista; cache offline do plano e da lista; estados loading/empty/erro/sucesso em todas as telas |
| Integração | UAT com o cliente do projeto; checklist de entrega F1 (§4) |

### Fase 2 — Portal Admin · 15.000 MT · ≈ 2 semanas

**Sprint 2.1 (semana 3) — Shell admin + Utilizadores + Lojas**

| Equipa | Entregas |
|---|---|
| BD | Migration **V4** (agora só `stores`); queries de pesquisa/paginação revistas |
| Backend | Guardas ADMIN + auditoria de ações sensíveis; endpoints de utilizadores (lista/detalhe/estado/perfil-de-saúde auditado); CRUD lojas (registo) |
| Frontend | Layout admin (sidebar, tabelas paginadas server-side reutilizáveis); T-10/T-11 Utilizadores, T-12/T-13 Lojas |

**Sprint 2.2 (semana 4) — Dados da IA + Métricas**

| Equipa | Entregas |
|---|---|
| BD | Afinação de índices com volume realista; plano de backup verificado (restore testado) |
| Backend | CRUD receitas/ingredientes + regras de publicação + feedback agregado; `metrics/summary` |
| Frontend | T-17/T-18 Receitas, T-19 Ingredientes, T-09 Dashboard de métricas |
| Integração | UAT F2; checklist de entrega F2 |

### Fase 3 — Portal da Loja + Encomendas · investimento a definir · ≈ 2 semanas (estimativa)

**Sprint 3.1 (semana 5) — Shell loja + Catálogo (manual + Excel)**

| Equipa | Entregas |
|---|---|
| BD | Migration **V6**: `users.store_id` + `role LOJISTA`; `products` redesenhado (por loja); `import_jobs` (por loja) |
| Backend | RBAC `LOJISTA` com ownership por `store_id`; CRUD `loja/products`; import/export Excel escopado à loja |
| Frontend | Layout loja (sidebar simples); T-23/T-24 Produtos da loja, T-25 Import Excel |

**Sprint 3.2 (semana 6) — Encomendar (cliente) + Gestão de encomendas (loja)**

| Equipa | Entregas |
|---|---|
| BD | Migration **V6** (cont.): `orders`, `order_items` |
| Backend | `POST/GET /me/orders` + cancelamento (cliente); `GET /loja/orders` + `PATCH /loja/orders/{id}/status` com validação de transições; auditoria de mudanças de estado |
| Frontend | T-06 (CTA "Encomendar"), T-20/T-21 escolher loja + rever encomenda, T-22 Minhas encomendas (cliente); T-26/T-27 Lista/Detalhe de encomendas (loja) |
| Integração | UAT F3; validar com o cliente do projeto que não há expectativa de pagamento/entrega geridos pelo sistema; checklist de entrega F3 |

## 3. Riscos e mitigações

| # | Risco | Impacto | Mitigação |
|---|---|---|---|
| R1 | **Qualidade da resposta da LLM** (planos incoerentes, ids inválidos) | Núcleo do produto | Grounding com lista fechada + JSON Schema estrito + validação/retries no backend; filtros de saúde em código, nunca delegados à IA; fixtures de teste por condição de saúde |
| R2 | **Conteúdo do catálogo** (receitas moçambicanas com nutrição credível) não chega a tempo — é input do cliente, não código | Bloqueia a Sprint 1.2 | Pedir no dia 1; template de recolha (Excel) fornecido; mínimo viável 40 receitas; nutricionista a validar tags de saúde **[Sugestão]** |
| R3 | **Custo/latência OpenAI** | Margem e UX | Modelo económico configurável; limite diário por cliente; log de tokens/custo desde o dia 1 (visível nas métricas F2); prompt compacto (ids + tags, não receitas inteiras) |
| R4 | **Conectividade móvel fraca** dos utilizadores finais | Adoção | PWA offline-first (plano e lista cacheados); payloads únicos e compactos; imagens SVG/PNG leves; testar com throttling 3G |
| R5 | **Âmbito elástico da "aprendizagem contínua"** (expectativa de ML vs. realidade contratada) | Expectativas do cliente | Definição operacional fechada neste plano (feedback 👍/👎 → prompt + curadoria admin); validar por escrito com o cliente na kickoff |
| R6 | **Dados de saúde** (sensíveis) tratados sem cuidado | Legal/reputacional | Minimização (IA recebe só parâmetros), acesso admin auditado e explícito, TLS, BCrypt, sem analytics de terceiros |
| R7 | Prazo agressivo (2 semanas/fase) com 3 equipas | Atraso | Contrato OpenAPI congelado no fim da S1.1; FE trabalha contra mocks; cortes pré-acordados (histórico de planos, partilha de lista são [Sugestão]) |
| R8 | Lock-in acidental no Supabase | Estratégico | Regra dura já fixada: acesso só via Prisma + connection string própria; revisão de código bloqueia qualquer SDK Supabase (Auth/Storage/Realtime) |
| R9 | **Lojistas sem hábito de manter catálogo digital** (baixa adesão ao CRUD/Excel) | Catálogo da Fase 3 fica vazio/desatualizado, encomendas sem preço | Excel simples como alternativa principal ao CRUD; suporte inicial da equipa na migração do catálogo de cada loja |
| R10 | **Expectativa do utilizador de que o sistema trata entrega/pagamento** (apesar de fora do âmbito) | Frustração do cliente, reclamações à loja | Comunicação explícita na UI (contacto da loja, sem ecrã de pagamento/entrega); validar por escrito com o cliente do projeto na Fase 3 |
| R11 | **Limite de execução do Vercel** para a geração síncrona do plano (10–30 s) | Falha/timeout da geração em produção | Plano **Vercel Pro** com `maxDuration` alargado no Route Handler de geração; monitorizar duração real via `ai_generation_log` e alertar se se aproximar do limite configurado |

## 4. Checklist de entrega

**Fase 1 (aceitação do MVP):**
- [ ] Registo, login, refresh e logout funcionais; conta suspensa bloqueada.
- [ ] Onboarding com os 4 objetivos e 4 condições da landing; perfil editável.
- [ ] Geração de plano: 7 dias × N refeições, 100% receitas do catálogo; celíaco/alergias nunca violados (testes com fixtures); falha da IA tratada com retry.
- [ ] Receita completa por refeição com anel de macros; feedback 👍/👎 persistente; troca de refeição atómica.
- [ ] Lista de compras agregada por categoria, com estados marcados persistentes.
- [ ] Offline: plano e lista consultáveis sem rede após primeiro load.
- [ ] Disclaimer médico visível (onboarding, receitas, rodapé).
- [ ] CI verde (lint + typecheck + testes unit/integração); OpenAPI publicado; auditoria e `ai_generation_log` a registar.
- [ ] Deploy em produção (Vercel) + UAT assinada → **saldo 10.500 MT**.

**Fase 2 (aceitação do Portal Admin):**
- [ ] Login admin com RBAC; impossível ficar sem admins ativos.
- [ ] Utilizadores: pesquisa/paginação, suspensão efetiva (revoga refresh), perfil de saúde só por ação auditada.
- [ ] Lojas: CRUD completo do registo (criar/editar/suspender/remover); remoções com confirmação.
- [ ] Receitas/ingredientes: regras de publicação aplicadas; macros calculados; feedback agregado visível; ingrediente em uso não removível.
- [ ] Métricas: KPIs, série temporal e custo de IA corretos contra fixtures.
- [ ] UAT assinada → **saldo 10.000 MT**.

**Fase 3 (aceitação do Portal da Loja + Encomendas):**
- [ ] Login lojista com RBAC próprio; ownership por loja verificado (lojista nunca vê outra loja).
- [ ] Catálogo da loja: CRUD completo; import/export Excel com round-trip sem alterações = 0 diffs.
- [ ] Cliente consegue encomendar itens da lista de compras a uma loja ativa e ver o contacto da loja.
- [ ] Loja consegue listar encomendas, ver detalhe e avançar o estado; transições inválidas rejeitadas pelo backend.
- [ ] Cliente vê o estado atualizado da encomenda em "Minhas encomendas".
- [ ] Confirmado com o cliente do projeto: nenhum ecrã/endpoint processa pagamento ou organiza entrega — tudo combinado fora do sistema.
- [ ] UAT assinada → saldo conforme aditamento comercial da Fase 3.

## 5. Estratégia de deploy

> **Mudança de plano:** deploy passa a ser no **Vercel** (não Docker/VPS) — decisão do cliente para simplificar operação. Um único projeto Next.js serve frontend e backend (Route Handlers); a base de dados mantém-se remota (Supabase Postgres), acedida com ligação pooled.

| Componente | Estratégia |
|---|---|
| **App (frontend + backend)** | Um único projeto **Next.js (App Router)** no **Vercel**, plano **Pro** (necessário para `maxDuration` alargado no Route Handler de geração de plano — 10–30 s). Deploy automático a cada push (preview deployments em PRs, produção a partir de `main`). |
| **Base de dados** | Supabase (plano gratuito/Pro conforme volume) — usado só como Postgres; ligação via **pooler de transações** do Supabase (obrigatório em serverless — funções não sustentam ligações persistentes); Prisma Migrate aplicado em CI antes do deploy (`prisma migrate deploy` contra `DIRECT_URL`); backups automáticos do fornecedor **+** `pg_dump` diário externo (independência); restore testado antes da entrega F2. |
| **Ambientes** | `development` (local, Postgres em container ou branch de dev do Supabase) · `preview` (Vercel Preview Deployments, 1 por PR, ligado a um branch de BD de teste) · `production`. |
| **CI/CD** | GitHub Actions: lint + typecheck + testes em cada PR; `prisma migrate deploy` + deploy no Vercel disparado por push/merge (Vercel Git integration) — testes têm de passar antes do deploy de produção. |
| **Segredos** | Vercel Environment Variables (por ambiente: Development/Preview/Production); nunca commitados no repositório. |

### Variáveis de ambiente por ambiente

| Variável | development | production |
|---|---|---|
| `DATABASE_URL` | Postgres local ou branch dev do Supabase | Supabase — connection string **pooled** (`pgbouncer=true`) |
| `DIRECT_URL` | igual a `DATABASE_URL` local | Supabase — connection string **direta** (só para `prisma migrate deploy`) |
| `JWT_SECRET` | fixo de dev | secret ≥ 256 bits (Vercel env var) |
| `JWT_ACCESS_TTL_MIN` / `JWT_REFRESH_TTL_DAYS` | `15` / `14` | `15` / `14` |
| `OPENAI_API_KEY` | chave de teste (ou mock) | secret |
| `OPENAI_MODEL` | modelo económico | idem, ajustável |
| `AI_DAILY_LIMIT` | 50 | 3 |
| `AI_PRICE_PER_1K_INPUT` / `_OUTPUT` | — | usado no cálculo de custo das métricas |
| `APP_CORS_ORIGINS` | `http://localhost:3000` | mesma origem (frontend e backend no mesmo domínio Vercel — CORS não aplicável entre si) |
| `SEED_ADMIN_BCRYPT` | hash de dev | secret (usado no seed inicial via script, não em migration versionada) |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | `https://app.ottimizo.ai` (ou domínio `*.vercel.app` até estar configurado) |

## 6. Roadmap — gaps do feedback do cliente

Estas tarefas nascem de uma análise do feedback recebido do cliente sobre a app, cruzada com o código atual, para fechar a distância entre o que ele espera e o que está implementado (ver `docs/plano/01-functional-plan.md` e os cartões `FE-W*`/`BE-C01B`/`BE-C06B`/`BE-C08` em `docs/plano/tasks.md`).

**Ordem de prioridade recomendada:**

1. **`FE-W01` — agregação real da lista de compras.** Primeiro na fila porque não é feature nova: é uma promessa já escrita no plano funcional ("agregar ingredientes repetidos por `ingredient_id`") que ainda não foi cumprida — o mock atual é uma lista estática pré-somada à mão. Zero risco de âmbito ou comercial; é débito técnico a fechar.
2. **`FE-W02`/`BE-C01B` — preferência alimentar no perfil.** Esforço pequeno, alto valor percebido pelo cliente, e desbloqueia `FE-W03` (pré-filtro de geração) e `FE-W05` (catálogo de receitas).
3. **`FE-W05`/`BE-C08` — catálogo de receitas navegável.** Esforço médio, mas reaproveita dados já geridos pelo admin (`F2-ADM-05`); risco técnico baixo.
4. **`FE-W04`/`BE-C06B` — adicionar item manual.** Esforço pequeno e independente dos restantes; pode encaixar em qualquer ponto livre do plano.
5. **`FUT-07` (catálogo multi-cozinha) e `FUT-03` (comparação de preços entre lojas) — não agendar.** Ambos precisam de decisão comercial com o cliente antes de qualquer trabalho técnico: implicam âmbito novo fora da cotação original, e as fases do projeto estão ligadas a valores pagos (ver `README.md` §6). `FUT-07` é o tema mais repetido no feedback do cliente, mas depende ainda de conteúdo (receitas não-moçambicanas) validado por ele.

Nenhuma das tarefas 1–4 precisa de reabrir conversa comercial — cabem no espírito já cotado da Fase 1. Só o item 5 precisa.

## 7. Pós-entrega (fora do âmbito atual — **[Sugestão]**)

Backlog priorizado para depois da Fase 3: FUT-05 (recuperação de password), FUT-02 (notificações WhatsApp), FUT-04 (landing pública + waitlist), FUT-06 (históricos), FUT-03 (custeio comparativo "onde é mais barato" entre lojas — agora com dados reais de F3-LOJ-01), FUT-01 (entrega ao domicílio + pagamento in-app — automatizar o que hoje, na Fase 3, é combinado diretamente entre cliente e loja). Ver detalhes no fim do `01-functional-plan.md`.

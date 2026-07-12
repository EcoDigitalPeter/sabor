# 05 — Roadmap de Implementação

> Faseamento alinhado com a cotação: **Fase 1 — Portal do Cliente (MVP), ≈ 2 semanas** · **Fase 2 — Portal Admin, ≈ 2 semanas**. Três equipas em paralelo (frontend / backend / base de dados) com pontos de integração explícitos.

## 1. Ordem de implementação e dependências técnicas

```
Fundações ──▶ Auth ──▶ Perfil ──▶ Catálogo seed ──▶ Motor IA ──▶ Plano/Receita ──▶ Lista ──▶ Entrega F1
(repos, CI,   (F1-VIS   (F1-CLI    (V2+V5: dados     (F1-CLI-02)   (F1-CLI-03/04/05)  (F1-CLI-06)
 Docker, BD,   01/02)     01)        p/ grounding)
 Flyway V1)

F2: Admin shell/RBAC ──▶ Utilizadores ──▶ Lojas ──▶ Produtos+Preços ──▶ Excel ──▶ Receitas/Ingredientes UI ──▶ Métricas ──▶ Entrega F2
                          (F2-ADM-01)     (-02)        (-03)             (-04)          (-05)                    (-06)
```

Dependências críticas:

| Dependência | Porquê | Quando resolver |
|---|---|---|
| **Catálogo seed de receitas (V5)** antes do motor de IA | Sem grounding não há geração testável | Início da Sprint 1.2 — conteúdo pedido ao cliente no dia 1 |
| Chave OpenAI + projeto Supabase criados | Bloqueiam integração e BD | Dia 1 da Fase 1 (setup) |
| Contrato OpenAPI (endpoints §8 do plano de backend) congelado no fim da S1.1 | FE e BE avançam em paralelo contra mocks | Fim da Sprint 1.1 |
| Enum de tags de saúde fechado (V2) | Usado por BD, backend (filtros duros) e admin UI | Sprint 1.1 |
| F2-ADM-05 (UI de receitas) não bloqueia o MVP | O MVP vive do seed V5; a UI de manutenção chega na F2 | — |

## 2. Sprints

### Fase 1 — Portal do Cliente (MVP) · 15.000 MT · ≈ 2 semanas

**Sprint 1.1 (semana 1) — Fundações + Auth + Perfil**

| Equipa | Entregas |
|---|---|
| BD | Projeto Supabase criado; Flyway configurado; migrations **V1, V2**; convenções documentadas |
| Backend | Esqueleto Spring Boot (§2 do plano de backend); `ApiResponse`/`ErrorCodes`/`GlobalExceptionHandler`; JWT completo (register/login/refresh/logout); `GET/PUT /me/profile`; springdoc publicado; CI a correr `mvn verify` |
| Frontend | Projeto Next.js + PWA base (manifest, service worker, shell precache); design tokens (§1 do plano de UI/UX); T-01 Login, T-02 Registo, T-03 Onboarding, T-08 Perfil; interceptor de auth com refresh |
| Integração | Fim da semana: registo→login→onboarding→perfil a funcionar ponta-a-ponta em ambiente dev |

**Sprint 1.2 (semana 2) — Motor IA + Plano + Receitas + Lista**

| Equipa | Entregas |
|---|---|
| BD | Migrations **V3, V5** (seed: ≥ 40 receitas validadas pelo cliente); índices verificados com dados de teste |
| Backend | `RecipeCatalogService` (pré-filtros duros de saúde/alergias); `OpenAiMealPlanService` (structured outputs + validação + retries + `ai_generation_log` + limite diário); geração assíncrona; plano ativo; swap + feedback; agregação da lista de compras; testes de integração (WireMock p/ OpenAI, Testcontainers) |
| Frontend | T-04 Dashboard (com anéis de macros), T-07 Geração, T-05 Receita (+feedback/troca), T-06 Lista; cache offline do plano e da lista; estados loading/empty/erro/sucesso em todas as telas |
| Integração | UAT com o cliente do projeto; checklist de entrega F1 (§4) |

### Fase 2 — Portal Admin · 15.000 MT · ≈ 2 semanas

**Sprint 2.1 (semana 3) — Shell admin + Utilizadores + Lojas + Produtos**

| Equipa | Entregas |
|---|---|
| BD | Migration **V4**; queries de pesquisa/paginação revistas |
| Backend | Guardas ADMIN + auditoria de ações sensíveis; endpoints de utilizadores (lista/detalhe/estado/perfil-de-saúde auditado); CRUD lojas; CRUD produtos + preços por loja |
| Frontend | Layout admin (sidebar, tabelas paginadas server-side reutilizáveis); T-10/T-11 Utilizadores, T-12/T-13 Lojas, T-14/T-15 Produtos |

**Sprint 2.2 (semana 4) — Excel + Dados da IA + Métricas**

| Equipa | Entregas |
|---|---|
| BD | Afinação de índices com volume realista; plano de backup verificado (restore testado) |
| Backend | Import/export Excel (POI, validar→confirmar, `import_jobs`); CRUD receitas/ingredientes + regras de publicação + feedback agregado; `metrics/summary` |
| Frontend | T-16 Import (upload→pré-visualização→resultado), T-17/T-18 Receitas, T-19 Ingredientes, T-09 Dashboard de métricas |
| Integração | UAT F2; migração do catálogo real (via Excel ou UI) pelo admin do cliente; checklist de entrega F2 |

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
| R8 | Lock-in acidental no Supabase | Estratégico | Regra dura já fixada: só JDBC + Flyway; revisão de código bloqueia qualquer SDK Supabase |

## 4. Checklist de entrega

**Fase 1 (aceitação do MVP):**
- [ ] Registo, login, refresh e logout funcionais; conta suspensa bloqueada.
- [ ] Onboarding com os 4 objetivos e 4 condições da landing; perfil editável.
- [ ] Geração de plano: 7 dias × N refeições, 100% receitas do catálogo; celíaco/alergias nunca violados (testes com fixtures); falha da IA tratada com retry.
- [ ] Receita completa por refeição com anel de macros; feedback 👍/👎 persistente; troca de refeição atómica.
- [ ] Lista de compras agregada por categoria, com estados marcados persistentes.
- [ ] Offline: plano e lista consultáveis sem rede após primeiro load.
- [ ] Disclaimer médico visível (onboarding, receitas, rodapé).
- [ ] `mvn verify` verde (unit + integração); OpenAPI publicado; auditoria e `ai_generation_log` a registar.
- [ ] Deploy em produção + UAT assinada → **saldo 10.500 MT**.

**Fase 2 (aceitação do Portal Admin):**
- [ ] Login admin com RBAC; impossível ficar sem admins ativos.
- [ ] Utilizadores: pesquisa/paginação, suspensão efetiva (revoga refresh), perfil de saúde só por ação auditada.
- [ ] Lojas e produtos: CRUD completo; preços por loja; remoções com confirmação e cascatas corretas.
- [ ] Excel: template, export, import validar→confirmar com relatório de erros por linha; round-trip sem alterações = 0 diffs.
- [ ] Receitas/ingredientes: regras de publicação aplicadas; macros calculados; feedback agregado visível; ingrediente em uso não removível.
- [ ] Métricas: KPIs, série temporal e custo de IA corretos contra fixtures.
- [ ] Catálogo real migrado pelo admin do cliente; UAT assinada → **saldo 10.000 MT**.

## 5. Estratégia de deploy

| Componente | Estratégia |
|---|---|
| **Backend** | Docker (imagem `eclipse-temurin:17-jre`, build multi-stage); deploy num VPS/cloud com `docker compose` (api + reverse proxy Caddy/Nginx com TLS automático). Flyway corre no arranque (`spring.flyway.enabled=true`). Health check: `/actuator/health` |
| **Frontend** | Next.js em modo standalone no mesmo compose (ou Vercel/equivalente se o cliente preferir); servido sob o mesmo domínio para simplificar CORS/cookies (`app.levesabor.co.mz` → FE; `/api` → proxy para o backend) |
| **Base de dados** | Supabase (plano gratuito/Pro conforme volume) — usado só como Postgres; backups automáticos do fornecedor **+** `pg_dump` diário externo (independência); restore testado antes da entrega F2 |
| **Ambientes** | `dev` (local, compose com Postgres em container) · `prod`. Staging é **[Sugestão]** se o orçamento permitir |
| **CI/CD** | GitHub Actions (ou equivalente): `mvn verify` + build de imagens em cada PR; deploy por tag. O irc-container não tem CI — aqui é requisito de entrega |
| **Segredos** | Só em variáveis de ambiente do host/secret manager do CI (lição direta do irc-container: nunca em `pom.xml`/properties) |

### Variáveis de ambiente por ambiente

| Variável | dev | prod |
|---|---|---|
| `DB_URL` | Postgres local (container) | Supabase (`sslmode=require`) |
| `DB_USERNAME` / `DB_PASSWORD` | dev/dev | secret |
| `JWT_SECRET` | fixo de dev | secret ≥ 256 bits |
| `OPENAI_API_KEY` | chave de teste (ou WireMock) | secret |
| `OPENAI_MODEL` | modelo económico | idem, ajustável |
| `AI_DAILY_LIMIT` | 50 | 3 |
| `APP_CORS_ORIGINS` | `http://localhost:3000` | `https://app.levesabor.co.mz` |
| `SEED_ADMIN_BCRYPT` | hash de dev | secret (injetado na 1.ª migração) |
| `SPRING_PROFILES_ACTIVE` | `dev` | `prod` |
| FE: `NEXT_PUBLIC_API_URL` | `http://localhost:8080/api/v1` | `https://app.levesabor.co.mz/api/v1` |

## 6. Pós-entrega (fora da cotação — **[Sugestão]**)

Backlog priorizado para uma eventual Fase 3: FUT-03 (custeio da lista com preços por loja — maior sinergia com os dados da F2), FUT-05 (recuperação de password), FUT-02 (notificações WhatsApp), FUT-04 (landing pública + waitlist), FUT-01 (entrega ao domicílio — o passo 05 prometido na landing), FUT-06 (históricos). Ver detalhes no fim do `01-functional-plan.md`.

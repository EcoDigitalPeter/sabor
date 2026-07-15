# Leve Sabor AI — Plano Técnico de Implementação

> Documentação de desenvolvimento derivada da **cotação aprovada pelo cliente** (Julho 2026) e da **landing page de design** (`project/Leve Sabor AI.dc.html`). Destina-se a três equipas independentes: frontend, backend e base de dados.

---

## 1. Visão geral da aplicação

A **Leve Sabor AI** é uma plataforma web de planeamento alimentar para Moçambique. Gera planos alimentares semanais personalizados por IA, com **pratos moçambicanos reais** (xima, matapa, feijão nhemba, caril de peixe…), adaptados ao objetivo, condição de saúde, gostos e orçamento de cada utilizador. Cada refeição vem com receita e o plano converte-se numa **lista de compras / rancho optimizado**.

Princípios de produto (comunicados na landing page e na cotação — são restrições, não sugestões):

1. **Mobile-first / PWA** — a app deve pesar pouco em dados móveis e os planos gerados devem ficar disponíveis offline no telemóvel do utilizador.
2. **IA fundamentada em dados curados** — a LLM só sugere pratos que existem no catálogo de receitas moçambicanas carregado e mantido pelo admin. Sem grounding, o risco de alucinação é inaceitável em planos para **diabetes tipo 2** ou **hipertensão**.
3. **Não substitui aconselhamento médico** — disclaimer permanente em todas as fases e em todas as telas com conteúdo de saúde.

## 2. Objetivo do sistema

Tornar acessível a qualquer moçambicano, com qualquer orçamento, um plano alimentar sério — hoje reservado a quem pode pagar um nutricionista particular (contexto: ~3 milhões de pessoas com diabetes no país e escassez de nutricionistas fora de Maputo).

## 3. Personas / utilizadores

| Persona | Quem é | Objetivo principal | Fase |
|---|---|---|---|
| **Visitante** | Pessoa não autenticada que chega à plataforma | Perceber o produto e criar conta | Fase 1 |
| **Cliente** | Utilizador registado do portal do cliente | Receber e seguir um plano alimentar semanal adequado ao seu objetivo, saúde e orçamento; encomendar o rancho a uma loja parceira | Fase 1 (MVP) · encomendas na Fase 3 |
| **Administrador** | Operador interno da Leve Sabor | Manter os dados que alimentam a IA (receitas, ingredientes, nutrição), gerir utilizadores e o registo de lojas parceiras, e acompanhar métricas | Fase 2 |
| **Lojista** | Operador de uma loja parceira, com acesso apenas à sua própria loja | Manter o seu catálogo de produtos/preços (manual ou Excel) e gerir o estado das encomendas recebidas dos clientes | Fase 3 |

Detalhe completo por persona e funcionalidade: [`01-functional-plan.md`](01-functional-plan.md).

## 4. Módulos principais

| Módulo | Descrição | Fase |
|---|---|---|
| **Autenticação e contas** | Registo, login, JWT (access + refresh), RBAC (`CLIENTE`, `ADMIN`, `LOJISTA`) | Fase 1 (+ `LOJISTA` na Fase 3) |
| **Perfil do cliente** | Objetivo, condição de saúde, alergias/preferências, orçamento | Fase 1 |
| **Motor de IA / Planos** | Geração de plano semanal via OpenAI com grounding no catálogo de receitas; aprendizagem contínua a partir do feedback | Fase 1 |
| **Receitas (consulta)** | Receita completa por refeição do plano (ingredientes, passos, macros) | Fase 1 |
| **Lista de compras** | Agregação dos ingredientes do plano semanal em lista de rancho | Fase 1 |
| **Gestão de utilizadores** | Listar, consultar, ativar/suspender clientes | Fase 2 |
| **Catálogo de lojas** | CRUD do registo de lojas parceiras (criar, editar, suspender, remover) pelo admin | Fase 2 |
| **Dados da IA** | CRUD de receitas, ingredientes e informação nutricional (o grounding da LLM) | Fase 2 |
| **Métricas** | Dashboard básico de utilização da plataforma | Fase 2 |
| **Portal da loja — catálogo próprio** | Cada loja mantém o seu catálogo de produtos e preços, via UI ou import/export Excel | Fase 3 |
| **Gestão de encomendas (loja)** | Lojista consulta os pedidos dos clientes e atualiza o estado (sem gerir entrega nem pagamento) | Fase 3 |
| **Encomendar rancho (cliente)** | Cliente envia a lista de compras (ou parte dela) como pedido a uma loja parceira e acompanha o estado | Fase 3 |

## 5. Arquitetura geral

> **Mudança de plano (Jul/2026):** o deploy passa a ser feito no **Vercel**, que não suporta um processo Java/Spring Boot de longa duração. A app torna-se **fullstack num único projeto Next.js** — mantendo frontend e backend como componentes/camadas distintas no código, mas com um único deploy. A base de dados mantém-se remota (Supabase Postgres).

```
┌────────────────────────────────────────────────┐
│  Next.js (App Router) — 1 único deploy (Vercel) │
│  ┌────────────────┐   ┌───────────────────────┐ │
│  │ Frontend (PWA) │   │ Backend — Route        │ │──────▶ OpenAI API
│  │ Portal Cliente │   │ Handlers /api/v1/**    │ │        (Structured Outputs,
│  │ Admin · Loja   │   │ Auth JWT (jose) · RBAC │ │         chamada síncrona)
│  └────────────────┘   └───────────┬───────────┘ │
└────────────────────────────────────┼─────────────┘
                                     │ Prisma (ligação com pooling)
                                     ▼
                        ┌─────────────────────────────┐
                        │  PostgreSQL remoto (Supabase)│  usado APENAS como Postgres gerido —
                        │  schema gerido por Prisma    │  sem Auth/Storage/Realtime/Edge Functions
                        │  Migrate                     │
                        └─────────────────────────────┘
```

Decisões estruturantes (fixas para todas as equipas):

- **Deploy**: um único projeto **Next.js (App Router)** no **Vercel**, incluindo frontend e backend (Route Handlers) — sem serviço Java separado. Plano **Vercel Pro** necessário para `maxDuration` alargado (chamada de geração de plano, 10–30 s).
- **Base de dados**: Supabase **exclusivamente como PostgreSQL remoto** — ligação via Prisma com **pooling obrigatório** (transaction pooler do Supabase; ambiente serverless não sustenta ligações persistentes). É **proibido** usar Supabase Auth, Storage, Edge Functions, Realtime ou depender de RLS, para evitar lock-in. Migrar de fornecedor deve custar apenas mudar a connection string.
- **Backend**: TypeScript, no mesmo projeto Next.js — Route Handlers (`src/app/api/v1/**/route.ts`) implementam o mesmo contrato REST já documentado (`ApiResponse`, códigos `LSAxxx`, OpenAPI); camadas de serviços/repositórios organizadas por pastas (ver [`03-backend-plan.md`](03-backend-plan.md)).
- **Autenticação**: JWT próprio (access + refresh token) com a lib `jose`, utilizadores persistidos com hash (`bcrypt`/`argon2`). Zero dependência de Supabase Auth.
- **Motor de IA**: OpenAI (structured outputs / function calling), chamada **síncrona** dentro do Route Handler de geração (decisão explícita para evitar filas/cron em serverless), abstraído atrás de uma interface (`AiMealPlanService`) para permitir troca de fornecedor.
- **Frontend**: Next.js com PWA (service worker), mobile-first, identidade visual herdada da landing (`project/Leve Sabor AI.dc.html`).
- **Migrations**: Prisma Migrate, schema versionado no repositório (`prisma/schema.prisma` + `prisma/migrations/`) — a BD é 100% reprodutível.

## 6. Fases e investimento

> **Mudança de plano (Jul/2026):** o âmbito original da cotação cobria as Fases 1 e 2. Foi decidido remover a gestão de produtos/preços do Portal Admin e criar, em vez disso, uma **Fase 3 — Portal da Loja**, onde cada loja parceira mantém o seu próprio catálogo e gere o estado das suas encomendas. O portal do cliente passa a permitir encomendar o rancho a uma loja. **Entrega e pagamento continuam fora do sistema**, tratados diretamente entre cliente e loja.

| Fase | Âmbito | Prazo | Investimento | Pagamento |
|---|---|---|---|---|
| **Fase 1 — Portal do Cliente (MVP)** | Conta e perfil · planos semanais por IA · receitas · lista de compras · aprendizagem contínua | ≈ 2 semanas | 15.000 MT | Entrada 4.500 MT · saldo 10.500 MT na entrega |
| **Fase 2 — Portal Admin** | Gestão de utilizadores · CRUD lojas (registo) · dados da LLM · métricas | ≈ 2 semanas | 15.000 MT | Entrada 5.000 MT · saldo 10.000 MT na entrega |
| **Fase 3 — Portal da Loja + Encomendas** | Login lojista · catálogo de produtos/preços por loja (UI ou Excel) · gestão do estado das encomendas · encomendar rancho no portal do cliente | ≈ 2 semanas (estimativa) | **A definir com o cliente** | A definir com o cliente |
| **Total (F1+F2)** | | ≈ 4 semanas | **30.000 MT** | |

Tudo o que não consta das Fases 1–3 está marcado nos documentos como **Futuro** e/ou **[Sugestão]**. O investimento e o plano de pagamento da Fase 3 ainda não foram acordados comercialmente — valores acima marcados como "a definir" até existir aditamento à cotação original.

## 7. Mapa da documentação

| Documento | Conteúdo | Equipa alvo |
|---|---|---|
| [`01-functional-plan.md`](01-functional-plan.md) | Funcionalidades por persona: fluxos, regras de negócio, tarefas FE/BE/BD, endpoints, validações, estados, critérios de aceitação, prioridade | Todas |
| [`02-ui-ux-plan.md`](02-ui-ux-plan.md) | Mapa de telas, componentes, estados de UI, navegação, design tokens, prompts de geração de imagens | Frontend + Design |
| [`03-backend-plan.md`](03-backend-plan.md) | Arquitetura Next.js/Route Handlers, pastas, services/repositories/DTOs, segurança, integração OpenAI, tabela de endpoints, testes | Backend |
| [`04-database-plan.md`](04-database-plan.md) | Modelo PostgreSQL, entidades, relacionamentos, migrations Prisma, índices, constraints | Base de dados |
| [`05-implementation-roadmap.md`](05-implementation-roadmap.md) | Sprints, ordem de implementação, dependências, riscos, checklist de entrega, deploy e variáveis de ambiente | Gestão + Todas |
| [`tasks.md`](tasks.md) | Quadro de execução (estilo Trello): todas as tarefas por componente, com dependências e faixas de paralelismo — **frontend primeiro, backend depois** | Todas |

### Convenção de identificadores de funcionalidades

Cada funcionalidade tem um ID usado em toda a documentação para rastreabilidade:

- `F1-VIS-xx` — Fase 1, persona Visitante
- `F1-CLI-xx` — Fase 1, persona Cliente
- `F2-ADM-xx` — Fase 2, persona Administrador
- `F3-LOJ-xx` — Fase 3, persona Lojista
- `F3-CLI-xx` — Fase 3, funcionalidade nova da persona Cliente (encomendar rancho)
- `FUT-xx` — Futuro (fora do âmbito atual das 3 fases; sempre acompanhado de **[Sugestão]**)

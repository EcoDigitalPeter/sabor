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
| **Cliente** | Utilizador registado do portal do cliente | Receber e seguir um plano alimentar semanal adequado ao seu objetivo, saúde e orçamento | Fase 1 (MVP) |
| **Administrador** | Operador interno da Leve Sabor | Manter os dados que alimentam a IA (receitas, ingredientes, nutrição), gerir utilizadores, lojas e produtos, e acompanhar métricas | Fase 2 |

Detalhe completo por persona e funcionalidade: [`01-functional-plan.md`](01-functional-plan.md).

## 4. Módulos principais

| Módulo | Descrição | Fase |
|---|---|---|
| **Autenticação e contas** | Registo, login, JWT (access + refresh), RBAC (`CLIENTE`, `ADMIN`) | Fase 1 |
| **Perfil do cliente** | Objetivo, condição de saúde, alergias/preferências, orçamento | Fase 1 |
| **Motor de IA / Planos** | Geração de plano semanal via OpenAI com grounding no catálogo de receitas; aprendizagem contínua a partir do feedback | Fase 1 |
| **Receitas (consulta)** | Receita completa por refeição do plano (ingredientes, passos, macros) | Fase 1 |
| **Lista de compras** | Agregação dos ingredientes do plano semanal em lista de rancho | Fase 1 |
| **Gestão de utilizadores** | Listar, consultar, ativar/suspender clientes | Fase 2 |
| **Catálogo de lojas** | CRUD de lojas parceiras (criar, editar, suspender, remover) | Fase 2 |
| **Catálogo de produtos e preços** | CRUD de produtos e preço por loja, via UI ou import/export Excel | Fase 2 |
| **Dados da IA** | CRUD de receitas, ingredientes e informação nutricional (o grounding da LLM) | Fase 2 |
| **Métricas** | Dashboard básico de utilização da plataforma | Fase 2 |

## 5. Arquitetura geral

```
┌────────────────────────────┐
│  Frontend — Next.js (PWA)  │  mobile-first, service worker,
│  Portal Cliente + Admin    │  cache offline dos planos
└─────────────┬──────────────┘
              │ HTTPS · REST JSON · Bearer JWT
              ▼
┌────────────────────────────┐        ┌──────────────────────┐
│  Backend — Spring Boot 3   │───────▶│  OpenAI API          │
│  Java 17 · /api/v1         │        │  (Structured Outputs) │
│  Auth JWT · RBAC · Flyway  │        └──────────────────────┘
└─────────────┬──────────────┘
              │ JDBC (HikariCP)
              ▼
┌────────────────────────────┐
│  PostgreSQL (Supabase)     │  usado APENAS como Postgres gerido —
│  schema gerido por Flyway  │  sem Auth/Storage/Realtime/Edge Functions
└────────────────────────────┘
```

Decisões estruturantes (fixas para todas as equipas):

- **Base de dados**: Supabase **exclusivamente como PostgreSQL** — ligação JDBC direta. É **proibido** usar Supabase Auth, Storage, Edge Functions, Realtime ou depender de RLS, para evitar lock-in. Migrar de fornecedor deve custar apenas mudar a connection string.
- **Backend**: Java 17 + Spring Boot 3.x + Maven, arquitetura em camadas inspirada no projeto de referência `irc-container` (com as práticas legadas modernizadas — ver [`03-backend-plan.md`](03-backend-plan.md)).
- **Autenticação**: Spring Security + JWT próprio (access + refresh token), utilizadores persistidos com BCrypt. Zero dependência de Supabase Auth.
- **Motor de IA**: OpenAI (structured outputs / function calling), abstraído atrás de uma interface Java (`IAiMealPlanService`) para permitir troca de fornecedor.
- **Frontend**: Next.js com PWA (service worker), mobile-first, identidade visual herdada da landing (`project/Leve Sabor AI.dc.html`).
- **Migrations**: Flyway, SQL versionado no repositório — a BD é 100% reprodutível.

## 6. Fases e investimento (da cotação)

| Fase | Âmbito | Prazo | Investimento | Pagamento |
|---|---|---|---|---|
| **Fase 1 — Portal do Cliente (MVP)** | Conta e perfil · planos semanais por IA · receitas · lista de compras · aprendizagem contínua | ≈ 2 semanas | 15.000 MT | Entrada 4.500 MT · saldo 10.500 MT na entrega |
| **Fase 2 — Portal Admin** | Gestão de utilizadores · CRUD lojas · CRUD produtos/preços (UI ou Excel) · dados da LLM · métricas | ≈ 2 semanas | 15.000 MT | Entrada 5.000 MT · saldo 10.000 MT na entrega |
| **Total** | | ≈ 4 semanas | **30.000 MT** | |

Tudo o que não consta da cotação está marcado nos documentos como **Futuro** e/ou **[Sugestão]**.

## 7. Mapa da documentação

| Documento | Conteúdo | Equipa alvo |
|---|---|---|
| [`01-functional-plan.md`](01-functional-plan.md) | Funcionalidades por persona: fluxos, regras de negócio, tarefas FE/BE/BD, endpoints, validações, estados, critérios de aceitação, prioridade | Todas |
| [`02-ui-ux-plan.md`](02-ui-ux-plan.md) | Mapa de telas, componentes, estados de UI, navegação, design tokens, prompts de geração de imagens | Frontend + Design |
| [`03-backend-plan.md`](03-backend-plan.md) | Arquitetura Spring Boot, pacotes, controllers/services/repositories/DTOs, segurança, integração OpenAI, tabela de endpoints, testes | Backend |
| [`04-database-plan.md`](04-database-plan.md) | Modelo PostgreSQL, entidades, relacionamentos, migrations Flyway, índices, constraints | Base de dados |
| [`05-implementation-roadmap.md`](05-implementation-roadmap.md) | Sprints, ordem de implementação, dependências, riscos, checklist de entrega, deploy e variáveis de ambiente | Gestão + Todas |
| [`tasks.md`](tasks.md) | Quadro de execução (estilo Trello): todas as tarefas por componente, com dependências e faixas de paralelismo — **frontend primeiro, backend depois** | Todas |

### Convenção de identificadores de funcionalidades

Cada funcionalidade tem um ID usado em toda a documentação para rastreabilidade:

- `F1-VIS-xx` — Fase 1, persona Visitante
- `F1-CLI-xx` — Fase 1, persona Cliente
- `F2-ADM-xx` — Fase 2, persona Administrador
- `FUT-xx` — Futuro (fora da cotação; sempre acompanhado de **[Sugestão]**)

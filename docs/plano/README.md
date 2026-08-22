# Ottimizo — Plano Técnico de Implementação

> Documentação de desenvolvimento derivada da **cotação aprovada pelo cliente** (Julho 2026) e da **landing page de design** (`project/Leve Sabor AI.dc.html`). Destina-se a três equipas independentes: frontend, backend e base de dados.

---

## 1. Visão geral da aplicação

A **Ottimizo** é uma plataforma web de planeamento alimentar para Moçambique. Gera planos alimentares semanais personalizados por IA, com **pratos moçambicanos reais** (xima, matapa, feijão nhemba, caril de peixe…), adaptados ao objetivo, condição de saúde, gostos e orçamento de cada utilizador. Cada refeição vem com receita e o plano converte-se numa **lista de compras / rancho optimizado**.

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
| **Administrador** | Operador interno da Ottimizo | Manter os dados que alimentam a IA (receitas, ingredientes, nutrição), gerir utilizadores e o registo de lojas parceiras, e acompanhar métricas | Fase 2 |
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

> **Mudança de plano (Ago/2026):** o backend volta a ser um **serviço Java/Spring Boot separado**
> (`ottimizo/`, Java 21, Spring Boot 3.5) — a tentativa anterior de backend fullstack dentro do
> mesmo projeto Next.js (Route Handlers + Prisma) foi abandonada. O frontend Next.js mantém-se
> como aplicação à parte (PWA, mobile-first) e passa a consumir o backend Java por HTTP
> (`/api/v1/**`). A base de dados mantém-se remota (Supabase Postgres), mas agora com Supabase
> Auth também em uso (o backend valida os JWT emitidos pelo Supabase) — decisão que reverte a
> proibição anterior de usar Supabase Auth.
>
> `03-backend-plan.md` e `04-database-plan.md` ainda descrevem a arquitetura anterior
> (Route Handlers/Prisma) e precisam de ser reescritos para refletir Java/Spring/Flyway — isto
> ainda não foi feito; não os tratem como espec atual até lá.

```
┌─────────────────────────┐        ┌────────────────────────────────┐
│ Next.js (App Router)    │        │ Spring Boot — ottimizo          │
│ Frontend PWA (Vercel)   │──HTTP─▶│ /api/v1/** (Java 21)             │──────▶ OpenAI API
│ Portal Cliente          │        │ Auth JWT (Supabase) · RBAC       │        (Spring AI ChatClient)
│ Admin · Loja            │        │ Flyway migrations                │
└─────────────────────────┘        └────────────────┬─────────────────┘
                                                      │ Spring Data JPA / Hibernate
                                                      ▼
                                     ┌───────────────────────────────┐
                                     │  PostgreSQL remoto (Supabase)  │
                                     │  schema gerido por Flyway      │
                                     │  Auth via Supabase Auth (JWT)  │
                                     └───────────────────────────────┘
```

Decisões estruturantes (fixas para todas as equipas):

- **Deploy**: dois serviços separados — frontend **Next.js (App Router)** no **Vercel** (PWA,
  mobile-first) e backend **Spring Boot** (`ottimizo/`, Java 21) como serviço à parte, expondo
  `/api/v1/**`. Sem lógica de negócio em Route Handlers Next.js — o frontend consome o backend
  Java por HTTP.
- **Base de dados**: Supabase PostgreSQL remoto, schema gerido por **Flyway** (migrações
  versionadas em `ottimizo/src/main/resources/db/migration/`), ligação via Spring Data JPA.
- **Backend**: Java 21 / Spring Boot 3.5, organizado em pacotes por domínio (`health`, `users`,
  `profile`, `catalog`, `stores`, …), contrato de resposta comum (`ApiResponse<T>`, códigos
  `LSAxxx`, `GlobalExceptionHandler`), documentado automaticamente via `springdoc-openapi`
  (`/v3/api-docs`).
- **Autenticação**: Supabase Auth emite o JWT; o backend valida-o como *OAuth2 resource server*
  (issuer/JWKS configuráveis) — sem gerir password nem refresh tokens próprios.
- **Motor de IA**: Spring AI (`ChatClient`) sobre a API da OpenAI — a IA nunca inventa entidades,
  só seleciona/ordena/resume dados já curados no catálogo (ver `StoreRankingService` como
  referência de padrão já implementado).
- **Frontend**: Next.js com PWA (service worker), mobile-first, identidade visual herdada da
  landing (`project/Leve Sabor AI.dc.html`), consome o backend Java via `fetch` contra
  `/api/v1/**`.
- **Migrations**: Flyway, schema versionado em `ottimizo/src/main/resources/db/migration/` — a
  BD é 100% reprodutível a partir do repositório.

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
| [`06-guia-de-copy-e-marca.md`](06-guia-de-copy-e-marca.md) | Regras de linguagem e posicionamento destiladas do feedback do cliente sobre a landing — checklist para copy nova em qualquer ecrã | Frontend + Design |
| [`07-prompts-ilustracoes-gaps.md`](07-prompts-ilustracoes-gaps.md) | Prompts de ilustração para as novas funcionalidades identificadas no feedback do cliente (P-12, P-13) | Frontend + Design |
| [`08-quadro-colaboradores-plan.md`](08-quadro-colaboradores-plan.md) | Quadro de colaboradores digitais (QUADRO OS) proposto para o backlog `BE-*`/`DB-*`/`INT-*`, e plano de contratação/configuração | Todas |
| [`10-checklist-integracao-backend.md`](10-checklist-integracao-backend.md) | Checklist passo a passo (básico → avançado) para arrancar o backend real, activar o Supabase Auth Hook, ligar o frontend e chegar ao deploy (`INT-01`/`INT-02`) | Backend + Gestão |

### Convenção de identificadores de funcionalidades

Cada funcionalidade tem um ID usado em toda a documentação para rastreabilidade:

- `F1-VIS-xx` — Fase 1, persona Visitante
- `F1-CLI-xx` — Fase 1, persona Cliente
- `F2-ADM-xx` — Fase 2, persona Administrador
- `F3-LOJ-xx` — Fase 3, persona Lojista
- `F3-CLI-xx` — Fase 3, funcionalidade nova da persona Cliente (encomendar rancho)
- `FUT-xx` — Futuro (fora do âmbito atual das 3 fases; sempre acompanhado de **[Sugestão]**)

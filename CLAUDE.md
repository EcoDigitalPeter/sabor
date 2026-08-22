# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository state

This repo has moved well past the original design-handoff stage. `levesabor/levesabor-web` is a working Next.js (App Router) implementation of **Ottimizzo** — an AI meal-planning product for Mozambique — built frontend-first against MSW mocks, with a client portal, an admin portal, and a store portal already implemented (see `docs/plano/tasks.md` for exactly what's done vs. pending). The original static design bundle (`project/*.dc.html`, `project/support.js`) is kept only for historical reference — it is **not** the current spec; don't treat it as one or try to "catch it up" to the app.

`ottimizo/` (repo root, sibling of `levesabor/`) is the **official backend**: a separate Java 21 / Spring Boot 3.5 service exposing `/api/v1/**`, with Flyway migrations, JPA entities per domain, and Spring AI for the AI-driven features. This replaces an earlier, briefly-documented plan to fold the backend into the Next.js project as Route Handlers over Prisma — that plan was abandoned (Aug/2026); don't resurrect it. Most of `ottimizo`'s schema (Flyway V001–V005) has no corresponding entity/controller yet — see the implementation plan referenced in memory (`backend-ottimizo-pivot` project memory) before assuming a domain is unbuilt just because `tasks.md` doesn't mention it in Java terms yet.

## Where to look first

- `docs/plano/README.md` — product overview, the 4 personas, architecture decision (separate Next.js frontend + Java/Spring Boot backend `ottimizo/`, Supabase Postgres via Flyway, Supabase Auth for JWT), phases and budget. Read this before anything else. Note: `03-backend-plan.md` and `04-database-plan.md` still describe the abandoned Next.js/Prisma backend plan and have not been rewritten yet — don't treat them as current spec for the backend.
- `docs/plano/01-functional-plan.md` — functional spec per persona/feature, with acceptance criteria and the canonical labels for enums (e.g. the 4 goal options and 4 health-condition options must appear byte-identical everywhere in the app — this is an explicit acceptance criterion, not a suggestion).
- `docs/plano/02-ui-ux-plan.md` — design tokens, screen-by-screen UX spec, component inventory.
- `docs/plano/06-guia-de-copy-e-marca.md` — living style guide distilled from real client feedback rounds. Read it before writing or editing any user-facing copy.
- `docs/plano/tasks.md` — Trello-style execution board (frontend-first, then backend + database). Check "Em curso" / "Concluído" before assuming a feature is missing or still to design.
- `descricao.md` — one-page product/persona/design-system description (originally written to brief a Stitch design tool, but a solid product summary in general).
- `levesabor/levesabor-web/` — the actual app: Next.js App Router, MSW mocks in `src/mocks/`, Playwright e2e specs in `e2e/`.

## Language and tone

All user-facing copy is **European Portuguese, written without the 1990 Orthographic Agreement (acordo ortográfico)** — an explicit, standing instruction from the client, not a stylistic default. Follow `docs/plano/06-guia-de-copy-e-marca.md` for the tone/wording rules distilled from actual client corrections: never word a safe, reversible action as if it were destructive; give context before asking for unusual or sensitive information; let the concrete value outrank its label in visual hierarchy; pair any progress indicator with an encouraging message rather than a bare number. There is no central i18n/copy module in this project — each screen keeps its own local string arrays — so whenever a label changes, grep the whole repo for the old string before considering the change done.

## Working in this repo

- The stack question is settled: frontend is Next.js (App Router) + TypeScript, MSW for mocks until the real Java backend (`ottimizo/`) lands per endpoint (see the `BE-*` section of `tasks.md` — mostly unbuilt in Java terms). Backend is Java 21 / Spring Boot 3.5 in `ottimizo/`, not Route Handlers. Don't re-litigate either stack choice.
- Build frontend-first against the MSW mocks in `levesabor/levesabor-web/src/mocks/`, not against a live backend.
- Before implementing a new feature or screen, check `docs/plano/tasks.md` for an existing card and `docs/superpowers/specs/*.md` for a matching design spec — several features already have one.

<!-- quadro:inicio -->
## Quadro OS — colaboradores digitais

Este projecto tem o `quadro` instalado: colaboradores digitais correm como
sessões do Claude Code em segundo plano, com tarefas, dependências e
orçamento geridos numa base de dados local.

Painel: http://127.0.0.1:4317

**Tu (Claude Code, nesta sessão) és o Agent Manager que coordena estes
colaboradores digitais** — gatilhos, dependências e despacho de tarefas
passam pelo quadro, não por decisão tua ad-hoc. O Peter é o supervisor
humano do Agent Manager: escaladas, aprovações e decisões de orçamento
aparecem no painel para ele, não são decididas por ti sozinho.

**Antes de assumires que uma tarefa está livre, feita, ou atribuída**, consulta
o estado ao vivo — `GET http://127.0.0.1:4317/api/estado` ou `/quadro:estado` —
em vez de te basares só na tua leitura deste ficheiro ou de documentos de
planeamento (`docs/`, `tasks.md`, etc.). Esses ficheiros podem estar
desactualizados face ao que está realmente a acontecer na base de dados do quadro.

**Fluxo de cartão com pares (ex. UI/UX + Copy + Implementação):** quando uma
tarefa de `especialista-ui-ux` tem correspondente(s) nos demais colaboradores
para o mesmo cartão (ex. FE-Y0x: `Parecer UI/UX` + `Revisão de copy` +
`Implementação`), cria uma branch git local dedicada a esse cartão a partir de
`master` antes de despachar a primeira tarefa do trio (ex. `quadro/fe-y02`).
Os colaboradores trabalham nessa branch **de forma sequencial** — parecer →
revisão → implementação, nunca em paralelo no mesmo cartão, para não haver
dois colaboradores a mexer nos mesmos ficheiros ao mesmo tempo. Só depois de
ambos os pareceres anteriores (UI/UX e copy) estarem `aprovado` ou `com
reservas` não-bloqueantes é que o colaborador de implementação avança e, no
fim, faz merge da branch do cartão para `master` (**local**, sem `git push`
— isso fica para o supervisor humano decidir). Se algum parecer sair
`rejeitado`, a branch fica aberta até ser corrigida — não fazer merge.

**Extrair o goal de tarefas existentes, não só despachar um passo:** ao
retomares uma tarefa já existente no quadro (backlog ou em curso), lê a
descrição e extrai o objectivo real por trás dela — não o passo isolado (ex.
o goal do trio FE-Y0x é "cartão implementado e mesclado em master com
parecer + revisão aprovados", não só "emitir um parecer"). Continua a
coordenar e a despachar os colaboradores seguintes da sequência até esse
objectivo estar cumprido, verificando o estado real no quadro entre cada
despacho — é isso que te torna gestor, não um dispatcher de um passo único.
<!-- quadro:fim -->

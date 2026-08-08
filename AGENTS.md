# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Repository state

This repo has moved well past the original design-handoff stage. `levesabor/levesabor-web` is a working Next.js (App Router) implementation of **Ottimizzo** — an AI meal-planning product for Mozambique — built frontend-first against MSW mocks, with a client portal, an admin portal, and a store portal already implemented (see `docs/plano/tasks.md` for exactly what's done vs. pending). The original static design bundle (`project/*.dc.html`, `project/support.js`) is kept only for historical reference — it is **not** the current spec; don't treat it as one or try to "catch it up" to the app.

## Where to look first

- `docs/plano/README.md` — product overview, the 4 personas, architecture decision (Next.js fullstack on Vercel + Supabase Postgres via Prisma — there is no separate backend service), phases and budget. Read this before anything else.
- `docs/plano/01-functional-plan.md` — functional spec per persona/feature, with acceptance criteria and the canonical labels for enums (e.g. the 4 goal options and 4 health-condition options must appear byte-identical everywhere in the app — this is an explicit acceptance criterion, not a suggestion).
- `docs/plano/02-ui-ux-plan.md` — design tokens, screen-by-screen UX spec, component inventory.
- `docs/plano/06-guia-de-copy-e-marca.md` — living style guide distilled from real client feedback rounds. Read it before writing or editing any user-facing copy.
- `docs/plano/tasks.md` — Trello-style execution board (frontend-first, then backend + database). Check "Em curso" / "Concluído" before assuming a feature is missing or still to design.
- `descricao.md` — one-page product/persona/design-system description (originally written to brief a Stitch design tool, but a solid product summary in general).
- `levesabor/levesabor-web/` — the actual app: Next.js App Router, MSW mocks in `src/mocks/`, Playwright e2e specs in `e2e/`.

## Language and tone

All user-facing copy is **European Portuguese, written without the 1990 Orthographic Agreement (acordo ortográfico)** — an explicit, standing instruction from the client, not a stylistic default. Follow `docs/plano/06-guia-de-copy-e-marca.md` for the tone/wording rules distilled from actual client corrections: never word a safe, reversible action as if it were destructive; give context before asking for unusual or sensitive information; let the concrete value outrank its label in visual hierarchy; pair any progress indicator with an encouraging message rather than a bare number. There is no central i18n/copy module in this project — each screen keeps its own local string arrays — so whenever a label changes, grep the whole repo for the old string before considering the change done.

## Working in this repo

- The stack question is settled: Next.js (App Router) + TypeScript, MSW for mocks until the real backend Route Handlers land (see the `BE-*` section of `tasks.md` — mostly unbuilt). Don't re-litigate the stack choice.
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
<!-- quadro:fim -->

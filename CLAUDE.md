# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository state

This repo currently contains only a **design handoff bundle** exported from Claude Design (claude.ai/design) — there is no implementation yet, and no package manager, build, lint, or test tooling exists. `README.md` at the root explains the handoff; read it before doing anything else.

## What's here

- `project/Leve Sabor AI.dc.html` — the primary design: a single-page marketing site for "Leve Sabor AI", an AI meal-planning product for Mozambique. Copy is in European Portuguese. This is the file to implement, read top to bottom before starting any work.
- `project/Leve Sabor AI-print-sp2h9c.dc.html` — an auto-generated print-styled export of the same page (same content, print `@media` rules added). Not separate content to design for.
- `project/support.js` — generated preview runtime ("dc-runtime", built from `dc-runtime/src/*.ts` which is not part of this bundle) that renders `.dc.html` files live in a browser for design purposes only. It is not part of the implementation target — don't port it or treat it as application code.

## The `.dc.html` format

Each `.dc.html` pairs an `<x-dc>` HTML template with a `<script type="text/x-dc" data-dc-script>` block containing a `class Component extends DCLogic`:
- The template uses placeholder directives that are not valid standalone HTML — `{{ expr }}` interpolation, `<sc-if value="{{ cond }}">` for conditional blocks, `<sc-for list="{{ items }}" as="item">` for loops — resolved by `support.js` only at design-preview time.
- `renderVals()` returns the object that fills those placeholders; `state` / `setState` plus methods like `selectGoal`, `toggleFaq`, `onWaitlistSubmit` define the interactive behavior (hero two-question mini quiz with a macro ring result, FAQ accordion, waitlist form with validation).
- Treat the file as a spec of markup, inline styles, and behavior — not code to lift as-is. Recreate the visual output and interactions pixel-perfectly in whatever stack the target implementation uses; don't copy the `sc-if`/`sc-for`/`DCLogic` structure unless it happens to fit.

## Implementing the design

No target stack has been chosen yet. Confirm with the user which framework/stack to build in before writing implementation code — nothing in this repo implies one. Don't render the `.dc.html` files in a browser or take screenshots to understand them; all dimensions, colors, and layout rules are already spelled out directly in the markup/inline styles.

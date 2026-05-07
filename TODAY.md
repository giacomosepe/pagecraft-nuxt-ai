# PageCraft — Today
Last updated: 2026-05-07

This file tracks the current frontier only.
Rewrite or remove any note as soon as it no longer changes the next session's behavior.

---

## Current phase

Sprint completed: schema, seed, server utilities, and prompt content for Steps 4–7.
Next: implement feature code for issues that are DB-complete but not yet wired.

## Recently completed

- ENGNEER-333 to 336 — prompts and form_schema for steps 4–7 applied to DB
- ENGNEER-337 — `page_context_documents` table, storage bucket, RLS; server routes built; utilities built; Configurazione panel UI and generation wiring not yet done
- ENGNEER-338 — `framework_step_examples` table, Saco Combimar seed data for steps 4–7, `blocklist` column; generation wiring not yet done
- ENGNEER-339 — `sanitiseGeneration.ts` built; not yet called from generation route

## Active frontier

- ENGNEER-337 — wire `getProjectContext` into generation route; Configurazione panel UI in document editor
- ENGNEER-338 — wire `getFrameworkStepExample` into generation route
- ENGNEER-339 — wire `sanitiseGeneration` post-stream in generation route
- ENGNEER-340 — `page_step_figures` table (not yet created); File tab UI; figure injection
- ENGNEER-341 to 344 — figure marker instruction per step prompt (in Approve & Plan)
- ENGNEER-324 to 332 — client and project detail pages (not yet started)

## Blockers

- `mammoth` not in `package.json` — add before ENGNEER-337 feature build
- `prisma/AGENTS.md` and `prisma/CLAUDE.md` missing the `type_a`/`type_b` prompt column rule
- seed.sql missing the `framework_step_examples` Saco INSERT block — retrieve from Supabase and add before next DB reset

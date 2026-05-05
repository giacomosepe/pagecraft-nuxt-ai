# PageCraft — Today
Last updated: 2026-05-05

This file tracks the current frontier only.
Rewrite or remove any note as soon as it no longer changes the next session’s behavior.

---

## Current phase

Wave 4 of the StepEditor reorganisation is complete. Now reviewing and correcting the Step 1-3 seed, field types, and form wiring.

## Active frontier

- Steps 1-3 seed revision in progress (ENGNEER-318, 319, 320, 321) - Codex mid-pass
- ENGNEER-322 (write-back fix) completed by Codex - needs manual verification
- ENGNEER-319 (Step 3 document_reference + disable generation) still needs runner
- Step 4 (Attivita Rilevanti) review not yet started - holding until Steps 1-3 are stable

## Recently completed

- Wave 4 StepEditor reorganisation
- New field types: `client_detail` and `project_detail` (ENGNEER-320/321)
- `pages.referente` column + migration added
- Write-back bug fixed: field edits now save to `step.form_data` only, never to client or page records (ENGNEER-322)
- Backlog issues created: ENGNEER-311-322 covering StepEditor composables, inline editing, variable highlighting, collapsible sidebar, template editor scoping

## Key decisions made today

- `client_detail` and `project_detail` fields are read-only from source, write to `step.form_data` only - never write back to client or page records. Subsidiary override use case depends on this.
- `type_a` and `type_b` prompt columns must be '' - rule to be added to `prisma/AGENTS.md` and `prisma/CLAUDE.md`
- `document_reference` is a new field type (seed-declared, renderer not yet built)
- Step 3 generation is disabled - extraction modal output is the step output, no AI prose pass
- `tipo_progetto` is display-only, derived from `page.frameworkName`, no new column

## Pending verification (test before moving to Step 4)

1. Edit ragione sociale in Step 1 -> client record must be unchanged in Supabase
2. Step 1 and 2 show no AI generation button
3. Step 3 shows no AI generation button, extraction modal still works
4. Project settings page has Dettagli progetto section with referente editable
5. `document_reference` field in Step 3 schema present (renderer pending - expected not to render yet)

## Blockers / open threads

- `prisma/AGENTS.md` and `prisma/CLAUDE.md` still need the prompt column rule added manually
- Step 4 prompt review is the next major content work after Steps 1-3 are stable


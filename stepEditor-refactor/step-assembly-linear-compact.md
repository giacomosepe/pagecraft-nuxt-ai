# PageCraft Step Assembly Refactor — Compact Linear Set
_Date: 2026-04-19_

## Recommended Structure

- 1 parent epic-style issue
- 6 execution issues
- 1 evaluator issue

This keeps the refactor manageable in Linear without losing the architecture.

## Parent Epic

### Title

`ENGNEER-STEP Step assembly refactor for configuration-driven frameworks`

### Purpose

Move PageCraft from a monolithic step editor toward a configuration-driven framework system. New frameworks should be assembled from reusable step behaviors and field renderers, not implemented as custom step code.

### Outcome

After this work:

- frameworks are composed from `framework_steps`
- step behavior is driven by `step_type`
- step contents are driven by `form_schema`
- field behavior is modular and reusable
- current Patent Box and Relazione Tecnica remain supported
- future framework creation can build on the same contract

### Supporting docs

- `april-refactor/step-assembly-architecture.md`
- `april-refactor/step-assembly-linear-breakdown.md`

## Child Issues

---

## Issue 1

### Title

`ENGNEER-C1 Lock step assembly contract and field-type rules`

### Agent label

`Agent: ui-ux`

### Scope

Finalize the architecture contract for:

- `type_a`, `type_b`, `type_c`
- `form_schema`
- `field_type`
- `file_upload_extraction`
- `file_upload_generation`
- allowed field types by step type

### Files to read

- `AGENTS.md`
- `codebase-map.md`
- `pagecraft-discovery-1.md`
- `april-refactor/step-assembly-architecture.md`

### Files to modify

- `april-refactor/step-assembly-architecture.md`

### Static ACs

- Architecture doc clearly defines step types, field types, and `form_schema`.
- Upload field roles are explicitly defined.
- Allowed field-type matrix is explicit and implementation-ready.

---

## Issue 2

### Title

`ENGNEER-C2 Normalize framework step schemas to extraction and generation upload field types`

### Agent label

`Agent: database`

### Blocked by

- Issue 1

### Scope

Update seeded framework-step schemas so legacy upload naming is replaced by reusable field-type naming aligned with the contract.

### Files to read

- `AGENTS.md`
- `codebase-map.md`
- `prisma/seed.sql`
- `april-refactor/step-assembly-architecture.md`

### Files to modify

- `prisma/seed.sql`

### Static ACs

- Seeded schemas use the agreed upload field-type names.
- Required backfill SQL is included.
- No unrelated schema drift is introduced.

### Manual ACs

- Verify in Vercel preview that current extraction-based steps still load correctly after reseeding.

---

## Issue 3

### Title

`ENGNEER-A1 Centralize step-type behavior and form persistence for StepEditor`

### Agent label

`Agent: ui-ux`

### Blocked by

- Issue 1

### Scope

Create the step-type config and extract `useStepForm()` so `StepEditor.vue` no longer owns scattered step behavior and risky save logic.

This issue should absorb the current review findings:

- stale full-payload save risk
- dropped repeatable-group save errors
- step-level behavior branching spread through the component

### Files to read

- `AGENTS.md`
- `codebase-map.md`
- `app/components/feature/page/StepEditor.vue`
- `app/types/app.types.ts`
- `server/api/db/mutate.post.ts`
- `april-refactor/step-assembly-architecture.md`

### Files to modify

- `app/components/feature/page/StepEditor.vue`
- `app/types/app.types.ts`
- `app/composables/` for `useStepForm()`

### Static ACs

- One step-type config controls step-level editor behavior.
- Main form persistence logic is moved out of `StepEditor.vue`.
- Keystroke-level stale-save risk is removed or serialized safely.
- Repeatable-group save failures are handled explicitly.

### Manual ACs

- Verify in Vercel preview that text fields, repeatable groups, and current uploads still save correctly.

---

## Issue 4

### Title

`ENGNEER-B1 Extract reusable field renderers for simple fields and repeatable groups`

### Agent label

`Agent: ui-ux`

### Blocked by

- Issue 3

### Scope

Split the repeated rendering logic out of `StepEditor.vue` into reusable field UI pieces. Cover:

- field shell
- simple fields
- repeatable groups

### Files to read

- `AGENTS.md`
- `codebase-map.md`
- `app/components/feature/page/StepEditor.vue`
- `april-refactor/step-assembly-architecture.md`

### Files to modify

- `app/components/feature/page/StepEditor.vue`
- `app/components/feature/page/`

### Static ACs

- Label/hint/required wrapper is extracted.
- Simple field rendering is extracted.
- Repeatable-group rendering is extracted.
- No material behavior regressions are introduced.

### Manual ACs

- Verify in Vercel preview that simple fields and repeatable groups behave as before.

---

## Issue 5

### Title

`ENGNEER-B2 Add reusable extraction and generation upload field renderers`

### Agent label

`Agent: ui-ux`

### Blocked by

- Issue 2
- Issue 3

### Scope

Replace the current visura-specific upload branch with reusable upload field renderers aligned to the new field-type contract:

- `file_upload_extraction`
- `file_upload_generation`

### Files to read

- `AGENTS.md`
- `codebase-map.md`
- `app/components/feature/page/StepEditor.vue`
- `app/composables/useGeneration.ts`
- `april-refactor/step-assembly-architecture.md`

### Files to modify

- `app/components/feature/page/StepEditor.vue`
- `app/components/feature/page/`

### Static ACs

- Legacy visura-specific field branching is replaced by reusable upload field renderers.
- Extraction upload remains compatible with current stored `form_data`.
- Generation upload is supported for `type_c` steps.

### Manual ACs

- Verify in Vercel preview that extraction upload still works.
- Verify in Vercel preview that a `type_c` step with generation upload renders correctly.

---

## Issue 6

### Title

`ENGNEER-A2 Turn StepEditor into a configuration-driven assembler`

### Agent label

`Agent: ui-ux`

### Blocked by

- Issue 3
- Issue 4
- Issue 5

### Scope

Complete the refactor so `StepEditor.vue` primarily assembles step-level UI from:

- `step_type`
- `form_schema`
- extracted field renderers
- `useStepForm()`

### Files to read

- `AGENTS.md`
- `codebase-map.md`
- `app/components/feature/page/StepEditor.vue`
- `app/composables/usePage.ts`
- `app/types/app.types.ts`
- `april-refactor/step-assembly-architecture.md`

### Files to modify

- `app/components/feature/page/StepEditor.vue`
- `app/types/app.types.ts`

### Static ACs

- `StepEditor.vue` acts mainly as an assembler/coordinator.
- Field compatibility with step type is handled centrally.
- The component is materially smaller and easier to reason about.

### Manual ACs

- Verify in Vercel preview that current frameworks still render correctly across `type_a`, `type_b`, and `type_c`.

---

## Issue 7

### Title

`ENGNEER-FPB1 Align current frameworks with the step assembly contract`

### Agent label

`Agent: database`

### Blocked by

- Issue 1
- Issue 2

### Scope

Ensure current frameworks are valid examples of the new contract so the architecture lives in real seeded framework definitions, not only in frontend code.

### Files to read

- `AGENTS.md`
- `codebase-map.md`
- `prisma/seed.sql`
- `pagecraft-discovery-1.md`
- `april-refactor/step-assembly-architecture.md`

### Files to modify

- `prisma/seed.sql`

### Static ACs

- Current frameworks use the agreed step and field type naming.
- Seed updates include required backfill SQL.
- No unrelated framework prompt/schema drift is introduced.

### Manual ACs

- Verify in Vercel preview that current frameworks still create pages correctly after reseeding/backfill.

---

## Issue 8

### Title

`ENGNEER-E1 Evaluate step assembly refactor against contract and regressions`

### Agent label

`Agent: evaluator`

### Blocked by

- Issue 6
- Issue 7

### Scope

Review the completed refactor against the architecture contract and flag regressions in current framework flows.

### Files to read

- `codebase-map.md`
- `april-refactor/step-assembly-architecture.md`
- final changed files from Issues 2 through 7

### Files to modify

- None

### Static ACs

- Evaluator confirms centralized step-type behavior.
- Evaluator confirms modular field rendering.
- Evaluator confirms the reviewed save risks were addressed.
- Evaluator flags any mismatch with the architecture doc.

### Manual ACs

- Verify in Vercel preview that representative `type_a`, `type_b`, and `type_c` steps all work.

## Suggested Linear Setup

Use:

- 1 parent issue for the overall refactor
- child issues 1 through 8 linked beneath it
- milestone: `April Refactor — Step Assembly`

Recommended first execution slice:

1. Issue 1
2. Issue 3
3. Issue 4

That gives:

- locked architecture
- safer persistence
- visible reduction in `StepEditor.vue` complexity

Then move to upload normalization and final assembler cleanup.

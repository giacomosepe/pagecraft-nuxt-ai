# PageCraft Step Assembly Refactor — Linear Breakdown
_Date: 2026-04-19_

## Purpose

This document translates the step assembly architecture into a Linear-ready issue set.

It is designed to support the April refactor with small, executable issues instead of one large rewrite. The goal is to move PageCraft toward a configuration-driven framework system, where new frameworks can be assembled from reusable step and field behaviors instead of requiring custom editor code.

This issue set follows the intent of the `linear-issue-writer` skill:

- tight scope
- explicit files
- cross-boundary work split by agent
- static and manual ACs separated

## Recommended Milestone

Suggested milestone name:

- `April Refactor — Step Assembly`

## Recommended Sequencing

Order of execution:

1. planning and contract lock
2. schema and field-type normalization
3. step-type config
4. field renderer split
5. form state and persistence extraction
6. StepEditor assembler refactor
7. framework migration and verification

## Issue List

---

## Issue 1

### Title

`ENGNEER-C1 Lock step assembly contract for frameworks, step types, and field types`

### Type

Planning / architecture

### Agent label

`Agent: ui-ux`

### Priority

High

### Accomplishes

Creates the written contract for how frameworks, framework steps, step types, field types, and `form_schema` relate. This is the source of truth the implementation issues will follow, so later issues do not invent behavior independently.

### Files to read

- `AGENTS.md`
- `codebase-map.md`
- `pagecraft-discovery-1.md`
- `april-refactor/step-assembly-architecture.md`

### Files to modify

#### `april-refactor/step-assembly-architecture.md`

1. Review and tighten the wording into an implementation-ready contract.
2. Confirm the allowed field types by step type.
3. Confirm the role of `file_upload_extraction` and `file_upload_generation`.
4. Add any missing open questions that need a product decision before implementation starts.

### Do NOT touch

- `server/` — out of scope for this planning issue
- `prisma/` — no schema or seed changes in this issue
- `app/components/feature/page/StepEditor.vue` — no code changes yet

### Acceptance criteria

#### Static

- `april-refactor/step-assembly-architecture.md` clearly defines `type_a`, `type_b`, and `type_c`.
- The document clearly distinguishes `step_type`, `field_type`, `form_schema`, and `form_data`.
- The document explicitly defines both `file_upload_extraction` and `file_upload_generation`.
- The document includes an allowed-field-type matrix for each step type.

#### Manual

- None.

---

## Issue 2

### Title

`ENGNEER-C2 Normalize framework field-type naming for extraction and generation uploads`

### Type

Database / config

### Agent label

`Agent: database`

### Priority

High

### Blocked by

- Issue 1

### Accomplishes

Replaces the current step-schema upload naming with reusable field types that match the new architecture. This is the foundation for making upload behavior framework-agnostic instead of tied to the current visura implementation.

### Files to read

- `AGENTS.md`
- `codebase-map.md`
- `prisma/seed.sql`
- `april-refactor/step-assembly-architecture.md`

### Files to modify

#### `prisma/seed.sql`

1. Replace legacy upload field-type names in framework step schemas with the new contract names.
2. Preserve existing behavior for current frameworks while aligning naming to the new architecture.
3. Include exact backfill SQL for existing `steps.form_schema` rows, per project rules.

### Do NOT touch

- `app/components/feature/page/StepEditor.vue` — UI support is a separate issue
- `server/api/` — backend changes are separate
- `app/composables/` — no frontend behavior changes here

### Acceptance criteria

#### Static

- `prisma/seed.sql` uses `file_upload_extraction` instead of legacy extraction-specific naming where applicable.
- The issue includes both required backfill SQL statements for seed-driven schema updates.
- No unrelated framework step definitions are changed.

#### Manual

- Verify in Vercel preview that existing extraction-based step flows still load after reseeding and backfill.

---

## Issue 3

### Title

`ENGNEER-A1 Add step type config as the single source of step-level editor behavior`

### Type

Feature / refactor

### Agent label

`Agent: ui-ux`

### Priority

High

### Blocked by

- Issue 1

### Accomplishes

Introduces one central configuration object that defines what each step type can do. This prevents `StepEditor.vue` from hardcoding scattered rules for AI buttons, helper text, and allowed field behaviors.

### Files to read

- `AGENTS.md`
- `codebase-map.md`
- `app/components/feature/page/StepEditor.vue`
- `app/types/app.types.ts`
- `april-refactor/step-assembly-architecture.md`

### Files to modify

#### `app/components/feature/page/StepEditor.vue`

1. Replace direct step-type branching with a central step-type config import or local config object.
2. Move step-level helper text, AI-action enablement, and high-level behavior rules behind config lookups.
3. Keep the visible behavior unchanged except where the architecture doc requires renamed concepts.

#### `app/types/app.types.ts`

1. Tighten `step_type` typing if needed so the step-type config can be applied safely.

### Do NOT touch

- `server/api/` — no generation pipeline changes here
- `prisma/seed.sql` — handled separately
- `app/composables/useGeneration.ts` — generation logic stays intact in this issue

### Acceptance criteria

#### Static

- `StepEditor.vue` no longer hardcodes step-type behavior in multiple scattered branches.
- One step-type config defines the editor behavior for `type_a`, `type_b`, and `type_c`.
- The code remains compatible with the current `StepRecord` shape.

#### Manual

- Verify in Vercel preview that `type_a` steps still suppress or disable AI actions correctly.
- Verify in Vercel preview that `type_c` steps still show AI actions correctly.

---

## Issue 4

### Title

`ENGNEER-B1 Extract reusable field shell and simple field renderer from StepEditor`

### Type

Refactor

### Agent label

`Agent: ui-ux`

### Priority

Medium

### Blocked by

- Issue 3

### Accomplishes

Removes repeated label, hint, required-marker, and simple input rendering logic from `StepEditor.vue`. This is the first step toward making the editor a true assembler rather than a monolithic renderer.

### Files to read

- `AGENTS.md`
- `codebase-map.md`
- `app/components/feature/page/StepEditor.vue`
- `april-refactor/step-assembly-architecture.md`

### Files to modify

#### `app/components/feature/page/StepEditor.vue`

1. Remove duplicated simple-field template branches where practical.
2. Replace them with calls to extracted reusable field UI pieces.

#### `app/components/feature/page/`

1. Add a reusable field shell component for label, hint, and required display.
2. Add a reusable simple-field renderer for `text`, `textarea`, `number`, `select`, and `multiselect`.

### Do NOT touch

- repeatable-group behavior beyond what is necessary for wiring
- extraction upload behavior
- generation upload behavior
- backend routes

### Acceptance criteria

#### Static

- The duplicated label/hint/required-marker pattern is extracted from `StepEditor.vue`.
- Simple field rendering lives in reusable components under `app/components/feature/page/`.
- No field behavior changes are introduced.

#### Manual

- Verify in Vercel preview that simple fields still render and save as before.

---

## Issue 5

### Title

`ENGNEER-B2 Extract repeatable group field renderer from StepEditor`

### Type

Refactor

### Agent label

`Agent: ui-ux`

### Priority

Medium

### Blocked by

- Issue 4

### Accomplishes

Moves the dynamic repeatable-group UI out of `StepEditor.vue` into a reusable renderer. This isolates the most complex structured-data field behavior and makes `type_b` steps easier to scale.

### Files to read

- `AGENTS.md`
- `codebase-map.md`
- `app/components/feature/page/StepEditor.vue`
- `april-refactor/step-assembly-architecture.md`

### Files to modify

#### `app/components/feature/page/StepEditor.vue`

1. Replace inline repeatable-group rendering with an extracted renderer component.
2. Keep current add/remove/collapse behavior unchanged unless required for correctness.

#### `app/components/feature/page/`

1. Add a dedicated repeatable-group field renderer component.

### Do NOT touch

- upload field behavior
- generation pipeline
- server routes

### Acceptance criteria

#### Static

- Repeatable-group UI is no longer defined inline inside `StepEditor.vue`.
- The extracted renderer supports the current nested field behavior.
- No new step-type assumptions are introduced.

#### Manual

- Verify in Vercel preview that adding, removing, and collapsing repeatable items still works.

---

## Issue 6

### Title

`ENGNEER-B3 Replace visura-specific upload UI with reusable extraction upload field renderer`

### Type

Feature / refactor

### Agent label

`Agent: ui-ux`

### Priority

High

### Blocked by

- Issue 2
- Issue 4

### Accomplishes

Replaces visura-specific UI naming and structure with a generic extraction upload field renderer aligned to the step assembly contract. The behavior remains extraction-oriented, but the editor becomes reusable across frameworks.

### Files to read

- `AGENTS.md`
- `codebase-map.md`
- `app/components/feature/page/StepEditor.vue`
- `april-refactor/step-assembly-architecture.md`

### Files to modify

#### `app/components/feature/page/StepEditor.vue`

1. Replace visura-specific field-type branching with the new extraction upload field type.
2. Wire the editor to use a reusable extraction upload renderer.

#### `app/components/feature/page/`

1. Add a reusable extraction upload field renderer.
2. Keep support for the current extraction flow and summary UI.

### Do NOT touch

- `/api/visura/extract-pdf` behavior unless blocked by the rename
- prompt-generation upload behavior
- unrelated field renderers

### Acceptance criteria

#### Static

- `StepEditor.vue` no longer uses the legacy `visura_upload` field-type branch.
- Extraction upload rendering lives in a reusable field component.
- Existing extraction result handling remains compatible with stored `form_data`.

#### Manual

- Verify in Vercel preview that the current extraction workflow still works end to end.
- Verify that extracted data still gates the relevant step behavior correctly.

---

## Issue 7

### Title

`ENGNEER-B4 Add generation upload field renderer for AI-backed step inputs`

### Type

Feature

### Agent label

`Agent: ui-ux`

### Priority

Medium

### Blocked by

- Issue 2
- Issue 4

### Accomplishes

Adds support for `file_upload_generation` so `type_c` steps can accept supporting documents as AI grounding inputs. This introduces the reusable UI contract even if only one framework uses it at first.

### Files to read

- `AGENTS.md`
- `codebase-map.md`
- `app/components/feature/page/StepEditor.vue`
- `app/composables/useGeneration.ts`
- `april-refactor/step-assembly-architecture.md`

### Files to modify

#### `app/components/feature/page/StepEditor.vue`

1. Add support for the new generation-upload field type.
2. Render it through a reusable field component, not an inline branch if possible.

#### `app/components/feature/page/`

1. Add a reusable generation upload field renderer.

### Do NOT touch

- backend prompt ingestion unless blocked
- extraction upload flow
- `prisma/seed.sql` in this issue

### Acceptance criteria

#### Static

- `StepEditor.vue` supports `file_upload_generation`.
- The new field type is rendered via a reusable field component.
- The implementation does not change extraction upload behavior.

#### Manual

- Verify in Vercel preview that a `type_c` step with generation upload fields renders correctly.

---

## Issue 8

### Title

`ENGNEER-A2 Extract step form state and persistence into useStepForm`

### Type

Feature / refactor

### Agent label

`Agent: ui-ux`

### Priority

High

### Blocked by

- Issue 3

### Accomplishes

Moves form state, persistence rules, upload state, and save safety out of `StepEditor.vue` and into a dedicated composable. This addresses the current save-risk findings and makes the step editor architecture reusable.

### Files to read

- `AGENTS.md`
- `codebase-map.md`
- `app/components/feature/page/StepEditor.vue`
- `server/api/db/mutate.post.ts`
- `april-refactor/step-assembly-architecture.md`

### Files to modify

#### `app/composables/`

1. Add `useStepForm()` to manage form values, persistence, loading states, and field update APIs.
2. Ensure text-like fields do not persist stale data due to racing full-payload saves.
3. Ensure repeatable-group writes do not drop errors silently.

#### `app/components/feature/page/StepEditor.vue`

1. Replace inline form state and save logic with `useStepForm()`.
2. Keep the rendered behavior stable while moving logic out of the component.

### Do NOT touch

- generation streaming logic in `useGeneration.ts`
- server-side extraction routes
- framework seed data

### Acceptance criteria

#### Static

- `StepEditor.vue` no longer owns the main persistence logic for `form_data`.
- `useStepForm()` provides the update APIs used by the editor.
- The stale-save risk from keystroke-level full-payload writes is removed or explicitly serialized.
- Repeatable-group writes no longer drop save failures silently.

#### Manual

- Verify in Vercel preview that text fields, repeatable groups, and uploads still save correctly.
- Verify that save failures surface as visible errors instead of only console noise.

---

## Issue 9

### Title

`ENGNEER-A3 Turn StepEditor into a step assembler driven by step_type and form_schema`

### Type

Feature / refactor

### Agent label

`Agent: ui-ux`

### Priority

High

### Blocked by

- Issue 3
- Issue 4
- Issue 5
- Issue 6
- Issue 7
- Issue 8

### Accomplishes

Completes the architectural shift so `StepEditor.vue` primarily reads configuration and assembles field renderers, rather than embedding most field and state logic directly. This is the core issue that makes new frameworks extensible without rewriting step code.

### Files to read

- `AGENTS.md`
- `codebase-map.md`
- `app/components/feature/page/StepEditor.vue`
- `app/composables/usePage.ts`
- `app/types/app.types.ts`
- `april-refactor/step-assembly-architecture.md`

### Files to modify

#### `app/components/feature/page/StepEditor.vue`

1. Reduce the component to step-level orchestration and field assembly.
2. Route field definitions to the correct extracted field renderer.
3. Validate or guard against field types that are not allowed for the active step type.

#### `app/types/app.types.ts`

1. Tighten shared typing as needed so `form_schema` and `step_type` can be used safely in the assembler.

### Do NOT touch

- `server/api/` routes
- `prisma/` schema and migrations
- unrelated page layouts

### Acceptance criteria

#### Static

- `StepEditor.vue` acts primarily as an assembler and coordinator.
- Field rendering is delegated to extracted field components.
- Field compatibility with the active `step_type` is handled centrally.
- The file is materially smaller and simpler than before the refactor.

#### Manual

- Verify in Vercel preview that the current frameworks still render correctly across their step types.

---

## Issue 10

### Title

`ENGNEER-FPB1 Migrate current framework step definitions to the step assembly contract`

### Type

Framework configuration

### Agent label

`Agent: database`

### Priority

High

### Blocked by

- Issue 1
- Issue 2

### Accomplishes

Aligns the current framework step definitions with the new architecture so the first two frameworks are real examples of the reusable system. This ensures the contract is applied in the database, not just in UI code.

### Files to read

- `AGENTS.md`
- `codebase-map.md`
- `prisma/seed.sql`
- `pagecraft-discovery-1.md`
- `april-refactor/step-assembly-architecture.md`

### Files to modify

#### `prisma/seed.sql`

1. Align current framework step schemas with the agreed field-type and step-type contract.
2. Keep prompts and field content source-driven; do not invent business content outside what is already specified.
3. Include required backfill SQL for existing seeded step rows.

### Do NOT touch

- `app/components/feature/page/StepEditor.vue`
- `app/composables/`
- backend generation routes

### Acceptance criteria

#### Static

- The current frameworks use the agreed step and field type naming.
- Seed changes include required backfill SQL.
- No unrelated prompt or schema drift is introduced.

#### Manual

- Verify in Vercel preview that existing frameworks still create pages correctly after reseeding and backfill.

---

## Issue 11

### Title

`ENGNEER-E1 Evaluate step assembly refactor against architecture contract and regression risks`

### Type

Evaluation

### Agent label

`Agent: evaluator`

### Priority

High

### Blocked by

- Issue 9
- Issue 10

### Accomplishes

Checks whether the implemented refactor actually satisfies the architecture contract and whether the existing framework flows still work without regressions. This is the quality gate before treating the refactor as complete.

### Files to read

- `codebase-map.md`
- `april-refactor/step-assembly-architecture.md`
- implementation PR or changed files from Issues 2 through 10

### Files to modify

- None.

### Do NOT touch

- entire codebase; evaluator issue is read-only

### Acceptance criteria

#### Static

- Evaluator confirms that step-type behavior is centralized.
- Evaluator confirms that field rendering is modularized.
- Evaluator confirms that the stale-save and repeatable-group save risks are addressed.
- Evaluator flags any mismatch between implementation and the architecture contract.

#### Manual

- Verify in Vercel preview that representative `type_a`, `type_b`, and `type_c` steps all work as expected.

---

## Suggested Dependency Graph

- Issue 1 is the contract lock.
- Issues 2 and 3 can start after Issue 1.
- Issue 4 depends on Issue 3.
- Issues 5, 6, and 7 depend on the relevant early split work.
- Issue 8 depends on Issue 3.
- Issue 9 depends on the field and form-state extraction issues.
- Issue 10 depends on the contract and naming normalization.
- Issue 11 depends on the implementation set being complete.

## Suggested First Slice

If you want the fastest path to visible progress with controlled risk, start with:

1. Issue 1
2. Issue 3
3. Issue 8

That sequence:

- locks the contract
- centralizes step behavior
- fixes the most important persistence risk

Then move into field extraction and final assembler cleanup.

## Notes

- The current review findings on `StepEditor.vue` should be folded mainly into Issue 8 and Issue 6.
- The field-type rename should be treated as an architectural normalization, not just a cosmetic change.
- If the implementation descriptions become too long for Linear, attach `april-refactor/step-assembly-architecture.md` as the supporting document and keep each issue brief focused on execution.

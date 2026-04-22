# PageCraft — Refactors
Last updated: 2026-04-22

This file is the refactor router for PageCraft.
Use it when a task is a refactor, rewrite, migration, or strong cleanup of an already-reworked surface.

Read this file before editing when:
- the issue is explicitly a refactor, rewrite, migration, or structural cleanup
- the issue touches the StepEditor/editor flow in a non-local way
- the issue touches surfaces covered by the RESTYLING program
- the issue references a refactor batch, refactor folder, or Linear milestone tied to a rewrite program

---

## Active refactor

No active large refactor at the moment.

---

## Completed major refactors

### StepEditor refactor — Completed
- Status: shipped
- Impact: moved the document editor toward a configuration-driven step assembler with extracted field components and `useStepForm.ts` ownership of form state/persistence
- Local references:
  - `stepEditor-refactor/step-assembly-architecture.md`
  - `stepEditor-refactor/step-assembly-linear-breakdown.md`
  - `stepEditor-refactor/step-assembly-linear-compact.md`
- External references: related Linear milestone and linked issues for the Step assembly / StepEditor rewrite

### RESTYLING program — Completed
- Status: shipped
- Impact: restyled app shell, clients/projects surfaces, editor, forms, modals, and destructive flows with shared workspace and state primitives
- Local references:
  - `RESTYLING/00-kickoff-summary.md`
  - `RESTYLING/01-batch-app-shell-navigation.md`
  - `RESTYLING/02-batch-clients-projects.md`
  - `RESTYLING/03-batch-editor-flow.md`
  - `RESTYLING/04-batch-forms-modals.md`
  - `RESTYLING/05-batch-polish-regressions.md`
- External references: related RESTYLING Linear milestone and linked batch issues

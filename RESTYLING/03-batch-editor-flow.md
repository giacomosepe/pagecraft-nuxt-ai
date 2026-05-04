# Batch 3 — Document Editor Flow

## Goal

Restyle and simplify the high-value editor experience without destabilizing the generation workflow. This batch should make the three-panel flow feel deliberate, calm, and production-ready for the V0.5 test.

## Pages And Components In Scope

- `app/pages/pages/[id].vue`
- `app/components/feature/page/StepNav.vue`
- `app/components/feature/page/StepEditor.vue`
- `app/components/feature/page/StepOutput.vue`
- `app/components/feature/page/StepFieldShell.vue`
- `app/components/feature/page/StepSimpleField.vue`
- `app/components/feature/page/StepRepeatableGroupField.vue`
- `app/components/feature/page/StepExtractionUploadField.vue`
- `app/components/feature/page/StepGenerationUploadField.vue`

## Main Refactor Outcomes

- Rebuild the editor shell around shared panels and section components
- Clarify visual hierarchy between navigation, form assembly, and generated output
- Normalize field spacing, helper text, upload states, AI actions, and commit states
- Extract shared panel headers and action bars
- Reduce the visual density and make long sessions easier to navigate

## Mandatory Pre-Read

Before doing any editor restyling, read these files:

- `app/composables/useStepForm.ts`
- `app/composables/useGeneration.ts`
- `app/components/feature/page/StepEditor.vue`

Reason:

- the editor state model changed during the step assembly refactor
- visual work must target the new componentized and state-driven editor, not the old monolithic model

## Explicit Substreams

### Document Page

- treat `app/pages/pages/[id].vue` as its own restyling target inside this batch
- reduce route-level markup further so the document experience is composed from editor primitives
- keep the three-panel workflow understandable for real legal-document sessions

### Prompt Text Areas

- restyle the large prompt-driven input areas inside the editor and related forms with clear hierarchy
- standardize textarea behavior, labels, hints, resize expectations, and long-content readability
- make AI-facing text entry feel intentional rather than like generic form controls

## Components To Extract

- `EditorShell`
- `EditorPanel`
- `EditorPanelHeader`
- `StepStatusPill`
- `FieldGroup`
- `UploadStateCard`
- `GenerationActionBar`

## Architectural Rules

- Do not move generation business logic into page routes
- Styling refactors should preserve the current `usePage` and `useGeneration` orchestration unless a simplification is clearly safe
- Field rendering stays componentized by field type
- Shared editor scaffolding should own spacing and panel chrome, not each field component
- Assume the current editor architecture is the post-refactor source of truth, not any pre-refactor mental model

## Figma Inputs Needed

- Full editor page
- States for generating, refining, empty output, committed output, and upload progress
- Modal or expanded output views if redesigned

## Exit Criteria

- The editor feels visually consistent with the restyled shell and list pages
- Step nav, center editor, and output panel share a cohesive component system
- AI actions and upload flows remain understandable under stress
- The page route becomes thinner, not thicker

## Risks To Watch

- Accidentally coupling visual refactors to generation logic changes
- Under-designing loading and error states
- Leaving panel spacing and typography inconsistent across the three panes

## Follow-Up Notes

- Type A steps are deterministic template steps. Their Prompt tab should stay disabled in the UI.
- Remove unused type_a prompt text from seed/live DB once the Wave 1 UI behavior is settled; templates should live in deterministic builders, not in `framework_steps.system_prompt_template`.
- Step 3 expects a `visura_pdf` `file_upload_extraction` field. Backfill existing `steps.form_schema` rows if older documents were created before that field existed.

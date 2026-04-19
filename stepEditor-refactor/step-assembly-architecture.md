# PageCraft Step Assembly Architecture
_Date: 2026-04-19_

## Purpose

This document defines the target model for how PageCraft frameworks, steps, and input fields should work.

The goal is to make frameworks composable without custom coding for each new step. A framework should be assembled from reusable step behaviors plus step-specific configuration.

This supports two product needs:

1. Internal team can add new frameworks by configuring steps, not rewriting the editor.
2. Future user-created frameworks can rely on the same contract.

This document is the planning reference for the StepEditor refactor and for future Linear issue breakdown.

## Core Model

### Database entities

- `frameworks`
  Stores each framework, such as `Italian Patent Box` or `Relazione Tecnica`.

- `framework_steps`
  Stores the ordered step definitions belonging to a framework.

Each `framework_step` is a configuration record for one step in one framework.

### Application-level concepts

- `step_type`
  A controlled classification stored on each `framework_step`. It defines how the whole step behaves.

- `field_type`
  A controlled classification inside the step schema. It defines what kind of input a field is.

- `form_schema`
  A JSON configuration stored on `framework_steps.form_schema`. It defines the fields to render for that step.

- `form_data`
  A JSON payload stored on `steps.form_data`. It stores the actual values entered or extracted for that page step.

## Relationship Map

- `framework` = ordered list of steps
- each step has one `step_type`
- each step has one `form_schema`
- `form_schema` contains field definitions
- each field definition has one `field_type`
- `field_type` must be allowed by that `step_type`

This means:

- `step_type` defines the behavior of the step
- `form_schema` defines the contents of the step
- `field_type` defines the behavior of each input inside the step

Two steps can share the same `step_type` and still have different `form_schema`.

Example:

- two `type_c` steps both use AI generation
- but one asks about R&D activities
- and another asks about outsourced activities

The shared behavior comes from `step_type`. The different questions come from `form_schema`.

## What `form_schema` Is

`form_schema` is not a database table.

It is a JSON recipe stored on `framework_steps` that tells the app how to assemble the input panel for that step.

It should define:

- which fields appear
- in what order they appear
- the label for each field
- the hint text for each field
- whether the field is required
- the `field_type` for each field
- any field-specific options or nested structure
- any allowed conditional display rules

In product terms:

- `step_type` = the engine
- `form_schema` = the dashboard controls for that engine

Without `form_schema`, every step of the same type would look identical. With it, the app can reuse step behavior while changing the exact questions per framework step.

## `form_schema` Contract

The app should treat `form_schema` as the authoritative step blueprint.

Minimum contract:

- `form_schema` is an array of field definitions
- each field definition has a stable `key`
- each field definition has one `field_type`
- field order in the array is the render order
- each field definition must be valid for the parent `step_type`

Minimum field definition shape:

```ts
type FormSchema = FormField[]

type FormField = {
  key: string
  label: string
  type: FieldType
  required?: boolean
  placeholder?: string
  hint?: string
  options?: string[]
  conditional?: {
    key: string
    value: string
  }
  accept?: string[]
  fields?: FormField[]
  minItems?: number
  addLabel?: string
}
```

Field-specific rules:

- `options` is only valid for selectable field types such as `select` and `multiselect`
- `fields` is only valid for `repeatable_group`
- `minItems` and `addLabel` are only valid for `repeatable_group`
- `accept` is only valid for upload field types
- `conditional` is optional and can be used on any field type unless implementation constraints are introduced later

Validation rule:

- if a field definition uses properties that do not belong to its `field_type`, the editor should ignore them rather than invent behavior from them

## Step Types

These are the three step types currently supported by the product model.

### `type_a`

Deterministic input step.

Characteristics:

- no AI generation
- fixed or mostly fixed form fields
- output maps directly into a known document section
- best for prefilled or ministry-style fixed text sections

Primary output:

- fixed template values

Typical use:

- heading sections
- intro sections
- simple metadata sections

### `type_b`

Structured data collection step.

Characteristics:

- no AI prose generation
- may contain dynamic or repeating data
- may use extraction to turn files into structured data
- output is structured content used directly in the document

Primary output:

- structured data

Typical use:

- ownership structures
- variable-length entities
- extracted data that populates document sections

### `type_c`

Guided AI writing step.

Characteristics:

- user fills structured inputs
- AI generates the prose for the step
- uploaded files may feed prompt context for generation

Primary output:

- generated prose

Typical use:

- analytical or narrative sections
- legal or technical writing sections
- sections where the structure is fixed but the content must be written from facts

## Field Types

These are the target reusable field types for the step system.

### Basic field types

- `text`
- `textarea`
- `number`
- `select`
- `multiselect`

These are generic field types that should remain reusable across step types.

### Structured field types

- `repeatable_group`

Used for N-of-something structures such as shareholders, subsidiaries, associated companies, or other repeatable records.

### Upload field types

- `file_upload_extraction`
- `file_upload_generation`

These replace the current overly specific `visura_upload` naming.

#### `file_upload_extraction`

Purpose:

- upload a file so the system extracts structured information from it

Behavior:

- extraction output is saved into `form_data`
- supports structured data workflows
- can prefill or update dynamic form content

Typical fit:

- `type_b`

Example:

- upload a visura PDF and extract shareholders, subsidiaries, or corporate structure data

#### `file_upload_generation`

Purpose:

- upload a file to provide source material for AI writing

Behavior:

- file content is used as prompt context for generation
- does not itself define the final document output
- supports AI-assisted writing workflows

Typical fit:

- `type_c`

Example:

- upload a technical note, contract, or supporting report to ground AI generation

## Allowed Field Types by Step Type

This is the target rule set for the step system.

## Step Type Matrix

| Step type | Primary output | AI prose generation | AI extraction | Allowed field families | Forbidden by default |
|---|---|---|---|---|---|
| `type_a` | Fixed template values | No | No | Basic fields | `repeatable_group`, `file_upload_extraction`, `file_upload_generation` |
| `type_b` | Structured data | No | Yes | Basic fields, structured fields, extraction upload | `file_upload_generation` |
| `type_c` | Generated prose | Yes | No | Basic fields, generation upload | `repeatable_group`, `file_upload_extraction` |

Definitions used in the matrix:

- Basic fields = `text`, `textarea`, `number`, `select`, `multiselect`
- Structured fields = `repeatable_group`
- Extraction upload = `file_upload_extraction`
- Generation upload = `file_upload_generation`

### `type_a` allowed field types

- `text`
- `textarea`
- `number`
- `select`
- `multiselect`

Not allowed:

- `repeatable_group`
- `file_upload_extraction`
- `file_upload_generation`

Rationale:

`type_a` should stay simple, deterministic, and low-risk.

### `type_b` allowed field types

- `text`
- `textarea`
- `number`
- `select`
- `multiselect`
- `repeatable_group`
- `file_upload_extraction`

Not allowed:

- `file_upload_generation`

Rationale:

`type_b` is for structured data collection and may use extraction, but it does not run AI prose generation.

### `type_c` allowed field types

- `text`
- `textarea`
- `number`
- `select`
- `multiselect`
- `file_upload_generation`

Not allowed:

- `repeatable_group` by default
- `file_upload_extraction` by default

Rationale:

`type_c` should focus on fact collection for prose generation. Keep it simpler than `type_b` unless a later product need justifies expanding it.

Transitional compatibility note:

- the current implementation temporarily allows `repeatable_group` in `type_c` because at least one existing framework step still depends on it
- this should be treated as compatibility behavior, not as the preferred target architecture
- the target model still treats `repeatable_group` as native to `type_b` unless a future product decision confirms a real `type_c` use case

## Non-Negotiable Rules

These rules should hold across implementation unless a later architecture change replaces them explicitly.

1. `step_type` defines step behavior, not the exact questions shown to the user.
2. `form_schema` defines the exact fields shown to the user, not the overall step behavior.
3. A `framework` may mix `type_a`, `type_b`, and `type_c` freely.
4. Two steps with the same `step_type` may have completely different `form_schema`.
5. `file_upload_extraction` is for producing structured data in `form_data`, not for feeding prose generation.
6. `file_upload_generation` is for feeding AI generation context, not for producing structured step data.
7. `StepEditor` must assemble from configuration; it must not become a per-framework custom component.
8. New frameworks must be addable by writing configuration in `framework_steps`, not by editing step-specific code.

## UI Responsibility Model

### `StepEditor`

`StepEditor` should become the assembler.

Its job should be to:

- read `activeStep.step_type`
- read `activeStep.form_schema`
- validate that each field is allowed for that step type
- render the correct field components
- show the correct action bar for the step type

It should not contain framework-specific business logic.

### Field components

Each field type should be a reusable UI component or renderer.

Examples:

- `FieldText`
- `FieldTextarea`
- `FieldSelect`
- `FieldMultiSelect`
- `FieldRepeatableGroup`
- `FieldFileUploadExtraction`
- `FieldFileUploadGeneration`

### Form state layer

Saving and state management should move out of the template and into a composable.

Suggested target:

- `useStepForm()`

Responsibilities:

- expose current `formValues`
- handle field updates safely
- debounce or queue saves for text-like fields
- persist immediate-save fields
- handle extraction upload flow
- handle generation-upload flow
- expose loading and error states

## Step-Type Behavior Contract

### `type_a`

UI behavior:

- no AI action bar
- commit based on deterministic content workflow
- simple form-focused subtitle and helper text

Data behavior:

- values saved to `form_data`
- no `generations` record
- `committed_output` is still the final step output, even if generated without AI

### `type_b`

UI behavior:

- no AI prose generation action bar
- supports dynamic structured sections
- may show extracted-data summaries or structured previews

Data behavior:

- values and extracted results saved to `form_data`
- no prose-generation call
- extracted file results must end up in structured step data, not hidden only in transient UI state

### `type_c`

UI behavior:

- show AI generation and refine actions
- use structured fields to build generation context
- may show generation-specific upload areas

Data behavior:

- values saved to `form_data`
- generation pipeline consumes `form_data`
- committed text stored in `committed_output`

## Save and State Rules

These rules are part of the contract because the current `StepEditor.vue` has persistence risks.

1. Text-like fields must not save in a way that lets older requests overwrite newer user input.
2. Repeatable-group writes must surface failure explicitly and must not fail silently.
3. Upload fields must persist enough result data in `form_data` to survive reloads.
4. Step-level gating logic must work from persisted state, not only from ephemeral in-memory refs.
5. The editor should prefer one shared form-state layer over field-by-field ad hoc persistence rules.

## Why This Model Supports Future Framework Creation

This contract allows PageCraft to add frameworks by configuration rather than by coding custom editors.

To add a framework, the internal team should only need to create:

- one `framework` record
- a sequence of `framework_steps`
- for each step:
  - title
  - description
  - order
  - `step_type`
  - `form_schema`
  - prompt templates where relevant

If the editor obeys this contract, a new framework can be assembled from reusable step behaviors and field components.

That same architecture can later support user-authored frameworks, because the user would also be creating configuration, not code.

## Refactor Plan

### Phase 1: lock the contract

Create agreement on:

- step type definitions
- field type definitions
- allowed combinations
- upload semantics
- expected `form_schema` shape

This document is the working contract for that implementation.

### Phase 2: normalize field types

Update naming and responsibilities:

- rename `visura_upload` to `file_upload_extraction`
- add `file_upload_generation`
- align current framework step schemas to these names

### Phase 3: add step type config

Create a central config object describing:

- whether AI actions are enabled
- which field types are allowed
- step-level helper text
- any step-level UI rules

Suggested target:

- `stepTypeConfig`

### Phase 4: split field rendering

Extract the large `StepEditor.vue` into reusable field renderers and shells.

Priority targets:

- generic field shell
- simple field renderer
- repeatable group renderer
- extraction upload renderer
- generation upload renderer

### Phase 5: centralize form state and saving

Create a composable to own:

- local draft state
- persistence rules
- upload state
- extraction results
- save errors

Suggested target:

- `useStepForm()`

### Phase 6: make `StepEditor` the assembler

After the split, `StepEditor` should mostly:

- read config
- validate step and field compatibility
- assemble components
- hand off state updates to `useStepForm()`

### Phase 7: migrate existing frameworks

Use Patent Box and Relazione Tecnica as the first two real examples of the contract.

This migration should verify that:

- multiple frameworks can coexist
- steps can mix different `step_type` values
- new frameworks can be added without editor rewrites

## Open Questions for Follow-Up

These do not block the architecture, but should be resolved during implementation planning:

- whether `type_c` should ever allow `repeatable_group`
- whether `type_c` should ever allow `file_upload_extraction`
- whether some `type_a` steps should auto-commit or still use manual commit
- whether internal framework creation should get a small admin UI before user-created frameworks

## Immediate Planning Outcome

The StepEditor refactor should be planned as a configuration-driven step system refactor, not just as a cleanup of `StepEditor.vue`.

The key success criterion is:

PageCraft must be able to add a new framework by assembling configured steps from reusable step and field behaviors, without writing custom step code.

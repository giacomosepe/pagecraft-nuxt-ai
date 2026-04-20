# Batch 4 — Forms, Creation Flows, And Modals

## Goal

Standardize every create and edit flow so form-heavy screens feel easier to maintain and visually aligned with the redesigned shell and entity pages.

## Pages And Components In Scope

- `app/pages/clients/new.vue`
- `app/pages/clients/[id]/edit.vue`
- `app/pages/pages/new.vue`
- `app/components/FrameworkPickerModal.vue`
- any inline confirmation or selection dialogs used by creation flows

## Main Refactor Outcomes

- Create a reusable form page scaffold for create and edit screens
- Standardize label, hint, section, action footer, and validation presentation
- Bring modal structure in line with the restyled system
- Remove one-off form wrappers and local spacing decisions
- Create a pattern for multi-section forms that can scale as the product grows

## Components To Extract

- `FormPageLayout`
- `FormSectionCard`
- `FormSectionHeader`
- `FormActionsFooter`
- `SelectionModalLayout`
- `InlineHelpBlock`

## Architectural Rules

- Pages remain thin orchestrators for fetch, submit, and route navigation
- Shared form visual rules belong in components, not copied utility stacks
- Existing data submission paths stay intact unless a refactor meaningfully reduces duplication

## Figma Inputs Needed

- Client create/edit form
- Program/page creation flow
- Framework picker modal
- Confirmation or destructive action modals

## Exit Criteria

- All create/edit flows look like part of the same product
- Form sections, footers, and modal actions follow one consistent pattern
- Editing later becomes faster because form structure is predictable

## Risks To Watch

- Treating each form as a unique layout problem
- Forgetting long-form and mobile scrolling behavior
- Mixing visual cleanup with risky mutation-flow rewrites

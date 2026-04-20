---
name: pagecraft-ui-refactor
description: Use this skill when restyling, restructuring, or reviewing PageCraft UI pages, layouts, and feature components. It is for multi-page visual refactors driven by Figma, with an emphasis on thin pages, reusable layout primitives, shared workspaces, and safe migration of PageCraft's existing clients, projects, editor, and form flows.
---

# PageCraft UI Refactor

Use this skill for substantial UI restyling or component/layout refactors in the PageCraft repo.

## Core Intent

- Treat PageCraft as a product with a shared UI system, not a collection of pages
- Prefer extracting reusable layout and workspace components over polishing one route in isolation
- Keep route pages thin and push visual structure into feature components and shared scaffolds
- Use Figma as the source of truth for target interaction and visual hierarchy, then adapt thoughtfully to the real product constraints

## Non-Negotiable Repo Rules

- Read `AGENTS.md` and `codebase-map.md` before making structural changes
- Follow the existing separation of concerns: pages orchestrate, composables own data/business logic, feature components render UI
- Do not move server logic or database concerns into UI work unless the task explicitly requires it
- Keep direct UI copy in Italian when writing template strings
- Preserve existing behavior unless the task explicitly includes product changes

## Default Workflow

1. Identify the exact Figma frame or frames and the real app routes they map to
2. Audit the current page and list the parts that belong in shared layout or feature components
3. Check whether an existing component can be extended before creating a new one
4. Extract scaffolding first: shell, page header, workspace, section card, toolbar, row, panel, or form layout
5. Move route pages toward orchestration-only code
6. Verify key states, not just the happy path: loading, empty, error, long content, and mobile/tablet behavior

## Preferred Component Hierarchy

- `layouts/` for app shell chrome
- `components/base/` for small presentation primitives with no product knowledge
- `components/feature/<domain>/` for product-aware workspaces and sections
- `pages/` as thin route orchestrators only

## Restyling Heuristics

- Start from shared page grammar: shell, page header, toolbar, body sections
- Normalize spacing and panel structure before polishing micro-details
- Use one component for repeated list scaffolding across clients, projects, and similar views
- Use one component family for form-page sections and action footers
- Use one component family for editor panels and panel headers
- Avoid local utility-class piles when the same structure appears twice

## Figma Translation Rules

- Preserve the design's hierarchy and mood, but adapt literal mockup content to real product data
- If Figma contains fake statuses or entities that do not exist in the app, map them to real supported states instead of forcing the data model
- Prefer reusable tokens and components over pixel-perfect one-off markup
- When a Figma pattern conflicts with product behavior, preserve behavior and document the adaptation

## Refactor Guardrails

- Do not let pages accumulate filtering, formatting, and view-model logic if that logic can live in composables or dedicated feature workspaces
- Do not duplicate route aliases or navigation definitions across multiple files
- Do not restyle a page by hardcoding values that should become shared tokens or component props
- Do not leave old and new component patterns mixed on the same surface if the task scope can reasonably finish the migration

## What Not To Do

- Do not treat Figma as permission to invent unsupported product behavior
- Do not rebuild the same shell, header, toolbar, or section structure separately on each page
- Do not hide business logic inside route pages just because the visual refactor started there
- Do not solve consistency problems with larger utility-class stacks when a component should exist
- Do not keep both a legacy component and a near-identical replacement without a clear migration reason
- Do not style only the happy path; always account for loading, empty, error, and long-content states
- Do not break route aliases, editor flow behavior, or legal-document workflow assumptions for visual neatness
- Do not turn every design difference into a new primitive; extract only patterns that truly repeat

## Batch Planning

When the task is broad, break work into these batches:

- app shell and navigation
- clients and projects surfaces
- editor flow
- forms and modals
- polish and regressions

Use the files in `RESTYLING/` as the active planning baseline when they exist.

## Definition Of Done

- The target surface matches the new design direction and feels native to the rest of the app
- Shared components own the new structure instead of route pages
- Loading, empty, and edge states are visually intentional
- The codebase becomes easier to extend after the change, not harder

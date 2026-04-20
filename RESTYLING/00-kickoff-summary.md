# PageCraft Restyling — Kickoff Summary

## Execution Order

Batch order must remain:

1. Batch 1 — App Shell And Navigation
2. Batch 2 — Clients And Projects Surfaces
3. Batch 3 — Document Editor Flow
4. Batch 4 — Forms, Creation Flows, And Modals
5. Batch 5 — Polish, Consistency, And Regression Cleanup

## Why This Order

- the `RESTYLING/` docs are already structured in this sequence
- the sequence establishes shared layout primitives and navigation patterns before touching the high-value editor flow
- it reduces duplication risk by defining shell, page header, and workspace scaffolding before broader page migrations

## Figma Inputs

- Figma MCP is preferred whenever it is available
- if Figma MCP is not available, the required fallback inputs are:
  - full desktop frames
  - mobile or compact states if they differ
  - hover, open, and expanded states
  - a clear mapping from Figma frames to real routes and components in the repo

## Verification Constraints

- local `nuxi typecheck` is still blocked by the Node mismatch: `styleText requires Node v20.12+`
- manual browser verification remains important until the local Node version is upgraded
- visual work should be validated in the browser for responsive behavior, long-content handling, and key interaction states

## Current Local State

- there are already local uncommitted changes that belong to Batch 2, not Batch 1
- Batch 1 should begin from a clean working tree on its own branch
- Batch 2 should continue from the existing client-surface work rather than restarting it

## Editor Architecture Note

- a strategic StepEditor refactor was already completed
- Batch 3 must target the new componentized and state-driven editor model, not the old monolithic editor assumptions

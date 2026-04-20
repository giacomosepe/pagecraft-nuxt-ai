# Batch 2 — Clients And Projects Surfaces

## Goal

Restyle and refactor the list and detail surfaces for clients, projects, and folders so the browsing experience feels cohesive and reusable before touching the heavier editor flow.

## Pages And Components In Scope

- `app/pages/clienti/index.vue`
- `app/pages/clients/index.vue`
- `app/pages/clients/new.vue`
- `app/pages/clients/[id].vue` or current equivalent detail route
- `app/pages/folders/[id].vue`
- `app/pages/progetti/index.vue`
- `app/components/feature/client/*`
- `app/components/feature/folder/FolderTable.vue`

## Main Refactor Outcomes

- Convert list pages into feature workspaces with shared list scaffolding
- Align filters, search, tab sets, empty states, and primary actions across clients and projects
- Create consistent row, card, and detail summary patterns
- Split business logic into composables where pages still own too much filtering or formatting
- Make detail pages reuse the same page header, metadata strips, and table sections

## Current Local Work Already In Scope

The following local changes already belong to Batch 2 and should be continued rather than reinvented:

- `app/composables/useClients.ts`
- `app/pages/clienti/index.vue`
- `app/pages/clients/index.vue`
- `app/components/feature/client/ClientListRow.vue`
- `app/components/feature/client/ClientListWorkspace.vue`
- deletion of `app/components/feature/client/ClientCard.vue`
- `app/types/app.types.ts` support change for nested page activity

These changes represent an in-progress clients-surface refactor and should be treated as the starting point for Batch 2.

## Explicit Substreams

### Project Page

- treat `app/pages/progetti/index.vue` as a first-class surface, not a follow-on after clients
- align project list interactions with the clients workspace while preserving domain-specific fields
- prepare the shared scaffolding needed by folder and document-adjacent listing surfaces

### Folder And Program Detail

- keep `app/pages/folders/[id].vue` visually aligned with client and project detail patterns
- extract reusable section cards and summary blocks instead of styling detail pages one by one

## Components To Extract

- `ListWorkspace`
- `ListToolbar`
- `ListEmptyState`
- `EntityRow`
- `EntityAvatar`
- `EntityMetaStrip`
- `DetailSummaryCard`
- `SectionCard`

## Architectural Rules

- Data shaping belongs in composables or dedicated computed layers inside feature components, not in route pages
- Pages should only wire route params, composables, and workspace props
- Repeated list behaviors should be configurable, not copied
- Continue the current clients-list refactor from the local branch state instead of re-implementing the same surface from scratch

## Figma Inputs Needed

- Clients list and detail
- Projects list and detail
- Folders/program detail
- Shared filter and search states

## Exit Criteria

- Clients, projects, and folders share a recognizable interaction model
- New list screens can be assembled from reusable primitives instead of one-off markup
- Detail pages have a consistent header and section structure
- Search, status views, and empty states feel intentionally designed rather than page-specific

## Risks To Watch

- Rebuilding table markup per page instead of extracting one reusable scaffold
- Mixing real domain differences with accidental layout differences
- Forgetting responsive behavior for wide data tables
- Accidentally discarding the current local clients-surface work while Batch 1 proceeds separately

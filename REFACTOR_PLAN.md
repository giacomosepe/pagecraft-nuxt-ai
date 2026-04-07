# PageCraft — Code Structure Refactor Plan
_Last updated: April 2026_

## Context for the PM / Linear agent

This document tracks the full refactor of PageCraft's frontend code structure
toward a professional, scalable 4-layer architecture (UI → Logic → Data → Infra).

It runs **in parallel** with the ongoing UI rewrite based on MagicPatterns designs.
The two workstreams must be merged: new UI components from MagicPatterns should be
built directly into the target structure below, not bolted onto the old one.

The backend is **not touched** in this refactor. All `server/api/` routes, Prisma
schema, and Supabase RLS policies remain unchanged.

---

## Target architecture (reference)

```
app/
├── components/
│   ├── base/          ← pure UI, no data, no business logic
│   ├── feature/       ← domain-aware, uses composables
│   │   ├── client/
│   │   ├── page/
│   │   └── folder/
│   └── ui/            ← layout shells (AppSidebar, AppBottomBar)
├── composables/       ← all data fetching and business logic
├── utils/             ← pure functions (date, status, folderStatus)
├── types/             ← shared TypeScript interfaces
├── pages/             ← route files only, ~40 lines max each
├── layouts/
└── middleware/
```

**The non-negotiable rule:** pages and components contain zero business logic.
Logic lives in composables. Data calls live in server/api. Never cross layers.

---

## Phase 1 — Extract utils and shared types
**Status: ✅ COMPLETE**
_Executed by: Claude (Sonnet 4.5) on 2026-04-06_
_Method: Direct filesystem writes via Claude.ai + Filesystem MCP_

### What was done

- [x] Created `app/utils/` directory
- [x] Created `app/utils/date.ts`
  - Exports `formatDate(iso)` — Italian short date display (e.g. "15 Mar 2024")
  - Exports `formatISODate(isoDate)` — ISO to Italian slash format (e.g. "01/01/1970")
  - Extracted from: `clients/[id]/index.vue` and bottom of `useClientFields.ts`
- [x] Created `app/utils/status.ts`
  - Exports `statusColor` record — maps status keys to NuxtUI badge color names
  - Exports `statusLabel` record — maps status keys to Italian display labels
  - Covers: folder, page, client, and step statuses in one place
  - Extracted from: `clients/[id]/index.vue` (was hardcoded inline)
- [x] Created `app/utils/folderStatus.ts`
  - Exports `deriveFolderStatus(pages)` — derives folder display status from child pages
  - Extracted from: `clients/[id]/index.vue`
- [x] Created `app/types/app.types.ts`
  - Exports: `ClientListItem`, `ClientDetail`, `PageItem`, `FolderItem`,
    `FolderTableRow`, `StepRecord`, `PageRecord`, `PageWithSteps`
  - These were all inline `type` definitions scattered across page files
- [x] Updated `app/pages/clients/[id]/index.vue`
  - Now imports from the three utils and `app.types.ts`
  - Removed all inline type definitions and helper functions
- [x] Updated `app/composables/useClientFields.ts`
  - Removed private `formatDate` function at the bottom
  - Now imports `formatISODate` from `~/utils/date`

### Verification checklist (for Claude Code)
- [ ] Run `nuxi typecheck` — no new TypeScript errors
- [ ] Run dev server — clients list and client detail page load correctly
- [ ] Status badges still render with correct colors and labels
- [ ] Date formatting is unchanged on client detail page

---

## Phase 2 — Extract composables for data fetching
**Status: 🔲 TODO**
_Prerequisite: Phase 1 verified_

### Goal
Move all `useAsyncData` + Supabase calls out of page `<script setup>` blocks
into dedicated composables. Pages become thin orchestrators.

### Tasks

- [ ] Create `app/composables/useClients.ts`
  - Wraps: `clients/index.vue` fetch (list of clients)
  - Exposes: `{ clients, pending }`

- [ ] Create `app/composables/useClient.ts`
  - Wraps: `clients/[id]/index.vue` fetch (single client with folders + pages)
  - Wraps: `onStatusChange` mutation
  - Exposes: `{ data, pending, updateStatus }`

- [ ] Create `app/composables/usePage.ts`
  - Wraps: `pages/[id].vue` — the two parallel Supabase fetches (page + steps)
  - Wraps: the secondary client data fetch (triggered by watch on page data)
  - Exposes: `{ page, steps, clientData, pending, error }`

- [ ] Create `app/composables/useGeneration.ts`
  - Wraps: `generate()`, `refine()`, `commit()`, `discard()` from `pages/[id].vue`
  - This is ~120 lines of logic that needs to be available to new UI components
  - Exposes: `{ output, isGenerating, isCommitting, errorMsg, generate, refine, commit, discard }`

- [ ] Create `app/composables/useStepCommit.ts`
  - Wraps: the commit logic and optimistic local state update
  - Can be composed inside `useGeneration` or used standalone

- [ ] Update `pages/clients/index.vue` to use `useClients()`
- [ ] Update `pages/clients/[id]/index.vue` to use `useClient()`
- [ ] Update `pages/clients/[id]/edit.vue` to use `useClient()` (load) + direct mutate (save)
- [ ] Update `pages/pages/[id].vue` to use `usePage()` + `useGeneration()`

### Verification checklist
- [ ] All pages still load and function identically
- [ ] Generate / refine / commit flow works on `pages/[id].vue`
- [ ] Client status update still persists
- [ ] No Supabase calls remain directly in page `<script setup>` blocks

---

## Phase 3 — Component split (UI rewrite phase)
**Status: 🔲 TODO — coordinate with MagicPatterns rewrite**
_Prerequisite: Phase 2 verified AND MagicPatterns designs available_

### Goal
Replace the monolithic page templates with composed feature components.
This is the phase where MagicPatterns output gets integrated.

**Critical constraint:** Every new component from MagicPatterns must be placed
into the correct layer immediately. Do not let design output become fat components.

### Folder structure to create

```
app/components/
├── base/
│   ├── BaseStatusBadge.vue     ← wraps UBadge with statusColor/statusLabel
│   └── BaseModal.vue           ← standardised modal wrapper
├── feature/
│   ├── client/
│   │   ├── ClientCard.vue      ← single client row/card (from MagicPatterns)
│   │   └── ClientStatusSelect.vue
│   ├── page/
│   │   ├── StepNav.vue         ← left sidebar: step list + progress bar
│   │   ├── StepEditor.vue      ← center panel: textarea + action buttons
│   │   └── StepOutput.vue      ← right panel: streamed output display
│   └── folder/
│       └── FolderTable.vue     ← folder list table (from MagicPatterns)
└── ui/
    ├── AppSidebar.vue          ← already exists, keep
    └── AppBottomBar.vue        ← already exists, keep
```

### Tasks

- [ ] Create `components/base/BaseStatusBadge.vue`
- [ ] Create `components/feature/client/ClientCard.vue` (MagicPatterns)
- [ ] Create `components/feature/client/ClientStatusSelect.vue`
- [ ] Create `components/feature/folder/FolderTable.vue` (MagicPatterns)
- [ ] Create `components/feature/page/StepNav.vue` (MagicPatterns)
  - Props: `steps`, `activeIndex`
  - Emits: `select(index)`
- [ ] Create `components/feature/page/StepEditor.vue` (MagicPatterns)
  - Uses `useGeneration()` internally
  - Props: `activeStep`
- [ ] Create `components/feature/page/StepOutput.vue` (MagicPatterns)
  - Props: `output`, `isGenerating`, `activeStep`
  - Emits: `commit`, `discard`
- [ ] Reduce `pages/pages/[id].vue` template to ~40 lines (mount 3 panels + wire composables)
- [ ] Move `FrameworkPickerModal.vue` → `components/feature/page/`
- [ ] Move `StepContextModal.vue` → `components/feature/page/`

### Verification checklist
- [ ] Full generate → refine → commit flow works end to end
- [ ] Step navigation works (sidebar clicks update center + right panels)
- [ ] Progress bar updates on commit
- [ ] Modal (guided context) still opens and confirms correctly
- [ ] Output expand modal still works

---

## Phase 4 — Cleanup stragglers
**Status: 🔲 TODO**
_Prerequisite: Phase 3 verified_

### Tasks

- [ ] Remove `app/pages/clienti/` directory (Italian duplicate of `clients/`)
  - Confirm `dashboard.vue` redirect points to `/clients` not `/clienti` first
- [ ] Move all remaining inline TypeScript types from pages into `app/types/app.types.ts`
- [ ] Audit `app/pages/pages/new.vue` — extract framework fetch into a composable
  (`useFrameworks.ts` — reusable if a framework picker appears elsewhere)
- [ ] Add `app/utils/` barrel export (`index.ts`) if import paths become verbose
- [ ] Remove `app/pages/about.vue` if unused
- [ ] Final audit: grep for `useSupabaseClient()` in `app/pages/` — should return zero results

### Verification checklist
- [ ] Full app smoke test: login → client list → client detail → new page → editor
- [ ] `nuxi typecheck` passes clean
- [ ] No orphaned imports or unused files

---

---

## Phase 3 addition — Public layout + homepage
**Status: 🔲 TODO — part of Phase 3 redesign**
_Prerequisite: Design system tokens established in Phase 3_

### Context
PageCraft has a public-facing area (`/` and `/login`) outside the protected app shell.
The separation already exists architecturally: `default.vue` is the protected shell,
`publicLayout.vue` is the public shell. Neither has been designed yet.

This is in scope for the redesign milestone. The public side must follow the same
design system and architecture as the app — not be treated as a separate concern.

### Scope for this milestone
Minimal login gate: brand, tagline, login CTA. No marketing copy, no features list.
This is honest for where the product is. Full landing page is post-V1.

### Files in scope
- `app/layouts/publicLayout.vue` — give it a proper designed shell
- `app/pages/index.vue` — stays under 20 lines, zero logic except the auth redirect
- `app/pages/login.vue` — review and align with new design system

### Architecture rules
- `publicLayout.vue` lives in `layouts/` — it IS a layout shell, not a feature component
- `index.vue` must stay thin: `definePageMeta`, auth redirect, one template block
- No composables needed — pure UI, no data fetching
- Must use the same CSS variables / design tokens as the app

### Verification checklist
- [ ] Logged-out user sees the designed homepage
- [ ] Login CTA navigates to `/login`
- [ ] Logged-in user is redirected to `/dashboard` (no flash of homepage)
- [ ] Design tokens match the app shell exactly

---

## Notes for Claude Code

- The `server/` directory is out of scope. Do not modify any API routes.
- `prisma/` is out of scope.
- `useClientFields.ts` is already well-structured — Phase 2 should not touch its logic,
  only potentially its import of `formatISODate` (already done in Phase 1).
- The `pages/pages/new.vue` multi-step form is complex — treat it as lower priority
  within Phase 2. The fetch logic there is straightforward but the component is large.
- When in doubt about whether logic belongs in a composable vs a component,
  the rule is: if two different components could ever need it, it's a composable.

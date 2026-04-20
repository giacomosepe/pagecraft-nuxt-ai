# Batch 1 — App Shell And Navigation

## Goal

Create the shared structural foundation for the restyling so every authenticated page inherits the same layout, spacing rhythm, navigation behavior, and top-level visual language.

## Pages And Components In Scope

- `app/layouts/default.vue`
- `app/layouts/auth.vue`
- `app/components/AppSidebar.vue`
- `app/components/AppBottomBar.vue`
- global page container patterns used by `clienti`, `progetti`, `folders`, and editor pages

## Main Refactor Outcomes

- Replace ad hoc page wrappers with one consistent app shell
- Define a reusable content container for page width, padding, and responsive spacing
- Restructure sidebar and bottom navigation into shared navigation config instead of repeated route literals
- Normalize active states, section headers, and bottom utility actions
- Establish the core visual tokens to be reused by all later batches: surfaces, borders, shadows, radii, spacing, and heading hierarchy

## Explicit Substreams

### Sidebar

- redesign desktop navigation hierarchy
- define section titles, active states, and utility actions
- remove duplicated route literals where possible

### Main Layout

- define the authenticated shell, content width, scroll behavior, and page padding
- create reusable page header and container primitives
- align mobile shell behavior with desktop intent

## Components To Extract

- `AppShell`
- `AppSidebarSection`
- `AppNavItem`
- `PageContainer`
- `PageHeader`

## Architectural Rules

- Layout owns shell chrome only
- Pages stay thin and should compose feature workspaces instead of recreating spacing and headers
- Route definitions for nav should live in one shared config source
- Mobile and desktop nav must reflect the same information architecture

## Figma Inputs Needed

- Main authenticated shell
- Sidebar states
- Mobile nav or compact navigation states
- Page header variants

## Exit Criteria

- All authenticated pages render inside the same shell and spacing system
- Sidebar and bottom nav no longer contain duplicated visual logic
- Page-level wrappers are reduced to orchestration only
- We can build later pages without re-deciding basic layout structure

## Risks To Watch

- Breaking route aliases between `/clienti` and `/clients`
- Styling one page in isolation instead of defining reusable shell rules
- Leaving mobile nav visually detached from desktop nav

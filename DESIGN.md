# PageCraft — Design Decisions Log

This file is the single written record of design decisions for PageCraft.
It exists to prevent drift: when building a new surface, check here before
picking any spacing, radius, or color value. If a decision isn't here, add it.

**Source of truth hierarchy:**
1. This file — why a decision was made
2. `app/assets/css/tokens.css` — what the value is
3. Figma file `cyyTo3teV9NiScXR1b2uHY` — what it looks like

Rule: never use a raw Tailwind value or hex in a component. Always go through a token.

---

## Typography

**Font:** Inter Variable (self-hosted, `/public/fonts/inter/InterVariable.woff2`)
- Chosen to match the Figma file. Variable font covers the full weight axis (100–900) in one file.
- `-webkit-font-smoothing: antialiased` applied globally — Inter renders heavier without it on macOS.

**Size scale** (defined as `--text-*` in tokens.css):
| Token | Value | Usage |
|---|---|---|
| `--text-xs` | 10px | Labels, badge text, sidebar counts |
| `--text-sm` | 12px | Sidebar nav items, table column headers |
| `--text-base` | 14px | Body text, table row content, field values |
| `--text-lg` | 17px | Section headings, page subtitles |
| `--text-xl` | 20px | Page headings (h1) |
| `--text-2xl` | 24px | Large headings (rarely used) |

- Scale is slightly compressed vs standard Tailwind (14px body, not 16px). Intentional:
  data-dense productivity UI, not a marketing site.
- Field labels use `--text-xs` at `font-weight: 500` with `letter-spacing: 0.06em` and
  `text-transform: uppercase`. This is the "meta label" style shared by section titles,
  table headers, and field labels.

---

## Color

**Brand:** Violet — `#7c3aed` (Tailwind violet-600). Full ramp in tokens as `--color-brand-*`.
- Violet was chosen over common blue/purple alternatives because it reads as "smart tool"
  without being cold.
- Used for: CTAs, active sidebar state, focus rings, primary buttons.

**Semantic surface tokens** (never use raw Tailwind slate-* in components):
| Token | Value | Usage |
|---|---|---|
| `--color-page-bg` | slate-50 | App background |
| `--color-surface` | white | Cards, sidebar, panels |
| `--color-surface-subtle` | slate-50 | Table header rows, hover states |
| `--color-border` | slate-200 | Default borders, dividers |
| `--color-border-subtle` | slate-100 | Hairlines, bottom nav separator |
| `--color-text-primary` | slate-900 | Headings, primary content |
| `--color-text-secondary` | slate-600 | Labels, body text, nav items |
| `--color-text-muted` | slate-500 | Meta text, timestamps |
| `--color-text-placeholder` | slate-400 | Placeholder text, empty states |

**Status colors** — always use semantic tokens, never raw hex:
- In progress / info → `--color-status-progress-*` (blue tones)
- Complete / success → `--color-status-complete-*` (emerald tones)
- Draft / warning → `--color-status-draft-*` (amber tones)
- Neutral / archived → `--color-status-neutral-*` (slate tones)

Status rendering goes through `BaseStatusBadge.vue` + `utils/status.ts`.
Never render a raw status string directly in a template.

---

## Spacing

**Base unit:** 4px (standard Tailwind). All spacing should be multiples of 4.

**Key spacing decisions:**
| Context | Token | Value | Rationale |
|---|---|---|---|
| Section gap (between page sections) | `--space-section` | `20px` | 32px (space-y-8) was too airy — made pages feel unfinished and unrelated |
| Field grid row gap | `--space-field-gap` | `12px` | Tight enough to read fields as a group, not a standalone form |
| Field grid column gap | `--space-field-col-gap` | `24px` | Half the old 32px — enough separation without fields appearing unrelated |
| Card internal padding | *(use px-6 py-5)* | `24px / 20px` | Matches Figma workspace surface spec |
| Table row padding | *(use px-6 py-3.5)* | `24px / 14px` | Comfortable for scanning without wasted height |

> **Why spacing tokens matter:** The client detail page was built with `gap: 22px 32px`
> and `space-y-8` without a token anchor. Each value was a developer guess. Adding
> `--space-section` and `--space-field-gap` means one change here tightens every
> detail page simultaneously.

---

## Border Radius

**Scale** (defined as `--radius-*` in tokens.css):
| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | 4px | Tight chips, small inline tags |
| `--radius-md` | 6px | Buttons, inputs, nav items |
| `--radius-lg` | 12px | Cards, workspace panels, detail sections |
| `--radius-full` | 9999px | Status badges (pill shape) |

**Critical rule:** Surface cards use `--radius-lg` (12px). Not 28px.
- `rounded-[28px]` appears in `BaseDetailSection`, `BaseWorkspaceSurface`, and
  `FormSectionCard` — this is a drift artifact from an early design pass that made
  surfaces feel like marketing cards. 12px is the correct value for a productivity tool.
- Fix: replace all `rounded-[28px]` with `rounded-xl` (which resolves to `--radius-lg`).

---

## Component Conventions

**Layer hierarchy:**
```
Tokens (tokens.css)
  └── Base components (app/components/base/)
        └── Feature components (app/components/feature/)
              └── Pages (app/pages/) — wire only, no layout logic
```

**Base components that exist:**
- `BasePageContainer` — page-level width constraint (size: md / lg / xl / full)
- `BasePageHeader` — title + optional description + actions slot
- `BaseDetailSection` — bordered card wrapper for detail page sections
- `BaseWorkspaceSurface` — bordered card for list/table surfaces with toolbar + footer slots
- `BaseStatusBadge` — renders any status key through statusColor/statusLabel maps
- `BaseStateMessage` / `BaseWorkspaceState` — loading and empty states
- `FormSectionCard` — section card with optional header for form pages
- `FormActionsFooter` — sticky-ish save/cancel footer for edit forms

**Base components still needed:**
- `BaseFieldGrid` — 2-column field grid using `--space-field-gap` and `--space-field-col-gap`.
  Should replace the ad-hoc `.client-detail-grid` pattern currently duplicated across
  the client detail page and any future entity detail pages.

**Inputs in detail/edit pages:**
- Style: borderless, transparent background, bottom border only (`border-bottom: 1px solid transparent`)
- On hover: `--color-border` (slate-200)
- On focus: `--color-brand` (violet-600)
- Font size: `--text-base` (14px)
- This style communicates "this is editable" without the heaviness of a full input box.
  Keep it — it is intentional and correct for read/write hybrid views.

---

## Save / Dirty State

- The "Salva modifiche" button must be visible at all times on edit-capable detail pages,
  not anchored to a specific section.
- Dirty detection: `JSON.stringify(currentPayload) !== initialSnapshot`. Correct approach —
  no form library needed for this use case.
- When not dirty: `opacity-40`, `variant: soft`. When dirty: full opacity, `variant: solid`.
- **Known issue to fix:** currently the button lives inside the REFERENTE section header.
  It should be in `BasePageHeader`'s actions slot so it is always visible regardless of
  scroll position.

---

## Detail Page Layout Pattern

The correct structure for any entity detail page (client, project, folder):

```
BasePageContainer
  ├── Back link (NuxtLink, text-sm, muted)
  ├── BasePageHeader
  │     ├── title: entity name
  │     ├── description: last updated date
  │     └── actions: primary CTA + save button (if editable) + danger action
  ├── UAlert (transition notices, errors — conditional)
  └── div.space-y-[--space-section]
        └── BaseDetailSection (one per logical group)
              ├── header slot: section title
              └── default slot: BaseFieldGrid or custom content
```

Section groups for a client: ANAGRAFICA, DATI AZIENDALI, LEGALE RAPPRESENTANTE, REFERENTE, PROGETTI.
Section groups for a project (folder): DETTAGLI PROGETTO, DOCUMENTI.

---

## On Overrides and Exceptions

Overrides and exceptions accumulate. Each one seems reasonable in isolation;
together they produce code that is hard to read, hard to change, and hard to
explain to someone new. This applies to CSS, component props, and template
structure equally.

**The test:** if you find yourself adding a modifier class, a boolean prop, or
a conditional slot to handle one specific case, stop. Ask whether that case
actually belongs inside the component at all. Usually it doesn't — it belongs
adjacent to it, or in a different component entirely.

**Concrete example — the address block:**
The client detail page has an address field that needs its own internal
layout (street / city / provincia + CAP). The temptation is to make
`BaseFieldGrid` support a full-width override for it. That is the wrong
answer. The address block is not a field — it is a small layout of fields.
It should sit *outside* `BaseFieldGrid` as its own `<div>`, not inside it
as an exception. The grid stays clean; the address block owns its own layout.

**The rule:**
A base component does one thing. When a child doesn't fit cleanly,
the child doesn't belong inside that component. Restructure the parent
template rather than adding an escape hatch to the component.

**In practice for detail pages:**
```
✓  BaseFieldGrid   ← 2-col grid, uniform fields only, no exceptions
✓  <div> block     ← address sub-layout, sits after the grid, not inside it
✗  BaseFieldGrid with :full-width-slot prop  ← override, avoid
✗  .field--full modifier class               ← override, avoid
```

This also applies to tokens. If a one-off spacing value appears in a
component, it either belongs in the token scale or the component is
doing something it shouldn't. Raw values like `gap: 22px` or
`margin-top: 22px` that don't map to any token are a signal that a
design decision was never made — just guessed.

---

## What Not To Do

- Never use `rounded-[28px]` — drift artifact. Use `rounded-xl` (12px via `--radius-lg`).
- Never hardcode `gap: 22px` or `gap: 32px` in a field grid — use `--space-field-gap` and `--space-field-col-gap`.
- Never put `space-y-8` between page sections — use `space-y-[--space-section]` (20px).
- Never render a status string directly — always go through `BaseStatusBadge`.
- Never build a new detail page without first sketching the field layout and checking this file.
- Never put the save button inside a section — it belongs in `BasePageHeader` actions.

---

## Changelog

| Date | Decision | Reason |
|---|---|---|
| 2026-05-08 | Created this file | Reverse-engineered from existing token and component files. Detail pages were built without a design reference — this file is the fix. |
| 2026-05-08 | Added `--space-section`, `--space-field-gap`, `--space-field-col-gap` to tokens.css | Spacing was hardcoded in components as developer guesses. Tokens allow global correction from one place. |
| 2026-05-08 | Designated `rounded-[28px]` as a drift artifact to be replaced with `rounded-xl` | 28px radius comes from an early design pass. 12px (`--radius-lg`) is correct for productivity surfaces. |
| 2026-05-08 | `--color-page-bg` changed from `#f8fafc` (slate-50) to `#fefefe` | slate-50 reads as noticeably grey on calibrated screens next to white cards. `#fefefe` preserves card separation without a visible tint. |
| 2026-05-08 | Added `--color-required: #ef4444` (red-500) | Required field marker (`*`) must be red — universal convention, instantly readable. Amber was considered and rejected. Violet was rejected — reserved for CTAs only. |
| 2026-05-08 | Required field pattern: `LABEL *` with `*` in `--color-required` | Decided from Figma mockup. The `*` sits immediately after the label text, same line, separated by a space. Applied consistently across all entity detail pages. |
| 2026-05-08 | Codice Fiscale removed from client entity UI | Partita IVA is the primary fiscal identifier for companies. Codice Fiscale is redundant for the client entity — it remains in the DB but is not surfaced. Codice Fiscale stays on LEGALE RAPPRESENTANTE (person, always correct). |
| 2026-05-08 | Contact fields (Referente, Email referente, Telefono referente) use a 3-column row | Contact fields are a logical group. 3-column layout communicates grouping without a separate section card. Row sits below the main ANAGRAFICA grid, separated by a 1px divider. |
| 2026-05-08 | Figma reference frame: node 123:2 in file `cyyTo3teV9NiScXR1b2uHY` | Client detail page redesign. All detail section decisions for clients, projects, and documents derive from this frame. |

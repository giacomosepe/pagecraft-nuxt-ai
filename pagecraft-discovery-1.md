# PageCraft — Architecture Discovery Document
**Version:** 1.3  
**Date:** March 26, 2026 (amended March 27 + updated March 30, 2026)  
**Status:** ARCHITECTURAL REFERENCE ONLY — do not use for build order or issue tracking  
**Author:** Giacomo Sepe (with AI PM assist)

> **⚠️ Claude Code: READ THIS FIRST**
> This document is the architectural source of truth for:
> - Step types (type_a, type_b, type_c) — Section 3
> - Prompt architecture (one call per step, 4-level hierarchy) — Section 4
> - Data model decisions — Section 6
>
> This document is OUT OF DATE for:
> - Issue list (Section 10) — all issues are now in Linear, use Linear
> - Step count: Patent Box has 7 steps not 8 (Relazione Tecnica is now a separate framework)
> - Page creation flow: 3-step flow is live (client → framework → project name)
> - Build status: ARKADIA-88, 89, 90, 91, 94 are Done and merged
>
> For current build state: read `claude.md` in the repo root.
> For current issues: read Linear directly or ask the PM coach.

> **Amendment — March 27, 2026 (ARKADIA-89 implementation):**
> During implementation of the Section 9 page creation flow, a UX issue was identified:
> the specified 4-step order (client → folder → framework → title) presents an empty
> folder list on the first visit for every new engagement, requiring users to always
> toggle to "create new" before they can proceed. A revised 3-step flow has been proposed
> to the PM: **client → framework → project name** (where project name creates the folder
> and seeds the title, with existing folders surfaced as quick-select options).
> Backend (`create.post.ts`) is updated and flow-order-independent. Frontend is
> implemented at 4 steps pending PM decision. See ARKADIA-89 comment for full rationale.

---

## 1. Context: What Triggered This Document

This document was written before touching any code or Linear issues following a user discovery session on March 26, 2026. The session revealed a fundamentally different mental model for how the 8 Patent Box steps should work. Rather than treating all steps as AI generation tasks, the actual document structure — confirmed by reading all 8 Ministry-defined template files — shows three distinct step types requiring different UX and data handling.

**The V0 issues already created in Linear (ARKADIA-85, ARKADIA-86, ARKADIA-87) are based on the old model and must be revised after this document is approved.**

---

## 2. What We Learned: Key Insight

The original PageCraft model treated every step the same way:

> User opens context modal → free text prompt → AI generates → user commits

After reading the actual Ministry templates and walking through the user journey with a practitioner (the person who currently writes these documents manually), the real structure is:

> **Most of the document is deterministic data, not AI-generated prose.**

Of the 8 sections, only 4–5 require substantive AI-assisted writing. The rest is structured data entry that maps directly to fixed or dynamic template fields. This changes the architecture significantly — and simplifies it.

---

## 3. The Three Step Types (Discovery Output)

### Type A — Pure Form Fields (Steps 1 & 2)

**Steps:** Intestazione (1), Premessa (2)

**What the template actually contains:**
- Step 1 (Intestazione): Company name, legal rep name, tax year, normative references (fixed legal text — never changes)
- Step 2 (Premessa): Two fillable fields — company name (`XXXXXXXX`) and tax year (`XXXXX`) — embedded in fixed Ministry-mandated prose

**Implication:** No AI needed. No generation call. The user either fills in a form field (which maps directly to a placeholder in the template) or the field is auto-populated from the client record already in the database.

**UX flow:** Step opens → form fields pre-filled from client record → user verifies → commits → done.

**Data model:** `form_schema` on `framework_steps` defines the fields. `form_data` on `steps` stores the filled values. No `generations` record created.

---

### Type B — Dynamic Form Fields (Step 3)

**Step:** Struttura Partecipativa (3)

**What the template actually contains:**
- Historical company register data (Visura storica)
- Current period ownership structure — shareholders, board members, subsidiaries
- Extraordinary events (mergers, acquisitions, IP transfers)
- A **pie chart** of shareholder percentages
- Optional: Visura PDF from Creditsafe or similar (paste/attach)

**Key complexity:** The number of shareholders, subsidiaries, and associated companies is variable. One client may have 1 shareholder; another may have 4 shareholders, 2 subsidiaries, and 1 associated company. The form must handle N-of-something, not a fixed field set.

**Implication:** Still no AI generation needed for the prose itself — it's structured data rendered into a template pattern. But the UI must support dynamic repeating field groups (add shareholder, remove shareholder, etc.).

**Pie chart:** Generated client-side from the shareholder percentage data already entered. Not AI-generated. Rendered as a chart in the document on export.

**Visura PDF:** User attaches the PDF from Creditsafe. On export, either embedded as an attachment or noted as "see attached." This is a file upload, not an AI task. Can be done manually after export if embedding is complex — not a blocker.

**UX flow:** Step opens → pre-filled data from client record (shareholders, board members already in `clients` table) → user adds/removes/edits repeating groups → pie chart auto-renders from percentages → user attaches Visura PDF (optional) → commits.

**Data model:** `form_schema` defines the repeating group structure. `form_data` stores the array of shareholders/subsidiaries as JSONB (already supported by schema). Chart generated at render time from form_data, not stored separately.

---

### Type C — Guided AI Generation (Steps 4–8)

**Steps:** Attività Rilevanti (4), Attività Commissionate (5), Modello Organizzativo (6), Relazione Tecnica (7), Funzioni Rischi Beni (8)

**What the templates actually contain:**
Each step has a clear set of named sub-sections (paragraphs), each requiring specific factual content:

| Step | Sub-sections (paragraphs) |
|------|--------------------------|
| 4 — Attività Rilevanti | Attività rilevanti description, Natura di investitore, Operazioni con imprese associate |
| 5 — Attività Commissionate | Description of commissioned activities, contract terms, investor nature proof |
| 6 — Modello Organizzativo | Organigramma, Dotazioni aziendali |
| 7 — Relazione Tecnica | Trattazione titolo, Attività rilevanti svolte, Stato dell'arte, Gantt, Team, Materiali, Fasi sviluppo, Problematiche tecniche, Situazione futura, Attività tutela, Attività commissionate |
| 8 — Funzioni Rischi Beni | Processi/funzioni/responsabili, Cespiti, Rischi assunti |

**Implication:** The paragraph structure is fixed and known in advance (baked into the framework). The user does not invent the structure — they provide the facts, and AI writes each section's prose from those facts.

---

## 4. The Prompt Architecture (Agreed Design)

Based on the discovery session and AI capability analysis, we adopt a **single-generation-per-step model** with a 4-level context hierarchy:

```
Level 1 — Framework prompt (system, baked in, never shown to user)
  └─ Level 2 — Document prompt (user, free text + file uploads, applies to all steps)
       └─ Level 3 — Step prompt (user, step-scoped facts + optional files)
            └─ Level 4 — Paragraph instructions (system, baked into framework_steps)
```

**Critical design decision:** Level 4 (paragraph structure) lives inside the system prompt as instructions, **not** as separate generation calls. One API call per step, not one per paragraph.

### Why one call per step (not per paragraph)

- Full context visible in one call — AI doesn't lose thread between paragraph calls
- 4–10x fewer API calls per document
- Anti-hallucination instruction `"Do not add information not present in the input"` applies to the whole step at once
- User reviews and refines the full step output before committing — cleaner UX

### The system prompt template structure (Type C steps)

```
ROLE + FRAMEWORK RULES
[Level 1 — baked into framework_steps.system_prompt_template]

COMPANY CONTEXT
[Auto-built from clients record via useClientFields composable]

DOCUMENT CONTEXT
[Level 2 — user's document-level notes + extracted text from uploaded files]

STEP-SPECIFIC INPUT
[Level 3 — user's answers to structured input fields for this step]

INSTRUCTION
Write the [Step Name] section of the Patent Box documentation.
Structure your response with the following sub-sections, in order:
  1. [Sub-section name]: [what it must cover]
  2. [Sub-section name]: [what it must cover]
  ...
Ground every claim in the facts provided above.
Do not add information not present in the input.
Write in formal Italian, third person, present tense.
```

### Input fields (Level 3) replace free-text userContext

Instead of a generic free-text `userContext` string, each step gets a **structured set of input fields** defined in `framework_steps.form_schema`. These are specific questions whose answers feed directly into the generation prompt.

Example for Step 4 (Attività Rilevanti):
- What R&D activities were conducted? (text area)
- What intangible assets are being protected? (text area)
- Were any activities conducted with associated companies? (yes/no + detail)
- What were the key results? (text area)

This structured input is then assembled into a coherent `userContext` block before the API call — replacing the current unstructured modal.

---

## 5. Revised Step Type Summary

| Step | Name | Type | AI? | Form Fields | Dynamic? |
|------|------|------|-----|-------------|----------|
| 1 | Intestazione | A — Pure form | No | Company name, legal rep, tax year | No |
| 2 | Premessa | A — Pure form | No | Company name, tax year | No |
| 3 | Struttura Partecipativa | B — Dynamic form | No | Shareholders[], subsidiaries[], board members[], pie chart | Yes (repeating) |
| 4 | Attività Rilevanti | C — Guided AI | Yes | ~5 structured fields | No |
| 5 | Attività Commissionate | C — Guided AI | Yes | ~4 structured fields | No |
| 6 | Modello Organizzativo | C — Guided AI | Yes | ~4 structured fields | No |
| 7 | Relazione Tecnica | C — Guided AI | Yes | ~8 structured fields (most complex step) | No |
| 8 | Funzioni Rischi Beni | C — Guided AI | Yes | ~4 structured fields | No |

---

## 6. Impact on Data Model

### What changes

**`framework_steps` table** — needs one new column:
- `step_type` enum: `'form' | 'dynamic_form' | 'ai_generation'`

**`framework_steps.form_schema`** — already exists as JSONB. Now becomes the authoritative definition of input fields per step. Must be populated for all 8 steps (currently only partially used).

**`steps.form_data`** — already exists as JSONB. Stores user's answers to the structured input fields. For Type B steps, stores the array of shareholders/subsidiaries.

**`steps.user_context`** — repurposed. For Type C steps, this stores the assembled prompt-ready block built from `form_data`. For Type A/B steps, this is null.

**`generations` table** — unchanged. Only created for Type C steps.

### What does NOT change

- `steps.committed_output` — stores the final committed text for all step types
- `steps.status` flow — PENDING → IN_PROGRESS → COMMITTED still valid for all types
- Security architecture — no changes
- `mutate` and `pages/create` routes — no changes
- `useClientFields` composable — no changes, still used to build company context

### What gets removed / simplified

- The `StepContextModal` as currently built is replaced by a **step-type-aware input panel** in the three-panel layout. The modal approach (open → fill → confirm) is replaced by an inline form that is always visible in the left panel for the active step.
- `/api/generations/premessa` (ARKADIA-85) — **no longer needed**. Step 2 is Type A: no generation call, just form fill.
- The `userContext` free text field in the current modal — replaced by structured `form_data` fields.

---

## 7. Impact on Linear Issues

### Cancel / revise immediately

| Issue | Action | Reason |
|-------|--------|--------|
| ARKADIA-85: Build /api/generations/premessa | **Cancel** | Step 2 is Type A — no AI generation needed |
| ARKADIA-86: Wire step 3 shareholder data into AI context | **Revise** | Step 3 is Type B — no AI generation, but still needs dynamic form + pie chart |
| ARKADIA-87: Build Word document export | **Keep, update inputs** | Still needed, but input structure changes |

### New issues needed (V0)

1. **Seed `form_schema` for all 8 steps** — define structured input fields per step in `framework_steps` table
2. **Build Type A step UI** — inline form fill for steps 1 & 2, auto-populated from client record
3. **Build Type B step UI** — dynamic repeating groups for step 3 (shareholders, subsidiaries), pie chart render
4. **Build Type C step UI** — structured input panel replacing StepContextModal for steps 4–8
5. **Update generation pipeline** — use structured `form_data` to assemble prompt instead of raw `userContext`
6. **Word export** — updated to handle all three step types correctly

---

## 8. Decisions — All Questions Answered (March 26, 2026)

**Q1 — Step 3 pie chart:**
Rendered as an actual image in the Word export, calculated from shareholder and subsidiary ownership percentages. **Decision: ownership data moves to the client profile page** (`clients/[id]/edit.vue`), not step 3. Step 3 reads from the client record and renders the chart — it does not collect the data. This keeps the step 3 UI clean and avoids duplicating data entry. V2 will add automatic extraction of this data from the Visura PDF when building the client profile. Schema of steps is unaffected.

**Q2 — Visura PDF:**
User attaches manually after export. The Word document notes "allegata separatamente" in section 3. No code needed for V0. Pagination issues are inherent to the PDF itself — not a product problem to solve.

**Q3 — Relazione Tecnica:**
Becomes a **completely separate document** with its own framework, its own prompt architecture, its own commit cycle. It is not embedded in the main Patent Box document. This is Option B: a second Page created by the user, linked to the same client and program folder. The main document's section 7 slot is handled by a brief placeholder or cross-reference on export. The Relazione Tecnica framework will be seeded as a second framework in the database alongside "Italian Patent Box."

**Q4 — File upload types:**
PDF is the primary format (market research, financial statements, technical docs, org charts). Word docs also accepted. Org charts are placed manually in the final Word document after export — not embedded programmatically in V0. Text extraction server-side via existing approach.

**Q5 — `form_schema` ownership:**
Eventually any user who creates a framework will own their `form_schema` definitions. Framework creation is already scaffolded in the database. No schema change needed now — but the design must not foreclose this. Confirmed V3 scope.

---

## 9. Schema Change — Folders as Program Containers

**Decision:** Add `client_id` and `program_name` to the `folders` table.

**Rationale:** Option B (Relazione Tecnica as a separate Page) requires a grouping concept above the Page level. Tax year is a weak grouping key — a client can run multiple Patent Box programs in the same year for different intangible assets. Program name (e.g. "Patent Box — Software Gestionale 2023") is the correct grouping key. This maps to how the work is actually sold and managed: discrete engagements, not calendar years.

**Migration:**
```sql
ALTER TABLE folders ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE SET NULL;
ALTER TABLE folders ADD COLUMN program_name TEXT;
```

Both columns nullable — no impact on existing folder records. No RLS policy changes required beyond ensuring `user_id` ownership check already in place continues to apply.

**Resulting data model:**
```
Client: Acme S.r.l.
  └── Folder: "Patent Box — Software Gestionale 2023"
        ├── Page: Patent Box Documentation  (framework: Italian Patent Box)
        └── Page: Relazione Tecnica         (framework: Relazione Tecnica)
  └── Folder: "Patent Box — Piattaforma E-commerce 2023"
        ├── Page: Patent Box Documentation
        └── Page: Relazione Tecnica
```

**UX change — page creation flow:**
The current flow (select framework → name document → optionally link client) must change to:

> Select client → Select or create program folder → Select framework → Name the document

Folder becomes a first-class step in page creation, not an afterthought. This is a UI change to `pages/new.vue` and the framework picker modal.

**⚠️ Implementation note (March 27, 2026):** A revised 3-step flow is under PM review —
see amendment note at top of document and ARKADIA-89 comments. Data model and backend
are unchanged; only step order and folder-naming UX are in question.

**`pages.client_id`** stays on the `pages` table — still useful for pages that exist outside a folder (edge cases, future flexibility).

**`pages.tax_year`** stays nullable — moves from being the grouping key to being a metadata field on the document (useful for the Premessa auto-fill).

---

## 10. New Issues Needed in Linear (V0 — updated after Q8)

These replace or supplement ARKADIA-85 (cancelled) and ARKADIA-86 (revised):

| # | Title | Scope |
|---|-------|-------|
| New | Add `client_id` + `program_name` to `folders` — migration + grants.sql update | Schema |
| New | Update page creation flow: client → folder → framework → title | UI |
| New | Seed `form_schema` for all 8 steps in `framework_steps` | Data |
| New | Seed Relazione Tecnica as second framework (steps TBD) | Data |
| New | Build Type A inline form UI for steps 1 & 2 | UI |
| ARKADIA-86 (revised) | Build Type B dynamic form UI for step 3 — reads from client record, renders pie chart | UI |
| New | Build Type C structured input panel for steps 4–8 (replaces StepContextModal) | UI |
| New | Update generation pipeline — assemble prompt from `form_data` fields, not raw `userContext` | Backend |
| ARKADIA-87 | Word export — updated to handle all three step types + new folder/program structure | Backend |

---

## 11. Exit Criterion for This Document

**Status: SIGNED OFF — March 26, 2026**

All questions answered. Decisions recorded. Linear issues ARKADIA-85 cancelled, ARKADIA-86 revised.

Next actions in order:
1. Create new Linear issues from the table in Section 10
2. Write the Prisma migration for the `folders` schema change
3. Update `grants.sql` with new columns
4. Seed `form_schema` for all 8 steps
5. Only then touch UI or generation code

**Do not touch schema or code before the Linear issues in Section 10 are created.**

---

*End of document. Next action: Giacomo reviews Section 5 and answers Section 8 questions.*

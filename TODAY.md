April 15 - 2026
Today we worked and closed the following

ENGNEER-92 —
  Step-type-aware input panel. Extended StepEditor.vue FormField interface
  with file, multiselect, repeatable_group, and conditional types. Added
  renderers for all new types (repeatable_group = collapsible bordered cards,
  add/remove, collapse at 3+). Removed userContext textarea, "Usa modulo
  guidato" button, openContextModal emit. Deleted StepContextModal.vue entirely.
  pages/[id].vue cleaned up accordingly.

ENGNEER-93 —
  Generation pipeline (form_data + cross-step context). Removed userContext
  from Zod schema, useGeneration interface, fetch bodies, and commit() data.
  Added serializeFormData() and buildPriorContext() helpers to create.post.ts.
  User message now assembled from form_data + prior committed steps.

ENGNEER-134 —
  Absorbed by ENGNEER-92 — pages/[id].vue was already a clean thin
  orchestrator after 92 merged. No separate merge needed.

ENGNEER-145 —
  FPB-4 Attività Rilevanti repeatable_group seed. Updated framework_steps
  form_schema for step 4. Re-ran seed.sql against Supabase DB.

Next up: ENGNEER-87 (Word export) — spec document attached in Linear.

---

March 30 - 2026 at 16:52
Today we worked and closed the following

ENGNEER-102 — 
  Fixed pages/new.vue framework step showing radio buttons instead
  of checkboxes. Root cause was a schema key mismatch: create-batch.post.ts
  expected frameworks: but the frontend sent pages:. Fixed by renaming the Zod
  schema key. Also simplified dashboard nav.

ARKADIA-96 — 
  Built /folders/[id].vue — the program/folder page showing a
  document list for a given folder, with the client context.

ARKADIA-95 — 
  Implemented client-centric navigation: the full flow dashboard →
  client → folder → page is now wired up and merged via PR #5.

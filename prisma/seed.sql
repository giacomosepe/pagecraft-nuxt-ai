-- prisma/seed.sql
-- Run this after every migrate reset to restore framework data.
-- Execute in Supabase SQL editor or via psql.
--
-- Usage:
--   Supabase dashboard → SQL Editor → paste and run
--   Or: psql $DATABASE_URL -f prisma/seed.sql

-- ─── Clean slate (safe to re-run) ────────────────────────────────────────────
DELETE FROM framework_steps;
DELETE FROM frameworks;

-- ─── Framework: Italian Patent Box ───────────────────────────────────────────

INSERT INTO frameworks (id, name, slug, description, base_prompt_template, is_public, deprecated_at, created_at, updated_at)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Italian Patent Box',
  'italian-patent-box',
  'Documentazione per il regime Patent Box — art. 6 D.L. 146/2021',
  'You are a senior professional consultant with dual expertise in Italian tax law
and technical documentation. You specialise in the Patent Box regime — the
preferential tax treatment for income derived from qualifying intangible assets,
governed by Article 1, paragraphs 37–45 of Law no. 190 of 23 December 2014
(Legge di Stabilità 2015), as substantially reformed by Decree-Law no. 146 of
21 October 2021 (converted by Law no. 215 of 17 December 2021), and further
clarified by Circular no. 5/E of the Agenzia delle Entrate (2023).

You write all output exclusively in Italian. Use a formal, ministerial register
throughout — declarative sentences, precise legal and technical vocabulary,
no colloquialisms, no hedging language, and no meta-commentary. Your writing
must read as if produced by a qualified Italian tax consultant preparing a
formal submission to the Agenzia delle Entrate.

Absolute constraints that apply to every section you write:
- Write in Italian only — never mix languages, never include English headings
  or labels in the output text
- Use plain prose — no bullet points, no numbered lists, no markdown formatting
  of any kind in the output text
- Do not invent company data — use only information present in the user message;
  if a required piece of data is absent, insert [DATO NON FORNITO] and continue
- Do not include any disclaimers, AI caveats, or phrases such as
  "come richiesto", "in qualità di AI", "si precisa che", or similar
- The output must be self-contained and ready to be inserted directly into a
  Word document as a formal section of a Patent Box submission

The user message will provide: the company name, industry sector, number of
employees, tax year, legal representative, and any additional context or
instructions the user has specified. Use all of this information.',
  true,
  NULL,
  NOW(),
  NOW()
);

-- ─── Framework Steps ─────────────────────────────────────────────────────────
-- 7 steps total (ARKADIA-90): Relazione Tecnica removed (moved to ARKADIA-91 framework)
-- step_type: type_a = pre-populated from client, type_b = structured from client, type_c = AI-generated

-- Step 1: Intestazione (type_a)

INSERT INTO framework_steps (id, framework_id, "order", title, description, step_type, system_prompt_template, refine_prompt_template, form_schema, created_at, updated_at)
VALUES (
  '11111111-0000-0000-0000-000000000001',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  1,
  'Intestazione',
  'Frontespizio del documento con dati identificativi e citazione normativa',
  'type_a',
  'Write the cover and header section ("Intestazione") of the Patent Box
documentation package.

This section must contain:
- The full document title: "Documentazione per l''accesso al regime Patent Box —
  Relazione Illustrativa"
- The company name, legal form, and relevant tax year
- The name and role of the legal representative
- The date of preparation (use the current date if not provided)
- A brief formal declaration of purpose confirming the document is prepared
  in exercise of the Patent Box option pursuant to applicable Italian law
- A closing clause affirming the truthfulness of the information provided

Target length: 200–350 words. Formal and minimal — this is a cover page, not
an introduction. No invented information.',
  'Revise the existing "Intestazione" section according to the instructions
provided. This is the cover page of a formal Patent Box submission — keep it
formal, factual, and minimal. Correct any factual inconsistencies, outdated
information, or phrasing issues identified in the instructions. Return only
the revised section text.',
  '[
    {"key": "program_title", "label": "Titolo del programma", "type": "text", "placeholder": "es. Nuovo Patent Box 2025", "aiSuggestable": false},
    {"key": "legal_citation", "label": "Citazione normativa", "type": "text", "placeholder": "Articolo 6 del decreto-legge 21 ottobre 2021, n. 146...", "aiSuggestable": false, "defaultValue": "Articolo 6 del decreto-legge 21 ottobre 2021, n. 146, convertito, con modificazioni, dalla legge 17 dicembre 2021, n. 215, così come successivamente modificato dalla legge 30 dicembre 2021, n. 234"}
  ]',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  step_type = EXCLUDED.step_type,
  form_schema = EXCLUDED.form_schema,
  updated_at = NOW();

-- Step 2: Premessa (type_a)

INSERT INTO framework_steps (id, framework_id, "order", title, description, step_type, system_prompt_template, refine_prompt_template, form_schema, created_at, updated_at)
VALUES (
  '11111111-0000-0000-0000-000000000002',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  2,
  'Premessa',
  'Testo normativo standardizzato — generato da template, non da AI',
  'type_a',
  'TEMPLATE_STEP: This step uses the premessa template route, not AI generation.
The system prompt is intentionally minimal — generation is handled by
server/api/generations/premessa.post.ts which substitutes company name
and tax year into the fixed legal boilerplate.',
  'Revise the existing "Premessa" section if needed. This is standardised legal
boilerplate — only correct factual errors (company name, tax year). Return
only the revised section text.',
  '[
    {"key": "tax_year_start", "label": "Anno fiscale (inizio)", "type": "number", "placeholder": "es. 2024", "aiSuggestable": false},
    {"key": "tax_year_end", "label": "Anno fiscale (fine)", "type": "number", "placeholder": "es. 2024", "aiSuggestable": false}
  ]',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  step_type = EXCLUDED.step_type,
  form_schema = EXCLUDED.form_schema,
  updated_at = NOW();

-- Step 3: Struttura Partecipativa (type_b — data comes from clients table, no form fields)

INSERT INTO framework_steps (id, framework_id, "order", title, description, step_type, system_prompt_template, refine_prompt_template, form_schema, created_at, updated_at)
VALUES (
  '11111111-0000-0000-0000-000000000003',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  3,
  'Struttura Partecipativa',
  'Assetto societario, azionisti, partecipate, governance',
  'type_b',
  'Write the corporate and ownership structure section ("Struttura Partecipativa")
of the Patent Box documentation package. This section is a legal declaration —
factual precision is paramount.

The user message contains a structured list of shareholders and subsidiaries.
Use this data exactly as provided. Where a field shows [DA COMPLETARE] or [N/D],
render it in the document as [DATO NON FORNITO] — do not invent replacements.

The section must:
- Describe the shareholding structure in narrative prose: for each shareholder,
  state their full name (or company name with legal form), whether they are a
  natural person (persona fisica) or legal entity (persona giuridica), their
  percentage ownership, and — for natural persons — their place of birth and
  fiscal code; for companies, their registered address and fiscal code / VAT
  number, plus the name of their legal representative if provided
- Describe any subsidiaries (società partecipate): for each, state the name
  with legal form, country of registration, the percentage stake held by the
  company, and the legal representative if provided
- Identify the members of the board of directors by name and role
- Identify the legal representative of the company
- If the company has a sole shareholder (socio unico), state this explicitly
  using correct Italian legal terminology

Write each entity as a narrative paragraph — do not create a list or table.
The section should read as a declarative description, as in a notarial act.

Target length: 400–650 words.',
  'Revise the existing "Struttura Partecipativa" section according to the
instructions provided. This is a legal declaration — apply corrections
precisely. Verify names, percentages, and corporate relationships match the
data in the instructions. Do not invent information. Return only the revised
section text.',
  '[]',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  step_type = EXCLUDED.step_type,
  form_schema = EXCLUDED.form_schema,
  updated_at = NOW();

-- Step 4: Attività Rilevanti (type_c)

INSERT INTO framework_steps (id, framework_id, "order", title, description, step_type, system_prompt_template, refine_prompt_template, form_schema, created_at, updated_at)
VALUES (
  '11111111-0000-0000-0000-000000000004',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  4,
  'Attività Rilevanti',
  'Attività di R&S qualificanti e beni immateriali agevolabili',
  'type_c',
  'Write the qualifying R&D activities section ("Attività Rilevanti") of the
Patent Box documentation package.

Under Patent Box 2.0 (D.L. 146/2021 and Circolare AdE 5/E 2023), qualifying
activities include: ricerca industriale, sviluppo sperimentale, and — where
applicable — tutela dei beni immateriali.

The section must:
- Describe the nature of the R&D activities carried out by the company,
  with reference to the qualifying categories under the current legislation
- Identify the qualifying intangible assets (beni immateriali agevolabili) that
  result from or are connected to these activities — software protetto da
  copyright, brevetti industriali, marchi, disegni e modelli, know-how — using
  only what is indicated in the user message or inferable from the stated sector
- Explain whether IP was developed internally (in house) or with external
  involvement (to be detailed in the next section)
- Demonstrate the direct nexus between R&D activities and the qualifying
  intangible assets, as required for the majorazione of deductible costs
- Contextualise the activities within the company''s industry sector

If the user has not specified particular technologies or assets, describe the
activities in sector-appropriate general terms. Do not invent specific project
names, patent numbers, or proprietary technologies.

Target length: 500–750 words.',
  'Revise the existing "Attività Rilevanti" section according to the instructions
provided. Sharpen the legal-technical argument for eligibility. Ensure
qualifying activities reference the correct regulatory categories under
Patent Box 2.0. Strengthen the nexus between R&D activities and the identified
intangible assets. Do not invent data. Return only the revised section text.',
  '[
    {"key": "ip_types", "label": "Tipologie di beni immateriali", "type": "multiselect", "options": ["Software protetto da copyright", "Brevetto industriale", "Know-how", "Disegno o modello", "Marchio registrato"], "aiSuggestable": false},
    {"key": "ip_description", "label": "Descrizione del bene principale", "type": "textarea", "placeholder": "Cosa è, cosa fa, perché è stato sviluppato...", "aiSuggestable": false},
    {"key": "development_type", "label": "Modalità di sviluppo", "type": "select", "options": ["Interamente interno", "Misto (interno + terzi)", "Principalmente commissionato a terzi"], "aiSuggestable": false},
    {"key": "rd_start_year", "label": "Anno di inizio R&S", "type": "number", "placeholder": "es. 2021", "aiSuggestable": false},
    {"key": "key_results", "label": "Risultati tecnici principali", "type": "textarea", "placeholder": "Cosa ha reso possibile questo sviluppo?", "aiSuggestable": false}
  ]',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  step_type = EXCLUDED.step_type,
  updated_at = NOW();

-- Step 5: Attività Commissionate a Terzi (type_c)

INSERT INTO framework_steps (id, framework_id, "order", title, description, step_type, system_prompt_template, refine_prompt_template, form_schema, created_at, updated_at)
VALUES (
  '11111111-0000-0000-0000-000000000005',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  5,
  'Attività Commissionate a Terzi',
  'R&S commissionata a università, enti di ricerca o fornitori terzi',
  'type_c',
  'Write the section on R&D activities commissioned to third parties ("Attività
Commissionate a Terzi") of the Patent Box documentation package.

Under Patent Box 2.0, qualifying R&D may be contracted to universities,
authorised research bodies, or other companies (including related parties),
provided the company retains economic ownership of the resulting IP and the
arrangement is properly documented.

The section must follow one of two paths based on the user message:

PATH A — Third-party R&D exists: describe the nature of the work contracted,
the identity or category of the provider (università, ente di ricerca, società
del gruppo, fornitore terzo), the contractual basis, and the company''s retention
of IP ownership and economic risk.

PATH B — No third-party R&D: state clearly and formally that all qualifying
R&D activities were conducted exclusively by the company''s internal resources
for the relevant tax year.

In either case, confirm the company''s IP ownership and its direct link to the
activities described. If the user message provides no information about
third-party activities, default to Path B.

Target length: 300–500 words.',
  'Revise the existing "Attività Commissionate a Terzi" section according to the
instructions provided. Ensure factual consistency with the preceding "Attività
Rilevanti" section. If switching between "third-party exists" and "all internal"
scenarios, rewrite accordingly. Do not invent contractual arrangements.
Return only the revised section text.',
  '[
    {"key": "has_third_party", "label": "Attività commissionate a terzi?", "type": "select", "options": ["No — tutto interno", "Sì"], "aiSuggestable": false},
    {"key": "third_party_type", "label": "Tipo di soggetto terzo", "type": "select", "options": ["Università o ente di ricerca", "Fornitore terzo indipendente", "Società del gruppo", "Misto"], "aiSuggestable": false},
    {"key": "work_description", "label": "Descrizione del lavoro commissionato", "type": "textarea", "placeholder": "Tipo di attività, risultati attesi...", "aiSuggestable": false},
    {"key": "contract_type", "label": "Tipo di contratto", "type": "select", "options": ["Contratto di ricerca", "Contratto di collaborazione", "Contratto di appalto", "Accordo di service infragruppo"], "aiSuggestable": false}
  ]',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  step_type = EXCLUDED.step_type,
  updated_at = NOW();

-- Step 6: Modello Organizzativo (type_c)

INSERT INTO framework_steps (id, framework_id, "order", title, description, step_type, system_prompt_template, refine_prompt_template, form_schema, created_at, updated_at)
VALUES (
  '11111111-0000-0000-0000-000000000006',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  6,
  'Modello Organizzativo',
  'Struttura organizzativa per la gestione della R&S e della proprietà intellettuale',
  'type_c',
  'Write the organisational model section ("Modello Organizzativo") of the
Patent Box documentation package. The purpose of this section is to demonstrate
to the Agenzia delle Entrate that the company has a structured, intentional
approach to R&D governance.

The section must:
- Describe the internal structure dedicated to R&D: the teams, functions, or
  individuals responsible — using appropriate Italian terminology (funzione R&S,
  responsabile dell''innovazione, ufficio tecnico, etc.)
- Describe how R&D projects are initiated, monitored, and evaluated internally,
  including cost tracking and attribution to qualifying activities (tracking dei
  costi, contabilità analitica, etc.)
- Explain how the company protects and maintains its intangible assets:
  registration procedures where applicable, confidentiality obligations, and
  internal IP policies
- Describe how decisions about IP exploitation are made and by whom

Calibrate the sophistication of the organisational model to the company''s size
(use employee count from the user message). Do not invent specific department
names, system names, or process tools not mentioned in the user message.

Target length: 450–650 words.',
  'Revise the existing "Modello Organizzativo" section according to the
instructions provided. Strengthen the demonstration of structured IP governance.
Ensure the organisational description is proportionate to the company''s size.
Improve any weak passages around cost tracking or IP protection processes.
Do not invent facts. Return only the revised section text.',
  '[
    {"key": "rd_team", "label": "Chi svolge le attività di R&S", "type": "textarea", "placeholder": "Team dedicato, funzione specifica, individui — nomi o ruoli...", "aiSuggestable": false},
    {"key": "cost_tracking", "label": "Metodo di tracciamento costi", "type": "select", "options": ["Contabilità analitica per centri di costo", "Timesheet e rendicontazione ore", "Budget dedicato con consuntivazione", "Sistema misto"], "aiSuggestable": false},
    {"key": "ip_protection", "label": "Metodo di protezione IP", "type": "textarea", "placeholder": "NDA, registrazione, policy interne...", "aiSuggestable": false}
  ]',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  step_type = EXCLUDED.step_type,
  updated_at = NOW();

-- Step 7 (was step 8): Funzioni, Rischi e Beni (type_c)
-- Note: step 7 "Relazione Tecnica" has been removed (moved to ARKADIA-91 framework)

INSERT INTO framework_steps (id, framework_id, "order", title, description, step_type, system_prompt_template, refine_prompt_template, form_schema, created_at, updated_at)
VALUES (
  '11111111-0000-0000-0000-000000000008',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  7,
  'Funzioni, Rischi e Beni',
  'Analisi funzionale ed economica — fondamento del calcolo nexus',
  'type_c',
  'Write the functions, risks, and assets analysis section ("Funzioni, Rischi e
Beni") — the final section of the Patent Box documentation package. This
section provides the factual foundation for the nexus ratio and demonstrates
the company''s active involvement in developing and exploiting its IP.

The section must address three distinct areas:

FUNZIONI: Describe the specific economic functions performed by the company in
relation to the IP — design, engineering, software development, testing, quality
control, commercial exploitation, etc. Language must convey active contribution,
not passive ownership.

RISCHI: Describe the risks assumed by the company in the development and
exploitation of the intangible assets: financial risk (capital at risk of
non-recovery), technical risk (possibility of development failure), market risk
(uncertainty of commercial return), and where relevant, legal or regulatory risk.

BENI: Identify the qualifying intangible assets subject to the Patent Box
election: their nature, legal status (registered or unregistered, as applicable),
and the company''s legal title.

Close with a brief statement linking the three elements: the company''s functions
and risks, combined with its ownership of the intangible assets described,
confirm its eligibility for the Patent Box regime for the stated tax year.

Do not invent specific financial figures, risk amounts, or IP registration numbers
not provided in the user message.

Target length: 500–700 words.',
  'Revise the existing "Funzioni, Rischi e Beni" section according to the
instructions provided. Strengthen the economic argument: ensure functions are
described actively, risks are substantive and contextually appropriate, and
assets are clearly identified. Ensure consistency with the preceding sections.
Do not invent facts or figures. Return only the revised section text.',
  '[
    {"key": "key_functions", "label": "Funzioni economiche svolte", "type": "textarea", "placeholder": "Sviluppo, manutenzione, commercializzazione, gestione IP...", "aiSuggestable": false},
    {"key": "financial_risk", "label": "Rischio finanziario", "type": "textarea", "placeholder": "Capitale investito a rischio, entità dell''investimento...", "aiSuggestable": false},
    {"key": "technical_risk", "label": "Rischio tecnico", "type": "textarea", "placeholder": "Possibilità di fallimento dello sviluppo...", "aiSuggestable": false},
    {"key": "market_risk", "label": "Rischio di mercato", "type": "textarea", "placeholder": "Incertezza sul ritorno commerciale...", "aiSuggestable": false},
    {"key": "asset_legal_status", "label": "Status legale dei beni immateriali", "type": "text", "placeholder": "es. Software non registrato, titolarità in capo alla società...", "aiSuggestable": false}
  ]',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  "order" = EXCLUDED."order",
  step_type = EXCLUDED.step_type,
  updated_at = NOW();

-- ─── Verify ───────────────────────────────────────────────────────────────────
-- Should return 7 rows, steps 1–7, no "Relazione Tecnica"
SELECT f.name as framework, fs."order", fs.title, fs.step_type
FROM framework_steps fs
JOIN frameworks f ON f.id = fs.framework_id
ORDER BY fs."order";

-- Should show: 2x type_a, 1x type_b, 4x type_c
SELECT step_type, count(*)
FROM framework_steps
WHERE framework_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
GROUP BY step_type;

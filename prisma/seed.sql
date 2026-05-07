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
  '',
  '',
  '[
    {"key": "program_title", "label": "Titolo del programma", "type": "project_detail", "placeholder": "es. Nuovo Patent Box 2025", "required": true, "hint": "Collegato al titolo del documento."},
    {"key": "company_name", "label": "Ragione sociale", "type": "client_detail", "placeholder": "es. Acme S.r.l.", "required": true, "hint": "Collegato alla scheda cliente."},
    {"key": "tax_year", "label": "Anno di imposta", "type": "project_detail", "placeholder": "es. 2026", "required": true, "hint": "Collegato ai dettagli progetto."},
    {"key": "legal_representative", "label": "Legale rappresentante", "type": "client_detail", "placeholder": "es. Mario Rossi", "required": true, "hint": "Collegato alla scheda cliente."}
  ]',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  description            = EXCLUDED.description,
  system_prompt_template = EXCLUDED.system_prompt_template,
  refine_prompt_template = EXCLUDED.refine_prompt_template,
  form_schema            = EXCLUDED.form_schema,
  step_type              = EXCLUDED.step_type,
  updated_at             = NOW();

-- Step 2: Premessa (type_a)

INSERT INTO framework_steps (id, framework_id, "order", title, description, step_type, system_prompt_template, refine_prompt_template, form_schema, created_at, updated_at)
VALUES (
  '11111111-0000-0000-0000-000000000002',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  2,
  'Premessa',
  'Testo normativo standardizzato — generato da template, non da AI',
  'type_a',
  '',
  '',
  '[
    {"key": "tax_year", "label": "Anno di imposta", "type": "project_detail", "placeholder": "es. 2026", "required": true, "hint": "Collegato ai dettagli progetto."},
    {"key": "legal_representative", "label": "Legale rappresentante", "type": "client_detail", "placeholder": "es. Mario Rossi", "required": true, "hint": "Collegato alla scheda cliente."}
  ]',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  description            = EXCLUDED.description,
  system_prompt_template = EXCLUDED.system_prompt_template,
  refine_prompt_template = EXCLUDED.refine_prompt_template,
  form_schema            = EXCLUDED.form_schema,
  step_type              = EXCLUDED.step_type,
  updated_at             = NOW();

-- Step 3: Struttura Partecipativa (type_b — data comes from clients table, no form fields)

INSERT INTO framework_steps (id, framework_id, "order", title, description, step_type, system_prompt_template, refine_prompt_template, form_schema, created_at, updated_at)
VALUES (
  '11111111-0000-0000-0000-000000000003',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  3,
  'Struttura Partecipativa',
  'Assetto societario, azionisti, partecipate, governance',
  'type_b',
  '',
  '',
  '[
    {
      "key": "document_reference",
      "label": "Documento di riferimento",
      "type": "document_reference",
      "hint": "Collegamento a un documento di riferimento. La visualizzazione del link verrà gestita in un passaggio successivo.",
      "required": false
    },
    {
      "key": "visura_pdf",
      "label": "Visura Camerale (PDF)",
      "type": "file_upload_extraction",
      "hint": "Carica la Visura Camerale Storica in formato PDF. L''AI estrarrà automaticamente soci, partecipate e governance.",
      "required": false,
      "accept": [".pdf"]
    },
    {
      "key": "note_integrative",
      "type": "textarea",
      "label": "Note integrative (opzionale)",
      "placeholder": "Informazioni aggiuntive sulla struttura societaria non presenti nella visura...",
      "required": false
    }
  ]',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  description            = EXCLUDED.description,
  system_prompt_template = EXCLUDED.system_prompt_template,
  refine_prompt_template = EXCLUDED.refine_prompt_template,
  form_schema            = EXCLUDED.form_schema,
  step_type              = EXCLUDED.step_type,
  updated_at             = NOW();

-- Step 4: Attività Rilevanti (type_c)

INSERT INTO framework_steps (id, framework_id, "order", title, description, step_type, system_prompt_template, refine_prompt_template, form_schema, created_at, updated_at)
VALUES (
  '11111111-0000-0000-0000-000000000004',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  4,
  'Attività Rilevanti',
  'Attività di R&S qualificanti e beni immateriali agevolabili',
  'type_c',
  $sysprompt$Sei un esperto di fiscalità italiana specializzato nel regime Patent Box (art. 6 D.L. 146/2021 e Provvedimento AdE 15/02/2022).
Stai redigendo la sezione "Attività rilevanti, natura di investitore ed eventuale attività svolta con imprese associate" della Relazione illustrativa per {{company_name}}, anno di imposta {{tax_year}}.

Il consulente ha fornito le seguenti informazioni:
- Nome del progetto: {{project_name}}
- Tipo di attività: {{activity_type}}
- Contesto e tematica: {{context_description}}
- La sfida: {{challenge}}
- Obiettivi e risultati attesi: {{objectives}}
- Fasi di sviluppo: {{development_phases}}
- Risultati conseguiti: {{results_achieved}}
- Operazioni con imprese associate: {{associated_companies}}

Hai accesso ai documenti di contesto caricati dal consulente (business plan, report R&D, documentazione tecnica). Usa questi documenti come fonte primaria per fatti, dati finanziari, nomi e dettagli tecnici non presenti nei campi sopra.

Redigi la sezione in italiano formale e burocratico, strutturata nei seguenti paragrafi:

1. INTRODUZIONE — Sintesi del progetto e inquadramento normativo (tipo di attività, riferimento all'art. 5 del D.M. 26/05/2020 se innovazione tecnologica)
2. LA SFIDA — Contesto operativo prima del progetto, problemi da risolvere, obiettivi del management
3. IL PROGETTO — Descrizione tecnica delle fasi di sviluppo. Se disponibili, includi una tabella con cronoprogramma (DATA | FASE | DESCRIZIONE | TIPOLOGIA)
4. I RISULTATI — Benefici conseguiti, dati quantitativi, impatto operativo e finanziario
5. NATURA DI INVESTITORE — Chi detiene i diritti di sfruttamento economico del bene immateriale, chi sostiene i costi e assume i rischi, autonomia finanziaria e gestionale dell'impresa
6. OPERAZIONI CON IMPRESE ASSOCIATE — Solo se il campo corrispondente non è vuoto. Se vuoto, ometti completamente questa sezione.

Regole:
- Non inventare dati, nomi, cifre o date non presenti nei campi o nei documenti di contesto
- Se un'informazione è assente e non recuperabile dai documenti, scrivi [DA COMPLETARE]
- Tono: formale, tecnico, in terza persona
- Lunghezza target: 600–900 parole$sysprompt$,
  $refineprompt$La sezione "Attività rilevanti" è stata generata. Il consulente ha richiesto le seguenti modifiche:

{{refine_instructions}}

Testo attuale:
{{current_output}}

Riscrivi la sezione incorporando le modifiche richieste, mantenendo il tono formale e la struttura esistente. Non aggiungere informazioni non presenti nel testo originale o nei campi forniti.$refineprompt$,
  $schema$[
  {
    "key": "project_name",
    "label": "Nome del progetto",
    "type": "text",
    "placeholder": "es. Autoquote — automazione quotazioni"
  },
  {
    "key": "activity_type",
    "label": "Tipo di attività",
    "type": "select",
    "options": ["Ricerca industriale", "Sviluppo sperimentale", "Innovazione tecnologica", "Design e ideazione estetica"]
  },
  {
    "key": "context_description",
    "label": "Contesto e tematica del progetto",
    "type": "textarea",
    "placeholder": "Descrivi liberamente il contesto, anche in modo grezzo. L'AI strutturerà il testo."
  },
  {
    "key": "challenge",
    "label": "La sfida e il problema da risolvere",
    "type": "textarea",
    "placeholder": "Qual era la situazione prima del progetto? Quali inefficienze o limiti si volevano superare?"
  },
  {
    "key": "objectives",
    "label": "Obiettivi e risultati attesi",
    "type": "textarea"
  },
  {
    "key": "development_phases",
    "label": "Fasi di sviluppo",
    "type": "textarea",
    "placeholder": "Elenca le fasi principali, anche in forma di lista o tabella grezza"
  },
  {
    "key": "results_achieved",
    "label": "Risultati conseguiti",
    "type": "textarea",
    "placeholder": "Includi dati quantitativi dove disponibili (es. tempi, volumi, risparmi)"
  },
  {
    "key": "associated_companies",
    "label": "Operazioni con imprese associate",
    "type": "textarea",
    "placeholder": "Lascia vuoto se non applicabile. L'AI ometterà questa sezione."
  }
]$schema$,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  step_type = EXCLUDED.step_type,
  form_schema = EXCLUDED.form_schema,
  system_prompt_template = EXCLUDED.system_prompt_template,
  refine_prompt_template = EXCLUDED.refine_prompt_template,
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
  $sysprompt$Sei un esperto di fiscalità italiana specializzato nel regime Patent Box (art. 6 D.L. 146/2021).
Stai redigendo la sezione "Attività rilevanti commissionate a terzi indipendenti" della Relazione illustrativa per {{company_name}}, anno di imposta {{tax_year}}.

Presenza di attività commissionate: {{has_outsourced}}

Se {{has_outsourced}} è "No":
Redigi un unico paragrafo formale che dichiari che la società non ha commissionato attività rilevanti a soggetti terzi indipendenti nel periodo di riferimento. Tono: formale, in terza persona. Lunghezza: 3–4 righe.

Se {{has_outsourced}} è "Sì":
Il consulente ha fornito le seguenti informazioni:
- Commissionario: {{contractor_name}} ({{contractor_type}})
- Ambito tecnico: {{technical_domain}}
- Oggetto del contratto: {{contract_object}}
- Titolarità IP: {{ip_ownership}}
- Ripartizione del rischio: {{risk_sharing}}
- Fasi di sviluppo: {{development_phases}}

Hai accesso ai documenti di contesto caricati dal consulente. Usali come fonte primaria per dettagli tecnici, clausole contrattuali e profilo del fornitore non presenti nei campi sopra.

Redigi la sezione in italiano formale, strutturata nei seguenti paragrafi:
1. AMBITO TECNOLOGICO — descrizione del dominio tecnico in cui opera il commissionario
2. IL COMMISSIONARIO — profilo e competenze del soggetto terzo
3. OGGETTO DEL CONTRATTO E FASI — attività previste, deliverable, metodologia di sviluppo
4. TITOLARITÀ DEI DIRITTI — clausole contrattuali su proprietà intellettuale e sfruttamento economico
5. RIPARTIZIONE DEL RISCHIO E NATURA DI INVESTITORE — distribuzione del rischio di insuccesso, evidenza che il committente mantiene la natura di investitore

Regole:
- Non inventare clausole contrattuali, nomi o dati non presenti nei campi o nei documenti di contesto
- Se un'informazione è assente, scrivi [DA COMPLETARE]
- Tono: formale, tecnico, in terza persona
- Lunghezza target: 400–600 parole$sysprompt$,
  $refineprompt$La sezione "Attività commissionate a terzi" è stata generata. Il consulente ha richiesto le seguenti modifiche:

{{refine_instructions}}

Testo attuale:
{{current_output}}

Riscrivi la sezione incorporando le modifiche richieste, mantenendo il tono formale e la struttura esistente.$refineprompt$,
  $schema$[
  {
    "key": "has_outsourced",
    "label": "Attività commissionate a terzi presenti",
    "type": "select",
    "options": ["Sì", "No"],
    "default": "Sì"
  },
  {
    "key": "contractor_name",
    "label": "Nome del soggetto commissionario",
    "type": "text",
    "placeholder": "es. Beta 80 Group S.p.A."
  },
  {
    "key": "contractor_type",
    "label": "Tipo di soggetto",
    "type": "select",
    "options": ["Università o ente di ricerca", "Società di sviluppo software", "Società di consulenza specializzata", "Altro soggetto indipendente"]
  },
  {
    "key": "technical_domain",
    "label": "Ambito tecnico e tecnologico",
    "type": "textarea",
    "placeholder": "Es. intelligenza artificiale applicata ai processi aziendali, RPA, machine learning..."
  },
  {
    "key": "contract_object",
    "label": "Oggetto del contratto",
    "type": "textarea",
    "placeholder": "Descrivi le attività previste dal contratto e i deliverable principali"
  },
  {
    "key": "ip_ownership",
    "label": "Titolarità dei diritti sul software / bene immateriale",
    "type": "textarea",
    "placeholder": "Chi detiene i diritti di sfruttamento economico? Indica le clausole contrattuali rilevanti."
  },
  {
    "key": "risk_sharing",
    "label": "Ripartizione del rischio di insuccesso",
    "type": "textarea",
    "placeholder": "Come è distribuito il rischio tra committente e commissionario?"
  },
  {
    "key": "development_phases",
    "label": "Fasi di sviluppo e metodologia",
    "type": "textarea",
    "placeholder": "Descrivi le fasi previste dal contratto e il metodo di lavoro del fornitore"
  }
]$schema$,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  description            = EXCLUDED.description,
  system_prompt_template = EXCLUDED.system_prompt_template,
  refine_prompt_template = EXCLUDED.refine_prompt_template,
  form_schema            = EXCLUDED.form_schema,
  step_type              = EXCLUDED.step_type,
  updated_at             = NOW();

-- Step 6: Modello Organizzativo (type_c)

INSERT INTO framework_steps (id, framework_id, "order", title, description, step_type, system_prompt_template, refine_prompt_template, form_schema, created_at, updated_at)
VALUES (
  '11111111-0000-0000-0000-000000000006',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  6,
  'Modello Organizzativo',
  'Struttura organizzativa per la gestione della R&S e della proprietà intellettuale',
  'type_c',
  $sysprompt$Sei un esperto di fiscalità italiana specializzato nel regime Patent Box (art. 6 D.L. 146/2021).
Stai redigendo la sezione "Modello organizzativo dell'impresa" della Relazione illustrativa per {{company_name}}, anno di imposta {{tax_year}}.
L'azienda conta {{total_employees}} dipendenti totali.

Il consulente ha fornito le seguenti informazioni:
- Struttura organizzativa: {{org_structure}}
- Dipartimenti coinvolti nel progetto: {{departments_involved}}
- Strutture trasversali: {{cross_functional_units}}
- Leadership e governance: {{leadership}}
- Dotazioni aziendali: {{company_assets}}

Hai accesso ai documenti di contesto caricati dal consulente (organigrammi, business plan, report interni). Usali come fonte primaria per nomi di persone, ruoli, headcount e dettagli sulle dotazioni non presenti nei campi sopra.

Redigi la sezione in italiano formale, strutturata nei seguenti paragrafi:

1. STRUTTURA ORGANIZZATIVA PER FUNZIONI — descrizione delle aree aziendali, responsabili, numero di risorse per divisione
2. UNITÀ TRASVERSALI — strutture che operano su più ambiti (solo se il campo non è vuoto)
3. LEADERSHIP E GOVERNANCE — chi guida l'azienda, modello decisionale, autonomia operativa
4. VANTAGGI DEL MODELLO ORGANIZZATIVO — come il modello supporta le attività di R&D e l'efficienza operativa
5. DOTAZIONI AZIENDALI — infrastrutture, attrezzature e risorse materiali impiegate nel progetto

Regole critiche:
- Non inventare MAI nomi di persone, ruoli specifici o cifre di headcount non presenti nei campi o nei documenti di contesto
- Se nomi o headcount non sono disponibili, scrivi [DA COMPLETARE] per quei valori specifici mantenendo la struttura del paragrafo
- Tono: formale, descrittivo, in terza persona
- Lunghezza target: 400–600 parole$sysprompt$,
  $refineprompt$La sezione "Modello organizzativo" è stata generata. Il consulente ha richiesto le seguenti modifiche:

{{refine_instructions}}

Testo attuale:
{{current_output}}

Riscrivi la sezione incorporando le modifiche richieste, mantenendo il tono formale e la struttura esistente. Non aggiungere nomi o dati non presenti nel testo originale o nei campi forniti.$refineprompt$,
  $schema$[
  {
    "key": "org_structure",
    "label": "Struttura organizzativa",
    "type": "textarea",
    "placeholder": "Descrivi le divisioni/dipartimenti principali, anche in modo grezzo. Includi nomi dei responsabili se disponibili."
  },
  {
    "key": "departments_involved",
    "label": "Dipartimenti coinvolti nel progetto R&D",
    "type": "textarea",
    "placeholder": "Quali reparti hanno partecipato al progetto? Quante persone per reparto?"
  },
  {
    "key": "cross_functional_units",
    "label": "Strutture trasversali",
    "type": "textarea",
    "placeholder": "Unità o uffici che operano in modo trasversale su più ambiti aziendali. Lascia vuoto se non applicabile."
  },
  {
    "key": "leadership",
    "label": "Leadership e governance",
    "type": "textarea",
    "placeholder": "Chi guida l'azienda? Come è strutturata la governance? Autonomia decisionale?"
  },
  {
    "key": "total_employees",
    "label": "Totale dipendenti",
    "type": "client_detail",
    "source": "client.employee_count"
  },
  {
    "key": "company_assets",
    "label": "Dotazioni aziendali",
    "type": "textarea",
    "placeholder": "Attrezzature, infrastruttura IT, laboratori, software, hardware utilizzati nel progetto"
  }
]$schema$,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  description            = EXCLUDED.description,
  system_prompt_template = EXCLUDED.system_prompt_template,
  refine_prompt_template = EXCLUDED.refine_prompt_template,
  form_schema            = EXCLUDED.form_schema,
  step_type              = EXCLUDED.step_type,
  updated_at             = NOW();

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
  $sysprompt$Sei un esperto di fiscalità italiana specializzato nel regime Patent Box (art. 6 D.L. 146/2021).
Stai redigendo la sezione "Funzioni, rischi e beni dell'impresa" della Relazione illustrativa per {{company_name}}, anno di imposta {{tax_year}}.
Fatturato indicativo: {{revenue}}.

Il consulente ha fornito le seguenti informazioni:
- Processi e funzioni: {{processes_functions}}
- Beni immateriali: {{intangible_assets}}
- Utilizzo indiretto: {{indirect_use}}
- Cespiti utilizzati: {{tangible_assets}}
- Dati economico-finanziari: {{financial_data}}
- Rischi di mercato: {{market_risks}}
- Rischi finanziari: {{financial_risks}}

Hai accesso ai documenti di contesto caricati dal consulente (bilancio, business plan, analisi di mercato). Usali come fonte primaria per tutti i dati finanziari, indicatori di bilancio e analisi di settore non presenti nei campi sopra.

Redigi la sezione in italiano formale, strutturata nei seguenti paragrafi:

1. PROCESSI, ATTIVITÀ E FUNZIONI — descrizione dei processi aziendali rilevanti e dei beni immateriali direttamente impiegati. Se utilizzo indiretto: aggiungi nota sul contratto di concessione allegato.
2. ANALISI ECONOMICA — performance economico-finanziaria dell'azienda. Includi indicatori disponibili (fatturato, MOL, risultato netto, ROE, ROI, ROS) con confronto rispetto all'anno precedente dove i dati sono disponibili.
3. CESPITI UTILIZZATI — beni materiali e infrastrutture tecnologiche impiegati nel progetto
4. ANALISI DEI RISCHI DI MERCATO — rischi del settore in cui opera l'azienda, contesto macroeconomico rilevante
5. ANALISI DEL RISCHIO FINANZIARIO — esposizione a rischio di credito, cambio, liquidità, tasso. Solidità patrimoniale.
6. CONCLUSIONE — capacità dell'azienda di gestire i rischi ordinari e straordinari del proprio settore

REGOLA CRITICA SUI DATI FINANZIARI:
Non inventare MAI cifre, percentuali o indicatori finanziari non esplicitamente forniti nei campi sopra o nei documenti di contesto. Se un dato finanziario non è disponibile scrivi [DA COMPLETARE — inserire dato da bilancio]. Non approssimare, non stimare, non dedurre da altri dati.

Tono: formale, analitico, in terza persona.
Lunghezza target: 500–750 parole.$sysprompt$,
  $refineprompt$La sezione "Funzioni, rischi e beni" è stata generata. Il consulente ha richiesto le seguenti modifiche:

{{refine_instructions}}

Testo attuale:
{{current_output}}

Riscrivi la sezione incorporando le modifiche richieste, mantenendo il tono formale e la struttura esistente. Non aggiungere dati finanziari non presenti nel testo originale o nei campi forniti.$refineprompt$,
  $schema$[
  {
    "key": "processes_functions",
    "label": "Processi e funzioni svolte",
    "type": "textarea",
    "placeholder": "Descrivi i principali processi aziendali e le funzioni relative al bene immateriale agevolato"
  },
  {
    "key": "intangible_assets",
    "label": "Beni immateriali utilizzati",
    "type": "textarea",
    "placeholder": "Software, brevetti, know-how, marchi direttamente impiegati nei processi. Indica se l'utilizzo è diretto o indiretto."
  },
  {
    "key": "indirect_use",
    "label": "Il bene immateriale è utilizzato indirettamente (licenza)?",
    "type": "select",
    "options": ["No — utilizzo diretto", "Sì — allega contratto di concessione"]
  },
  {
    "key": "tangible_assets",
    "label": "Cespiti utilizzati",
    "type": "textarea",
    "placeholder": "Macchinari, hardware, laboratori, infrastrutture tecnologiche impiegate nel progetto"
  },
  {
    "key": "financial_data",
    "label": "Dati economico-finanziari principali",
    "type": "textarea",
    "placeholder": "Fatturato, MOL, risultato netto, ROE, ROI, ROS per l'anno di riferimento e precedenti. Anche in forma grezza."
  },
  {
    "key": "market_risks",
    "label": "Rischi di mercato",
    "type": "textarea",
    "placeholder": "Rischi specifici del settore in cui opera l'azienda (es. geopolitici, competitivi, valutari, di settore)"
  },
  {
    "key": "financial_risks",
    "label": "Rischi finanziari",
    "type": "textarea",
    "placeholder": "Rischio di credito, di cambio, di liquidità, di tasso. Indica se la società è esposta o meno a ciascuno."
  },
  {
    "key": "revenue",
    "label": "Fatturato (€)",
    "type": "client_detail",
    "source": "client.revenue"
  }
]$schema$,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  description            = EXCLUDED.description,
  system_prompt_template = EXCLUDED.system_prompt_template,
  refine_prompt_template = EXCLUDED.refine_prompt_template,
  form_schema            = EXCLUDED.form_schema,
  step_type              = EXCLUDED.step_type,
  updated_at             = NOW();

-- Backfill current step copies after step-schema contract changes
UPDATE framework_steps
SET
  system_prompt_template = '',
  refine_prompt_template = '',
  form_schema = '[
    {"key": "program_title", "label": "Titolo del programma", "type": "project_detail", "placeholder": "es. Nuovo Patent Box 2025", "required": true, "hint": "Collegato al titolo del documento."},
    {"key": "company_name", "label": "Ragione sociale", "type": "client_detail", "placeholder": "es. Acme S.r.l.", "required": true, "hint": "Collegato alla scheda cliente."},
    {"key": "tax_year", "label": "Anno di imposta", "type": "project_detail", "placeholder": "es. 2026", "required": true, "hint": "Collegato ai dettagli progetto."},
    {"key": "legal_representative", "label": "Legale rappresentante", "type": "client_detail", "placeholder": "es. Mario Rossi", "required": true, "hint": "Collegato alla scheda cliente."}
  ]'
WHERE id = '11111111-0000-0000-0000-000000000001';

UPDATE framework_steps
SET
  system_prompt_template = '',
  refine_prompt_template = '',
  form_schema = '[
    {"key": "tax_year", "label": "Anno di imposta", "type": "project_detail", "placeholder": "es. 2026", "required": true, "hint": "Collegato ai dettagli progetto."},
    {"key": "legal_representative", "label": "Legale rappresentante", "type": "client_detail", "placeholder": "es. Mario Rossi", "required": true, "hint": "Collegato alla scheda cliente."}
  ]'
WHERE id = '11111111-0000-0000-0000-000000000002';

UPDATE framework_steps
SET
  system_prompt_template = '',
  refine_prompt_template = '',
  form_schema = '[
  {
    "key": "document_reference",
    "label": "Documento di riferimento",
    "type": "document_reference",
    "hint": "Collegamento a un documento di riferimento. La visualizzazione del link verrà gestita in un passaggio successivo.",
    "required": false
  },
  {
    "key": "visura_pdf",
    "label": "Visura Camerale (PDF)",
    "type": "file_upload_extraction",
    "hint": "Carica la Visura Camerale Storica in formato PDF. L''AI estrarrà automaticamente soci, partecipate e governance.",
    "required": false,
    "accept": [".pdf"]
  },
  {
    "key": "note_integrative",
    "type": "textarea",
    "label": "Note integrative (opzionale)",
    "placeholder": "Informazioni aggiuntive sulla struttura societaria non presenti nella visura...",
    "required": false
  }
]'
WHERE id = '11111111-0000-0000-0000-000000000003';

UPDATE steps s
SET
  form_schema = fs.form_schema,
  system_prompt_template = fs.system_prompt_template,
  refine_prompt_template = fs.refine_prompt_template
FROM framework_steps fs
WHERE fs.id = s.framework_step_id
  AND fs.id IN (
    '11111111-0000-0000-0000-000000000001',
    '11111111-0000-0000-0000-000000000002',
    '11111111-0000-0000-0000-000000000003',
    '11111111-0000-0000-0000-000000000004',
    '11111111-0000-0000-0000-000000000005',
    '11111111-0000-0000-0000-000000000006',
    '11111111-0000-0000-0000-000000000008'
  )
  AND (
    s.form_schema IS DISTINCT FROM fs.form_schema
    OR s.system_prompt_template IS DISTINCT FROM fs.system_prompt_template
    OR s.refine_prompt_template IS DISTINCT FROM fs.refine_prompt_template
  );

-- ─── Few-shot examples: Saco Combimar 2024 ───────────────────────────────────
-- blocklist is stored metadata seeded with the examples; runtime enforcement is handled by generation sanitisation.

WITH example_data(step_order, label, sector, blocklist, content) AS (
  VALUES
  (
    4,
    'Saco Combimar 2024 — logistica/shipping',
    'logistica',
    ARRAY['Saco Combimar','Saco','Combimar','Autoquote','AutoQuote','Beta 80','Beta80','BeOne','Beon','FBH','MEDH','Roberto Laquale','Laquale','Deborah Fridecky','Fridecky','Roberto Roccato','Roccato','Pierlorenzo Messina','Messina','Mona Bakal','Bakal','Angelo Martina','Martina','Melzo','NVOCC','IBM Watson','Watson Assistant','Automation Anywhere','Django'],
    $example$L'attività di Ricerca di Saco Combimar ha portato alla realizzazione di un software proprietario che facilita i processi di relazione con i clienti e pertanto le vendite e la customer experience.

L'innovazione consiste specificamente in una soluzione per il miglioramento del processo di produzione di offerte di quotazioni.

Oltre a creare quotazioni, il sistema sviluppato rende possibile visualizzare lo storico delle quotazioni inviate dai diversi canali, utilizzare le funzionalità del servizio cognitivo, amministrare utenze e impostare alcuni parametri necessari al bot "Autoquote".

L'attività di ricerca ha riguardato l'automazione dei processi e l'aumento dell'efficienza dell'erogazione del servizio.

L'attività di innovazione tecnologica svolta dall'impresa, è finalizzata al raggiungimento di obiettivi di innovazione digitale 4.0 contenuti nell'art. 5 comma 1 del Decreto del 26 maggio 2020 del Ministero dello sviluppo Economico: c) l'integrazione, attraverso l'applicazione di tecnologie digitali, tra il sistema informatico (IT) e le fasi del processo di produzione di beni o servizi (Operations).

La sfida di Saco Combimar quando ha avviato il progetto di innovazione "Autoquote" era di ridurre la mole di lavoro degli addetti alla vendita e alla gestione offerte. Saco riceve circa 800 richieste di quotazione (RFP, Requests for Proposal) al giorno. Questo enorme flusso di comunicazione, gestito manualmente dagli addetti dell'azienda, ha un effetto molto impegnativo per l'azienda, con costi e tempi dilatati.

Tipicamente una richiesta, se gestita manualmente, richiede che un addetto legga l'email e proceda a trovare le quotazioni migliori sul sistema collegato con le società di shipping. Questo processo manuale e laborioso, richiede una media tra 10 e 15 minuti di lavoro per evadere ciascuna richiesta.

Il cronoprogramma prevede 3 fasi per il 2023: Fase 1 (aprile) — setup ambiente e attivazione; Fase 2 (luglio); Fase 3 (agosto) — compreso test e attivazione; Collaudo (settembre).

I risultati incideranno su alcuni aspetti fondamentali nell'efficienza operativa aziendale. Grazie allo sviluppo di questo progetto innovativo saranno gestite circa 700 quotazioni al giorno con servizio 24x7, con una tempistica da 25 secondi ad alcuni minuti per la creazione di quotazioni.

I principali benefici sono: aumento fatturato grazie alla maggior rapidità dell'emissione delle offerte; migliore servizio clienti grazie a maggiori risorse libere; aumento produttività con incremento dei volumi a parità o con minori risorse dedicate.

Saco Combimar, pur facendo parte del gruppo internazionale SACO e operando sotto la direzione coordinata di FBH S.p.A., mantiene un livello totale di indipendenza finanziaria e operativa. Dal punto di vista finanziario, è una società per azioni con capitale sociale interamente versato pari a tre milioni di euro che genera cash flow sufficiente a finanziare i propri investimenti. In termini operativi, agisce come un'entità con struttura gestionale propria, team indipendente (circa 125 dipendenti), centro decisionale in Italia (Melzo) e autonomia nella definizione delle strategie commerciali.$example$
  ),
  (
    5,
    'Saco Combimar 2024 — logistica/shipping',
    'logistica',
    ARRAY['Saco Combimar','Saco','Combimar','Autoquote','AutoQuote','Beta 80','Beta80','BeOne','Beon','FBH','MEDH','Roberto Laquale','Laquale','Deborah Fridecky','Fridecky','Roberto Roccato','Roccato','Pierlorenzo Messina','Messina','Mona Bakal','Bakal','Angelo Martina','Martina','Melzo','NVOCC','IBM Watson','Watson Assistant','Automation Anywhere','Django'],
    $example$L'ambito di riferimento è l'intelligenza artificiale, ossia un campo della scienza informatica che si occupa dello sviluppo di sistemi e macchine in grado di compiere attività che richiedono solitamente l'intelligenza umana, come il ragionamento, il problem solving, l'apprendimento e il riconoscimento di pattern.

Nell'ambito di questo progetto l'intelligenza artificiale è applicata ai processi aziendali; quindi, si fa riferimento all'utilizzo di algoritmi e modelli predittivi per automatizzare e ottimizzare le attività all'interno di un'azienda.

Sulla base degli accordi con i fornitori e in funzione anche della sua attività di ideazione e coordinamento del progetto, Saco Combimar è titolare esclusiva dei diritti di utilizzazione economica del Software senza limiti di tempo e per il suo sfruttamento in qualunque territorio.

In forza del Contratto tra il fornitore (Beta80) e la società (Saco Combimar S.p.A.), la società potrà effettuare: la traduzione, l'adattamento, la trasformazione e ogni altra modificazione del Software; effettuare o autorizzare la riproduzione, permanente o temporanea, totale o parziale, del software con qualsiasi mezzo o in qualsiasi forma; le operazioni di caricamento, visualizzazione, esecuzione, trasmissione e memorizzazione del Software.

Il fornitore Beta 80, società specializzata nella programmazione informatica incluso l'utilizzo di motori di Intelligenza artificiale, ha messo a disposizione di Saco Combimar un'unità di sviluppo agile che coprirà le seguenti aree di attività: Ricerca, Sviluppo, Realizzazione prototipo, Test & collaudo per messa in produzione, Formazione.

La realizzazione del progetto è stata attuata attraverso diverse fasi: Prima fase — automazione completa delle attività dei BOT (preparazione ambiente, impostazione BOT, attivazione del sistema); Fasi successive — attuazione del servizio cognitivo e tuning, con analisi e definizione KPI di efficienza, test di implementazione e valutazione dei risultati raggiunti. I task sono stati tutti completati nel 2023.$example$
  ),
  (
    6,
    'Saco Combimar 2024 — logistica/shipping',
    'logistica',
    ARRAY['Saco Combimar','Saco','Combimar','Autoquote','AutoQuote','Beta 80','Beta80','BeOne','Beon','FBH','MEDH','Roberto Laquale','Laquale','Deborah Fridecky','Fridecky','Roberto Roccato','Roccato','Pierlorenzo Messina','Messina','Mona Bakal','Bakal','Angelo Martina','Martina','Melzo','NVOCC','IBM Watson','Watson Assistant','Automation Anywhere','Django'],
    $example$Saco Combimar S.p.A. ha delineato un approccio chiaro e strutturato, con i riferimenti diretti dall'organigramma ufficiale.

Saco Combimar adotta una struttura organizzativa funzionale, organizzata intorno a diverse aree specialistiche, ognuna con competenze precise e personale dedicato:

Sales: guidata da Roberto Laquale (Amministratore Delegato e supervisor di Sales General Manager), coadiuvato da Deborah Fridecky (Deputy Sales General Manager) e dal team overseas. Questa divisione gestisce le relazioni con i clienti, definisce strategie commerciali, stabilisce tariffe e cura lo sviluppo dei mercati esteri.

Operations – Import & Export: coordinamento delle operazioni logistiche, planning delle rotte, prenotazioni, consolidamento container, gestione magazzini e logistica doganale. Coordinata da Roberto Roccato.

Customs (Dogana): assicura la compliance normativa, l'ottenimento delle certificazioni (es. AEOF) e supporto per lo sdoganamento. Coordinata da Pierlorenzo Messina.

Finance – Accounting – Human Resources: gestione contabilità, controllo di gestione, tesoreria e amministrazione del personale. Coordinata da Mona Bakal.

ICT (Information & Communication Technology): coordinata da Angelo Martina.

La "Centrale Operativa" di Melzo è il nodo decisionale dell'azienda, dove convergono sales, operations, ICT e dogana. Ogni spedizione è monitorata e coordinata end-to-end da team dedicati, garantendo flessibilità operativa e alta reattività sul mercato.

La società è guidata da Roberto Laquale – CEO e Sales General Manager, il quale coordina i vari team e risponde al consiglio di amministrazione, che opera secondo le linee strategiche di FBH S.p.A. pur mantenendo ampia autonomia decisionale in Italia.

Il modello organizzativo si basa su quattro pilastri: chiarezza dei ruoli, agilità operativa, forte coordinamento tra funzioni, e adattabilità geografica con soluzioni personalizzate sui principali mercati.$example$
  ),
  (
    7,
    'Saco Combimar 2024 — logistica/shipping',
    'logistica',
    ARRAY['Saco Combimar','Saco','Combimar','Autoquote','AutoQuote','Beta 80','Beta80','BeOne','Beon','FBH','MEDH','Roberto Laquale','Laquale','Deborah Fridecky','Fridecky','Roberto Roccato','Roccato','Pierlorenzo Messina','Messina','Mona Bakal','Bakal','Angelo Martina','Martina','Melzo','NVOCC','IBM Watson','Watson Assistant','Automation Anywhere','Django'],
    $example$La società ha registrato nel 2024 un fatturato di € 41.3 mln per un margine operativo lordo (MOL) di € 886k e un Risultato Netto di €163k. Questo risultato è in calo rispetto all'anno precedente in cui il fatturato era di € 43.2 mln, MOL di € 3.3 mln e Risultato Netto di € 1.7 mln. I risultati producono una redditività in termini di MOL su fatturato per il 2024 pari al 2.1%, in calo rispetto all'anno precedente (7.6%).

Il "ROE netto" è determinato come rapporto tra Risultato Netto e Patrimonio Netto non inclusivo del risultato dell'esercizio. Il "ROI" è determinato come rapporto tra Risultato Operativo e Totale Attivo. Il "ROS" è determinato come rapporto tra Risultato Operativo e Ricavi netti.

Il valore della produzione ha subito una diminuzione di circa 1,9 Milioni di euro, pari al 4,39% circa rispetto al 2023, principalmente per la riduzione dei volumi. L'aumento del Costo del lavoro di € 255k, ovvero il 4% in più rispetto al 2023, è dovuto all'aumento dell'organico ed al costo del lavoro dopo il rinnovo contrattuale.

Dal punto di vista patrimoniale l'analisi delle principali voci del bilancio mostra una gestione efficiente del capitale circolante netto e nessuna variazione rilevante del capitale immobilizzato, escluso il normale processo di ammortamento. L'analisi dei principali indicatori finanziari conferma la solidità dell'azienda.

La società non è esposta ad altri rischi finanziari: nessun rischio di credito significativo in considerazione della natura primaria dei clienti; non appare un significativo rischio di cambio operando principalmente in valuta euro.

L'oscillazione del valore di mercato dei noli fa parte dell'attività caratteristica del settore e comporta un rischio di mercato gestito e monitorato con attenzione. Una nota riguarda il rischio connesso agli effetti delle politiche dei dazi dell'amministrazione americana, che rappresenta un mutamento a medio-lungo termine delle relazioni commerciali con potenziale impatto sul volume degli scambi.

Saco Combimar, nel tempo, ha dimostrato di saper gestire rischi ordinari e straordinari del settore in cui opera con una flessibilità gestionale molto efficace nel mitigare i momenti negativi e cavalcare quelli positivi.$example$
  )
)
INSERT INTO framework_step_examples (
  framework_step_id,
  label,
  sector,
  blocklist,
  content,
  is_active
)
SELECT
  fs.id,
  e.label,
  e.sector,
  e.blocklist,
  e.content,
  TRUE
FROM example_data e
JOIN frameworks f ON f.slug = 'italian-patent-box'
JOIN framework_steps fs ON fs.framework_id = f.id AND fs."order" = e.step_order
WHERE NOT EXISTS (
  SELECT 1
  FROM framework_step_examples existing
  WHERE existing.framework_step_id = fs.id
    AND existing.label = e.label
);

-- ─── Framework: Relazione Tecnica — Patent Box (ARKADIA-91) ──────────────────
-- Standalone technical report framework. Separate from the main Patent Box.
-- 11 steps, all type_c.

INSERT INTO frameworks (id, name, slug, description, is_public, created_at, updated_at)
VALUES (
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  'Relazione Tecnica — Patent Box',
  'relazione-tecnica-patent-box',
  'Standalone technical report required for Patent Box. Prepared by the R&D responsible and countersigned by the legal representative. Separate document from the Allegato A.',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Step 1: Trattazione del Titolo

INSERT INTO framework_steps (id, framework_id, "order", title, description, step_type, system_prompt_template, refine_prompt_template, form_schema, created_at, updated_at)
VALUES (
  '22222222-0000-0000-0000-000000000001',
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  1,
  'Trattazione del Titolo',
  'Trattazione legale del titolo sul bene immateriale — software, registrazione SIAE, originalità',
  'type_c',
  'Write the legal title treatment section (Trattazione del Titolo) for the Relazione Tecnica Patent Box document. This section establishes the legal basis for the intangible asset claim. Describe: the asset name and nature, SIAE registration details if applicable, the originality and creative intent of the software, and the company''s legal ownership. Write in formal Italian, third person, grounded only in the facts provided. Target: 300–450 words.',
  'Revise the Trattazione del Titolo section as instructed. Maintain formal legal Italian. Correct any factual inaccuracies. Do not invent registration numbers or legal references not provided. Return only the revised text.',
  '[
    {"key":"asset_name","type":"text","label":"Nome del bene immateriale","placeholder":"es. PlatformX — sistema gestionale","aiSuggestable":false},
    {"key":"siae_registration","type":"text","label":"Registrazione SIAE (se presente)","placeholder":"es. Numero deposito SIAE 2023/XXXXX","aiSuggestable":false},
    {"key":"originality_description","type":"textarea","label":"Descrizione originalità e creatività","placeholder":"Cosa rende questo software originale? Quali scelte creative ha fatto il team?","aiSuggestable":true},
    {"key":"legal_title","type":"select","label":"Titolo giuridico","options":["Titolarità originaria — sviluppato internamente","Titolarità derivata — acquisito o ceduto","Titolarità mista"],"aiSuggestable":false}
  ]'::jsonb,
  NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  description            = EXCLUDED.description,
  system_prompt_template = EXCLUDED.system_prompt_template,
  refine_prompt_template = EXCLUDED.refine_prompt_template,
  form_schema            = EXCLUDED.form_schema,
  step_type              = EXCLUDED.step_type,
  updated_at             = NOW();

-- Step 2: Attività Rilevanti Svolte

INSERT INTO framework_steps (id, framework_id, "order", title, description, step_type, system_prompt_template, refine_prompt_template, form_schema, created_at, updated_at)
VALUES (
  '22222222-0000-0000-0000-000000000002',
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  2,
  'Attività Rilevanti Svolte',
  'Tipologia di attività rilevante svolta — R&S, innovazione tecnologica, design',
  'type_c',
  'Write the qualifying activities section (Attività Rilevanti Svolte) for the Relazione Tecnica. Identify and describe the type of qualifying R&D activity: ricerca industriale, sviluppo sperimentale, innovazione tecnologica, or design. Link the activity directly to the intangible asset described in the previous section. Use precise regulatory language referencing Patent Box 2.0 (D.L. 146/2021). Write in formal Italian, third person. Target: 350–500 words.',
  'Revise the Attività Rilevanti Svolte section as instructed. Strengthen regulatory precision. Ensure activity type matches the asset type. Return only the revised text.',
  '[
    {"key":"activity_type","type":"multiselect","label":"Tipo di attività rilevante","options":["Ricerca industriale","Sviluppo sperimentale","Innovazione tecnologica","Design e ideazione estetica"],"aiSuggestable":false},
    {"key":"activity_description","type":"textarea","label":"Descrizione delle attività svolte","placeholder":"Cosa ha fatto concretamente il team? Quali esperimenti, prototipi, iterazioni?","aiSuggestable":true},
    {"key":"team_involved","type":"textarea","label":"Chi ha svolto le attività","placeholder":"Ruoli coinvolti, numero di persone, competenze chiave","aiSuggestable":true}
  ]'::jsonb,
  NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  description            = EXCLUDED.description,
  system_prompt_template = EXCLUDED.system_prompt_template,
  refine_prompt_template = EXCLUDED.refine_prompt_template,
  form_schema            = EXCLUDED.form_schema,
  step_type              = EXCLUDED.step_type,
  updated_at             = NOW();

-- Step 3: Stato dell'Arte

INSERT INTO framework_steps (id, framework_id, "order", title, description, step_type, system_prompt_template, refine_prompt_template, form_schema, created_at, updated_at)
VALUES (
  '22222222-0000-0000-0000-000000000003',
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  3,
  'Stato dell''Arte',
  'Contesto tecnologico e di mercato prima dello sviluppo del bene',
  'type_c',
  'Write the prior art section (Stato dell''Arte) for the Relazione Tecnica. Describe the technological and market context that existed before the company developed its intangible asset. Explain what solutions existed, what their limitations were, and why the company''s development represents a meaningful advance. Do not invent specific competitor names or technical benchmarks not provided. Write in formal Italian, third person. Target: 400–550 words.',
  'Revise the Stato dell''Arte section as instructed. Sharpen the contrast between prior solutions and the company''s innovation. Do not invent facts. Return only the revised text.',
  '[
    {"key":"prior_solutions","type":"textarea","label":"Soluzioni preesistenti sul mercato","placeholder":"Cosa esisteva già? Quali strumenti, software, processi usavano le aziende del settore?","aiSuggestable":true},
    {"key":"limitations","type":"textarea","label":"Limiti delle soluzioni esistenti","placeholder":"Cosa non funzionava? Quali problemi non erano risolti?","aiSuggestable":true},
    {"key":"market_context","type":"textarea","label":"Contesto di mercato","placeholder":"Settore, dimensione, tendenze tecnologiche al momento dello sviluppo","aiSuggestable":true}
  ]'::jsonb,
  NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  description            = EXCLUDED.description,
  system_prompt_template = EXCLUDED.system_prompt_template,
  refine_prompt_template = EXCLUDED.refine_prompt_template,
  form_schema            = EXCLUDED.form_schema,
  step_type              = EXCLUDED.step_type,
  updated_at             = NOW();

-- Step 4: Gantt di Progetto

INSERT INTO framework_steps (id, framework_id, "order", title, description, step_type, system_prompt_template, refine_prompt_template, form_schema, created_at, updated_at)
VALUES (
  '22222222-0000-0000-0000-000000000004',
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  4,
  'Gantt di Progetto',
  'Fasi del progetto e timeline di sviluppo',
  'type_c',
  'Write the project timeline section (Gantt di Progetto) for the Relazione Tecnica. Describe the development phases in chronological order: planning, design, development, testing, and deployment. For each phase state the approximate period, the activities performed, and the outputs. Present as narrative prose, not as a visual Gantt chart. Write in formal Italian, third person. Target: 350–500 words.',
  'Revise the Gantt di Progetto section as instructed. Ensure phases are chronologically coherent and outputs are clearly stated per phase. Return only the revised text.',
  '[
    {"key":"project_start","type":"text","label":"Inizio progetto","placeholder":"es. Gennaio 2022","aiSuggestable":false},
    {"key":"project_end","type":"text","label":"Fine progetto (o stato attuale)","placeholder":"es. Dicembre 2023 — in sviluppo continuo","aiSuggestable":false},
    {"key":"phases","type":"textarea","label":"Fasi principali del progetto","placeholder":"Fase 1: analisi requisiti (gen-mar 2022)\nFase 2: sviluppo MVP (apr-set 2022)\nFase 3: test e rilascio (ott-dic 2022)\n...","aiSuggestable":true}
  ]'::jsonb,
  NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  description            = EXCLUDED.description,
  system_prompt_template = EXCLUDED.system_prompt_template,
  refine_prompt_template = EXCLUDED.refine_prompt_template,
  form_schema            = EXCLUDED.form_schema,
  step_type              = EXCLUDED.step_type,
  updated_at             = NOW();

-- Step 5: Team di Progetto

INSERT INTO framework_steps (id, framework_id, "order", title, description, step_type, system_prompt_template, refine_prompt_template, form_schema, created_at, updated_at)
VALUES (
  '22222222-0000-0000-0000-000000000005',
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  5,
  'Team di Progetto',
  'Composizione del team, ruoli, tipo di contratto e coinvolgimento nelle attività R&S',
  'type_c',
  'Write the project team section (Team di Progetto) for the Relazione Tecnica. Describe each person involved in the R&D activities: their role, employment type (dipendente, collaboratore, consulente esterno), their specific contribution to the qualifying activities, and — where relevant — their technical qualifications. Use only information provided. Do not invent names or credentials. Write in formal Italian, third person. Target: 300–450 words.',
  'Revise the Team di Progetto section as instructed. Ensure each team member''s contribution to qualifying R&D is clearly stated. Return only the revised text.',
  '[
    {"key":"team_members","type":"textarea","label":"Membri del team","placeholder":"Nome (o ruolo), tipo contratto, attività svolta nel progetto\nes. Sviluppatore senior (dipendente) — architettura backend e sviluppo API\nes. Designer UX (collaboratore) — prototipazione interfacce","aiSuggestable":true},
    {"key":"total_fte","type":"text","label":"FTE dedicati (approssimativo)","placeholder":"es. 2.5 FTE nel 2023","aiSuggestable":false}
  ]'::jsonb,
  NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  description            = EXCLUDED.description,
  system_prompt_template = EXCLUDED.system_prompt_template,
  refine_prompt_template = EXCLUDED.refine_prompt_template,
  form_schema            = EXCLUDED.form_schema,
  step_type              = EXCLUDED.step_type,
  updated_at             = NOW();

-- Step 6: Materiali e Beni Strumentali

INSERT INTO framework_steps (id, framework_id, "order", title, description, step_type, system_prompt_template, refine_prompt_template, form_schema, created_at, updated_at)
VALUES (
  '22222222-0000-0000-0000-000000000006',
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  6,
  'Materiali e Beni Strumentali',
  'Strumenti, infrastrutture e materiali utilizzati nelle attività di R&S',
  'type_c',
  'Write the materials and instrumental assets section (Materiali e Beni Strumentali) for the Relazione Tecnica. Describe the tools, infrastructure, and materials used in the R&D activities: hardware, cloud infrastructure, software licences, development environments, testing equipment. Distinguish between assets owned by the company and those accessed as services. Write in formal Italian, third person. Target: 250–400 words.',
  'Revise the Materiali e Beni Strumentali section as instructed. Ensure assets are correctly categorised. Return only the revised text.',
  '[
    {"key":"hardware","type":"textarea","label":"Hardware e infrastruttura fisica","placeholder":"Server interni, workstation, dispositivi di test...","aiSuggestable":true},
    {"key":"cloud_services","type":"textarea","label":"Servizi cloud e infrastruttura digitale","placeholder":"AWS, GCP, Azure, Supabase, hosting, CDN...","aiSuggestable":true},
    {"key":"software_licences","type":"textarea","label":"Licenze software utilizzate","placeholder":"IDE, strumenti di design, librerie commerciali...","aiSuggestable":true}
  ]'::jsonb,
  NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  description            = EXCLUDED.description,
  system_prompt_template = EXCLUDED.system_prompt_template,
  refine_prompt_template = EXCLUDED.refine_prompt_template,
  form_schema            = EXCLUDED.form_schema,
  step_type              = EXCLUDED.step_type,
  updated_at             = NOW();

-- Step 7: Fasi di Sviluppo

INSERT INTO framework_steps (id, framework_id, "order", title, description, step_type, system_prompt_template, refine_prompt_template, form_schema, created_at, updated_at)
VALUES (
  '22222222-0000-0000-0000-000000000007',
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  7,
  'Fasi di Sviluppo',
  'Descrizione tecnica delle fasi di sviluppo, iterazioni e sotto-progetti',
  'type_c',
  'Write the development phases section (Fasi di Sviluppo) for the Relazione Tecnica. This is a deeper technical narrative than the Gantt section — describe each development phase from a technical perspective: the architectural decisions made, the technologies adopted, the iterations and pivots, and how each phase contributed to the final asset. Write in formal Italian, third person, with technical precision. Target: 500–700 words.',
  'Revise the Fasi di Sviluppo section as instructed. Increase technical depth. Ensure each phase''s technical contribution is clearly articulated. Return only the revised text.',
  '[
    {"key":"phase_details","type":"textarea","label":"Dettaglio tecnico delle fasi","placeholder":"Descrivi ogni fase dal punto di vista tecnico: decisioni architetturali, tecnologie adottate, problemi affrontati, risultati intermedi","aiSuggestable":true},
    {"key":"pivots","type":"textarea","label":"Cambiamenti di direzione significativi","placeholder":"Hai cambiato approccio tecnologico? Sostituito librerie? Ridisegnato l''architettura? Perché?","aiSuggestable":true}
  ]'::jsonb,
  NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  description            = EXCLUDED.description,
  system_prompt_template = EXCLUDED.system_prompt_template,
  refine_prompt_template = EXCLUDED.refine_prompt_template,
  form_schema            = EXCLUDED.form_schema,
  step_type              = EXCLUDED.step_type,
  updated_at             = NOW();

-- Step 8: Problematiche Tecniche e Scientifiche

INSERT INTO framework_steps (id, framework_id, "order", title, description, step_type, system_prompt_template, refine_prompt_template, form_schema, created_at, updated_at)
VALUES (
  '22222222-0000-0000-0000-000000000008',
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  8,
  'Problematiche Tecniche e Scientifiche',
  'Incertezze tecniche affrontate e risolte durante lo sviluppo',
  'type_c',
  'Write the technical and scientific challenges section (Problematiche Tecniche e Scientifiche) for the Relazione Tecnica. This is one of the most important sections for Patent Box eligibility — it must demonstrate that the development involved genuine technical uncertainty and problem-solving, not routine implementation. For each challenge: describe the problem, why it was uncertain or novel, the approach taken to resolve it, and the outcome. Write in formal Italian, third person. Target: 500–650 words.',
  'Revise the Problematiche Tecniche section as instructed. Strengthen the demonstration of technical uncertainty — this is the core eligibility argument. Do not soften or genericise. Return only the revised text.',
  '[
    {"key":"technical_challenges","type":"textarea","label":"Sfide tecniche principali","placeholder":"Problema 1: [descrizione]\nPerché era incerto: [spiegazione]\nApproccio: [cosa avete fatto]\nEsito: [risultato]\n\nProblema 2: ...","aiSuggestable":true},
    {"key":"failed_approaches","type":"textarea","label":"Approcci falliti o abbandonati","placeholder":"Hai provato soluzioni che non hanno funzionato? Questo dimostra l''incertezza tecnica.","aiSuggestable":true}
  ]'::jsonb,
  NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  description            = EXCLUDED.description,
  system_prompt_template = EXCLUDED.system_prompt_template,
  refine_prompt_template = EXCLUDED.refine_prompt_template,
  form_schema            = EXCLUDED.form_schema,
  step_type              = EXCLUDED.step_type,
  updated_at             = NOW();

-- Step 9: Situazione Futura

INSERT INTO framework_steps (id, framework_id, "order", title, description, step_type, system_prompt_template, refine_prompt_template, form_schema, created_at, updated_at)
VALUES (
  '22222222-0000-0000-0000-000000000009',
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  9,
  'Situazione Futura',
  'Benefici futuri attesi a livello aziendale e di settore',
  'type_c',
  'Write the future outlook section (Situazione Futura) for the Relazione Tecnica. Describe the expected future benefits of the intangible asset at two levels: (1) for the company — revenue potential, competitive advantage, operational efficiency, IP exploitation plans; (2) for the sector — broader technological contribution, potential for diffusion or licensing. Keep projections realistic and grounded in the facts provided. Write in formal Italian, third person. Target: 300–450 words.',
  'Revise the Situazione Futura section as instructed. Ensure projections are realistic and grounded. Distinguish company-level from sector-level benefits clearly. Return only the revised text.',
  '[
    {"key":"company_benefits","type":"textarea","label":"Benefici attesi per l''azienda","placeholder":"Crescita ricavi, riduzione costi, vantaggio competitivo, piani di commercializzazione...","aiSuggestable":true},
    {"key":"sector_benefits","type":"textarea","label":"Contributo al settore","placeholder":"Come questa tecnologia può beneficiare il settore più ampio? Possibilità di licensing, open source, diffusione...","aiSuggestable":true}
  ]'::jsonb,
  NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  description            = EXCLUDED.description,
  system_prompt_template = EXCLUDED.system_prompt_template,
  refine_prompt_template = EXCLUDED.refine_prompt_template,
  form_schema            = EXCLUDED.form_schema,
  step_type              = EXCLUDED.step_type,
  updated_at             = NOW();

-- Step 10: Attività di Tutela del Bene

INSERT INTO framework_steps (id, framework_id, "order", title, description, step_type, system_prompt_template, refine_prompt_template, form_schema, created_at, updated_at)
VALUES (
  '22222222-0000-0000-0000-000000000010',
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  10,
  'Attività di Tutela del Bene',
  'Misure adottate per proteggere e tutelare il bene immateriale',
  'type_c',
  'Write the IP protection section (Attività di Tutela del Bene) for the Relazione Tecnica. Describe the measures taken by the company to protect its intangible asset: registration actions (SIAE, patent, trademark), contractual protections (NDA, employment IP clauses, supplier agreements), technical protections (access controls, code confidentiality), and internal IP policies. Write in formal Italian, third person. Target: 250–400 words.',
  'Revise the Attività di Tutela section as instructed. Ensure all protection measures are clearly categorised. Return only the revised text.',
  '[
    {"key":"registration_actions","type":"textarea","label":"Registrazioni formali","placeholder":"SIAE, brevetti, marchi, design registrati — numero e data se disponibili","aiSuggestable":false},
    {"key":"contractual_protections","type":"textarea","label":"Protezioni contrattuali","placeholder":"NDA con dipendenti e collaboratori, clausole IP nei contratti, accordi con fornitori","aiSuggestable":true},
    {"key":"technical_protections","type":"textarea","label":"Protezioni tecniche","placeholder":"Controllo accessi al codice, repository privati, policy di sicurezza","aiSuggestable":true}
  ]'::jsonb,
  NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  description            = EXCLUDED.description,
  system_prompt_template = EXCLUDED.system_prompt_template,
  refine_prompt_template = EXCLUDED.refine_prompt_template,
  form_schema            = EXCLUDED.form_schema,
  step_type              = EXCLUDED.step_type,
  updated_at             = NOW();

-- Step 11: Altre Attività Rilevanti

INSERT INTO framework_steps (id, framework_id, "order", title, description, step_type, system_prompt_template, refine_prompt_template, form_schema, created_at, updated_at)
VALUES (
  '22222222-0000-0000-0000-000000000011',
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  11,
  'Altre Attività Rilevanti',
  'Attività rilevanti aggiuntive collegate al bene immateriale (opzionale)',
  'type_c',
  'Write the additional qualifying activities section (Altre Attività Rilevanti) for the Relazione Tecnica. This optional section covers any qualifying activities not described in the earlier sections that are connected to the intangible asset — for example, activities related to complementary IP, derivative works, or parallel innovation streams. If the user indicates there are no additional activities, write a brief formal statement to that effect. Write in formal Italian, third person. Target: 150–300 words.',
  'Revise the Altre Attività Rilevanti section as instructed. If converting from "no additional activities" to describing activities, rewrite accordingly. Return only the revised text.',
  '[
    {"key":"has_additional","type":"select","label":"Ci sono altre attività rilevanti?","options":["No — le attività sono già descritte nelle sezioni precedenti","Sì"],"aiSuggestable":false},
    {"key":"additional_description","type":"textarea","label":"Descrizione attività aggiuntive","placeholder":"Descrivi le attività rilevanti non coperte nelle sezioni precedenti","aiSuggestable":true}
  ]'::jsonb,
  NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  description            = EXCLUDED.description,
  system_prompt_template = EXCLUDED.system_prompt_template,
  refine_prompt_template = EXCLUDED.refine_prompt_template,
  form_schema            = EXCLUDED.form_schema,
  step_type              = EXCLUDED.step_type,
  updated_at             = NOW();

-- ─── Verify ───────────────────────────────────────────────────────────────────
-- Patent Box (Allegato A): should return 7 rows, steps 1–7, no "Relazione Tecnica"
SELECT f.name as framework, fs."order", fs.title, fs.step_type
FROM framework_steps fs
JOIN frameworks f ON f.id = fs.framework_id
ORDER BY f.name, fs."order";

-- Patent Box step type distribution: 2x type_a, 1x type_b, 4x type_c
SELECT step_type, count(*)
FROM framework_steps
WHERE framework_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
GROUP BY step_type;

-- Relazione Tecnica: should return 11 rows, all type_c
SELECT "order", title, step_type
FROM framework_steps
WHERE framework_id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901'
ORDER BY "order";

-- ─── framework_step_examples (Saco Combimar seed) ──────────────────────────────────────
-- Added: ENGNEER-338 (2026-05-07)
-- Provides example outputs for steps 4–7 to inject at generation time.
-- Each row: framework_step_id, example_output (text), blocklist (text[] of banned phrases), is_active.
-- Newest active row per framework_step_id wins at runtime (ordered by created_at DESC).
-- Anon grants are intentionally REVOKED on this table. Do not re-grant.
-- blocklist is stored metadata only — enforcement is in server/utils/sanitiseGeneration.ts.
--
-- NOTE: The Saco Combimar example content for steps 4–7 was applied directly to Supabase
-- via migration (ENGNEER-338) and is present in the live DB.
-- To reproduce on a fresh DB, INSERT the Saco rows here.
-- Retrieve the current rows from Supabase with:
--   SELECT id, framework_step_id, is_active, blocklist, created_at FROM framework_step_examples ORDER BY created_at;
-- Then paste the INSERT block below in this format:
--
-- INSERT INTO framework_step_examples (id, framework_step_id, example_output, blocklist, is_active, created_at, updated_at)
-- VALUES
--   ('<uuid>', '11111111-0000-0000-0000-000000000004', $ex$<step 4 example text>$ex$, ARRAY['<phrase1>', '<phrase2>'], true, NOW(), NOW()),
--   ('<uuid>', '11111111-0000-0000-0000-000000000005', $ex$<step 5 example text>$ex$, ARRAY[]::text[], true, NOW(), NOW()),
--   ('<uuid>', '11111111-0000-0000-0000-000000000006', $ex$<step 6 example text>$ex$, ARRAY[]::text[], true, NOW(), NOW()),
--   ('<uuid>', '11111111-0000-0000-0000-000000000008', $ex$<step 7 example text>$ex$, ARRAY[]::text[], true, NOW(), NOW())
-- ON CONFLICT (id) DO UPDATE SET
--   example_output = EXCLUDED.example_output,
--   blocklist      = EXCLUDED.blocklist,
--   is_active      = EXCLUDED.is_active,
--   updated_at     = NOW();

-- Verify examples present:
-- SELECT fse.id, fs.title, fse.is_active, array_length(fse.blocklist, 1) as blocklist_count
-- FROM framework_step_examples fse
-- JOIN framework_steps fs ON fs.id = fse.framework_step_id
-- ORDER BY fs."order";

-- ─── page_step_figures ──────────────────────────────────────────────────────────────────
-- Added: ENGNEER-340 (pending build as of 2026-05-07)
-- Stores figure captions per page+step. V1: text markers only ([INSERIRE FIGURA: {caption}]).
-- No seed data required. Table is created by migration.
-- Verify table exists:
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'page_step_figures';

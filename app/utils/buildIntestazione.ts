// app/utils/buildIntestazione.ts
//
// Assembles the Intestazione cover page for step 1 (type_a).
// Pure function — no Vue, no side effects, no API calls.
// Mirrors the server-side buildPremessa pattern.

import { formatDateLong } from "~/utils/date";
import { renderTemplate } from "~/utils/renderTemplate";

export const DEFAULT_LEGAL_CITATION =
  "Articolo 6 del decreto-legge 21 ottobre 2021, n. 146, convertito, con modificazioni, dalla legge 17 dicembre 2021, n. 215, così come successivamente modificato dalla legge 30 dicembre 2021, n. 234";

export interface IntestazioneParams {
  programTitle: string;
  legalCitation?: string;
  companyName: string;
  companyForm: string;
  legalRepresentative: string;
  taxYear: number | string | null;
  templateOverride?: string | null;
}

export function buildIntestazione({
  programTitle,
  legalCitation,
  companyName,
  companyForm,
  legalRepresentative,
  taxYear,
  templateOverride,
}: IntestazioneParams): string {
  const company = companyForm ? `${companyName} ${companyForm}`.trim() : companyName;
  const year = taxYear ?? "[ANNO DI IMPOSTA]";
  const rep = legalRepresentative || "[LEGALE RAPPRESENTANTE]";
  const citation = legalCitation || DEFAULT_LEGAL_CITATION;
  const title = programTitle || "[TITOLO DEL PROGRAMMA]";
  const date = formatDateLong();

  if (templateOverride?.trim()) {
    return renderTemplate(templateOverride, {
      program_title: title,
      titolo_del_programma: title,
      legal_citation: citation,
      citazione_normativa: citation,
      company_name: company,
      ragione_sociale: company,
      tax_year: year,
      anno_di_imposta: year,
      legal_representative: rep,
      legale_rappresentante: rep,
      data_di_redazione: date,
      draft_date: date,
    });
  }

  return `Documentazione per l'accesso al regime Patent Box — Relazione Illustrativa

Titolo del programma: ${title}

Ragione sociale: ${company}
Anno di imposta: ${year}
Legale rappresentante: ${rep}
Data di redazione: ${date}

La presente documentazione è predisposta in esercizio dell'opzione per il regime Patent Box ai sensi del ${citation}, al fine di fornire la descrizione delle attività rilevanti svolte e delle spese sostenute per il loro svolgimento.

Il sottoscritto ${rep}, in qualità di legale rappresentante della società ${company}, attesta che le informazioni contenute nella presente documentazione sono veritiere, complete e conformi alle risultanze contabili aziendali.`;
}

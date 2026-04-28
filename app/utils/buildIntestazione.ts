// app/utils/buildIntestazione.ts
//
// Assembles the Intestazione cover page for step 1 (type_a).
// Pure function — no Vue, no side effects, no API calls.
// Mirrors the server-side buildPremessa pattern.

import { formatDateLong } from "~/utils/date";

export interface IntestazioneParams {
  programTitle: string;
  legalCitation: string;
  companyName: string;
  companyForm: string;
  legalRepresentative: string;
  taxYear: number | string | null;
}

export function buildIntestazione({
  programTitle,
  legalCitation,
  companyName,
  companyForm,
  legalRepresentative,
  taxYear,
}: IntestazioneParams): string {
  const company = companyForm ? `${companyName} ${companyForm}`.trim() : companyName;
  const year = taxYear ?? "[ANNO DI IMPOSTA]";
  const rep = legalRepresentative || "[LEGALE RAPPRESENTANTE]";
  const citation = legalCitation || "[CITAZIONE NORMATIVA]";
  const title = programTitle || "[TITOLO DEL PROGRAMMA]";
  const date = formatDateLong();

  return `Documentazione per l'accesso al regime Patent Box — Relazione Illustrativa

Titolo del programma: ${title}

Ragione sociale: ${company}
Anno di imposta: ${year}
Legale rappresentante: ${rep}
Data di redazione: ${date}

La presente documentazione è predisposta in esercizio dell'opzione per il regime Patent Box ai sensi del ${citation}, al fine di fornire la descrizione delle attività rilevanti svolte e delle spese sostenute per il loro svolgimento.

Il sottoscritto ${rep}, in qualità di legale rappresentante della società ${company}, attesta che le informazioni contenute nella presente documentazione sono veritiere, complete e conformi alle risultanze contabili aziendali.`;
}

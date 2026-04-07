// app/utils/date.ts
//
// Date formatting utilities.
// Pure functions — no side effects, no external dependencies.
// Used by: clients/[id]/index.vue, any future component needing Italian date display.

const MONTHS_IT = [
  "Gen", "Feb", "Mar", "Apr", "Mag", "Giu",
  "Lug", "Ago", "Set", "Ott", "Nov", "Dic",
];

/**
 * Formats an ISO datetime string into Italian short date.
 * e.g. "2024-03-15T10:30:00Z" → "15 Mar 2024"
 */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS_IT[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Formats an ISO date string (YYYY-MM-DD) into Italian format.
 * e.g. "1970-01-01" → "01/01/1970"
 * Used by useClientFields for legal document descriptions.
 */
export function formatISODate(isoDate: string): string {
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

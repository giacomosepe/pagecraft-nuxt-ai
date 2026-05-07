// app/utils/folderStatus.ts
//
// Derives a folder's display status from its child pages.
// Pure function — takes an array of page status strings, returns a status key.
//
// Rules (in priority order):
//   1. No pages → "attesa_info"
//   2. All pages completed/archived → "completato"
//   3. Any page "in_revisione" → "in_revisione"
//   4. Any page "in_lavorazione" → "in_lavorazione"
//   5. Mixed/older waiting statuses → "attesa_info"

export function deriveFolderStatus(pages: { status: string }[]): string {
  if (!pages || pages.length === 0) return "attesa_info";
  if (pages.every((p) => ["completato", "archiviato"].includes(p.status))) return "completato";
  if (pages.some((p) => p.status === "in_revisione")) return "in_revisione";
  if (pages.some((p) => p.status === "in_lavorazione")) return "in_lavorazione";
  return "attesa_info";
}

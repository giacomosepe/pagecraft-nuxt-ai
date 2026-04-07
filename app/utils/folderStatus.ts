// app/utils/folderStatus.ts
//
// Derives a folder's display status from its child pages.
// Pure function — takes an array of page status strings, returns a status key.
//
// Rules (in priority order):
//   1. No pages → "in_attesa"
//   2. Any page "in_lavorazione" → "in_lavorazione"
//   3. All pages "in_attesa" → "in_attesa"
//   4. All pages "completato" or "archiviato" → "completato"
//   5. Mixed → "in_lavorazione"

export function deriveFolderStatus(pages: { status: string }[]): string {
  if (!pages || pages.length === 0) return "in_attesa";
  if (pages.some((p) => p.status === "in_lavorazione")) return "in_lavorazione";
  if (pages.every((p) => p.status === "in_attesa")) return "in_attesa";
  if (pages.every((p) => ["completato", "archiviato"].includes(p.status))) return "completato";
  return "in_lavorazione";
}

// app/utils/status.ts
//
// Status label and color maps shared across the UI.
// Pure lookup objects — import these wherever a status badge is rendered.
// Currently used by: clients/[id]/index.vue (folder status badges).
// Future use: pages, steps, any entity with a status field.

type BadgeColor = "error" | "primary" | "secondary" | "success" | "info" | "warning" | "neutral";

/**
 * Maps status keys to NuxtUI badge color names.
 * Type is constrained to the exact union NuxtUI's UBadge accepts.
 */
export const statusColor: Record<string, BadgeColor> = {
  // Folder / page statuses
  attesa_info:    "warning",
  in_attesa:      "warning",
  in_lavorazione: "info",
  in_revisione:   "secondary",
  completato:     "success",
  archiviato:     "neutral",

  // Client statuses
  aperto:         "info",
  chiuso:         "neutral",

  // Step statuses (uppercase — matches DB enum)
  PENDING:        "warning",
  IN_PROGRESS:    "info",
  COMMITTED:      "success",
};

/**
 * Maps status keys to human-readable Italian labels.
 */
export const statusLabel: Record<string, string> = {
  // Folder / page statuses
  attesa_info:    "Attesa info",
  in_attesa:      "In attesa",
  in_lavorazione: "In lavorazione",
  in_revisione:   "In revisione",
  completato:     "Completato",
  archiviato:     "Archiviato",

  // Client statuses
  aperto:         "Aperto",
  chiuso:         "Chiuso",

  // Step statuses
  PENDING:        "In attesa",
  IN_PROGRESS:    "In lavorazione",
  COMMITTED:      "Salvato",
};

export function statusToneClass(status: string): string {
  switch (status) {
    case "completato":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
    case "in_revisione":
      return "bg-violet-50 text-violet-700 ring-1 ring-violet-200";
    case "in_lavorazione":
      return "bg-blue-50 text-blue-700 ring-1 ring-blue-200";
    case "attesa_info":
    case "in_attesa":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
    case "aperto":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
    case "chiuso":
    case "archiviato":
      return "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
    default:
      return "bg-blue-50 text-blue-700 ring-1 ring-blue-200";
  }
}

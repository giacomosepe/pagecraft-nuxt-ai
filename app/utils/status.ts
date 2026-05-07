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

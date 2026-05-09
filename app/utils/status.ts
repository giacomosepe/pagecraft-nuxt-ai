// app/utils/status.ts
//
// Status label and color maps shared across the UI.
// Pure lookup objects — import these wherever a status badge is rendered.
// Currently used by: clients/[id]/index.vue (folder status badges).
// Future use: pages, steps, any entity with a status field.

import {
  CLIENT_STATUS,
  DOCUMENT_STATUS,
  STEP_STATUS,
} from "~/utils/statuses";

type BadgeColor = "error" | "primary" | "secondary" | "success" | "info" | "warning" | "neutral";

/**
 * Maps status keys to NuxtUI badge color names.
 * Type is constrained to the exact union NuxtUI's UBadge accepts.
 */
export const statusColor: Record<string, BadgeColor> = {
  // Folder / page statuses
  [DOCUMENT_STATUS.WAITING_INFO]: "warning",
  [DOCUMENT_STATUS.WAITING]:      "warning",
  [DOCUMENT_STATUS.IN_PROGRESS]:  "info",
  [DOCUMENT_STATUS.IN_REVIEW]:    "secondary",
  [DOCUMENT_STATUS.COMPLETED]:    "success",
  [DOCUMENT_STATUS.ARCHIVED]:     "neutral",

  // Client statuses
  [CLIENT_STATUS.OPEN]:           "info",
  [CLIENT_STATUS.CLOSED]:         "neutral",

  // Step statuses (uppercase — matches DB enum)
  [STEP_STATUS.PENDING]:          "warning",
  [STEP_STATUS.IN_PROGRESS]:      "info",
  [STEP_STATUS.COMMITTED]:        "success",
};

/**
 * Maps status keys to human-readable Italian labels.
 */
export const statusLabel: Record<string, string> = {
  // Folder / page statuses
  [DOCUMENT_STATUS.WAITING_INFO]: "Attesa info",
  [DOCUMENT_STATUS.WAITING]:      "In attesa",
  [DOCUMENT_STATUS.IN_PROGRESS]:  "In lavorazione",
  [DOCUMENT_STATUS.IN_REVIEW]:    "In revisione",
  [DOCUMENT_STATUS.COMPLETED]:    "Completato",
  [DOCUMENT_STATUS.ARCHIVED]:     "Archiviato",

  // Client statuses
  [CLIENT_STATUS.OPEN]:           "Aperto",
  [CLIENT_STATUS.CLOSED]:         "Chiuso",

  // Step statuses
  [STEP_STATUS.PENDING]:          "In attesa",
  [STEP_STATUS.IN_PROGRESS]:      "In lavorazione",
  [STEP_STATUS.COMMITTED]:        "Salvato",
};

export function statusToneClass(status: string): string {
  switch (status) {
    case DOCUMENT_STATUS.COMPLETED:
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
    case DOCUMENT_STATUS.IN_REVIEW:
      return "bg-violet-50 text-violet-700 ring-1 ring-violet-200";
    case DOCUMENT_STATUS.IN_PROGRESS:
      return "bg-blue-50 text-blue-700 ring-1 ring-blue-200";
    case DOCUMENT_STATUS.WAITING_INFO:
    case DOCUMENT_STATUS.WAITING:
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
    case CLIENT_STATUS.OPEN:
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
    case CLIENT_STATUS.CLOSED:
    case DOCUMENT_STATUS.ARCHIVED:
      return "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
    default:
      return "bg-blue-50 text-blue-700 ring-1 ring-blue-200";
  }
}

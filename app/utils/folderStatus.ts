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

import {
  CLOSED_DOCUMENT_STATUSES,
  DOCUMENT_STATUS,
  FOLDER_STATUS,
  type DocumentStatus,
  type FolderStatus,
} from "~/utils/statuses";

export function deriveFolderStatus(pages: { status: string }[]): FolderStatus {
  if (!pages || pages.length === 0) return FOLDER_STATUS.WAITING_INFO;
  if (pages.every((p) => CLOSED_DOCUMENT_STATUSES.includes(p.status as DocumentStatus))) {
    return FOLDER_STATUS.COMPLETED;
  }
  if (pages.some((p) => p.status === DOCUMENT_STATUS.IN_REVIEW)) return FOLDER_STATUS.IN_REVIEW;
  if (pages.some((p) => p.status === DOCUMENT_STATUS.IN_PROGRESS)) return FOLDER_STATUS.IN_PROGRESS;
  return FOLDER_STATUS.WAITING_INFO;
}

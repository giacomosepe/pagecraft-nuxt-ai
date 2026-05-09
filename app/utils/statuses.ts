export const CLIENT_STATUS = {
  OPEN: "aperto",
  CLOSED: "chiuso",
  COMPLETED: "completato",
} as const;

export type ClientStatus = typeof CLIENT_STATUS[keyof typeof CLIENT_STATUS];

export const DOCUMENT_STATUS = {
  WAITING: "in_attesa",
  WAITING_INFO: "attesa_info",
  IN_PROGRESS: "in_lavorazione",
  IN_REVIEW: "in_revisione",
  COMPLETED: "completato",
  ARCHIVED: "archiviato",
} as const;

export type DocumentStatus = typeof DOCUMENT_STATUS[keyof typeof DOCUMENT_STATUS];

export const FOLDER_STATUS = {
  WAITING_INFO: "attesa_info",
  WAITING: "in_attesa",
  IN_PROGRESS: "in_lavorazione",
  IN_REVIEW: "in_revisione",
  COMPLETED: "completato",
  ARCHIVED: "archiviato",
} as const;

export type FolderStatus = typeof FOLDER_STATUS[keyof typeof FOLDER_STATUS];

export const STEP_STATUS = {
  PENDING: "PENDING",
  IN_PROGRESS: "IN_PROGRESS",
  COMMITTED: "COMMITTED",
  SKIPPED: "SKIPPED",
} as const;

export type StepStatus = typeof STEP_STATUS[keyof typeof STEP_STATUS];

export const ACTIVE_FOLDER_STATUSES: FolderStatus[] = [
  FOLDER_STATUS.WAITING_INFO,
  FOLDER_STATUS.WAITING,
  FOLDER_STATUS.IN_PROGRESS,
  FOLDER_STATUS.IN_REVIEW,
];

export const CLOSED_FOLDER_STATUSES: FolderStatus[] = [
  FOLDER_STATUS.COMPLETED,
  FOLDER_STATUS.ARCHIVED,
];

export const CLOSED_DOCUMENT_STATUSES: DocumentStatus[] = [
  DOCUMENT_STATUS.COMPLETED,
  DOCUMENT_STATUS.ARCHIVED,
];

export const CLOSED_CLIENT_STATUSES: ClientStatus[] = [
  CLIENT_STATUS.CLOSED,
  CLIENT_STATUS.COMPLETED,
];

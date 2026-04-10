<script setup lang="ts">
import type { TableColumn, TableRow } from "@nuxt/ui";
import { formatDate } from "~/utils/date";
import { deriveFolderStatus } from "~/utils/folderStatus";
import type { FolderItem, FolderTableRow } from "~/types/app.types";

const props = defineProps<{
  folders: FolderItem[] | null | undefined;
}>();

// ─── Column definitions ────────────────────────────────────────────────────────
const columns: TableColumn<FolderTableRow>[] = [
  { accessorKey: "programName", header: "Programma" },
  { accessorKey: "status", header: "Stato" },
  { accessorKey: "documenti", header: "Documenti" },
  { accessorKey: "lastModified", header: "Ultima modifica" },
  { accessorKey: "id", header: "" },
];

// ─── Row helpers ────────────────────────────────────────────────────────────────
function lastModified(folder: FolderItem): string {
  const pages = folder.pages ?? [];
  if (!pages.length) return formatDate(folder.updated_at);
  const latest = pages
    .map((p) => p.updated_at)
    .reduce((max, d) => (new Date(d) > new Date(max) ? d : max));
  return formatDate(latest);
}

function documenti(folder: FolderItem): string {
  const pages = folder.pages ?? [];
  const completed = pages.filter((p) => p.status === "completato").length;
  return `${completed} / ${pages.length}`;
}

// ─── Computed rows ──────────────────────────────────────────────────────────────
const rows = computed<FolderTableRow[]>(() =>
  (props.folders ?? []).map((f) => ({
    id: f.id,
    programName: f.program_name ?? "—",
    documenti: documenti(f),
    lastModified: lastModified(f),
    status: deriveFolderStatus(f.pages ?? []),
  })),
);

const tableMeta = { class: { tr: "cursor-pointer" } };

function onSelect(_e: Event, row: TableRow<FolderTableRow>): void {
  navigateTo(`/folders/${row.original.id}`);
}
</script>

<template>
  <!-- Empty state -->
  <div
    v-if="!rows.length"
    class="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center"
    style="border-color: var(--color-border)"
  >
    <UIcon
      name="i-lucide-folder-open"
      class="mb-3 size-9"
      style="color: var(--color-text-placeholder)"
    />
    <p class="text-sm font-medium" style="color: var(--color-text-primary)">
      Nessun programma
    </p>
    <p class="mt-1 text-xs" style="color: var(--color-text-muted)">
      Crea il primo documento per avviare un programma
    </p>
  </div>

  <!-- Folder table -->
  <UTable
    v-else
    :data="rows"
    :columns="columns"
    :meta="tableMeta"
    :on-select="onSelect"
  >
    <template #status-cell="{ row }">
      <BaseStatusBadge :status="row.original.status" />
    </template>
    <template #id-cell="{ row }">
      <NuxtLink
        :to="`/folders/${row.original.id}`"
        class="text-sm transition-colors hover:underline"
        style="color: var(--color-brand)"
        @click.stop
      >
        Apri →
      </NuxtLink>
    </template>
  </UTable>
</template>

<script setup lang="ts">
import { formatDate } from "~/utils/date";
import { deriveFolderStatus } from "~/utils/folderStatus";
import { statusLabel } from "~/utils/status";
import { DOCUMENT_STATUS } from "~/utils/statuses";
import type { FolderItem } from "~/types/app.types";

const props = defineProps<{
  folders: FolderItem[] | null | undefined;
}>();

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
  const completed = pages.filter((p) => p.status === DOCUMENT_STATUS.COMPLETED).length;
  return `${completed} / ${pages.length}`;
}

const rows = computed(() =>
  (props.folders ?? []).map((folder) => ({
    id: folder.id,
    programName: folder.program_name ?? "—",
    documenti: documenti(folder),
    lastModified: lastModified(folder),
    status: deriveFolderStatus(folder.pages ?? []),
  })),
);
</script>

<template>
  <BaseDetailSection
    title="Progetti"
    description="Apri rapidamente i progetti collegati e controlla il loro avanzamento."
  >
    <div
      v-if="!rows.length"
      class="flex flex-col items-center justify-center py-10 text-center"
    >
      <div class="mb-3 flex size-12 items-center justify-center rounded-2xl bg-slate-100">
        <UIcon
          name="i-lucide-folder-open"
          class="size-6 text-slate-400"
        />
      </div>
      <p class="text-sm font-medium text-slate-900">
        Nessun progetto
      </p>
      <p class="mt-1 text-sm text-slate-500">
        Crea il primo documento per avviare un progetto.
      </p>
    </div>

    <div v-else class="overflow-x-auto rounded-2xl border border-slate-200">
      <div class="min-w-[720px]">
        <div class="grid grid-cols-[minmax(0,1.8fr)_minmax(110px,0.9fr)_minmax(140px,1fr)_minmax(120px,0.95fr)_80px] gap-4 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
          <p>Progetto</p>
          <p>Stato</p>
          <p>Documenti</p>
          <p>Ultima attività</p>
          <p class="text-right">Apri</p>
        </div>

        <NuxtLink
          v-for="row in rows"
          :key="row.id"
          :to="`/folders/${row.id}`"
          class="interactive-row grid grid-cols-[minmax(0,1.8fr)_minmax(110px,0.9fr)_minmax(140px,1fr)_minmax(120px,0.95fr)_80px] items-center gap-4 border-t border-slate-200 px-5 py-4 transition-colors hover:bg-slate-50"
        >
          <div class="min-w-0">
            <p class="truncate text-sm font-semibold text-slate-900">
              {{ row.programName }}
            </p>
          </div>

          <div>
            <span class="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
              {{ statusLabel[row.status] ?? row.status }}
            </span>
          </div>

          <p class="text-sm text-slate-600">
            {{ row.documenti }}
          </p>

          <p class="text-sm text-slate-500">
            {{ row.lastModified }}
          </p>

          <p class="text-right text-sm font-medium text-violet-600">
            Apri
          </p>
        </NuxtLink>
      </div>
    </div>
  </BaseDetailSection>
</template>

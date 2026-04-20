<script setup lang="ts">
import type { DocumentListItem } from "~/types/app.types";
import { formatDate } from "~/utils/date";
import { statusLabel } from "~/utils/status";

const props = defineProps<{
  document: DocumentListItem;
  deleteLoading?: boolean;
}>();

const emit = defineEmits<{
  delete: [document: DocumentListItem];
}>();

const router = useRouter();

const projectName = computed((): string =>
  props.document.folders?.program_name ?? "Programma non collegato",
);

const clientName = computed((): string =>
  props.document.clients?.name ?? "Cliente non collegato",
);

const statusTone = computed((): string => {
  switch (props.document.status) {
    case "completato":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
    case "in_lavorazione":
      return "bg-blue-50 text-blue-700 ring-1 ring-blue-200";
    case "archiviato":
      return "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
    default:
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
  }
});

function openDocument(): void {
  router.push(`/pages/${props.document.id}`);
}

function handleDeleteClick(event: MouseEvent): void {
  event.stopPropagation();
  emit("delete", props.document);
}
</script>

<template>
  <div
    class="grid w-full grid-cols-[minmax(0,2.1fr)_minmax(180px,1.2fr)_minmax(150px,1fr)_minmax(125px,0.9fr)_minmax(120px,0.9fr)_72px] items-center gap-4 border-t border-slate-200 px-6 py-4 transition-colors hover:bg-slate-50"
  >
    <div
      class="interactive-row col-span-5 grid grid-cols-[minmax(0,2.1fr)_minmax(180px,1.2fr)_minmax(150px,1fr)_minmax(125px,0.9fr)_minmax(120px,0.9fr)] items-center gap-4 text-left"
      role="button"
      tabindex="0"
      @click="openDocument"
      @keydown.enter="openDocument"
      @keydown.space.prevent="openDocument"
    >
      <div class="flex min-w-0 items-start gap-3">
      <div class="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
        <UIcon name="i-lucide-file-text" class="size-5" />
      </div>
      <div class="min-w-0">
        <p class="truncate text-sm font-semibold text-slate-900">
          {{ document.title }}
        </p>
        <p class="truncate text-xs text-slate-500">
          {{ document.framework_name ?? "Framework non definito" }}
        </p>
      </div>
    </div>

    <p class="truncate text-sm text-slate-600">
      {{ projectName }}
    </p>

    <p class="truncate text-sm text-slate-600">
      {{ clientName }}
    </p>

    <div>
      <span
        class="inline-flex rounded-full px-3 py-1 text-xs font-medium"
        :class="statusTone"
      >
        {{ statusLabel[document.status] ?? document.status }}
      </span>
    </div>

    <p class="text-sm text-slate-500">
      {{ formatDate(document.updated_at) }}
    </p>
    </div>

    <div class="flex justify-end">
      <UButton
        color="error"
        variant="soft"
        icon="i-lucide-trash-2"
        class="rounded-xl"
        :loading="deleteLoading"
        @click="handleDeleteClick"
      />
    </div>
  </div>
</template>

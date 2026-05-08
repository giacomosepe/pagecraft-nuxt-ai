<script setup lang="ts">
import type { DocumentListItem } from "~/types/app.types";
import { formatDate } from "~/utils/date";
import { documentListCols } from "~/utils/listLayout";
import { statusLabel, statusToneClass } from "~/utils/status";

const props = defineProps<{
  document: DocumentListItem;
  deleteLoading?: boolean;
  compact?: boolean;
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

const relativeUpdatedAt = computed((): string => {
  const updated = new Date(props.document.updated_at);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - updated.getTime()) / 86_400_000);

  if (diffDays <= 0) return "aggiornato oggi";
  if (diffDays === 1) return "aggiornato ieri";
  if (diffDays < 7) return `aggiornato ${diffDays} giorni fa`;
  return `aggiornato il ${formatDate(props.document.updated_at)}`;
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
    v-if="compact"
    class="grid w-full grid-cols-[minmax(0,1fr)_minmax(120px,auto)_32px] items-center gap-4 border-t border-slate-200 px-6 py-4 transition-colors hover:bg-slate-50"
  >
    <div
      class="interactive-row col-span-3 grid grid-cols-[minmax(0,1fr)_minmax(120px,auto)_32px] items-center gap-4 text-left"
      role="button"
      tabindex="0"
      @click="openDocument"
      @keydown.enter="openDocument"
      @keydown.space.prevent="openDocument"
    >
      <div class="min-w-0">
        <p class="truncate text-sm font-semibold text-slate-900">
          {{ document.title }}
        </p>
        <p class="truncate text-xs text-slate-500">
          {{ document.framework_name ?? "Framework non definito" }}
        </p>
      </div>

      <p class="whitespace-nowrap text-sm text-slate-500">
        {{ relativeUpdatedAt }}
      </p>

      <UIcon name="i-lucide-arrow-right" class="size-4 text-slate-400" />
    </div>
  </div>

  <div
    v-else
    class="grid w-full items-center gap-4 border-t border-slate-200 px-6 py-4 transition-colors hover:bg-slate-50"
    :class="documentListCols"
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
        :class="statusToneClass(props.document.status)"
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

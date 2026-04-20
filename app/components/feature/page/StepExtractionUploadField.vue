<script setup lang="ts">
interface UploadField {
  key: string;
  label: string;
  hint?: string;
  required?: boolean;
}

interface VisuraExtractResult {
  shareholders: unknown[];
  subsidiaries: unknown[];
  missing: {
    shareholders: { index: number; name: string; missing: string[] }[];
    subsidiaries: { index: number; name: string; missing: string[] }[];
  };
}

const props = defineProps<{
  field: UploadField;
  selectedFile?: File | null;
  disabled: boolean;
  isExtracting: boolean;
  error?: string | null;
  result?: VisuraExtractResult | null;
  savedValue?: unknown;
  showRequiredHint: boolean;
}>();

const emit = defineEmits<{
  selectFile: [file: File | null];
  extract: [];
}>();

const inputRef = ref<HTMLInputElement | null>(null);

function onChange(event: Event): void {
  const file = (event.target as HTMLInputElement).files?.[0] ?? null;
  emit("selectFile", file);
}

const savedFilename = computed(() => {
  if (
    props.savedValue &&
    typeof props.savedValue === "object" &&
    !Array.isArray(props.savedValue)
  ) {
    return (props.savedValue as Record<string, unknown>).filename ?? "file.pdf";
  }

  return "file.pdf";
});
</script>

<template>
  <StepFieldShell
    :label="field.label"
    :hint="field.hint"
    :required="field.required"
  >
    <div class="space-y-4 rounded-[24px] border border-slate-200 bg-white p-4 sm:p-5">
      <div class="flex flex-col gap-3 rounded-[20px] border border-dashed border-slate-300 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <input
          ref="inputRef"
          type="file"
          accept=".pdf"
          class="sr-only"
          :disabled="disabled || isExtracting"
          @change="onChange"
        />

        <UButton
          type="button"
          variant="outline"
          color="neutral"
          size="sm"
          icon="i-lucide-paperclip"
          class="rounded-xl border-slate-300 bg-white"
          :disabled="disabled || isExtracting"
          @click="inputRef?.click()"
        >
          Scegli file
        </UButton>

        <span
          class="text-xs leading-5"
          :class="selectedFile ? 'text-slate-700' : 'text-slate-500'"
        >
          {{ selectedFile?.name ?? 'Nessun file selezionato' }}
        </span>
      </div>

      <UButton
        size="sm"
        variant="outline"
        color="neutral"
        icon="i-lucide-scan-text"
        class="rounded-xl border-slate-300 bg-white sm:w-fit"
        :loading="isExtracting"
        :disabled="!selectedFile || disabled || isExtracting"
        @click="emit('extract')"
      >
        Estrai dalla visura
      </UButton>

      <UAlert
        v-if="error"
        color="error"
        variant="soft"
        :description="error"
        icon="i-lucide-circle-alert"
        size="sm"
      />

      <div
        v-if="result"
        class="rounded-[20px] border border-emerald-200 bg-emerald-50 p-4"
      >
        <div class="mb-2 flex items-center gap-1.5">
          <UIcon
            name="i-lucide-check-circle"
            class="size-4 text-emerald-600"
          />
          <span class="text-sm font-semibold text-emerald-800">
            Estrazione completata
          </span>
        </div>
        <ul class="space-y-1 text-xs text-emerald-800/90">
          <li>
            {{ (result.shareholders ?? []).length }} soci estratti
          </li>
          <li>
            {{ (result.subsidiaries ?? []).length }} partecipate estratte
          </li>
        </ul>

        <div
          v-if="
            (result.missing?.shareholders?.length ?? 0) > 0 ||
            (result.missing?.subsidiaries?.length ?? 0) > 0
          "
          class="mt-3 text-xs leading-5 text-emerald-700"
        >
          <span class="font-medium">Dati mancanti:</span>
          <span
            v-for="entry in [
              ...(result.missing?.shareholders ?? []),
              ...(result.missing?.subsidiaries ?? []),
            ]"
            :key="`${entry.name}-${entry.index}`"
            class="block"
          >
            {{ entry.name }}: {{ entry.missing.join(', ') }}
          </span>
        </div>

        <p
          v-if="savedValue"
          class="mt-3 text-xs text-emerald-700"
        >
          I dati estratti sono stati salvati per la generazione AI.
        </p>
      </div>

      <div
        v-else-if="savedValue && !isExtracting"
        class="rounded-[20px] border border-slate-200 bg-slate-50 p-4"
      >
        <div class="flex items-center gap-1.5">
          <UIcon
            name="i-lucide-check-circle"
            class="size-4 text-violet-600"
          />
          <span class="text-sm font-semibold text-slate-900">
            Visura già estratta — {{ savedFilename }}
          </span>
        </div>
        <p class="mt-2 text-xs leading-5 text-slate-500">
          Carica un nuovo PDF e clicca "Estrai dalla visura" per aggiornare i dati.
        </p>
      </div>

      <p
        v-if="showRequiredHint"
        class="text-xs font-medium text-slate-500"
      >
        Carica la visura per abilitare la generazione
      </p>
    </div>
  </StepFieldShell>
</template>

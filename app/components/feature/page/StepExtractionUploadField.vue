<script setup lang="ts">
interface UploadField {
  key: string;
  label: string;
  hint?: string;
  required?: boolean;
}

interface VisuraExtractResult {
	  soci?: unknown[];
	  partecipate?: unknown[];
	  shareholders: unknown[];
	  subsidiaries: unknown[];
	  missing: {
	    soci?: { index: number; name: string; missing: string[] }[];
	    partecipate?: { index: number; name: string; missing: string[] }[];
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
	  editExtractionRule: [];
	  clearFile: [];
	}>();

const inputRef = ref<HTMLInputElement | null>(null);

function onChange(event: Event): void {
  const file = (event.target as HTMLInputElement).files?.[0] ?? null;
  emit("selectFile", file);
}

function clearFile(): void {
  if (inputRef.value) inputRef.value.value = "";
  emit("clearFile");
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

const missingEntries = computed(() => [
	  ...(props.result?.missing?.soci ?? props.result?.missing?.shareholders ?? []),
	  ...(props.result?.missing?.partecipate ?? props.result?.missing?.subsidiaries ?? []),
	]);

const sociCount = computed(() => (props.result?.soci ?? props.result?.shareholders ?? []).length);
const partecipateCount = computed(() => (props.result?.partecipate ?? props.result?.subsidiaries ?? []).length);
</script>

<template>
  <StepFieldShell
    :label="field.label"
    :hint="field.hint"
    :required="field.required"
  >
    <div class="space-y-3">
      <div class="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-3">
        <input
          ref="inputRef"
          type="file"
          accept=".pdf"
          class="sr-only"
          :disabled="disabled || isExtracting"
          @change="onChange"
        />

        <div class="flex items-start justify-between gap-3">
          <button
            type="button"
            class="min-w-0 text-left text-xs leading-5"
            :class="selectedFile || savedValue ? 'text-slate-700' : 'text-slate-500'"
            :disabled="disabled || isExtracting"
            @click="inputRef?.click()"
          >
            {{ selectedFile?.name ?? (savedValue ? savedFilename : 'Nessun file selezionato') }}
          </button>

          <UButton
            v-if="selectedFile || savedValue"
            variant="ghost"
            color="error"
            size="xs"
            icon="i-lucide-trash-2"
            class="shrink-0 rounded-md"
            aria-label="Cancella file"
            :disabled="disabled || isExtracting"
            @click="clearFile"
          />
        </div>

        <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          <UButton
            variant="link"
            color="primary"
            size="xs"
            class="px-0"
            :disabled="disabled || isExtracting"
            @click="inputRef?.click()"
          >
            Scegli file
          </UButton>

          <UButton
            variant="link"
            color="primary"
            size="xs"
            class="px-0"
            :loading="isExtracting"
            :disabled="!selectedFile || disabled || isExtracting"
            @click="emit('extract')"
          >
            Estrai dalla visura
          </UButton>

          <UButton
            v-if="selectedFile"
            variant="link"
            color="neutral"
            size="xs"
            icon="i-lucide-eye"
            class="px-0 text-slate-600 hover:text-slate-900"
            :disabled="disabled || isExtracting"
            @click="emit('editExtractionRule')"
          >
            Regola di estrazione
          </UButton>
        </div>
      </div>

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
        class="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3"
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
	            {{ sociCount }} soci estratti
          </li>
          <li>
	            {{ partecipateCount }} partecipate estratte
          </li>
        </ul>

        <div
          v-if="missingEntries.length"
          class="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3"
        >
          <div class="flex items-start gap-2">
            <UIcon
              name="i-lucide-triangle-alert"
              class="mt-0.5 size-4 shrink-0 text-amber-600"
            />
            <div class="space-y-2">
              <p class="text-xs font-semibold uppercase tracking-[0.08em] text-amber-800">
                Dati da completare
              </p>
              <ul class="space-y-1 text-xs leading-5 text-amber-800">
                <li
                  v-for="entry in missingEntries"
                  :key="`${entry.name}-${entry.index}`"
                >
                  <span class="font-semibold">{{ entry.name }}:</span>
                  {{ entry.missing.join(', ') }}
                </li>
              </ul>
            </div>
          </div>
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
        class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3"
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

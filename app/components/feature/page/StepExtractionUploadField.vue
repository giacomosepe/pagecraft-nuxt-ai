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
    <div class="flex flex-col gap-6">
      <div class="flex items-center gap-12">
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
          :disabled="disabled || isExtracting"
          @click="inputRef?.click()"
        >
          Scegli file
        </UButton>

        <span
          class="text-xs"
          :style="selectedFile ? 'color: var(--color-text-primary)' : 'color: var(--color-text-muted)'"
        >
          {{ selectedFile?.name ?? 'Nessun file selezionato' }}
        </span>
      </div>

      <UButton
        size="sm"
        variant="outline"
        color="neutral"
        icon="i-lucide-scan-text"
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
        class="rounded-md border p-3"
        style="border-color: var(--color-border-subtle); background-color: var(--color-surface-subtle)"
      >
        <div class="mb-2 flex items-center gap-1.5">
          <UIcon
            name="i-lucide-check-circle"
            class="size-3.5"
            style="color: var(--color-brand)"
          />
          <span class="text-xs font-medium" style="color: var(--color-text-primary)">
            Estrazione completata
          </span>
        </div>
        <ul class="space-y-1 text-xs" style="color: var(--color-text-secondary)">
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
          class="mt-2 text-xs"
          style="color: var(--color-text-muted)"
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
          class="mt-2 text-xs"
          style="color: var(--color-text-muted)"
        >
          I dati estratti sono stati salvati per la generazione AI.
        </p>
      </div>

      <div
        v-else-if="savedValue && !isExtracting"
        class="rounded-md border p-3"
        style="border-color: var(--color-border-subtle); background-color: var(--color-surface-subtle)"
      >
        <div class="flex items-center gap-1.5">
          <UIcon
            name="i-lucide-check-circle"
            class="size-3.5"
            style="color: var(--color-brand)"
          />
          <span class="text-xs font-medium" style="color: var(--color-text-primary)">
            Visura già estratta — {{ savedFilename }}
          </span>
        </div>
        <p class="mt-1 text-xs" style="color: var(--color-text-muted)">
          Carica un nuovo PDF e clicca "Estrai dalla visura" per aggiornare i dati.
        </p>
      </div>

      <p
        v-if="showRequiredHint"
        class="text-xs"
        style="color: var(--color-text-muted)"
      >
        Carica la visura per abilitare la generazione
      </p>
    </div>
  </StepFieldShell>
</template>

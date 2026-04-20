<script setup lang="ts">
interface UploadField {
  label: string;
  hint?: string;
  required?: boolean;
  accept?: string[];
}

defineProps<{
  field: UploadField;
  disabled: boolean;
  loading: boolean;
  error?: string | null;
  savedValue?: unknown;
}>();

const emit = defineEmits<{
  selectFile: [file: File | null];
}>();

const inputRef = ref<HTMLInputElement | null>(null);
const selectedFilename = ref("");

function onChange(event: Event): void {
  const file = (event.target as HTMLInputElement).files?.[0] ?? null;
  selectedFilename.value = file?.name ?? "";
  emit("selectFile", file);
}
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
          :accept="(field.accept ?? []).join(',')"
          :disabled="disabled || loading"
          class="sr-only"
          @change="onChange"
        />

        <UButton
          type="button"
          variant="outline"
          color="neutral"
          size="sm"
          icon="i-lucide-paperclip"
          class="rounded-xl border-slate-300 bg-white"
          :disabled="disabled || loading"
          @click="inputRef?.click()"
        >
          Carica allegato
        </UButton>

        <span class="text-xs leading-5 text-slate-500">
          {{ selectedFilename || String(savedValue ?? "Nessun file selezionato") }}
        </span>
      </div>

      <div
        v-if="loading"
        class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600"
      >
        <UIcon name="i-lucide-loader-circle" class="size-3.5 animate-spin" />
        Caricamento in corso...
      </div>

      <div
        v-else-if="savedValue"
        class="rounded-[20px] border border-slate-200 bg-slate-50 p-4"
      >
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-check-circle" class="size-4 text-violet-600" />
          <span class="text-sm font-semibold text-slate-900">
            Allegato pronto per la generazione
          </span>
        </div>
        <p class="mt-2 text-xs leading-5 text-slate-500">
          Il file è stato salvato come contesto di supporto per l’AI.
        </p>
      </div>

      <UAlert
        v-if="error"
        color="error"
        variant="soft"
        :description="error"
        icon="i-lucide-circle-alert"
        size="sm"
      />
    </div>
  </StepFieldShell>
</template>

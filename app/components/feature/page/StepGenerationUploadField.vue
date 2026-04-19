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

function onChange(event: Event): void {
  const file = (event.target as HTMLInputElement).files?.[0] ?? null;
  emit("selectFile", file);
}
</script>

<template>
  <StepFieldShell
    :label="field.label"
    :hint="field.hint"
    :required="field.required"
  >
    <div class="flex flex-col gap-2">
      <div class="flex items-center gap-2">
        <input
          type="file"
          :accept="(field.accept ?? []).join(',')"
          :disabled="disabled || loading"
          class="block w-full text-xs file:mr-3 file:rounded file:border-0 file:px-3 file:py-1 file:text-xs file:font-medium"
          style="color: var(--color-text-secondary)"
          @change="onChange"
        />

        <span
          v-if="loading"
          class="flex shrink-0 items-center gap-1.5 text-xs"
          style="color: var(--color-text-muted)"
        >
          <UIcon name="i-lucide-loader-circle" class="size-3.5 animate-spin" />
          Caricamento...
        </span>

        <span
          v-else-if="savedValue"
          class="shrink-0 text-xs"
          style="color: var(--color-text-muted)"
        >
          {{ savedValue }}
        </span>
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

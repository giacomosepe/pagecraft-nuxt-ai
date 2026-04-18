<script setup lang="ts">
// app/components/feature/page/StepEditor.vue
//
// Center panel of the document editor for a single step.
// Renders step title and form fields driven by form_schema JSONB.
// Generation action buttons (generate / refine) emit to the parent page.
//
// Generation state lives in the parent page (via useGeneration).
// This component receives generate/refine as emits and isGenerating as prop
// so that output is shared with StepOutput on the same page.

import type { StepRecord } from "~/types/app.types";

// ─── Form field schema (cast from form_schema JSONB) ──────────────────────────
interface FormField {
  key: string;
  label: string;
  type:
    | "text"
    | "textarea"
    | "select"
    | "number"
    | "file"
    | "multiselect"
    | "repeatable_group"
    | "visura_upload";
  options?: string[];
  placeholder?: string;
  hint?: string;
  required?: boolean;
  accept?: string[]; // file and visura_upload only
  conditional?: { key: string; value: string }; // show only when another field equals value
  // repeatable_group only:
  minItems?: number;
  addLabel?: string;
  fields?: FormField[];
}

// ─── Visura extraction result types ───────────────────────────────────────────
interface VisuraExtractResult {
  shareholders: unknown[];
  subsidiaries: unknown[];
  missing: {
    shareholders: { index: number; name: string; missing: string[] }[];
    subsidiaries: { index: number; name: string; missing: string[] }[];
  };
}

// ─── Props ────────────────────────────────────────────────────────────────────
const props = defineProps<{
  activeStep: StepRecord;
  isGenerating: boolean;
  errorMsg?: string;
}>();

const emit = defineEmits<{
  generate: [];
  refine: [];
}>();

// ─── Form schema ──────────────────────────────────────────────────────────────
const formFields = computed<FormField[]>(() => {
  const schema = props.activeStep.form_schema;
  if (!schema || !Array.isArray(schema)) return [];
  return schema as FormField[];
});

const formValues = ref<Record<string, unknown>>({});

watch(
  () => props.activeStep,
  (step) => {
    const data = step.form_data;
    formValues.value =
      data && typeof data === "object" && !Array.isArray(data)
        ? (data as Record<string, unknown>)
        : {};
    // Pre-load one empty instance for repeatable_group fields with minItems >= 1
    for (const field of formFields.value) {
      if (field.type === "repeatable_group") {
        const existing = formValues.value[field.key];
        const minItems = field.minItems ?? 1;
        if (!Array.isArray(existing) || existing.length === 0) {
          if (minItems >= 1) {
            formValues.value = {
              ...formValues.value,
              [field.key]: [buildEmptyInstance(field)],
            };
          }
        }
      }
    }
  },
  { immediate: true, deep: true },
);

function buildEmptyInstance(field: FormField): Record<string, unknown> {
  const instance: Record<string, unknown> = {};
  for (const subField of field.fields ?? []) {
    instance[subField.key] = subField.type === "multiselect" ? [] : "";
  }
  return instance;
}

async function saveFormField(key: string, value: unknown): Promise<void> {
  const updated = { ...formValues.value, [key]: value };
  formValues.value = updated;
  try {
    await $fetch("/api/db/mutate", {
      method: "POST",
      body: {
        table: "steps",
        operation: "update",
        data: { form_data: updated },
        where: { id: props.activeStep.id },
      },
    });
  } catch (err: unknown) {
    // Non-blocking for most fields — local state already updated optimistically.
    // Re-throw so callers that track loading state (e.g. onFileChange) can handle errors.
    console.error("[StepEditor] saveFormField error:", err);
    throw err;
  }
}

// ─── repeatable_group helpers ─────────────────────────────────────────────────

function getInstances(fieldKey: string): Record<string, unknown>[] {
  const v = formValues.value[fieldKey];
  return Array.isArray(v) ? (v as Record<string, unknown>[]) : [];
}

function addInstance(field: FormField): void {
  const instances = [...getInstances(field.key), buildEmptyInstance(field)];
  saveFormField(field.key, instances);
}

function removeInstance(field: FormField, index: number): void {
  const instances = getInstances(field.key).filter((_, i) => i !== index);
  saveFormField(field.key, instances);
}

function updateInstanceField(
  groupKey: string,
  index: number,
  subKey: string,
  value: unknown,
): void {
  const instances = getInstances(groupKey).map((inst, i) =>
    i === index ? { ...inst, [subKey]: value } : inst,
  );
  saveFormField(groupKey, instances);
}

// Collapsed state per group instance: Map<groupKey, Set<index>>
const collapsedInstances = ref<Record<string, Set<number>>>({});

function isCollapsed(groupKey: string, index: number): boolean {
  return collapsedInstances.value[groupKey]?.has(index) ?? false;
}

function toggleCollapse(groupKey: string, index: number): void {
  const set = collapsedInstances.value[groupKey] ?? new Set<number>();
  if (set.has(index)) {
    set.delete(index);
  } else {
    set.add(index);
  }
  collapsedInstances.value = { ...collapsedInstances.value, [groupKey]: set };
}

function instanceSummary(
  field: FormField,
  instance: Record<string, unknown>,
): string {
  const firstField = field.fields?.[0];
  if (!firstField) return "—";
  const val = instance[firstField.key];
  if (Array.isArray(val)) return val.join(", ") || "—";
  return String(val || "—");
}

// ─── UI state ─────────────────────────────────────────────────────────────────
const showSystemPrompt = ref(false);
const isAiStep = computed(() => !!props.activeStep.system_prompt_template);
const isTypeAStep = computed(() => props.activeStep.step_type === "type_a");

watch(
  () => props.activeStep.id,
  () => {
    showSystemPrompt.value = false;
  },
);

function isFieldVisible(field: FormField): boolean {
  if (!field.conditional) return true;
  return String(formValues.value[field.conditional.key] ?? "") === field.conditional.value;
}

// ─── File upload state (type: "file") ─────────────────────────────────────────

// Per-field loading and error state keyed by field.key
const fileUploading = ref<Record<string, boolean>>({});
const fileUploadError = ref<Record<string, string | null>>({});

// Derived: true when any file field is currently saving
const isAnyFileUploading = computed(() =>
  Object.values(fileUploading.value).some(Boolean),
);

// ─── Visura gate computeds ─────────────────────────────────────────────────────
// isVisuraRequired: true when the current step has a visura_upload field
const isVisuraRequired = computed(() =>
  formFields.value.some((f) => f.type === "visura_upload"),
);

// isVisuraReady: true when no visura is required, OR when extraction result is
// present (either from this session's visuraResult or a previously saved formValues entry)
const isVisuraReady = computed(() => {
  if (!isVisuraRequired.value) return true;
  return formFields.value
    .filter((f) => f.type === "visura_upload")
    .some((f) => visuraResult.value[f.key] != null || formValues.value[f.key] != null);
});

// Reset file upload state when the step changes
watch(
  () => props.activeStep.id,
  () => {
    fileUploading.value = {};
    fileUploadError.value = {};
  },
);

async function onFileChange(fieldKey: string, event: Event): Promise<void> {
  const filename = (event.target as HTMLInputElement).files?.[0]?.name ?? "";
  fileUploading.value = { ...fileUploading.value, [fieldKey]: true };
  fileUploadError.value = { ...fileUploadError.value, [fieldKey]: null };
  try {
    await saveFormField(fieldKey, filename);
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Errore durante il salvataggio del file";
    fileUploadError.value = { ...fileUploadError.value, [fieldKey]: msg };
    console.error("[StepEditor] file save error:", err);
  } finally {
    fileUploading.value = { ...fileUploading.value, [fieldKey]: false };
  }
}

// ─── Visura upload state ───────────────────────────────────────────────────────

// Per-field state keyed by field.key
const visuraFile = ref<Record<string, File | null>>({});
const visuraExtracting = ref<Record<string, boolean>>({});
const visuraError = ref<Record<string, string | null>>({});
const visuraResult = ref<Record<string, VisuraExtractResult | null>>({});

// Reset visura state when the step changes
watch(
  () => props.activeStep.id,
  () => {
    visuraFile.value = {};
    visuraExtracting.value = {};
    visuraError.value = {};
    visuraResult.value = {};
  },
);

function onVisuraFileChange(fieldKey: string, event: Event): void {
  const file = (event.target as HTMLInputElement).files?.[0] ?? null;
  visuraFile.value = { ...visuraFile.value, [fieldKey]: file };
  visuraError.value = { ...visuraError.value, [fieldKey]: null };
  visuraResult.value = { ...visuraResult.value, [fieldKey]: null };
}

async function extractVisura(field: FormField): Promise<void> {
  const file = visuraFile.value[field.key];
  if (!file) return;

  visuraExtracting.value = { ...visuraExtracting.value, [field.key]: true };
  visuraError.value = { ...visuraError.value, [field.key]: null };
  visuraResult.value = { ...visuraResult.value, [field.key]: null };

  try {
    const formData = new FormData();
    formData.append("file", file);

    const result = await $fetch<VisuraExtractResult>("/api/visura/extract-pdf", {
      method: "POST",
      body: formData,
    });

    visuraResult.value = { ...visuraResult.value, [field.key]: result };

    // Persist extracted data to form_data under the field key
    await saveFormField(field.key, {
      filename: file.name,
      shareholders: result.shareholders,
      subsidiaries: result.subsidiaries,
      missing: result.missing,
      extracted_at: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Errore durante l''estrazione dalla visura";
    visuraError.value = { ...visuraError.value, [field.key]: msg };
    console.error("[StepEditor] visura extraction error:", err);
  } finally {
    visuraExtracting.value = { ...visuraExtracting.value, [field.key]: false };
  }
}
</script>

<template>
  <div
    class="flex flex-col"
    style="background-color: var(--color-surface)"
  >
    <!-- Step header -->
    <div
      class="border-b px-4 py-3"
      style="border-color: var(--color-border-subtle)"
    >
      <div class="flex items-center gap-2">
        <div
          class="flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
          style="background-color: var(--color-brand)"
        >
          {{ activeStep.order }}
        </div>
        <h2
          class="text-sm font-semibold"
          style="color: var(--color-text-primary)"
        >
          {{ activeStep.title }}
        </h2>
      </div>
      <p class="mt-1 text-xs" style="color: var(--color-text-muted)">
        <template v-if="isTypeAStep">
          Compila i campi — il contenuto verrà inserito automaticamente nel documento.
        </template>
        <template v-else>
          Descrivi cosa approfondire — l'AI combina le tue istruzioni con il profilo aziendale automaticamente.
        </template>
      </p>
    </div>

    <!-- Generate action bar (AI steps only) -->
    <div
      v-if="isAiStep"
      class="border-b px-4 py-3"
      style="border-color: var(--color-border-subtle)"
    >
      <div class="flex gap-2">
        <UButton
          class="flex-1 justify-center"
          size="sm"
          icon="i-lucide-sparkles"
          :loading="isGenerating"
          :disabled="isGenerating || isAnyFileUploading || !isVisuraReady || isTypeAStep"
          :class="isTypeAStep ? 'opacity-50 cursor-not-allowed' : ''"
          @click="emit('generate')"
        >
          Genera bozza AI
        </UButton>
        <UButton
          class="flex-1 justify-center"
          variant="outline"
          color="neutral"
          size="sm"
          :disabled="isGenerating || isAnyFileUploading || isTypeAStep"
          :class="isTypeAStep ? 'opacity-50 cursor-not-allowed' : ''"
          @click="emit('refine')"
        >
          Raffina
        </UButton>
      </div>
    </div>

    <!-- Form content -->
    <div class="flex flex-col gap-4 p-4">

      <!-- Form fields -->
      <template v-if="formFields.length">
        <div class="flex flex-col gap-5">
          <template v-for="field in formFields" :key="field.key">
            <!-- conditional visibility wrapper -->
            <div v-if="isFieldVisible(field)">

              <!-- ── repeatable_group ─────────────────────────────── -->
              <template v-if="field.type === 'repeatable_group'">
                <div class="flex flex-col gap-3">
                  <label
                    class="block text-xs font-medium"
                    style="color: var(--color-text-secondary)"
                  >
                    {{ field.label }}
                    <span v-if="field.required" class="ml-0.5 text-red-500">*</span>
                  </label>
                  <p v-if="field.hint" class="text-xs" style="color: var(--color-text-muted)">
                    {{ field.hint }}
                  </p>

                  <!-- Instances -->
                  <div
                    v-for="(instance, idx) in getInstances(field.key)"
                    :key="idx"
                    class="rounded-lg border p-3"
                    style="border-color: var(--color-border-subtle); background-color: var(--color-surface-subtle)"
                  >
                    <!-- Instance header -->
                    <div class="mb-2 flex items-center justify-between">
                      <button
                        v-if="getInstances(field.key).length >= 3"
                        class="flex items-center gap-1 text-xs"
                        style="color: var(--color-text-muted)"
                        type="button"
                        @click="toggleCollapse(field.key, idx)"
                      >
                        <UIcon
                          :name="isCollapsed(field.key, idx) ? 'i-lucide-chevron-right' : 'i-lucide-chevron-down'"
                          class="size-3"
                        />
                        <span v-if="isCollapsed(field.key, idx)">
                          {{ instanceSummary(field, instance) }}
                        </span>
                        <span v-else>Comprimi</span>
                      </button>
                      <span v-else class="text-xs font-medium" style="color: var(--color-text-muted)">
                        #{{ idx + 1 }}
                      </span>

                      <UButton
                        variant="ghost"
                        color="neutral"
                        size="xs"
                        icon="i-lucide-x"
                        :disabled="getInstances(field.key).length <= (field.minItems ?? 1) || isGenerating"
                        @click="removeInstance(field, idx)"
                      />
                    </div>

                    <!-- Sub-fields (hidden when collapsed) -->
                    <div v-if="!isCollapsed(field.key, idx)" class="flex flex-col gap-3">
                      <div v-for="subField in field.fields" :key="subField.key">
                        <label
                          class="mb-1 block text-xs font-medium"
                          style="color: var(--color-text-secondary)"
                        >
                          {{ subField.label }}
                          <span v-if="subField.required" class="ml-0.5 text-red-500">*</span>
                        </label>
                        <p v-if="subField.hint" class="mb-1 text-xs" style="color: var(--color-text-muted)">
                          {{ subField.hint }}
                        </p>
                        <!-- select -->
                        <USelect
                          v-if="subField.type === 'select'"
                          :model-value="String(instance[subField.key] ?? '')"
                          :items="subField.options ?? []"
                          class="w-full"
                          :disabled="isGenerating"
                          @update:model-value="updateInstanceField(field.key, idx, subField.key, $event)"
                        />
                        <!-- textarea -->
                        <UTextarea
                          v-else-if="subField.type === 'textarea'"
                          :model-value="String(instance[subField.key] ?? '')"
                          :placeholder="subField.placeholder ?? ''"
                          :rows="4"
                          class="w-full text-sm"
                          :disabled="isGenerating"
                          @update:model-value="updateInstanceField(field.key, idx, subField.key, $event)"
                        />
                        <!-- number -->
                        <UInput
                          v-else-if="subField.type === 'number'"
                          :model-value="String(instance[subField.key] ?? '')"
                          :placeholder="subField.placeholder ?? ''"
                          type="number"
                          class="w-full"
                          :disabled="isGenerating"
                          @update:model-value="updateInstanceField(field.key, idx, subField.key, $event)"
                        />
                        <!-- multiselect (checkbox group) -->
                        <div
                          v-else-if="subField.type === 'multiselect'"
                          class="flex flex-col gap-1.5 mt-1"
                        >
                          <label
                            v-for="opt in subField.options ?? []"
                            :key="opt"
                            class="flex cursor-pointer items-center gap-2 text-xs"
                            style="color: var(--color-text-primary)"
                          >
                            <input
                              type="checkbox"
                              :value="opt"
                              :checked="Array.isArray(instance[subField.key]) && (instance[subField.key] as string[]).includes(opt)"
                              :disabled="isGenerating"
                              class="rounded"
                              @change="updateInstanceField(
                                field.key, idx, subField.key,
                                (instance[subField.key] as string[] ?? []).includes(opt)
                                  ? (instance[subField.key] as string[]).filter((v: string) => v !== opt)
                                  : [...(instance[subField.key] as string[] ?? []), opt]
                              )"
                            />
                            {{ opt }}
                          </label>
                        </div>
                        <!-- text (default) -->
                        <UInput
                          v-else
                          :model-value="String(instance[subField.key] ?? '')"
                          :placeholder="subField.placeholder ?? ''"
                          class="w-full"
                          :disabled="isGenerating"
                          @update:model-value="updateInstanceField(field.key, idx, subField.key, $event)"
                        />
                      </div>
                    </div>
                  </div>

                  <!-- Add button -->
                  <UButton
                    variant="outline"
                    color="neutral"
                    size="xs"
                    icon="i-lucide-plus"
                    :disabled="isGenerating"
                    @click="addInstance(field)"
                  >
                    {{ field.addLabel ?? 'Aggiungi' }}
                  </UButton>
                </div>
              </template>

              <!-- ── multiselect (top-level) ──────────────────────── -->
              <template v-else-if="field.type === 'multiselect'">
                <label
                  class="mb-1 block text-xs font-medium"
                  style="color: var(--color-text-secondary)"
                >
                  {{ field.label }}
                  <span v-if="field.required" class="ml-0.5 text-red-500">*</span>
                </label>
                <p v-if="field.hint" class="mb-1.5 text-xs" style="color: var(--color-text-muted)">
                  {{ field.hint }}
                </p>
                <div class="flex flex-col gap-1.5">
                  <label
                    v-for="opt in field.options ?? []"
                    :key="opt"
                    class="flex cursor-pointer items-center gap-2 text-xs"
                    style="color: var(--color-text-primary)"
                  >
                    <input
                      type="checkbox"
                      :value="opt"
                      :checked="Array.isArray(formValues[field.key]) && (formValues[field.key] as string[]).includes(opt)"
                      :disabled="isGenerating"
                      class="rounded"
                      @change="saveFormField(
                        field.key,
                        (formValues[field.key] as string[] ?? []).includes(opt)
                          ? (formValues[field.key] as string[]).filter((v: string) => v !== opt)
                          : [...(formValues[field.key] as string[] ?? []), opt]
                      )"
                    />
                    {{ opt }}
                  </label>
                </div>
              </template>

              <!-- ── visura_upload ───────────────────────────────────── -->
              <template v-else-if="field.type === 'visura_upload'">
                <label
                  class="mb-1 block text-xs font-medium"
                  style="color: var(--color-text-secondary)"
                >
                  {{ field.label }}
                  <span v-if="field.required" class="ml-0.5 text-red-500">*</span>
                </label>
                <p v-if="field.hint" class="mb-1.5 text-xs" style="color: var(--color-text-muted)">
                  {{ field.hint }}
                </p>

                <!-- File picker + extract button -->
                <div class="flex flex-col gap-2">
                  <div class="flex items-center gap-2">
                    <input
                      type="file"
                      accept=".pdf"
                      :disabled="isGenerating || visuraExtracting[field.key]"
                      class="block w-full text-xs file:mr-3 file:rounded file:border-0 file:px-3 file:py-1 file:text-xs file:font-medium"
                      style="color: var(--color-text-secondary)"
                      @change="onVisuraFileChange(field.key, $event)"
                    />
                  </div>

                  <UButton
                    size="sm"
                    variant="outline"
                    color="neutral"
                    icon="i-lucide-scan-text"
                    :loading="visuraExtracting[field.key]"
                    :disabled="!visuraFile[field.key] || isGenerating || visuraExtracting[field.key]"
                    @click="extractVisura(field)"
                  >
                    Estrai dalla visura
                  </UButton>

                  <!-- Extraction error -->
                  <UAlert
                    v-if="visuraError[field.key]"
                    color="error"
                    variant="soft"
                    :description="visuraError[field.key] ?? ''"
                    icon="i-lucide-circle-alert"
                    size="sm"
                  />

                  <!-- Extraction result summary -->
                  <div
                    v-if="visuraResult[field.key]"
                    class="rounded-md border p-3"
                    style="border-color: var(--color-border-subtle); background-color: var(--color-surface-subtle)"
                  >
                    <div class="flex items-center gap-1.5 mb-2">
                      <UIcon name="i-lucide-check-circle" class="size-3.5" style="color: var(--color-brand)" />
                      <span class="text-xs font-medium" style="color: var(--color-text-primary)">
                        Estrazione completata
                      </span>
                    </div>
                    <ul class="text-xs space-y-1" style="color: var(--color-text-secondary)">
                      <li>
                        {{ (visuraResult[field.key]?.shareholders ?? []).length }} soci estratti
                      </li>
                      <li>
                        {{ (visuraResult[field.key]?.subsidiaries ?? []).length }} partecipate estratte
                      </li>
                    </ul>
                    <!-- Missing fields warning -->
                    <div
                      v-if="
                        (visuraResult[field.key]?.missing?.shareholders?.length ?? 0) > 0 ||
                        (visuraResult[field.key]?.missing?.subsidiaries?.length ?? 0) > 0
                      "
                      class="mt-2 text-xs"
                      style="color: var(--color-text-muted)"
                    >
                      <span class="font-medium">Dati mancanti:</span>
                      <span
                        v-for="entry in [
                          ...(visuraResult[field.key]?.missing?.shareholders ?? []),
                          ...(visuraResult[field.key]?.missing?.subsidiaries ?? []),
                        ]"
                        :key="entry.index"
                        class="block"
                      >
                        {{ entry.name }}: {{ entry.missing.join(', ') }}
                      </span>
                    </div>
                    <!-- Previously saved extraction notice -->
                    <p
                      v-if="formValues[field.key]"
                      class="mt-2 text-xs"
                      style="color: var(--color-text-muted)"
                    >
                      I dati estratti sono stati salvati per la generazione AI.
                    </p>
                  </div>

                  <!-- Previously saved result (on step load, no active extraction) -->
                  <div
                    v-else-if="formValues[field.key] && !visuraExtracting[field.key]"
                    class="rounded-md border p-3"
                    style="border-color: var(--color-border-subtle); background-color: var(--color-surface-subtle)"
                  >
                    <div class="flex items-center gap-1.5">
                      <UIcon name="i-lucide-check-circle" class="size-3.5" style="color: var(--color-brand)" />
                      <span class="text-xs font-medium" style="color: var(--color-text-primary)">
                        Visura già estratta —
                        {{ (formValues[field.key] as Record<string, unknown>)?.filename ?? 'file.pdf' }}
                      </span>
                    </div>
                    <p class="mt-1 text-xs" style="color: var(--color-text-muted)">
                      Carica un nuovo PDF e clicca "Estrai dalla visura" per aggiornare i dati.
                    </p>
                  </div>

                  <!-- Hint: visura required but not yet extracted -->
                  <p
                    v-if="isVisuraRequired && !isVisuraReady"
                    class="text-xs"
                    style="color: var(--color-text-muted)"
                  >
                    Carica la visura per abilitare la generazione
                  </p>
                </div>
              </template>

              <!-- ── file ────────────────────────────────────────────── -->
              <template v-else-if="field.type === 'file'">
                <label
                  class="mb-1 block text-xs font-medium"
                  style="color: var(--color-text-secondary)"
                >
                  {{ field.label }}
                  <span v-if="field.required" class="ml-0.5 text-red-500">*</span>
                </label>
                <p v-if="field.hint" class="mb-1.5 text-xs" style="color: var(--color-text-muted)">
                  {{ field.hint }}
                </p>
                <div class="flex flex-col gap-2">
                  <div class="flex items-center gap-2">
                    <input
                      type="file"
                      :accept="(field.accept ?? []).join(',')"
                      :disabled="isGenerating || fileUploading[field.key]"
                      class="block w-full text-xs file:mr-3 file:rounded file:border-0 file:px-3 file:py-1 file:text-xs file:font-medium"
                      style="color: var(--color-text-secondary)"
                      @change="onFileChange(field.key, $event)"
                    />
                    <!-- Loading indicator -->
                    <span
                      v-if="fileUploading[field.key]"
                      class="flex shrink-0 items-center gap-1.5 text-xs"
                      style="color: var(--color-text-muted)"
                    >
                      <UIcon name="i-lucide-loader-circle" class="size-3.5 animate-spin" />
                      Caricamento...
                    </span>
                    <!-- Saved filename (shown when not loading) -->
                    <span
                      v-else-if="formValues[field.key]"
                      class="shrink-0 text-xs"
                      style="color: var(--color-text-muted)"
                    >
                      {{ formValues[field.key] }}
                    </span>
                  </div>
                  <!-- Upload error -->
                  <UAlert
                    v-if="fileUploadError[field.key]"
                    color="error"
                    variant="soft"
                    :description="fileUploadError[field.key] ?? ''"
                    icon="i-lucide-circle-alert"
                    size="sm"
                  />
                </div>
              </template>

              <!-- ── textarea ────────────────────────────────────────── -->
              <template v-else-if="field.type === 'textarea'">
                <label
                  class="mb-1 block text-xs font-medium"
                  style="color: var(--color-text-secondary)"
                >
                  {{ field.label }}
                  <span v-if="field.required" class="ml-0.5 text-red-500">*</span>
                </label>
                <p v-if="field.hint" class="mb-1.5 text-xs" style="color: var(--color-text-muted)">
                  {{ field.hint }}
                </p>
                <UTextarea
                  :model-value="String(formValues[field.key] ?? '')"
                  :placeholder="field.placeholder ?? ''"
                  :rows="5"
                  class="w-full text-sm"
                  :disabled="isGenerating"
                  @update:model-value="saveFormField(field.key, $event)"
                />
              </template>

              <!-- ── select ──────────────────────────────────────────── -->
              <template v-else-if="field.type === 'select'">
                <label
                  class="mb-1 block text-xs font-medium"
                  style="color: var(--color-text-secondary)"
                >
                  {{ field.label }}
                  <span v-if="field.required" class="ml-0.5 text-red-500">*</span>
                </label>
                <p v-if="field.hint" class="mb-1.5 text-xs" style="color: var(--color-text-muted)">
                  {{ field.hint }}
                </p>
                <USelect
                  :model-value="String(formValues[field.key] ?? '')"
                  :items="field.options ?? []"
                  class="w-full"
                  :disabled="isGenerating"
                  @update:model-value="saveFormField(field.key, $event)"
                />
              </template>

              <!-- ── text / number (default) ─────────────────────────── -->
              <template v-else>
                <label
                  class="mb-1 block text-xs font-medium"
                  style="color: var(--color-text-secondary)"
                >
                  {{ field.label }}
                  <span v-if="field.required" class="ml-0.5 text-red-500">*</span>
                </label>
                <p v-if="field.hint" class="mb-1.5 text-xs" style="color: var(--color-text-muted)">
                  {{ field.hint }}
                </p>
                <UInput
                  :model-value="String(formValues[field.key] ?? '')"
                  :placeholder="field.placeholder ?? ''"
                  :type="field.type === 'number' ? 'number' : 'text'"
                  class="w-full"
                  :disabled="isGenerating"
                  @update:model-value="saveFormField(field.key, $event)"
                />
              </template>

            </div>
          </template>
        </div>
      </template>

      <!-- System prompt toggle (AI steps only) -->
      <template v-if="isAiStep && activeStep.system_prompt_template">
        <div>
          <UButton
            variant="ghost"
            color="neutral"
            size="xs"
            :icon="showSystemPrompt ? 'i-lucide-eye-off' : 'i-lucide-eye'"
            @click="showSystemPrompt = !showSystemPrompt"
          >
            {{ showSystemPrompt ? "Nascondi" : "Mostra" }} system prompt
          </UButton>
          <div
            v-if="showSystemPrompt"
            class="mt-2 rounded-md p-3"
            style="background-color: var(--color-surface-subtle)"
          >
            <pre
              class="max-h-64 overflow-y-auto whitespace-pre-wrap font-mono text-xs"
              style="color: var(--color-text-muted)"
              >{{ activeStep.system_prompt_template }}</pre
            >
          </div>
        </div>
      </template>

      <!-- Generation in progress -->
      <div v-if="isGenerating" class="flex items-center gap-2">
        <span
          class="size-1.5 animate-pulse rounded-full"
          style="background-color: var(--color-brand)"
        />
        <span class="text-xs" style="color: var(--color-brand-text)">
          Generazione in corso…
        </span>
      </div>

      <!-- Error -->
      <UAlert
        v-if="errorMsg"
        color="error"
        variant="soft"
        :description="errorMsg"
        icon="i-lucide-circle-alert"
        size="sm"
      />
    </div>
  </div>
</template>

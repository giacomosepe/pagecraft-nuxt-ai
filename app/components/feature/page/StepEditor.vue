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

import { useStepForm } from "~/composables/useStepForm";
import type {
  StepFieldType,
  StepFormField,
  StepRecord,
  StepType,
} from "~/types/app.types";

// ─── Visura extraction result types ───────────────────────────────────────────
interface VisuraExtractResult {
  shareholders: unknown[];
  subsidiaries: unknown[];
  missing: {
    shareholders: { index: number; name: string; missing: string[] }[];
    subsidiaries: { index: number; name: string; missing: string[] }[];
  };
}

interface StepTypeConfig {
  subtitle: string;
  showAiActions: boolean;
  disableAiActions: boolean;
  allowedFieldTypes: StepFieldType[];
}

const STEP_TYPE_CONFIG: Record<StepType, StepTypeConfig> = {
  type_a: {
    subtitle: "Compila i campi — il contenuto verrà inserito automaticamente nel documento.",
    showAiActions: false,
    disableAiActions: true,
    allowedFieldTypes: ["text", "textarea", "number", "select", "multiselect"],
  },
  type_b: {
    subtitle: "Compila o aggiorna i dati strutturati del passaggio prima di procedere.",
    showAiActions: false,
    disableAiActions: true,
    allowedFieldTypes: [
      "text",
      "textarea",
      "number",
      "select",
      "multiselect",
      "repeatable_group",
      "visura_upload",
      "file_upload_extraction",
    ],
  },
  type_c: {
    subtitle:
      "Descrivi cosa approfondire — l'AI combina le tue istruzioni con il profilo aziendale automaticamente.",
    showAiActions: true,
    disableAiActions: false,
    allowedFieldTypes: [
      "text",
      "textarea",
      "number",
      "select",
      "multiselect",
      "repeatable_group",
      "file",
      "file_upload_generation",
    ],
  },
};

const FALLBACK_ALLOWED_FIELD_TYPES: StepFieldType[] = [
  "text",
  "textarea",
  "number",
  "select",
  "multiselect",
  "repeatable_group",
  "visura_upload",
  "file_upload_extraction",
  "file",
  "file_upload_generation",
];

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
const formFields = computed<StepFormField[]>(() => {
  const schema = props.activeStep.form_schema;
  if (!schema || !Array.isArray(schema)) return [];
  return schema as StepFormField[];
});

const activeStep = computed(() => props.activeStep);

const {
  formValues,
  formSaveError,
  clearFormSaveError,
  saveFormField,
  isFieldVisible,
  getInstances,
  addInstance,
  removeInstance,
  updateInstanceField,
} = useStepForm({
  activeStep,
  formFields,
});

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
  field: StepFormField,
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
const stepConfig = computed<StepTypeConfig>(() => {
  const stepType = props.activeStep.step_type;
  if (stepType && stepType in STEP_TYPE_CONFIG) {
    return STEP_TYPE_CONFIG[stepType];
  }

  return {
    subtitle:
      "Descrivi cosa approfondire — l'AI combina le tue istruzioni con il profilo aziendale automaticamente.",
    showAiActions: !!props.activeStep.system_prompt_template,
    disableAiActions: false,
    allowedFieldTypes: FALLBACK_ALLOWED_FIELD_TYPES,
  };
});

const isAiStep = computed(() => stepConfig.value.showAiActions);
const areAiActionsDisabled = computed(() => stepConfig.value.disableAiActions);
const unsupportedFields = computed(() =>
  formFields.value.filter(
    (field) => !stepConfig.value.allowedFieldTypes.includes(field.type),
  ),
);
const renderableFields = computed(() =>
  formFields.value.filter((field) =>
    stepConfig.value.allowedFieldTypes.includes(field.type),
  ),
);

watch(
  () => props.activeStep.id,
  () => {
    showSystemPrompt.value = false;
  },
);

// ─── Upload state ──────────────────────────────────────────────────────────────

// Per-field loading and error state keyed by field.key
const fileUploading = ref<Record<string, boolean>>({});
const fileUploadError = ref<Record<string, string | null>>({});

// Derived: true when any file field is currently saving
const isAnyFileUploading = computed(() =>
  Object.values(fileUploading.value).some(Boolean),
);

function isExtractionUploadField(field: StepFormField): boolean {
  return field.type === "visura_upload" || field.type === "file_upload_extraction";
}

function isGenerationUploadField(field: StepFormField): boolean {
  return field.type === "file" || field.type === "file_upload_generation";
}

function isSimpleField(field: StepFormField): boolean {
  return ["multiselect", "textarea", "select", "number", "text"].includes(field.type);
}

// ─── Extraction gate computeds ─────────────────────────────────────────────────
// Only renderable extraction fields should participate in the AI readiness gate.
const renderableExtractionFields = computed(() =>
  renderableFields.value.filter((field) => isExtractionUploadField(field)),
);

// isVisuraRequired: true when the current step has a visible extraction upload field
const isVisuraRequired = computed(() =>
  renderableExtractionFields.value.length > 0,
);

// isVisuraReady: true when no extraction is required, OR when every visible
// extraction field has either a fresh extraction result or a previously saved value.
const isVisuraReady = computed(() => {
  if (!isVisuraRequired.value) return true;
  return renderableExtractionFields.value.every(
    (field) => visuraResult.value[field.key] != null || formValues.value[field.key] != null,
  );
});

// Reset file upload state when the step changes
watch(
  () => props.activeStep.id,
  () => {
    fileUploading.value = {};
    fileUploadError.value = {};
  },
);

async function onFileChange(fieldKey: string, file: File | null): Promise<void> {
  const filename = file?.name ?? "";
  fileUploading.value = { ...fileUploading.value, [fieldKey]: true };
  fileUploadError.value = { ...fileUploadError.value, [fieldKey]: null };
  try {
    clearFormSaveError();
    await saveFormField(fieldKey, filename, { throwOnError: true });
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Errore durante il salvataggio del file";
    fileUploadError.value = { ...fileUploadError.value, [fieldKey]: msg };
    console.error("[StepEditor] file save error:", err);
  } finally {
    fileUploading.value = { ...fileUploading.value, [fieldKey]: false };
  }
}

// ─── Extraction upload state ───────────────────────────────────────────────────

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

function onVisuraFileChange(fieldKey: string, file: File | null): void {
  visuraFile.value = { ...visuraFile.value, [fieldKey]: file };
  visuraError.value = { ...visuraError.value, [fieldKey]: null };
  visuraResult.value = { ...visuraResult.value, [fieldKey]: null };
}

async function extractVisura(field: StepFormField): Promise<void> {
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
    clearFormSaveError();
    await saveFormField(field.key, {
      filename: file.name,
      shareholders: result.shareholders,
      subsidiaries: result.subsidiaries,
      missing: result.missing,
      extracted_at: new Date().toISOString(),
    }, { throwOnError: true });
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
    class="flex h-full flex-col"
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
        {{ stepConfig.subtitle }}
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
          :disabled="isGenerating || isAnyFileUploading || !isVisuraReady || areAiActionsDisabled"
          :class="areAiActionsDisabled ? 'opacity-50 cursor-not-allowed' : ''"
          @click="emit('generate')"
        >
          Genera bozza AI
        </UButton>
        <UButton
          class="flex-1 justify-center"
          variant="outline"
          color="neutral"
          size="sm"
          :disabled="isGenerating || isAnyFileUploading || areAiActionsDisabled"
          :class="areAiActionsDisabled ? 'opacity-50 cursor-not-allowed' : ''"
          @click="emit('refine')"
        >
          Raffina
        </UButton>
      </div>
    </div>

    <!-- Scrollable content -->
    <div class="flex flex-1 flex-col gap-4 overflow-y-auto p-4 pb-48">

      <!-- Form fields -->
      <template v-if="formFields.length">
        <div class="flex flex-col gap-5">
          <template v-for="field in renderableFields" :key="field.key">
            <!-- conditional visibility wrapper -->
            <div v-if="isFieldVisible(field)">

              <!-- ── repeatable_group ─────────────────────────────── -->
              <StepRepeatableGroupField
                v-if="field.type === 'repeatable_group'"
                :field="field"
                :instances="getInstances(field.key)"
                :disabled="isGenerating"
                :is-collapsed="(idx) => isCollapsed(field.key, idx)"
                :instance-summary="(instance) => instanceSummary(field, instance)"
                @add="addInstance(field)"
                @remove="removeInstance(field, $event)"
                @toggle-collapse="toggleCollapse(field.key, $event)"
                @update-sub-field="updateInstanceField(field.key, $event.index, $event.subKey, $event.value)"
              />

              <!-- ── multiselect (top-level) ──────────────────────── -->
              <StepSimpleField
                v-else-if="isSimpleField(field)"
                :field="field"
                :model-value="formValues[field.key]"
                :disabled="isGenerating"
                @update:model-value="saveFormField(field.key, $event)"
              />

              <StepExtractionUploadField
                v-else-if="isExtractionUploadField(field)"
                :field="field"
                :selected-file="visuraFile[field.key]"
                :disabled="isGenerating"
                :is-extracting="visuraExtracting[field.key]"
                :error="visuraError[field.key]"
                :result="visuraResult[field.key]"
                :saved-value="formValues[field.key]"
                :show-required-hint="isVisuraRequired && !isVisuraReady"
                @select-file="onVisuraFileChange(field.key, $event)"
                @extract="extractVisura(field)"
              />

              <StepGenerationUploadField
                v-else-if="isGenerationUploadField(field)"
                :field="field"
                :disabled="isGenerating"
                :loading="fileUploading[field.key]"
                :error="fileUploadError[field.key]"
                :saved-value="formValues[field.key]"
                @select-file="onFileChange(field.key, $event)"
              />

              <!-- ── unsupported fallback ─────────────────────────────── -->
              <template v-else />

            </div>
          </template>
        </div>
      </template>

      <UAlert
        v-if="unsupportedFields.length"
        color="warning"
        variant="soft"
        icon="i-lucide-triangle-alert"
        :description="`Alcuni campi di questo step non sono compatibili con ${activeStep.step_type ?? 'il tipo corrente'} e non vengono mostrati.`"
        size="sm"
      />

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
        v-if="formSaveError"
        color="error"
        variant="soft"
        :description="formSaveError"
        icon="i-lucide-circle-alert"
        size="sm"
      />

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

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
  <EditorPanel body-class="overflow-y-auto px-5 py-5">
    <template #header>
      <EditorPanelHeader
        :title="activeStep.title"
        :description="stepConfig.subtitle"
        eyebrow="Editor step"
      >
        <template #badge>
          <div
            class="inline-flex items-center rounded-full bg-violet-600 px-2.5 py-1 text-xs font-semibold text-white"
          >
            Step {{ activeStep.order }}
          </div>
        </template>

        <template #meta>
          <div class="flex flex-wrap items-center gap-2 text-xs">
            <span class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium text-slate-600">
              {{ activeStep.step_type ?? "step generico" }}
            </span>
            <span
              v-if="isAiStep"
              class="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 font-medium text-violet-700"
            >
              Supporto AI attivo
            </span>
          </div>
        </template>
      </EditorPanelHeader>
    </template>

    <div class="flex flex-col gap-5">
      <GenerationActionBar
        v-if="isAiStep"
        :is-generating="isGenerating"
        :disable-generate="isGenerating || isAnyFileUploading || !isVisuraReady || areAiActionsDisabled"
        :disable-refine="isGenerating || isAnyFileUploading || areAiActionsDisabled"
        @generate="emit('generate')"
        @refine="emit('refine')"
      />

      <div
        v-if="formFields.length"
        class="space-y-5 rounded-[24px] border border-slate-200 bg-slate-50/60 p-4 sm:p-5"
      >
        <template v-for="field in renderableFields" :key="field.key">
          <div v-if="isFieldVisible(field)">
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

            <template v-else />
          </div>
        </template>
      </div>

      <UAlert
        v-if="unsupportedFields.length"
        color="warning"
        variant="soft"
        icon="i-lucide-triangle-alert"
        :description="`Alcuni campi di questo step non sono compatibili con ${activeStep.step_type ?? 'il tipo corrente'} e non vengono mostrati.`"
        size="sm"
      />

      <div
        v-if="isAiStep && activeStep.system_prompt_template"
        class="rounded-[24px] border border-slate-200 bg-white p-4"
      >
        <UButton
          variant="ghost"
          color="neutral"
          size="sm"
          class="rounded-xl"
          :icon="showSystemPrompt ? 'i-lucide-eye-off' : 'i-lucide-eye'"
          @click="showSystemPrompt = !showSystemPrompt"
        >
          {{ showSystemPrompt ? "Nascondi" : "Mostra" }} system prompt
        </UButton>

        <div
          v-if="showSystemPrompt"
          class="mt-3 rounded-2xl bg-slate-50 p-4"
        >
          <pre class="max-h-64 overflow-y-auto whitespace-pre-wrap font-mono text-xs leading-6 text-slate-500">{{ activeStep.system_prompt_template }}</pre>
        </div>
      </div>

      <UAlert
        v-if="formSaveError"
        color="error"
        variant="soft"
        :description="formSaveError"
        icon="i-lucide-circle-alert"
        size="sm"
      />

      <UAlert
        v-if="errorMsg"
        color="error"
        variant="soft"
        :description="errorMsg"
        icon="i-lucide-circle-alert"
        size="sm"
      />
    </div>
  </EditorPanel>
</template>

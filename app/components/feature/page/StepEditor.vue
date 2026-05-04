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
import type { ClientRecord } from "~/composables/useClientFields";
import type {
  StepFieldType,
  StepFormField,
  StepRecord,
  StepType,
} from "~/types/app.types";
import type { GenerativeRuleSection } from "~/types/generative-rule";
import {
  assembleStruttura,
  DEFAULT_STRUTTURA_RULE,
  type StrutturaRule,
} from "~/utils/assembleStruttura";
import type { ExtractionResult } from "~/utils/visuraExtraction";
import { normalizeExtractionResult } from "~/utils/visuraExtraction";

// ─── Visura extraction result types ───────────────────────────────────────────
interface VisuraExtractResult {
  soci?: unknown[];
  partecipate?: unknown[];
  board?: unknown[];
  legale_rappresentante_societa?: string | null;
  shareholders: unknown[];
  subsidiaries: unknown[];
  missing: {
    soci?: { index: number; name: string; missing: string[] }[];
    partecipate?: { index: number; name: string; missing: string[] }[];
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
  pageId: string;
  activeStep: StepRecord;
  isGenerating: boolean;
  isCommitting: boolean;
  errorMsg?: string;
  output: string;
  clientData?: ClientRecord | null;
  taxYear?: number | null;
  canGoNext: boolean;
}>();

const emit = defineEmits<{
  generate: [promptRule?: string | null];
  refine: [];
  formValuesChange: [values: Record<string, unknown>];
  produceTypeA: [templateOverride: string | null];
  generatePremessa: [taxYearStart: number, taxYearEnd: number, legalRepresentative: string, templateOverride: string | null];
  commit: [];
  discard: [];
  next: [];
  confermaStruttura: [text: string];
}>();

// ─── Form schema ──────────────────────────────────────────────────────────────
const baseFormFields = computed<StepFormField[]>(() => {
  const schema = props.activeStep.form_schema;
  if (!schema || !Array.isArray(schema)) return [];
  return schema as StepFormField[];
});

const premessaLegalRepresentativeField = computed<StepFormField | null>(() => {
  if (props.activeStep.order !== 2) return null;
  if (baseFormFields.value.some((field) => field.key === "legale_rappresentante")) {
    return null;
  }

  return {
    key: "legale_rappresentante",
    label: "Legale rappresentante",
    type: "text",
    placeholder: "Es. Mario Rossi",
    hint: "Campo locale di questo step: non modifica la scheda cliente.",
    required: true,
    defaultValue: props.clientData?.legal_representative ?? undefined,
  };
});

const defaultVisuraField: StepFormField = {
  key: "visura_pdf",
  label: "Visura Camerale (PDF)",
  type: "file_upload_extraction",
  hint: "Carica la visura camerale per estrarre soci, partecipazioni e legale rappresentante.",
  required: false,
  accept: [".pdf"],
};

function hasExtractionUploadField(fields: StepFormField[]): boolean {
  return fields.some(
    (field) => field.type === "visura_upload" || field.type === "file_upload_extraction",
  );
}

function ensureStepThreeVisuraField(fields: StepFormField[]): StepFormField[] {
  const isStrutturaStep =
    props.activeStep.step_type === "type_b" || props.activeStep.order === 3;

  if (!isStrutturaStep || hasExtractionUploadField(fields)) {
    return fields;
  }

  return [defaultVisuraField, ...fields];
}

const clientVariableMap = computed(() => {
  const { variableMap } = useClientFields(props.clientData ?? null, props.taxYear ?? null);
  return variableMap.value;
});

function prefillValueForField(field: StepFormField): string | undefined {
  const variableValue = clientVariableMap.value[field.key];
  if (variableValue) return variableValue;

  if (field.key === "esercizio_fiscale" && props.taxYear) {
    return String(props.taxYear);
  }

  if (field.key === "legale_rappresentante") {
    return props.clientData?.legal_representative ?? undefined;
  }

  return undefined;
}

function applyFieldPrefill(field: StepFormField): StepFormField {
  const nestedFields = field.fields?.map(applyFieldPrefill);
  const defaultValue = field.defaultValue ?? prefillValueForField(field);

  return {
    ...field,
    ...(defaultValue !== undefined ? { defaultValue } : {}),
    ...(nestedFields ? { fields: nestedFields } : {}),
  };
}

const formFields = computed<StepFormField[]>(() => {
  const extraField = premessaLegalRepresentativeField.value;
  const fields = extraField ? [...baseFormFields.value, extraField] : baseFormFields.value;
  return ensureStepThreeVisuraField(fields).map(applyFieldPrefill);
});

const activeStep = computed(() => props.activeStep);

const effectiveStepType = computed<StepType>(() => {
  if (props.activeStep.step_type) return props.activeStep.step_type;
  if (props.activeStep.order <= 2) return "type_a";
  if (props.activeStep.order === 3) return "type_b";
  return "type_c";
});

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

// Propagate live form values to the page shell for type_a output assembly
watch(
  formValues,
  (values) => {
    emit("formValuesChange", { ...values });
  },
  { deep: true, immediate: true },
);

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
const promptModalOpen = ref(false);
const typeCRuleSections = ref<GenerativeRuleSection[]>([]);
const appliedTypeCRules = ref<Record<string, GenerativeRuleSection[]>>({});
const strutturaRuleModalOpen = ref(false);
const activeStrutturaRuleFieldKey = ref<string | null>(null);
const appliedStrutturaRules = ref<Record<string, StrutturaRule>>({});
const extractionRuleModalOpen = ref(false);
const activeExtractionRuleFieldKey = ref<string | null>(null);
const extractionRuleSections = ref<GenerativeRuleSection[]>([]);
const appliedExtractionRules = ref<Record<string, GenerativeRuleSection[]>>({});
const stepConfig = computed<StepTypeConfig>(() => {
  const stepType = effectiveStepType.value;
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
const isTypeAStep = computed(() => effectiveStepType.value === "type_a");
const areAiActionsDisabled = computed(() => stepConfig.value.disableAiActions);
const premessaTaxYear = computed(() => {
  const value = formValues.value.esercizio_fiscale;
  const year = Number(String(value ?? "").trim());
  return Number.isInteger(year) && year >= 2020 && year <= 2035 ? year : null;
});
const premessaLegalRepresentative = computed(() =>
  String(formValues.value.legale_rappresentante ?? "").trim(),
);
const isPremessaReady = computed(
  () => premessaTaxYear.value !== null && premessaLegalRepresentative.value.length > 0,
);
const isTypeAActionDisabled = computed(() => {
  if (props.isGenerating) return true;
  if (props.activeStep.order === 2) return !isPremessaReady.value;
  return !props.output;
});
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

function isValueFilled(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function isFieldComplete(field: StepFormField): boolean {
  if (!isFieldVisible(field)) return true;
  const value = formValues.value[field.key];

  if (field.type === "repeatable_group") {
    const instances = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
    const minItems = field.minItems ?? (field.required ? 1 : 0);
    if (instances.length < minItems) return false;

    return instances.every((instance) =>
      (field.fields ?? [])
        .filter((subField) => subField.required)
        .every((subField) => isValueFilled(instance[subField.key])),
    );
  }

  if (!field.required) return true;
  return isValueFilled(value);
}

const areRequiredFieldsComplete = computed(() =>
  renderableFields.value.every((field) => isFieldComplete(field)),
);

watch(
	  () => props.activeStep.id,
	  () => {
		    promptModalOpen.value = false;
		    strutturaRuleModalOpen.value = false;
		    activeStrutturaRuleFieldKey.value = null;
		    extractionRuleModalOpen.value = false;
		    activeExtractionRuleFieldKey.value = null;
		  },
		);
	
async function openPromptModal(): Promise<void> {
  const stepId = props.activeStep.id;
  const appliedRule = appliedTypeCRules.value[stepId];
  if (appliedRule) {
    typeCRuleSections.value = appliedRule;
    promptModalOpen.value = true;
    return;
  }

  typeCRuleSections.value = [
    {
      key: "prompt",
      label: "Prompt",
      content: "Caricamento della regola di generazione...",
    },
  ];
  promptModalOpen.value = true;

  try {
    const prompt = await $fetch<string>("/api/generations/prompt-preview", {
      method: "POST",
      body: {
        stepId,
        pageId: props.pageId,
        mode: "generate",
      },
    });
    if (props.activeStep.id !== stepId) return;
    typeCRuleSections.value = [
      {
        key: "prompt",
        label: "Prompt",
        content: prompt,
      },
    ];
  } catch {
    typeCRuleSections.value = [
      {
        key: "prompt",
        label: "Prompt",
        content: "Non siamo riusciti a caricare la regola di generazione. Riprova.",
      },
    ];
  }
}

function cancelPromptEdit(): void {
  promptModalOpen.value = false;
}

function applyTypeCRule(sections: GenerativeRuleSection[]): void {
  appliedTypeCRules.value = {
    ...appliedTypeCRules.value,
    [props.activeStep.id]: sections,
  };
}

function onGenerateText(): void {
  const appliedPrompt = appliedTypeCRules.value[props.activeStep.id]
    ?.find((section) => section.key === "prompt")
    ?.content ?? null;
  emit("generate", appliedPrompt);
}

function onTypeAAction(templateOverride: string | null): void {
  if (isTypeAActionDisabled.value) return;

  if (props.activeStep.order === 2) {
    if (premessaTaxYear.value === null || !premessaLegalRepresentative.value) return;
    emit(
      "generatePremessa",
      premessaTaxYear.value,
      premessaTaxYear.value,
      premessaLegalRepresentative.value,
      templateOverride,
    );
    return;
  }

  emit("produceTypeA", templateOverride);
}

// ─── Visura data accessor (type_b) ────────────────────────────────────────────
function getVisuraData(fieldKey: string): ExtractionResult {
  const v = formValues.value[fieldKey];
  return normalizeExtractionResult(v);
}

function getStrutturaPreview(fieldKey: string): string {
  const data = getVisuraData(fieldKey);
  return assembleStruttura(data, appliedStrutturaRules.value[fieldKey] ?? DEFAULT_STRUTTURA_RULE, props.clientData?.company_name ?? props.clientData?.name ?? null);
}

function hasStrutturaPreview(fieldKey: string): boolean {
  return getStrutturaPreview(fieldKey).trim().length > 0;
}

function openStrutturaRuleModal(fieldKey: string): void {
  if (!hasStrutturaPreview(fieldKey)) return;
  activeStrutturaRuleFieldKey.value = fieldKey;
  strutturaRuleModalOpen.value = true;
}

const strutturaRuleSections = computed<GenerativeRuleSection[]>(() => {
  const fieldKey = activeStrutturaRuleFieldKey.value;
	  const rule = fieldKey ? (appliedStrutturaRules.value[fieldKey] ?? DEFAULT_STRUTTURA_RULE) : DEFAULT_STRUTTURA_RULE;
	  return [
    {
      key: "intro",
      label: "Introduzione",
      content: rule.intro,
    },
	    {
	      key: "bloccoSociPersonaFisica",
	      label: "Socio persona fisica",
	      content: rule.bloccoSociPersonaFisica,
	    },
	    {
	      key: "bloccoSociPersonaGiuridica",
	      label: "Socio persona giuridica",
	      content: rule.bloccoSociPersonaGiuridica,
	    },
	    {
	      key: "bloccoPartecipate",
	      label: "Partecipata",
	      content: rule.bloccoPartecipate,
	    },
	  ];
	});

function applyStrutturaRule(sections: GenerativeRuleSection[]): void {
  const fieldKey = activeStrutturaRuleFieldKey.value;
  if (!fieldKey) return;
  appliedStrutturaRules.value = {
    ...appliedStrutturaRules.value,
	    [fieldKey]: {
	      intro: sections.find((section) => section.key === "intro")?.content ?? "",
	      bloccoSociPersonaFisica:
	        sections.find((section) => section.key === "bloccoSociPersonaFisica")?.content ??
	        DEFAULT_STRUTTURA_RULE.bloccoSociPersonaFisica,
	      bloccoSociPersonaGiuridica:
	        sections.find((section) => section.key === "bloccoSociPersonaGiuridica")?.content ??
	        DEFAULT_STRUTTURA_RULE.bloccoSociPersonaGiuridica,
	      bloccoPartecipate:
	        sections.find((section) => section.key === "bloccoPartecipate")?.content ??
	        DEFAULT_STRUTTURA_RULE.bloccoPartecipate,
	    },
	  };
	}

async function openExtractionRuleModal(fieldKey: string): Promise<void> {
  activeExtractionRuleFieldKey.value = fieldKey;
  const appliedRule = appliedExtractionRules.value[fieldKey];
  if (appliedRule) {
    extractionRuleSections.value = appliedRule;
    extractionRuleModalOpen.value = true;
    return;
  }

  extractionRuleSections.value = [
    {
      key: "prompt",
      label: "Prompt di estrazione",
      content: "Caricamento della regola di estrazione...",
    },
  ];
  extractionRuleModalOpen.value = true;

  try {
    const prompt = await $fetch<string>("/api/visura/extraction-rule");
    if (activeExtractionRuleFieldKey.value !== fieldKey) return;
    extractionRuleSections.value = [
      {
        key: "prompt",
        label: "Prompt di estrazione",
        content: prompt,
      },
    ];
  } catch {
    extractionRuleSections.value = [
      {
        key: "prompt",
        label: "Prompt di estrazione",
        content: "Non siamo riusciti a caricare la regola di estrazione. Riprova.",
      },
    ];
  }
}

function applyExtractionRule(sections: GenerativeRuleSection[]): void {
  const fieldKey = activeExtractionRuleFieldKey.value;
  if (!fieldKey) return;
  appliedExtractionRules.value = {
    ...appliedExtractionRules.value,
    [fieldKey]: sections,
  };
}

function previewSections(text: string): { title: string; paragraphs: string[] }[] {
  const sections: { title: string; paragraphs: string[] }[] = [];
  const lines = text.split("\n");
  let current: { title: string; paragraphs: string[] } | null = null;

  for (const line of lines) {
    const value = line.trim();
    if (!value) continue;

    if (value === value.toUpperCase() && !value.includes(".")) {
      current = { title: value, paragraphs: [] };
      sections.push(current);
      continue;
    }

    if (!current) {
      current = { title: "Anteprima", paragraphs: [] };
      sections.push(current);
    }

    current.paragraphs.push(value);
  }

  return sections;
}

function highlightedParts(paragraph: string): { text: string; isPlaceholder: boolean }[] {
  return paragraph.split(/(\[DA COMPLETARE\])/g)
    .filter(Boolean)
    .map((text) => ({
      text,
      isPlaceholder: text === "[DA COMPLETARE]",
    }));
}

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

type PaneTab = "variables" | "file" | "prompt";

const activePaneTab = ref<PaneTab>("variables");

const variableFields = computed(() =>
  renderableFields.value.filter((field) =>
    field.type === "repeatable_group" || isSimpleField(field),
  ),
);

const fileFields = computed(() =>
  renderableFields.value.filter(
    (field) => isExtractionUploadField(field) || isGenerationUploadField(field),
  ),
);

const paneTabs = computed<{ key: PaneTab; label: string; disabled: boolean }[]>(() => [
  {
    key: "variables",
    label: "Variabili",
    disabled: variableFields.value.length === 0 && !isTypeAStep.value && !isAiStep.value,
  },
  {
    key: "file",
    label: "File",
    disabled: fileFields.value.length === 0,
  },
  {
    key: "prompt",
    label: "Prompt",
    disabled: isTypeAStep.value,
  },
]);

const activeFields = computed(() =>
  activePaneTab.value === "file" ? fileFields.value : variableFields.value,
);

const promptTabDescription = computed(() => {
  if (effectiveStepType.value === "type_c") {
    return "Leggi o modifica la regola usata per generare il testo con AI.";
  }

  if (effectiveStepType.value === "type_a") {
    return "Questo step usa un template fisso: i campi compilati vengono inseriti nel testo senza intervento AI.";
  }

  return "Questo step usa una regola controllata dal sistema. Puoi leggerla senza modificare il flusso.";
});

watch(
  () => props.activeStep.id,
  () => {
    activePaneTab.value =
      effectiveStepType.value === "type_b" && fileFields.value.length
        ? "file"
        : "variables";
  },
  { immediate: true },
);

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
	    const extractionRule = appliedExtractionRules.value[field.key]
	      ?.find((section) => section.key === "prompt")
	      ?.content;
	    if (extractionRule?.trim()) {
	      formData.append("extractionRule", extractionRule);
	    }

    const result = await $fetch<VisuraExtractResult>("/api/visura/extract-pdf", {
      method: "POST",
      body: formData,
    });

    visuraResult.value = { ...visuraResult.value, [field.key]: result };

    // Persist extracted data to form_data under the field key
    clearFormSaveError();
	    await saveFormField(field.key, {
	      filename: file.name,
	      soci: result.soci ?? [],
	      partecipate: result.partecipate ?? [],
	      board: result.board ?? [],
	      legale_rappresentante_societa: result.legale_rappresentante_societa ?? null,
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
  <EditorPanel flush body-class="overflow-y-auto px-4 py-4">
    <template #header>
      <EditorPanelHeader
        :title="activeStep.title"
        :description="stepConfig.subtitle"
        eyebrow="Step corrente"
      >
        <template #badge>
          <div
            class="inline-flex items-center rounded-full bg-violet-600 px-2.5 py-1 text-xs font-semibold text-white"
          >
            Step {{ activeStep.order }}
          </div>
        </template>

        <template v-if="isAiStep" #meta>
          <span class="inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
            Supporto AI attivo
          </span>
        </template>

      </EditorPanelHeader>
    </template>

    <div class="flex flex-col gap-4">
      <div class="grid grid-cols-3 gap-1 border-b border-slate-200 pb-3">
        <button
          v-for="tab in paneTabs"
          :key="tab.key"
          type="button"
          class="min-h-9 rounded-lg px-2 text-xs font-medium transition-colors"
          :class="
            activePaneTab === tab.key
              ? 'bg-violet-600 text-white shadow-sm'
              : tab.disabled
                ? 'cursor-not-allowed text-slate-300'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
          "
          :disabled="tab.disabled"
          @click="activePaneTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <div
        v-if="activePaneTab !== 'prompt'"
        class="space-y-5"
      >
        <template
          v-if="activeFields.length || (activePaneTab === 'variables' && isTypeAStep)"
        >
        <template v-for="field in activeFields" :key="field.key">
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
	              @edit-extraction-rule="openExtractionRuleModal(field.key)"
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

            <template v-if="effectiveStepType === 'type_b' && isExtractionUploadField(field)">
              <div
                v-if="hasStrutturaPreview(field.key)"
                class="mt-5 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div class="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Anteprima documento
                    </p>
                    <h3 class="mt-1 text-sm font-semibold text-slate-900">
                      Struttura partecipativa
                    </h3>
                  </div>
                  <span class="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                    Estrazione completata
                  </span>
                </div>

                <div class="space-y-5">
                  <section
                    v-for="section in previewSections(getStrutturaPreview(field.key))"
                    :key="section.title"
                    class="space-y-3"
                  >
                    <h4 class="border-b border-slate-200 pb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      {{ section.title }}
                    </h4>
                    <p
                      v-for="paragraph in section.paragraphs"
                      :key="paragraph"
                      class="text-sm leading-7 text-slate-700"
                    >
                      <template
                        v-for="(part, index) in highlightedParts(paragraph)"
                        :key="`${paragraph}-${index}`"
                      >
                        <span
                          v-if="part.isPlaceholder"
                          class="inline-flex rounded-md bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200"
                        >
                          {{ part.text }}
                        </span>
                        <template v-else>{{ part.text }}</template>
                      </template>
                    </p>
                  </section>
                </div>
              </div>

	              <UButton
	                icon="i-lucide-check-circle"
	                class="mt-3 w-full justify-center rounded-xl sm:w-auto"
	                :disabled="!hasStrutturaPreview(field.key)"
	                @click="emit('confermaStruttura', getStrutturaPreview(field.key))"
	              >
	                Conferma struttura
	              </UButton>
	              <UButton
	                variant="link"
	                color="neutral"
	                size="sm"
	                icon="i-lucide-eye"
	                class="mt-2 w-fit px-0 text-slate-600 hover:text-slate-900"
	                :disabled="!hasStrutturaPreview(field.key)"
	                @click="openStrutturaRuleModal(field.key)"
	              >
	                Regola di generazione
	              </UButton>
	            </template>
          </div>
        </template>

        <StepTypeAWorkspace
          v-if="activePaneTab === 'variables' && isTypeAStep"
          :step-id="activeStep.id"
          :template-content="activeStep.system_prompt_template ?? ''"
          :is-generating="isGenerating"
          :action-disabled="isTypeAActionDisabled"
          @produce="onTypeAAction"
        />
        </template>

        <div
          v-else
          class="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm leading-6 text-slate-500"
        >
          Nessun contenuto in questa scheda per lo step corrente.
        </div>
      </div>

      <div v-else class="space-y-4">
        <div class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
          <p class="text-sm font-semibold text-slate-900">
            Regola dello step
          </p>
          <p class="mt-2 text-sm leading-6 text-slate-500">
            {{ promptTabDescription }}
          </p>
        </div>

        <div
          v-if="activeStep.system_prompt_template"
          class="max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 text-xs leading-6 text-slate-600"
        >
          {{ activeStep.system_prompt_template }}
        </div>

        <UButton
          v-if="isAiStep"
          variant="outline"
          color="neutral"
          size="sm"
          icon="i-lucide-expand"
          class="w-full justify-center rounded-xl border-slate-300 bg-white"
          @click="openPromptModal"
        >
          Apri e modifica prompt
        </UButton>
      </div>

      <div
        v-if="isAiStep && activePaneTab === 'variables'"
        class="space-y-3 border-t border-slate-200 pt-4"
      >
        <GenerationActionBar
          :is-generating="isGenerating"
          :disable-generate="isGenerating || isAnyFileUploading || !isVisuraReady || areAiActionsDisabled || !areRequiredFieldsComplete"
          :disable-refine="isGenerating || isAnyFileUploading || areAiActionsDisabled || !output"
          @generate="onGenerateText"
          @refine="emit('refine')"
        />

        <p
          v-if="!areRequiredFieldsComplete"
          class="text-xs font-medium text-slate-500"
        >
          Compila i campi obbligatori per abilitare la generazione.
        </p>
      </div>

      <UAlert
        v-if="unsupportedFields.length"
        color="warning"
        variant="soft"
        icon="i-lucide-triangle-alert"
        :description="`Alcuni campi di questo step non sono compatibili con ${activeStep.step_type ?? 'il tipo corrente'} e non vengono mostrati.`"
        size="sm"
      />

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

	  <GenerativeRuleModal
	    v-model:open="promptModalOpen"
	    title="Regola di generazione"
	    :sections="typeCRuleSections"
	    confirm-label="Applica"
	    @cancel="cancelPromptEdit"
	    @save="applyTypeCRule"
	  />
	  <GenerativeRuleModal
	    v-model:open="strutturaRuleModalOpen"
	    title="Regola di generazione"
	    :sections="strutturaRuleSections"
	    confirm-label="Applica"
	    @cancel="strutturaRuleModalOpen = false"
	    @save="applyStrutturaRule"
	  />
	  <GenerativeRuleModal
	    v-model:open="extractionRuleModalOpen"
	    title="Regola di estrazione"
	    :sections="extractionRuleSections"
	    confirm-label="Applica"
	    @cancel="extractionRuleModalOpen = false"
	    @save="applyExtractionRule"
	  />
	</template>

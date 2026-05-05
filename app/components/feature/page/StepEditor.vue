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
import type { ClientProfilePartecipata, ClientProfileSocio } from "~/types/company.types";
import type {
  StepFieldType,
  StepFormField,
  StepRecord,
  StepType,
} from "~/types/app.types";
import type { GenerativeRuleSection } from "~/types/generative-rule";
import type { ExtractionResult } from "~/utils/visuraExtraction";
import { normalizeExtractionResult } from "~/utils/visuraExtraction";

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
    allowedFieldTypes: ["text", "textarea", "number", "select", "multiselect", "client_detail", "project_detail"],
  },
  type_b: {
    subtitle: "Compila o aggiorna i dati strutturati del passaggio prima di procedere.",
    showAiActions: false,
    disableAiActions: true,
    allowedFieldTypes: [
      "text",
      "textarea",
      "number",
      "client_detail",
      "project_detail",
      "select",
      "multiselect",
      "repeatable_group",
      "visura_upload",
      "file_upload_extraction",
      "document_reference",
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
      "client_detail",
      "project_detail",
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
  "client_detail",
  "project_detail",
  "repeatable_group",
  "visura_upload",
  "file_upload_extraction",
  "document_reference",
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
  pageTitle?: string | null;
  taxYear?: number | null;
  typeATemplateContent?: string;
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
  projectDetailChange: [patch: { title?: string; tax_year?: number | null; referente?: string | null }];
}>();

// ─── Form schema ──────────────────────────────────────────────────────────────
const STEP_ONE_FRAMEWORK_FIELDS: StepFormField[] = [
  {
    key: "program_title",
    label: "Titolo del programma",
    type: "project_detail",
    placeholder: "es. Nuovo Patent Box 2025",
    required: true,
    hint: "Collegato al titolo del documento.",
  },
  {
    key: "company_name",
    label: "Ragione sociale",
    type: "client_detail",
    placeholder: "es. Acme S.r.l.",
    required: true,
    hint: "Collegato alla scheda cliente.",
  },
  {
    key: "tax_year",
    label: "Anno di imposta",
    type: "project_detail",
    placeholder: "es. 2026",
    required: true,
    hint: "Collegato ai dettagli progetto.",
  },
  {
    key: "legal_representative",
    label: "Legale rappresentante",
    type: "client_detail",
    placeholder: "es. Mario Rossi",
    required: true,
    hint: "Collegato alla scheda cliente.",
  },
];

const STEP_TWO_FRAMEWORK_FIELDS: StepFormField[] = [
  {
    key: "tax_year",
    label: "Anno di imposta",
    type: "project_detail",
    placeholder: "es. 2026",
    required: true,
    hint: "Collegato ai dettagli progetto.",
  },
  {
    key: "legal_representative",
    label: "Legale rappresentante",
    type: "client_detail",
    placeholder: "es. Mario Rossi",
    required: true,
    hint: "Collegato alla scheda cliente.",
  },
];

const STEP_THREE_DOCUMENT_REFERENCE_FIELD: StepFormField = {
  key: "document_reference",
  label: "Documento di riferimento",
  type: "document_reference",
  hint: "Collegamento a un documento di riferimento. La visualizzazione del link verrà gestita in un passaggio successivo.",
  required: false,
};

function normalizeFrameworkFields(fields: StepFormField[]): StepFormField[] {
  const fieldKeys = new Set(fields.map((field) => field.key));
  const fieldTypes = new Set(fields.map((field) => field.type));

  if (
    props.activeStep.order === 1 &&
    (fieldKeys.has("legal_citation") ||
      fieldKeys.has("ragione_sociale") ||
      !fieldTypes.has("client_detail") ||
      !fieldTypes.has("project_detail"))
  ) {
    return STEP_ONE_FRAMEWORK_FIELDS;
  }

  if (
    props.activeStep.order === 2 &&
    (fieldKeys.has("esercizio_fiscale") ||
      fieldKeys.has("legale_rappresentante") ||
      !fieldTypes.has("client_detail") ||
      !fieldTypes.has("project_detail"))
  ) {
    return STEP_TWO_FRAMEWORK_FIELDS;
  }

  if (props.activeStep.order === 3 && !fieldKeys.has("document_reference")) {
    return [STEP_THREE_DOCUMENT_REFERENCE_FIELD, ...fields];
  }

  return fields;
}

const baseFormFields = computed<StepFormField[]>(() => {
  const schema = props.activeStep.form_schema;
  if (!schema || !Array.isArray(schema)) return [];
  return normalizeFrameworkFields(schema as StepFormField[]);
});

const premessaLegalRepresentativeField = computed<StepFormField | null>(() => {
  if (props.activeStep.order !== 2) return null;
  if (
    baseFormFields.value.some((field) =>
      field.key === "legale_rappresentante" ||
      field.key === "legal_representative",
    )
  ) {
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

  if (field.type === "client_detail") {
    return clientVariableMap.value[field.key] || undefined;
  }

  if (field.key === "program_title" || field.key === "title") {
    return props.pageTitle ?? undefined;
  }

  if (
    (field.key === "tax_year" ||
      field.key === "anno_di_imposta" ||
      field.key === "esercizio_fiscale") &&
    props.taxYear
  ) {
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
const activeStepId = computed(() => props.activeStep.id);

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
const extractionRuleModalOpen = ref(false);
const activeExtractionRuleFieldKey = ref<string | null>(null);
const extractionRuleSections = ref<GenerativeRuleSection[]>([]);
const appliedExtractionRules = ref<Record<string, GenerativeRuleSection[]>>({});
const connectedDetailSaveError = ref("");
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
const isPromptEditable = computed(() => effectiveStepType.value === "type_c");
const areAiActionsDisabled = computed(() => stepConfig.value.disableAiActions);
const premessaTaxYear = computed(() => {
  const value =
    formValues.value.tax_year ??
    formValues.value.anno_di_imposta ??
    formValues.value.esercizio_fiscale;
  const year = Number(String(value ?? "").trim());
  return Number.isInteger(year) && year >= 2020 && year <= 2035 ? year : null;
});
const premessaLegalRepresentative = computed(() =>
  String(
    formValues.value.legal_representative ??
    formValues.value.legale_rappresentante ??
    "",
  ).trim(),
);
const isPremessaReady = computed(
  () => premessaTaxYear.value !== null && premessaLegalRepresentative.value.length > 0,
);
const isTypeAActionDisabled = computed(() => {
  if (props.isGenerating) return true;
  if (props.activeStep.order === 2) return !isPremessaReady.value;
  return false;
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
		    extractionRuleModalOpen.value = false;
		    activeExtractionRuleFieldKey.value = null;
		  },
		);

const {
  promptModalOpen,
  promptReadOnlyValue,
  editablePrompt,
  openPromptModal,
  cancelPromptEdit,
  savePromptEdit,
  onGenerateText,
} = useStepPromptOverride({
  activeStep,
  isEditable: isPromptEditable,
  onGenerate: (promptOverride) => emit("generate", promptOverride),
});

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

const clientForStruttura = computed(() => props.clientData);

const {
  strutturaRuleModalOpen,
  strutturaRuleSections,
  getStrutturaPreview,
  hasStrutturaPreview,
  openStrutturaRuleModal,
  applyStrutturaRule,
  buildStrutturaText,
} = useStrutturaRule({
  activeStepId,
  clientData: clientForStruttura,
  getVisuraData,
});

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

const {
  fileUploading,
  fileUploadError,
  isAnyFileUploading,
  onFileChange,
} = useStepUploadFields({
  activeStepId,
  clearFormSaveError,
  saveFormField,
});

function isExtractionUploadField(field: StepFormField): boolean {
  return field.type === "visura_upload" || field.type === "file_upload_extraction";
}

function isGenerationUploadField(field: StepFormField): boolean {
  return field.type === "file" || field.type === "file_upload_generation";
}

function isDocumentReferenceField(field: StepFormField): boolean {
  return field.type === "document_reference";
}

function isSimpleField(field: StepFormField): boolean {
  return ["multiselect", "textarea", "select", "number", "text", "client_detail", "project_detail"].includes(field.type);
}

function isConnectedDetailField(field: StepFormField): boolean {
  return field.type === "client_detail" || field.type === "project_detail";
}

function normalizeConnectedDetailPayload(field: StepFormField, value: unknown): string | number | null {
  const text = String(value ?? "").trim();
  if (!text) return null;

  if (
    field.key === "tax_year" ||
    field.key === "anno_di_imposta" ||
    field.key === "esercizio_fiscale" ||
    field.type === "number"
  ) {
    const numeric = Number(text);
    return Number.isFinite(numeric) ? numeric : null;
  }

  return text;
}

function clientDetailColumn(fieldKey: string): string {
  const aliases: Record<string, string> = {
    ragione_sociale: "company_name",
    legale_rappresentante: "legal_representative",
    partita_iva: "vat_number",
    sede_legale: "registered_address",
  };
  return aliases[fieldKey] ?? fieldKey;
}

function projectDetailColumn(fieldKey: string): string {
  const aliases: Record<string, string> = {
    program_title: "title",
    anno_di_imposta: "tax_year",
    esercizio_fiscale: "tax_year",
  };
  return aliases[fieldKey] ?? fieldKey;
}

async function saveConnectedDetailField(field: StepFormField, value: unknown): Promise<void> {
  clearFormSaveError();
  connectedDetailSaveError.value = "";
  const payloadValue = normalizeConnectedDetailPayload(field, value);

  try {
    await saveFormField(field.key, value, { throwOnError: true });

    const saved = await $fetch<{
      fieldType: "client_detail" | "project_detail";
      column: string;
      value: string | number | null;
      client?: Record<string, unknown>;
      page?: { title?: string; tax_year?: number | null; referente?: string | null };
    }>("/api/pages/detail-field", {
      method: "POST",
      body: {
        pageId: props.pageId,
        fieldType: field.type,
        fieldKey: field.key,
        value: payloadValue,
      },
    });

    if (saved.value !== value) {
      await saveFormField(field.key, saved.value, { throwOnError: true });
    }

    if (saved.fieldType === "client_detail" && props.clientData) {
      const column = clientDetailColumn(field.key);
      Object.assign(props.clientData, saved.client ?? { [column]: saved.value });
      return;
    }

    if (saved.fieldType === "project_detail") {
      const column = projectDetailColumn(field.key);
      emit("projectDetailChange", {
        [column]: saved.value,
      } as { title?: string; tax_year?: number | null; referente?: string | null });
    }
  } catch (err: unknown) {
    console.error("[StepEditor] connected detail save error:", err);
    connectedDetailSaveError.value =
      err instanceof Error
        ? err.message
        : "Non siamo riusciti a salvare il campo collegato.";
  }
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
    (field) =>
      isExtractionUploadField(field) ||
      isGenerationUploadField(field) ||
      isDocumentReferenceField(field),
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
    disabled: false,
  },
]);

const activeFields = computed(() =>
  activePaneTab.value === "file" ? fileFields.value : variableFields.value,
);

const visibleActiveFields = computed(() =>
  activeFields.value.filter((field) => isFieldVisible(field)),
);

const hasPaneContent = computed(() =>
  visibleActiveFields.value.length > 0 ||
  (activePaneTab.value === "variables" && isTypeAStep.value),
);

const promptTabDescription = computed(() => {
  if (effectiveStepType.value === "type_c") {
    return "Questo prompt guida la prossima generazione AI per lo step corrente.";
  }

  return "Questo step non usa AI: il contenuto viene costruito dai dati inseriti o estratti.";
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

const isSavingClientProfile = ref(false);
const clientProfileSaved = ref(false);

const {
  visuraFile,
  visuraExtracting,
  visuraError,
  visuraResult,
  visuraReviewResult,
  extractionReviewOpen,
  activeExtractionReviewFieldKey,
  extractionReviewFilename,
  onVisuraFileChange,
  clearVisuraFile,
  extractVisura,
  insertReviewedVisura,
} = useVisuraExtractionReview({
  activeStepId,
  clearFormSaveError,
  saveFormField,
  getExtractionRule: (fieldKey) =>
    appliedExtractionRules.value[fieldKey]
      ?.find((section) => section.key === "prompt")
      ?.content ?? null,
  onReset: () => {
    isSavingClientProfile.value = false;
    clientProfileSaved.value = false;
  },
  onInsert: (fieldKey, payload) => {
    emit(
      "confermaStruttura",
      buildStrutturaText(fieldKey, payload),
    );
  },
});

// isVisuraReady: true when no extraction is required, OR when every visible
// extraction field has either a fresh extraction result or a previously saved value.
const isVisuraReady = computed(() => {
  if (!isVisuraRequired.value) return true;
  return renderableExtractionFields.value.every(
    (field) => visuraResult.value[field.key] != null || formValues.value[field.key] != null,
  );
});

const canSaveExtractionToClientProfile = computed(() => Boolean(props.clientData?.id));

const clientProfileHasStructureData = computed(() =>
  Boolean(
    props.clientData?.soci?.length ||
    props.clientData?.partecipate?.length ||
    props.clientData?.shareholders?.length ||
    props.clientData?.subsidiaries?.length,
  ),
);

function toClientProfileSoci(result: ExtractionResult): ClientProfileSocio[] {
  return result.soci.map((socio) => ({
    ragione_sociale: socio.nome ?? null,
    quota: socio.percentuale ?? null,
    tipo: socio.entity_type ?? null,
    sede: socio.indirizzo ?? null,
    codice_fiscale: socio.cf ?? null,
    legale_rappresentante: socio.legale_rappresentante ?? null,
  }));
}

function toClientProfilePartecipate(result: ExtractionResult): ClientProfilePartecipata[] {
  return result.partecipate.map((partecipata) => ({
    ragione_sociale: partecipata.nome ?? null,
    quota: partecipata.percentuale_detenuta ?? null,
    tipo: "persona_giuridica",
    sede: partecipata.indirizzo ?? null,
    codice_fiscale: partecipata.cf ?? null,
    legale_rappresentante: partecipata.legale_rappresentante ?? null,
  }));
}

async function saveReviewedVisuraToClientProfile(result: ExtractionResult): Promise<void> {
  const clientId = props.clientData?.id;
  if (!clientId || isSavingClientProfile.value) return;

  if (clientProfileHasStructureData.value) {
    const confirmed = window.confirm(
      "Il profilo cliente contiene già dati su soci o partecipate. Vuoi sovrascriverli con i dati estratti dalla visura?",
    );
    if (!confirmed) return;
  }

  isSavingClientProfile.value = true;
  try {
    await $fetch("/api/db/mutate", {
      method: "POST",
      body: {
        table: "clients",
        operation: "update",
        data: {
          soci: toClientProfileSoci(result),
          partecipate: toClientProfilePartecipate(result),
        },
        where: { id: clientId },
      },
    });
    clientProfileSaved.value = true;
  } catch (err) {
    console.error("[StepEditor] client profile save error:", err);
    window.alert("Non siamo riusciti a salvare i dati nel profilo cliente. Riprova.");
  } finally {
    isSavingClientProfile.value = false;
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
        <div v-if="hasPaneContent" class="space-y-5">
          <div
            v-for="field in visibleActiveFields"
            :key="`${activeStep.id}-${activePaneTab}-${field.key}`"
          >
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
              @update:model-value="
                isConnectedDetailField(field)
                  ? saveConnectedDetailField(field, $event)
                  : saveFormField(field.key, $event)
              "
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
	              @clear-file="clearVisuraFile(field.key)"
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
              @clear-file="onFileChange(field.key, null)"
            />

            <StepDocumentReferenceField
              v-else-if="isDocumentReferenceField(field)"
              :field="field"
              :value="formValues[field.key]"
            />

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
                      class="text-justify text-[12px] leading-7 text-slate-700"
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

          <StepTypeAWorkspace
            v-if="activePaneTab === 'variables' && isTypeAStep"
            :step-id="activeStep.id"
            :template-content="typeATemplateContent ?? ''"
            :is-generating="isGenerating"
            :action-disabled="isTypeAActionDisabled"
            @produce="onTypeAAction"
          />
        </div>

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
            Prompt dello step
          </p>
          <p class="mt-2 text-sm leading-6 text-slate-500">
            {{ promptTabDescription }}
          </p>
        </div>

        <div
          v-if="!isPromptEditable"
          class="rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm leading-6 text-slate-500"
        >
          {{ promptReadOnlyValue }}
        </div>

        <div
          v-else
          class="relative"
        >
          <UTextarea
            v-model="editablePrompt"
            :rows="10"
            class="w-full"
            :ui="{
              base: 'w-full resize-y rounded-xl border-slate-200 bg-white px-4 py-3 pr-12 font-mono text-xs leading-6 text-slate-700 focus:border-violet-300 focus:ring-violet-200',
            }"
          />
          <UButton
            variant="ghost"
            color="neutral"
            size="sm"
            icon="i-lucide-expand"
            class="absolute right-2 top-2 rounded-lg"
            aria-label="Espandi prompt"
            @click="openPromptModal"
          />
        </div>
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
        v-if="connectedDetailSaveError"
        color="error"
        variant="soft"
        :description="connectedDetailSaveError"
        icon="i-lucide-circle-alert"
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

	  <PromptExpandModal
	    v-model:open="promptModalOpen"
	    :prompt="editablePrompt"
	    @cancel="cancelPromptEdit"
	    @save="savePromptEdit"
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
	  <StepExtractionReviewModal
	    v-model:open="extractionReviewOpen"
	    :result="activeExtractionReviewFieldKey ? visuraReviewResult[activeExtractionReviewFieldKey] ?? null : null"
	    :filename="extractionReviewFilename"
	    :can-save-profile="canSaveExtractionToClientProfile"
	    :is-saving-profile="isSavingClientProfile"
	    :profile-saved="clientProfileSaved"
	    @insert="insertReviewedVisura"
	    @save-profile="saveReviewedVisuraToClientProfile"
	  />
	</template>

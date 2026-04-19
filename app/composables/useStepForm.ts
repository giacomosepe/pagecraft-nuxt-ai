import type { ComputedRef } from "vue";
import type { StepFormField, StepRecord } from "~/types/app.types";

interface SaveFormFieldOptions {
  throwOnError?: boolean;
}

interface UseStepFormParams {
  activeStep: ComputedRef<StepRecord>;
  formFields: ComputedRef<StepFormField[]>;
}

function buildEmptyInstance(field: StepFormField): Record<string, unknown> {
  const instance: Record<string, unknown> = {};
  for (const subField of field.fields ?? []) {
    instance[subField.key] = subField.type === "multiselect" ? [] : "";
  }
  return instance;
}

function normalizeFormData(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function useStepForm({ activeStep, formFields }: UseStepFormParams) {
  const formValues = ref<Record<string, unknown>>({});
  const formSaveError = ref("");

  let saveQueue: Promise<void> = Promise.resolve();

  watch(
    [() => activeStep.value.id, () => activeStep.value.form_data, formFields],
    ([, formData]) => {
      const nextValues = { ...normalizeFormData(formData) };

      for (const field of formFields.value) {
        if (field.type !== "repeatable_group") continue;

        const existing = nextValues[field.key];
        const minItems = field.minItems ?? 1;
        if ((!Array.isArray(existing) || existing.length === 0) && minItems >= 1) {
          nextValues[field.key] = [buildEmptyInstance(field)];
        }
      }

      formValues.value = nextValues;
      formSaveError.value = "";
      saveQueue = Promise.resolve();
    },
    { immediate: true },
  );

  async function persistFormData(
    payload: Record<string, unknown>,
    stepId: string,
  ): Promise<void> {
    await $fetch("/api/db/mutate", {
      method: "POST",
      body: {
        table: "steps",
        operation: "update",
        data: { form_data: payload },
        where: { id: stepId },
      },
    });
  }

  async function saveFormField(
    key: string,
    value: unknown,
    options: SaveFormFieldOptions = {},
  ): Promise<void> {
    const updated = { ...formValues.value, [key]: value };
    const stepId = activeStep.value.id;

    formValues.value = updated;
    formSaveError.value = "";

    const queuedSave = saveQueue
      .catch(() => {})
      .then(async () => {
        try {
          await persistFormData(updated, stepId);
        } catch (err: unknown) {
          const message =
            err instanceof Error
              ? err.message
              : "Errore durante il salvataggio dei campi";

          formSaveError.value = message;
          console.error("[useStepForm] saveFormField error:", err);

          if (options.throwOnError) {
            throw err;
          }
        }
      });

    saveQueue = queuedSave.catch(() => {});
    return queuedSave;
  }

  function clearFormSaveError(): void {
    formSaveError.value = "";
  }

  function isFieldVisible(field: StepFormField): boolean {
    if (!field.conditional) return true;
    return String(formValues.value[field.conditional.key] ?? "") === field.conditional.value;
  }

  function getInstances(fieldKey: string): Record<string, unknown>[] {
    const value = formValues.value[fieldKey];
    return Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
  }

  async function addInstance(field: StepFormField): Promise<void> {
    const instances = [...getInstances(field.key), buildEmptyInstance(field)];
    await saveFormField(field.key, instances);
  }

  async function removeInstance(field: StepFormField, index: number): Promise<void> {
    const instances = getInstances(field.key).filter((_, i) => i !== index);
    await saveFormField(field.key, instances);
  }

  async function updateInstanceField(
    groupKey: string,
    index: number,
    subKey: string,
    value: unknown,
  ): Promise<void> {
    const instances = getInstances(groupKey).map((instance, i) =>
      i === index ? { ...instance, [subKey]: value } : instance,
    );

    await saveFormField(groupKey, instances);
  }

  return {
    formValues,
    formSaveError,
    clearFormSaveError,
    saveFormField,
    isFieldVisible,
    getInstances,
    addInstance,
    removeInstance,
    updateInstanceField,
  };
}

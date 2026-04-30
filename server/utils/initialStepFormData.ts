interface FrameworkStepSnapshot {
  order: number;
  form_schema: unknown;
}

function hasProgramTitleField(formSchema: unknown): boolean {
  if (!Array.isArray(formSchema)) return false;

  return formSchema.some(
    (field) =>
      field &&
      typeof field === "object" &&
      "key" in field &&
      field.key === "program_title",
  );
}

export function buildInitialStepFormData(
  step: FrameworkStepSnapshot,
  documentTitle: string,
): Record<string, string> | null {
  if (step.order !== 1 || !hasProgramTitleField(step.form_schema)) {
    return null;
  }

  return {
    program_title: documentTitle,
  };
}

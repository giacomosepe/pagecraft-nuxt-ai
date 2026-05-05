interface FrameworkStepSnapshot {
  order: number;
  form_schema: unknown;
}

interface InitialStepFormContext {
  documentTitle: string;
  taxYear?: number | null;
}

function hasField(formSchema: unknown, key: string): boolean {
  if (!Array.isArray(formSchema)) return false;

  return formSchema.some(
    (field) =>
      field &&
      typeof field === "object" &&
      "key" in field &&
      field.key === key,
  );
}

export function buildInitialStepFormData(
  step: FrameworkStepSnapshot,
  contextOrTitle: InitialStepFormContext | string,
): Record<string, string> | null {
  const context =
    typeof contextOrTitle === "string"
      ? { documentTitle: contextOrTitle }
      : contextOrTitle;

  if (step.order !== 1) {
    return null;
  }

  const data: Record<string, string> = {};

  if (hasField(step.form_schema, "program_title")) {
    data.program_title = context.documentTitle;
  }

  if (context.taxYear && hasField(step.form_schema, "tax_year")) {
    data.tax_year = String(context.taxYear);
  }

  if (context.taxYear && hasField(step.form_schema, "anno_di_imposta")) {
    data.anno_di_imposta = String(context.taxYear);
  }

  if (context.taxYear && hasField(step.form_schema, "esercizio_fiscale")) {
    data.esercizio_fiscale = String(context.taxYear);
  }

  return Object.keys(data).length ? data : null;
}

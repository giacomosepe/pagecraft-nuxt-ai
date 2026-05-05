import { serverSupabaseClient } from "#supabase/server";
import { z } from "zod";

const clientDetailColumns = {
  company_name: "company_name",
  ragione_sociale: "company_name",
  legal_representative: "legal_representative",
  legale_rappresentante: "legal_representative",
  vat_number: "vat_number",
  partita_iva: "vat_number",
  codice_fiscale: "codice_fiscale",
  registered_address: "registered_address",
  sede_legale: "registered_address",
  company_form: "company_form",
  industry_sector: "industry_sector",
} as const;

const projectDetailColumns = {
  program_title: "title",
  title: "title",
  tax_year: "tax_year",
  anno_di_imposta: "tax_year",
  esercizio_fiscale: "tax_year",
  referente: "referente",
} as const;

const DetailFieldSchema = z.object({
  pageId: z.string().uuid(),
  fieldType: z.enum(["client_detail", "project_detail"]),
  fieldKey: z.string().min(1).max(80),
  value: z.union([z.string(), z.number(), z.null()]),
});

function normalizedValue(column: string, value: string | number | null): string | number | null {
  if (value === null) return null;

  const text = String(value).trim();
  if (!text) return null;

  if (column === "tax_year") {
    const year = Number(text);
    if (!Number.isInteger(year) || year < 2020 || year > 2035) {
      throw createError({
        statusCode: 400,
        message: "Anno di imposta non valido.",
      });
    }
    return year;
  }

  return text;
}

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event);
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw createError({ statusCode: 401, message: "Unauthorized" });

  const body = await readBody(event);
  const parsed = DetailFieldSchema.safeParse(body);
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.issues[0]?.message ?? "Richiesta non valida.",
    });
  }

  const { pageId, fieldType, fieldKey, value } = parsed.data;

  const { data: page, error: pageError } = await client
    .from("pages")
    .select("id, client_id, user_id")
    .eq("id", pageId)
    .single();

  if (pageError || !page) {
    throw createError({ statusCode: 404, message: "Documento non trovato." });
  }

  if (page.user_id !== user.id) {
    throw createError({ statusCode: 403, message: "Accesso non consentito." });
  }

  if (fieldType === "client_detail") {
    const column = clientDetailColumns[fieldKey as keyof typeof clientDetailColumns];
    if (!column) {
      throw createError({ statusCode: 400, message: "Campo cliente non supportato." });
    }

    if (!page.client_id) {
      throw createError({ statusCode: 400, message: "Documento senza cliente collegato." });
    }

    const nextValue = normalizedValue(column, value);
    const { data: updatedClient, error: updateError } = await client
      .from("clients")
      .update({ [column]: nextValue })
      .eq("id", page.client_id)
      .eq("user_id", user.id)
      .select("id, company_name, legal_representative, vat_number, codice_fiscale, registered_address, company_form, industry_sector")
      .single();

    if (updateError || !updatedClient) {
      throw createError({
        statusCode: 500,
        message: updateError?.message ?? "Salvataggio cliente non riuscito.",
      });
    }

    return {
      fieldType,
      column,
      value: nextValue,
      client: updatedClient,
    };
  }

  const column = projectDetailColumns[fieldKey as keyof typeof projectDetailColumns];
  if (!column) {
    throw createError({ statusCode: 400, message: "Campo progetto non supportato." });
  }

  const nextValue = normalizedValue(column, value);
  const { data: updatedPage, error: updateError } = await client
    .from("pages")
    .update({ [column]: nextValue })
    .eq("id", pageId)
    .eq("user_id", user.id)
    .select("id, title, tax_year, referente")
    .single();

  if (updateError || !updatedPage) {
    throw createError({
      statusCode: 500,
      message: updateError?.message ?? "Salvataggio progetto non riuscito.",
    });
  }

  return {
    fieldType,
    column,
    value: nextValue,
    page: updatedPage,
  };
});

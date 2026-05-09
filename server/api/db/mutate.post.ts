import { serverSupabaseClient } from "#supabase/server";
import { z } from "zod";

// Supported tables and operations
// NOTE: company_profiles removed — all company data lives on clients now
const MutateSchema = z.object({
  table: z.enum([
    "clients",
    "folders",
    "pages",
    "files",
    "steps",
    "generations",
  ]),
  operation: z.enum(["insert", "update", "delete"]),
  data: z.record(z.string(), z.unknown()),
  where: z.record(z.string(), z.unknown()).optional(),
});

// Whitelist of allowed filter columns per table
const ALLOWED_WHERE_KEYS: Record<string, string[]> = {
  clients: ["id"],
  folders: ["id"],
  pages: ["id", "folder_id", "client_id"],
  files: ["id", "page_id", "step_id"],
  steps: ["id", "page_id"],
  generations: ["id", "step_id"],
};

// Whitelist of client-writable columns per table. Columns not listed here are
// silently stripped so legacy callers do not break, while sensitive fields stay
// outside the generic write surface.
const ALLOWED_WRITE_COLUMNS: Record<string, string[]> = {
  clients: [
    "name",
    "company_name",
    "industry_sector",
    "employee_count",
    "legal_representative",
    "vat_number",
    "codice_fiscale",
    "registered_address",
    "company_form",
    "street_address",
    "city",
    "provincia",
    "cap",
    "revenue",
    "legal_rep_name",
    "legal_rep_cf",
    "legal_rep_dob",
    "contact_name",
    "contact_email",
    "contact_phone",
    "board_members",
    "shareholders",
    "subsidiaries",
    "soci",
    "partecipate",
  ],
  folders: [
    "program_name",
    "tax_year",
    "referente",
  ],
  pages: [
    "title",
    "tax_year",
  ],
  files: [
    "filename",
    "storage_path",
    "mime_type",
    "file_size_bytes",
    "scope",
    "file_type",
    "extraction_status",
    "page_id",
    "step_id",
  ],
  steps: [
    "form_data",
    "user_context",
  ],
  generations: [
    "step_id",
    "page_id",
    "prompt",
    "output",
    "mode",
  ],
};

// Tables that have user_id directly on the row (used for RLS double-check on writes)
// steps and generations are protected by RLS through their parent chain
const TABLES_WITH_USER_ID = [
  "clients",
  "folders",
  "pages",
  "files",
];

function sanitizeWriteData(
  table: string,
  operation: "insert" | "update" | "delete",
  data: Record<string, unknown>,
): Record<string, unknown> {
  if (operation === "delete") return {};

  const allowedColumns = ALLOWED_WRITE_COLUMNS[table] ?? [];
  const allowedColumnSet = new Set(allowedColumns);
  const payload: Record<string, unknown> = {};
  const strippedColumns: string[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (allowedColumnSet.has(key)) {
      payload[key] = value;
    } else {
      strippedColumns.push(key);
    }
  }

  if (strippedColumns.length > 0) {
    console.warn("[db/mutate] stripped disallowed write columns", {
      table,
      operation,
      columns: strippedColumns,
    });
  }

  return payload;
}

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event);
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw createError({ statusCode: 401, message: "Unauthorized" });

  const body = await readBody(event);
  const parsed = MutateSchema.safeParse(body);
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.issues[0]?.message,
    });
  }

  const { table, operation, data, where } = parsed.data;
  const sanitizedData = sanitizeWriteData(table, operation, data);

  // Validate where keys against whitelist
  if (where) {
    const allowedKeys = ALLOWED_WHERE_KEYS[table] ?? [];
    const invalidKeys = Object.keys(where).filter(
      (k) => !allowedKeys.includes(k),
    );
    if (invalidKeys.length > 0) {
      throw createError({
        statusCode: 400,
        message: `Invalid filter keys: ${invalidKeys.join(", ")}`,
      });
    }
  }

  // Always inject user_id on insert — never trust it from the client
  const payload =
    operation === "insert" && TABLES_WITH_USER_ID.includes(table)
      ? { ...sanitizedData, user_id: user.id }
      : sanitizedData;

  let query = client.from(table);

  if (operation === "insert") {
    const { data: result, error } = await (query as any)
      .insert(payload)
      .select()
      .single();
    if (error) throw createError({ statusCode: 500, message: error.message });
    return result;
  }

  if (operation === "update" && where) {
    let q = (query as any).update(payload);
    for (const [key, value] of Object.entries(where)) {
      q = q.eq(key, value);
    }
    if (TABLES_WITH_USER_ID.includes(table)) {
      q = q.eq("user_id", user.id);
    }
    const { data: result, error } = await q.select().single();
    if (error) throw createError({ statusCode: 500, message: error.message });
    return result;
  }

  if (operation === "delete" && where) {
    let q = (query as any).delete();
    for (const [key, value] of Object.entries(where)) {
      q = q.eq(key, value);
    }
    if (TABLES_WITH_USER_ID.includes(table)) {
      q = q.eq("user_id", user.id);
    }
    const { error } = await q;
    if (error) throw createError({ statusCode: 500, message: error.message });
    return { success: true };
  }

  throw createError({ statusCode: 400, message: "Invalid operation" });
});

import { serverSupabaseClient } from "#supabase/server";
import { z } from "zod";

// Supported tables and operations
const MutateSchema = z.object({
  table: z.enum([
    "clients",
    "folders",
    "company_profiles",
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
  company_profiles: ["id", "client_id"],
  pages: ["id", "folder_id", "client_id"],
  files: ["id", "page_id", "step_id"],
  steps: ["id", "page_id"],
  generations: ["id", "step_id"],
};

// ← NEW: only these tables have user_id directly on the row
// steps and generations do not — they're protected by RLS through parent tables
const TABLES_WITH_USER_ID = [
  "clients",
  "folders",
  "company_profiles",
  "pages",
  "files",
];

export default defineEventHandler(async (event) => {
  // Always verify auth first
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
  // Only for tables that have user_id directly
  const payload =
    operation === "insert" && TABLES_WITH_USER_ID.includes(table)
      ? { ...data, user_id: user.id }
      : data;

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
    // Defence in depth — only add user_id filter for tables that have it
    // For steps/generations, RLS protects through the parent chain
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
    // Same — only add user_id filter for tables that have it directly
    if (TABLES_WITH_USER_ID.includes(table)) {
      q = q.eq("user_id", user.id);
    }
    const { error } = await q;
    if (error) throw createError({ statusCode: 500, message: error.message });
    return { success: true };
  }

  throw createError({ statusCode: 400, message: "Invalid operation" });
});

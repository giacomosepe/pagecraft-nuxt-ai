import {
  serverSupabaseServiceRole,
  serverSupabaseClient,
} from "#supabase/server";
import { randomUUID } from "uncrypto";
import { z } from "zod";

// ─── Request schema ───────────────────────────────────────────────────────────
// Zod validates the shape and content of whatever the client sends.
// If any field fails, Zod tells us exactly which one and why — before we
// touch the database at all.
const nullable_uuid = z
  .union([z.string().uuid(), z.literal(""), z.null()])
  .optional()
  .transform((v) => v || null);

const CreatePageSchema = z.object({
  frameworkId: z.string().uuid("Please select a valid framework"),
  title: z
    .string()
    .min(1, "Title is required")
    .max(200)
    .transform((s) => s.trim()),
  clientId: nullable_uuid,
  companyProfileId: nullable_uuid,
});

export default defineEventHandler(async (event) => {
  // ─── Step 1: Authenticate ─────────────────────────────────────────────────
  // serverSupabaseUser reads the session from the request cookies server-side.
  // If there's no valid session, we stop immediately with a 401.
  const client = await serverSupabaseClient(event);
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  // ─── Step 2: Validate request body ───────────────────────────────────────
  // readBody parses the JSON body. safeParse runs Zod validation without
  // throwing — we get { success, data } or { success, error } back.
  const body = await readBody(event);
  const parsed = CreatePageSchema.safeParse(body);

  if (!parsed.success) {
    // Return the first validation error message — clear and specific

    throw createError({
      statusCode: 400,
      message: parsed.error.issues[0]?.message ?? "Invalid request body",
    });
  }

  // From here on, parsed.data is fully typed and guaranteed valid
  const { frameworkId, title, clientId, companyProfileId } = parsed.data;

  // ─── Step 3: Get service role client ─────────────────────────────────────
  // The service role client bypasses Row Level Security. We need it here
  // because framework_steps are system-owned — not user-owned — so the
  // regular user client can't read them.
  // This client ONLY runs on the server. Never expose it to the browser.
  const supabase = serverSupabaseServiceRole(event);

  // ─── Step 4: Load and validate the framework ──────────────────────────────
  // We snapshot the framework name so the page title survives future
  // framework renames or deletions.
  const { data: framework, error: frameworkError } = await supabase
    .from("frameworks")
    .select("id, name")
    .eq("id", frameworkId)
    .eq("is_public", true)
    .is("deprecated_at", null)
    .single();

  if (frameworkError) {
    throw createError({ statusCode: 404, message: "Framework not found" });
  }

  // ─── Step 5: Load framework steps ────────────────────────────────────────
  // These are the blueprint steps we'll copy into the page.
  // Ordered by `order` so the snapshot preserves the correct sequence.
  const { data: frameworkSteps, error: frameworkStepsError } = await supabase
    .from("framework_steps")
    .select("id, order, title, system_prompt_template, refine_prompt_template")
    .eq("framework_id", frameworkId)
    .order("order", { ascending: true });

  if (frameworkStepsError) {
    throw createError({
      statusCode: 500,
      message: "Could not load framework steps",
    });
  }

  if (!frameworkSteps?.length) {
    throw createError({
      statusCode: 422,
      message: "This framework has no steps defined",
    });
  }

  // ─── Step 6: Create the page row ─────────────────────────────────────────
  // We set framework_name as a snapshot — if the framework is renamed later,
  // existing pages are unaffected.
  const pageId = randomUUID();
  const now = new Date().toISOString();

  const { error: pageInsertError } = await supabase.from("pages").insert({
    id: pageId,
    user_id: user.id,
    framework_id: frameworkId,
    framework_name: framework.name,
    title,
    status: "DRAFT",
    client_id: clientId ?? null,
    company_profile_id: companyProfileId ?? null,
    folder_id: null,
    created_at: now,
    updated_at: now,
  });

  if (pageInsertError) {
    throw createError({ statusCode: 500, message: "Could not create page" });
  }

  // ─── Step 7: Snapshot framework steps into page steps ────────────────────
  // This is the critical atomic operation. We copy every framework step into
  // a step row tied to this page. Prompt templates are copied verbatim —
  // future edits to the framework blueprint never affect existing pages.
  const stepRows = frameworkSteps.map((fs) => ({
    id: randomUUID(),
    page_id: pageId,
    framework_step_id: fs.id,
    order: fs.order,
    title: fs.title,
    system_prompt_template: fs.system_prompt_template,
    refine_prompt_template: fs.refine_prompt_template,
    status: "PENDING" as const,
    user_context: null,
    committed_output: null,
    last_prompt_used: null,
    created_at: now,
    updated_at: now,
  }));

  const { error: stepsInsertError } = await supabase
    .from("steps")
    .insert(stepRows);

  if (stepsInsertError) {
    // Step insertion failed — manually clean up the page row we just created
    // so we don't leave an orphaned page with no steps in the database.
    // This is a manual rollback since Supabase JS doesn't expose transactions.
    await supabase.from("pages").delete().eq("id", pageId);
    throw createError({
      statusCode: 500,
      message: "Could not create steps — page creation rolled back",
    });
  }

  // ─── Step 8: Return the new page id ──────────────────────────────────────
  // The client uses this to redirect to /pages/[pageId]
  return { pageId };
});

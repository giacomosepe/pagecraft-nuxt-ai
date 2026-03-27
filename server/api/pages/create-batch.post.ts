import {
  serverSupabaseServiceRole,
  serverSupabaseClient,
} from "#supabase/server";
import { randomUUID } from "uncrypto";
import { z } from "zod";

// ─── Request schema ───────────────────────────────────────────────────────────
// Each framework entry carries its own title so the caller can name each
// document independently (e.g. "Patent Box 2024" vs "Relazione Tecnica 2024").
const FrameworkEntrySchema = z.object({
  frameworkId: z.string().uuid("Invalid framework ID"),
  title: z
    .string()
    .min(1, "Document title is required")
    .max(200)
    .transform((s) => s.trim()),
});

const CreateBatchSchema = z
  .object({
    pages: z
      .array(FrameworkEntrySchema)
      .min(1, "Select at least one framework")
      .max(10, "Too many frameworks selected"),
    clientId: z.string().uuid("Please select a valid client"),
    // Exactly one of folderId or newFolderName must be provided.
    // folderId  → user picked an existing folder
    // newFolderName → user typed a new project name; we create the folder here
    folderId: z.string().uuid().optional().nullable(),
    newFolderName: z.string().min(1).max(200).optional(),
  })
  .refine((d) => d.folderId || d.newFolderName, {
    message: "Please select or create a program folder",
  });

export default defineEventHandler(async (event) => {
  // ─── Step 1: Authenticate ─────────────────────────────────────────────────
  const client = await serverSupabaseClient(event);
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  // ─── Step 2: Validate request body ───────────────────────────────────────
  const body = await readBody(event);
  const parsed = CreateBatchSchema.safeParse(body);

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.issues[0]?.message ?? "Invalid request body",
    });
  }

  const { pages, clientId, folderId, newFolderName } = parsed.data;

  // ─── Step 3: Get service role client ─────────────────────────────────────
  // Needed to read system-owned framework_steps (not user-scoped).
  // All writes still include user_id so ownership is enforced at the data level.
  const supabase = serverSupabaseServiceRole(event);

  // ─── Step 4: Verify client ownership ─────────────────────────────────────
  // Service role bypasses RLS, so we check explicitly using the user client
  // that the client record belongs to the authenticated user.
  const { data: ownedClient, error: clientCheckError } = await client
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .single();

  if (clientCheckError || !ownedClient) {
    throw createError({
      statusCode: 403,
      message: "Client not found or access denied",
    });
  }

  // ─── Step 5: Resolve folder — create it on the fly if needed ─────────────
  // One folder is shared across all documents in this batch.
  let resolvedFolderId: string;
  let resolvedFolderName: string;
  let folderWasCreated = false;

  if (newFolderName) {
    const newFolderId = randomUUID();
    const trimmedName = newFolderName.trim();
    const { error: folderInsertError } = await supabase.from("folders").insert({
      id: newFolderId,
      user_id: user.id,
      client_id: clientId,
      program_name: trimmedName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (folderInsertError) {
      throw createError({
        statusCode: 500,
        message: "Could not create program folder",
      });
    }
    resolvedFolderId = newFolderId;
    resolvedFolderName = trimmedName;
    folderWasCreated = true;
  } else {
    // folderId is guaranteed by the Zod .refine() above — safe to assert.
    // Look up the folder name so we can return it.
    resolvedFolderId = folderId!;
    const { data: existingFolder, error: folderLookupError } = await supabase
      .from("folders")
      .select("program_name")
      .eq("id", resolvedFolderId)
      .single();
    if (folderLookupError || !existingFolder) {
      throw createError({ statusCode: 404, message: "Folder not found" });
    }
    resolvedFolderName = existingFolder.program_name ?? "";
  }

  // ─── Step 6: Create each document ────────────────────────────────────────
  // We track IDs of successfully created pages so we can roll back on failure.
  const createdPageIds: string[] = [];
  const now = new Date().toISOString();

  // Manual rollback helper — delete all pages created so far (and the folder
  // if we created it), so nothing is left behind on failure.
  const rollback = async () => {
    if (createdPageIds.length > 0) {
      await supabase.from("pages").delete().in("id", createdPageIds);
    }
    if (folderWasCreated) {
      await supabase.from("folders").delete().eq("id", resolvedFolderId);
    }
  };

  for (const entry of pages) {
    // ── 6a: Load and validate the framework ──────────────────────────────
    const { data: framework, error: frameworkError } = await supabase
      .from("frameworks")
      .select("id, name")
      .eq("id", entry.frameworkId)
      .eq("is_public", true)
      .is("deprecated_at", null)
      .single();

    if (frameworkError || !framework) {
      await rollback();
      throw createError({
        statusCode: 404,
        message: `Framework not found: ${entry.frameworkId}`,
      });
    }

    // ── 6b: Load framework steps ─────────────────────────────────────────
    const { data: frameworkSteps, error: frameworkStepsError } = await supabase
      .from("framework_steps")
      .select("id, order, title, system_prompt_template, refine_prompt_template")
      .eq("framework_id", entry.frameworkId)
      .order("order", { ascending: true });

    if (frameworkStepsError) {
      await rollback();
      throw createError({
        statusCode: 500,
        message: "Could not load framework steps",
      });
    }

    if (!frameworkSteps?.length) {
      await rollback();
      throw createError({
        statusCode: 422,
        message: `Framework "${framework.name}" has no steps defined`,
      });
    }

    // ── 6c: Create the page row ──────────────────────────────────────────
    const pageId = randomUUID();

    const { error: pageInsertError } = await supabase.from("pages").insert({
      id: pageId,
      user_id: user.id,
      framework_id: entry.frameworkId,
      framework_name: framework.name,
      title: entry.title,
      status: "DRAFT",
      client_id: clientId,
      folder_id: resolvedFolderId,
      created_at: now,
      updated_at: now,
    });

    if (pageInsertError) {
      await rollback();
      throw createError({
        statusCode: 500,
        message: `Could not create page for framework "${framework.name}"`,
      });
    }

    createdPageIds.push(pageId);

    // ── 6d: Snapshot framework steps into page steps ─────────────────────
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
      // Page was inserted but steps failed — include this page in the rollback.
      // createdPageIds already contains pageId, so rollback() handles it.
      await rollback();
      throw createError({
        statusCode: 500,
        message: `Could not create steps for "${framework.name}" — all changes rolled back`,
      });
    }
  }

  // ─── Step 7: Return ───────────────────────────────────────────────────────
  // folderId is used by the frontend to navigate to /folders/[folderId].
  // pageIds lets the folder page load and display the correct documents.
  return {
    folderId: resolvedFolderId,
    folderName: resolvedFolderName,
    pageIds: createdPageIds,
  };
});

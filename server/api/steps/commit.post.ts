import { serverSupabaseClient } from "#supabase/server";
import { z } from "zod";

const CommitStepSchema = z.object({
  stepId: z.string().uuid(),
  committedOutput: z.string().min(1),
});

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event);
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw createError({ statusCode: 401, message: "Unauthorized" });

  const body = await readBody(event);
  const parsed = CommitStepSchema.safeParse(body);
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.issues[0]?.message,
    });
  }

  const { stepId, committedOutput } = parsed.data;

  const { data, error } = await client
    .from("steps")
    .update({
      committed_output: committedOutput,
      status: "COMMITTED",
    })
    .eq("id", stepId)
    .select()
    .single();

  if (error) {
    throw createError({ statusCode: 500, message: error.message });
  }

  return data;
});

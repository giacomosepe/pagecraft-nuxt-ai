import {
	serverSupabaseClient,
	serverSupabaseServiceRole,
} from "#supabase/server";
import { z } from "zod";
import {
	buildPageContextStoragePath,
	inferDocumentMimeType,
	isAllowedContextDocument,
	isPageContextSlot,
	PAGE_CONTEXT_BUCKET,
	PAGE_CONTEXT_CHAR_BUDGETS,
	PAGE_CONTEXT_ALLOWED_MIME_TYPES,
	truncateAtSentence,
	type PageContextSlot,
} from "../../utils/contextDocuments";
import { extractDocumentText } from "../../utils/extractDocumentText";

const MAX_FILE_SIZE = 20 * 1024 * 1024;

const FormSchema = z.object({
	pageId: z.string().uuid(),
	slot: z.string().refine(isPageContextSlot, "Invalid slot"),
});

async function ensureContextBucket(supabase: ReturnType<typeof serverSupabaseServiceRole>) {
	const { data } = await supabase.storage.getBucket(PAGE_CONTEXT_BUCKET);
	if (data) return;

	const { error } = await supabase.storage.createBucket(PAGE_CONTEXT_BUCKET, {
		public: false,
		fileSizeLimit: MAX_FILE_SIZE,
		allowedMimeTypes: [...PAGE_CONTEXT_ALLOWED_MIME_TYPES],
	});

	if (error && !error.message.toLowerCase().includes("already exists")) {
		throw createError({ statusCode: 500, message: error.message });
	}
}

export default defineEventHandler(async (event) => {
	const userClient = await serverSupabaseClient(event);
	const {
		data: { user },
	} = await userClient.auth.getUser();
	if (!user) throw createError({ statusCode: 401, message: "Unauthorized" });

	const form = await readMultipartFormData(event);
	if (!form?.length) {
		throw createError({ statusCode: 400, message: "No file uploaded" });
	}

	const parsed = FormSchema.safeParse({
		pageId: form.find((part) => part.name === "pageId")?.data?.toString("utf8"),
		slot: form.find((part) => part.name === "slot")?.data?.toString("utf8"),
	});

	if (!parsed.success) {
		throw createError({
			statusCode: 400,
			message: parsed.error.issues[0]?.message ?? "Invalid upload",
		});
	}

	const filePart = form.find((part) => part.name === "file");
	if (!filePart?.data || !filePart.filename) {
		throw createError({ statusCode: 400, message: "Missing file field" });
	}

	const { pageId, slot } = parsed.data as { pageId: string; slot: PageContextSlot };
	const mimeType = inferDocumentMimeType(filePart.filename, filePart.type ?? "");

	if (!isAllowedContextDocument(filePart.filename, mimeType)) {
		throw createError({
			statusCode: 400,
			message: "Sono accettati solo file PDF, DOC o DOCX.",
		});
	}

	if (filePart.data.length > MAX_FILE_SIZE) {
		throw createError({
			statusCode: 413,
			message: "Il file supera il limite massimo di 20 MB.",
		});
	}

	const { error: ownerError } = await userClient
		.from("pages")
		.select("id")
		.eq("id", pageId)
		.single();

	if (ownerError) {
		throw createError({ statusCode: 403, message: "Access denied" });
	}

	const supabase = serverSupabaseServiceRole(event);
	await ensureContextBucket(supabase);

	const rawText = await extractDocumentText(filePart.data, mimeType);
	const extractedText = truncateAtSentence(rawText, PAGE_CONTEXT_CHAR_BUDGETS[slot]);
	const storagePath = buildPageContextStoragePath(pageId, slot, filePart.filename);

	const { data: existing } = await (supabase.from as any)("page_context_documents")
		.select("id, storage_path")
		.eq("page_id", pageId)
		.eq("slot", slot)
		.maybeSingle();

	if (existing?.storage_path) {
		await supabase.storage
			.from(PAGE_CONTEXT_BUCKET)
			.remove([existing.storage_path]);

		await (supabase.from as any)("page_context_documents")
			.delete()
			.eq("id", existing.id);
	}

	const { error: uploadError } = await supabase.storage
		.from(PAGE_CONTEXT_BUCKET)
		.upload(storagePath, filePart.data, {
			contentType: mimeType,
			upsert: true,
		});

	if (uploadError) {
		throw createError({ statusCode: 500, message: uploadError.message });
	}

	const { data: inserted, error: insertError } = await (supabase.from as any)("page_context_documents")
		.insert({
			page_id: pageId,
			slot,
			filename: filePart.filename,
			file_size_bytes: filePart.data.length,
			storage_path: storagePath,
			extracted_text: extractedText,
			extracted_at: new Date().toISOString(),
			user_id: user.id,
		})
		.select("id, page_id, slot, filename, file_size_bytes, storage_path, extracted_at, uploaded_at")
		.single();

	if (insertError) {
		await supabase.storage.from(PAGE_CONTEXT_BUCKET).remove([storagePath]);
		throw createError({ statusCode: 500, message: insertError.message });
	}

	return inserted;
});

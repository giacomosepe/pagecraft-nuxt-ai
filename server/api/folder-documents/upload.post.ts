import {
	serverSupabaseClient,
	serverSupabaseServiceRole,
} from "#supabase/server";
import { z } from "zod";
import {
	buildFolderDocumentStoragePath,
	FOLDER_DOCUMENT_ALLOWED_MIME_TYPES,
	FOLDER_DOCUMENT_BUCKET,
	inferFolderDocumentMimeType,
	isAllowedFolderDocument,
	isFolderDocumentSlot,
	type FolderDocumentSlot,
} from "../../utils/folderDocuments";

const MAX_FILE_SIZE = 20 * 1024 * 1024;

const FormSchema = z.object({
	folderId: z.string().uuid(),
	slot: z.string().refine(isFolderDocumentSlot, "Invalid slot"),
});

async function ensureFolderDocumentBucket(
	supabase: ReturnType<typeof serverSupabaseServiceRole>,
) {
	const { data } = await supabase.storage.getBucket(FOLDER_DOCUMENT_BUCKET);
	if (data) return;

	const { error } = await supabase.storage.createBucket(FOLDER_DOCUMENT_BUCKET, {
		public: false,
		fileSizeLimit: MAX_FILE_SIZE,
		allowedMimeTypes: [...FOLDER_DOCUMENT_ALLOWED_MIME_TYPES],
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
		folderId: form.find((part) => part.name === "folderId")?.data?.toString("utf8"),
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

	const { folderId, slot } = parsed.data as {
		folderId: string;
		slot: FolderDocumentSlot;
	};
	const mimeType = inferFolderDocumentMimeType(filePart.filename, filePart.type ?? "");

	if (!isAllowedFolderDocument(filePart.filename, mimeType)) {
		throw createError({
			statusCode: 400,
			message: "Sono accettati solo file PDF, Word o Excel.",
		});
	}

	if (filePart.data.length > MAX_FILE_SIZE) {
		throw createError({
			statusCode: 413,
			message: "Il file supera il limite massimo di 20 MB.",
		});
	}

	const { error: ownerError } = await userClient
		.from("folders")
		.select("id")
		.eq("id", folderId)
		.single();

	if (ownerError) {
		throw createError({ statusCode: 403, message: "Access denied" });
	}

	const supabase = serverSupabaseServiceRole(event);
	await ensureFolderDocumentBucket(supabase);

	const storagePath = buildFolderDocumentStoragePath(folderId, slot, filePart.filename);

	const { data: existing } = await (supabase.from as any)("folder_documents")
		.select("id, storage_path")
		.eq("folder_id", folderId)
		.eq("slot", slot)
		.maybeSingle();

	if (existing?.storage_path) {
		await supabase.storage
			.from(FOLDER_DOCUMENT_BUCKET)
			.remove([existing.storage_path]);

		await (supabase.from as any)("folder_documents")
			.delete()
			.eq("id", existing.id);
	}

	const { error: uploadError } = await supabase.storage
		.from(FOLDER_DOCUMENT_BUCKET)
		.upload(storagePath, filePart.data, {
			contentType: mimeType,
			upsert: true,
		});

	if (uploadError) {
		throw createError({ statusCode: 500, message: uploadError.message });
	}

	const { data: inserted, error: insertError } = await (supabase.from as any)("folder_documents")
		.insert({
			folder_id: folderId,
			slot,
			filename: filePart.filename,
			file_size_bytes: filePart.data.length,
			storage_path: storagePath,
			user_id: user.id,
		})
		.select("id, folder_id, slot, filename, file_size_bytes, storage_path, uploaded_at")
		.single();

	if (insertError) {
		await supabase.storage.from(FOLDER_DOCUMENT_BUCKET).remove([storagePath]);
		throw createError({ statusCode: 500, message: insertError.message });
	}

	return inserted;
});

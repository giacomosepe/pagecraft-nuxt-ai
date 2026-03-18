<script setup lang="ts">
definePageMeta({ middleware: "auth" });

const client = useSupabaseClient();
const user = useSupabaseUser();
const router = useRouter();
const route = useRoute();

// Framework comes from query param set by the modal
// e.g. /pages/new?frameworkId=xxx&frameworkName=Italian+Patent+Box
const frameworkId = Array.isArray(route.query.frameworkId)
	? route.query.frameworkId[0]
	: (route.query.frameworkId as string);

// ← ADD THESE TWO LINES HERE
console.log("full query:", route.query);
console.log("frameworkId:", typeof frameworkId, JSON.stringify(frameworkId));

const frameworkName = route.query.frameworkName as string;

// Guard — if no framework selected, send back to dashboard
if (!frameworkId) {
	await navigateTo("/dashboard");
}

// Load clients for the dropdown
const { data: clients } = await useAsyncData(
	"clients-for-new-page",
	async () => {
		const { data, error } = await client
			.from("clients")
			.select("id, name")
			.eq("user_id", user.value!.id)
			.order("name");
		if (error) throw error;
		return data;
	},
);

// Load company profiles when a client is selected
const selectedClientId = ref<string | null>(null);
const selectedProfileId = ref<string | null>(null);

const { data: profiles } = await useAsyncData(
	() => `profiles-${selectedClientId.value}`,
	async () => {
		if (!selectedClientId.value) return [];
		const { data, error } = await client
			.from("company_profiles")
			.select("id, name, tax_year")
			.eq("client_id", selectedClientId.value)
			.order("tax_year", { ascending: false });
		if (error) throw error;
		return data;
	},
	{ watch: [selectedClientId] },
);

// Form state
const title = ref("");
const loading = ref(false);
const errorMsg = ref("");

// File upload state
const dragOver = ref(false);
const files = ref<File[]>([]);

const allowedTypes = [
	"application/pdf",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	"application/vnd.openxmlformats-officedocument.presentationml.presentation",
	"text/plain",
	"text/csv",
	"image/png",
	"image/jpeg",
];

function onDrop(e: DragEvent) {
	dragOver.value = false;
	const dropped = Array.from(e.dataTransfer?.files ?? []);
	addFiles(dropped);
}

function onFileInput(e: Event) {
	const input = e.target as HTMLInputElement;
	addFiles(Array.from(input.files ?? []));
}

function addFiles(incoming: File[]) {
	const valid = incoming.filter((f) => allowedTypes.includes(f.type));
	files.value = [...files.value, ...valid];
}

function removeFile(index: number) {
	files.value = files.value.filter((_, i) => i !== index);
}

function formatBytes(bytes: number) {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Create page — calls server route then handles file uploads
async function createPage() {
	console.log("frameworkId being sent:", frameworkId, typeof frameworkId);

	if (!title.value.trim()) return;
	loading.value = true;
	errorMsg.value = "";

	try {
		// 1. Create page + snapshot steps atomically
		const { pageId } = await $fetch("/api/pages/create", {
			method: "POST",
			body: {
				frameworkId,
				title: title.value.trim(),
				clientId: selectedClientId.value,
				companyProfileId: selectedProfileId.value,
			},
		});

		// 2. Upload files if any (non-blocking — extraction runs async on server)
		if (files.value.length) {
			await Promise.all(
				files.value.map(async (file) => {
					const path = `${user.value!.id}/${pageId}/${file.name}`;
					await client.storage.from("page-files").upload(path, file);
					// Register file record in db
					await client.from("files").insert({
						id: crypto.randomUUID(),
						user_id: user.value!.id,
						page_id: pageId,
						file_name: file.name,
						file_type: fileType(file),
						storage_path: path,
						scope: "PAGE",
						size_bytes: file.size,
						extraction_status: "PENDING",
					});
				}),
			);
		}

		// 3. Redirect to the step editor
		await navigateTo(`/pages/${pageId}`);
	} catch (e: any) {
		errorMsg.value =
			e?.data?.message ?? "Something went wrong. Please try again.";
		loading.value = false;
	}
}

function fileType(file: File): string {
	const map: Record<string, string> = {
		"application/pdf": "PDF",
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document":
			"DOCX",
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
			"XLSX",
		"application/vnd.openxmlformats-officedocument.presentationml.presentation":
			"PPTX",
		"text/plain": "TXT",
		"text/csv": "CSV",
	};
	if (file.type.startsWith("image/")) return "IMAGE";
	return map[file.type] ?? "TXT";
}
</script>

<template>
	<div class="mx-auto max-w-2xl px-6 py-10">
		<!-- Header -->
		<div class="mb-8">
			<p
				class="text-xs font-medium text-primary-600 dark:text-primary-400 mb-1"
			>
				{{ frameworkName }}
			</p>
			<h1 class="text-xl font-semibold text-gray-900 dark:text-white">
				New page
			</h1>
			<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
				Fill in the details to create your document
			</p>
		</div>

		<div class="flex flex-col gap-6">
			<!-- Title -->
			<UFormField label="Title">
				<UInput
					v-model="title"
					placeholder="e.g. Acme S.r.l. — Patent Box 2024"
					size="md"
					class="w-full"
					autofocus
				/>
			</UFormField>

			<!-- Client + Profile -->
			<div class="grid grid-cols-2 gap-4">
				<UFormField label="Client (optional)">
					<USelect
						v-model="selectedClientId"
						:items="
							(clients ?? []).map((c) => ({
								label: c.name,
								value: c.id,
							}))
						"
						placeholder="Select client"
						class="w-full"
					/>
				</UFormField>

				<UFormField label="Company profile (optional)">
					<USelect
						v-model="selectedProfileId"
						:items="
							(profiles ?? []).map((p) => ({
								label: `${p.name} · ${p.tax_year}`,
								value: p.id,
							}))
						"
						placeholder="Select profile"
						:disabled="!selectedClientId"
						class="w-full"
					/>
				</UFormField>
			</div>

			<!-- File upload -->
			<UFormField label="Reference files (optional)">
				<div
					class="rounded-lg border-2 border-dashed p-6 text-center transition-colors cursor-pointer"
					:class="
						dragOver
							? 'border-primary-400 bg-primary-50 dark:bg-primary-950'
							: 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
					"
					@dragover.prevent="dragOver = true"
					@dragleave="dragOver = false"
					@drop.prevent="onDrop"
					@click="($refs.fileInput as HTMLInputElement).click()"
				>
					<UIcon
						name="i-lucide-upload-cloud"
						class="mx-auto mb-2 size-8 text-gray-400"
					/>
					<p class="text-sm text-gray-600 dark:text-gray-400">
						Drop files here or
						<span class="text-primary-600 dark:text-primary-400"
							>click to browse</span
						>
					</p>
					<p class="mt-1 text-xs text-gray-400 dark:text-gray-500">
						PDF, DOCX, XLSX, PPTX, TXT — multiple files
					</p>
					<input
						ref="fileInput"
						type="file"
						multiple
						class="hidden"
						accept=".pdf,.docx,.xlsx,.pptx,.txt,.csv,.png,.jpg"
						@change="onFileInput"
					/>
				</div>

				<!-- File list -->
				<div v-if="files.length" class="mt-3 flex flex-wrap gap-2">
					<div
						v-for="(file, i) in files"
						:key="i"
						class="flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
					>
						<UIcon name="i-lucide-file" class="size-3 shrink-0" />
						{{ file.name }}
						<span class="text-gray-400"
							>({{ formatBytes(file.size) }})</span
						>
						<button
							class="ml-1 text-gray-400 hover:text-gray-600"
							@click.stop="removeFile(i)"
						>
							×
						</button>
					</div>
				</div>
			</UFormField>

			<!-- Error -->
			<UAlert
				v-if="errorMsg"
				color="error"
				variant="soft"
				:description="errorMsg"
				icon="i-lucide-circle-alert"
			/>

			<!-- Actions -->
			<div class="flex justify-end gap-3 pt-2">
				<UButton color="neutral" variant="ghost" to="/dashboard">
					Cancel
				</UButton>
				<UButton
					:disabled="!title.trim()"
					:loading="loading"
					@click="createPage"
				>
					Create page
				</UButton>
			</div>
		</div>
	</div>
</template>

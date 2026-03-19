<script setup lang="ts">
definePageMeta({ middleware: "auth" });

const client = useSupabaseClient();
const user = useSupabaseUser();
const route = useRoute();

// Framework comes from query param set by the modal
const frameworkId = Array.isArray(route.query.frameworkId)
	? route.query.frameworkId[0]
	: (route.query.frameworkId as string);

const frameworkName = route.query.frameworkName as string;

// Guard — if no framework selected, send back to dashboard
if (!frameworkId) {
	await navigateTo("/dashboard");
}

// ─── Load clients ──────────────────────────────────────────────────────────
const { data: clients } = await useAsyncData("clients-for-new-page", async () => {
	const { data, error } = await client
		.from("clients")
		.select("id, name")
		.eq("user_id", user.value!.id)
		.order("name");
	if (error) throw error;
	return data;
});

// ─── Load profiles when client is selected ────────────────────────────────
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

// Reset profile when client changes
watch(selectedClientId, () => {
	selectedProfileId.value = null;
});

// Computed state helpers
const hasClients = computed(() => (clients.value?.length ?? 0) > 0);
const clientHasNoProfiles = computed(
	() => selectedClientId.value && (profiles.value?.length ?? 0) === 0,
);
const profileItems = computed(() =>
	(profiles.value ?? []).map((p) => ({
		label: `${p.name ?? p.tax_year} · ${p.tax_year}`,
		value: p.id,
	})),
);
const clientItems = computed(() =>
	(clients.value ?? []).map((c) => ({ label: c.name, value: c.id })),
);

// ─── Form state ────────────────────────────────────────────────────────────
const title = ref("");
const loading = ref(false);
const errorMsg = ref("");

// ─── File upload ───────────────────────────────────────────────────────────
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
	addFiles(Array.from(e.dataTransfer?.files ?? []));
}
function onFileInput(e: Event) {
	addFiles(Array.from((e.target as HTMLInputElement).files ?? []));
}
function addFiles(incoming: File[]) {
	files.value = [...files.value, ...incoming.filter((f) => allowedTypes.includes(f.type))];
}
function removeFile(index: number) {
	files.value = files.value.filter((_, i) => i !== index);
}
function formatBytes(bytes: number) {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Create page ───────────────────────────────────────────────────────────
async function createPage() {
	if (!title.value.trim()) return;
	loading.value = true;
	errorMsg.value = "";

	try {
		const { pageId } = await $fetch("/api/pages/create", {
			method: "POST",
			body: {
				frameworkId,
				title: title.value.trim(),
				clientId: selectedClientId.value,
				companyProfileId: selectedProfileId.value,
			},
		});

		if (files.value.length) {
			await Promise.all(
				files.value.map(async (file) => {
					const path = `${pageId}/${file.name}`;
					await client.storage.from("page-files").upload(path, file);
					await $fetch("/api/db/mutate", {
						method: "POST",
						body: {
							table: "files",
							operation: "insert",
							data: {
								user_id: user.value!.id,
								page_id: pageId,
								file_name: file.name,
								file_type: fileType(file),
								storage_path: path,
								scope: "PAGE",
								size_bytes: file.size,
							},
						},
					});
				}),
			);
		}

		await navigateTo(`/pages/${pageId}`);
	} catch (e: any) {
		errorMsg.value = e?.data?.message ?? "Something went wrong. Please try again.";
		loading.value = false;
	}
}

function fileType(file: File): string {
	const map: Record<string, string> = {
		"application/pdf": "PDF",
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
		"application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPTX",
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
			<p class="mb-1 text-xs font-medium text-primary-600 dark:text-primary-400">
				{{ frameworkName }}
			</p>
			<h1 class="text-xl font-semibold text-gray-900 dark:text-white">
				Nuovo documento
			</h1>
			<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
				Collega il documento a un cliente per alimentare automaticamente la generazione AI.
			</p>
		</div>

		<div class="flex flex-col gap-6">

			<!-- ── Client + Profile ── -->
			<section class="flex flex-col gap-3">
				<div class="flex items-center justify-between">
					<p class="text-sm font-medium text-gray-700 dark:text-gray-300">
						Cliente e profilo aziendale
					</p>
					<!-- If user has no clients at all, show create link -->
					<NuxtLink
						v-if="!hasClients"
						to="/clients/new"
						target="_blank"
						class="text-xs text-primary-600 hover:underline dark:text-primary-400"
					>
						+ Crea il tuo primo cliente
					</NuxtLink>
				</div>

				<!-- No clients at all — soft warning -->
				<div
					v-if="!hasClients"
					class="flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-950"
				>
					<UIcon name="i-lucide-triangle-alert" class="mt-0.5 size-4 shrink-0 text-yellow-600 dark:text-yellow-400" />
					<div>
						<p class="text-xs font-medium text-yellow-800 dark:text-yellow-300">
							Nessun cliente configurato
						</p>
						<p class="mt-0.5 text-xs text-yellow-700 dark:text-yellow-400">
							Puoi creare il documento ora e collegarlo a un cliente in seguito,
							ma l'AI non avrà dati aziendali da usare finché non viene collegato un profilo.
						</p>
					</div>
				</div>

				<!-- Has clients — show dropdowns -->
				<template v-else>
					<div class="grid grid-cols-2 gap-4">
						<UFormField label="Cliente">
							<USelect
								v-model="selectedClientId"
								:items="clientItems"
								placeholder="Seleziona cliente"
								class="w-full"
							/>
						</UFormField>

						<UFormField label="Profilo aziendale">
							<USelect
								v-model="selectedProfileId"
								:items="profileItems"
								placeholder="Seleziona profilo"
								:disabled="!selectedClientId"
								class="w-full"
							/>
						</UFormField>
					</div>

					<!-- Client selected but has no profiles -->
					<div
						v-if="clientHasNoProfiles"
						class="flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-950"
					>
						<UIcon name="i-lucide-triangle-alert" class="mt-0.5 size-4 shrink-0 text-yellow-600 dark:text-yellow-400" />
						<div>
							<p class="text-xs font-medium text-yellow-800 dark:text-yellow-300">
								Questo cliente non ha ancora un profilo aziendale
							</p>
							<p class="mt-0.5 text-xs text-yellow-700 dark:text-yellow-400">
								Il profilo contiene i dati (azionisti, CdA, settore) che l'AI usa automaticamente.
								<NuxtLink
									:to="`/clients/${selectedClientId}/profiles/new`"
									target="_blank"
									class="font-medium underline"
								>
									Crea un profilo ora →
								</NuxtLink>
							</p>
						</div>
					</div>

					<!-- Profile selected — confirmation pill -->
					<div
						v-if="selectedProfileId"
						class="flex items-center gap-2 text-xs text-green-700 dark:text-green-400"
					>
						<UIcon name="i-lucide-check-circle" class="size-3.5" />
						Profilo collegato — i dati aziendali verranno iniettati automaticamente in ogni sezione.
					</div>
				</template>
			</section>

			<!-- ── Title ── -->
			<UFormField label="Titolo del documento">
				<UInput
					v-model="title"
					placeholder="es. Acme S.r.l. — Patent Box 2024"
					size="md"
					class="w-full"
					autofocus
				/>
			</UFormField>

			<!-- ── File upload ── -->
			<UFormField label="File di riferimento (opzionale)">
				<div
					class="cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors"
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
					<UIcon name="i-lucide-upload-cloud" class="mx-auto mb-2 size-8 text-gray-400" />
					<p class="text-sm text-gray-600 dark:text-gray-400">
						Trascina qui i file o
						<span class="text-primary-600 dark:text-primary-400">clicca per sfogliare</span>
					</p>
					<p class="mt-1 text-xs text-gray-400 dark:text-gray-500">
						PDF, DOCX, XLSX, PPTX, TXT — più file supportati
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

				<div v-if="files.length" class="mt-3 flex flex-wrap gap-2">
					<div
						v-for="(file, i) in files"
						:key="i"
						class="flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
					>
						<UIcon name="i-lucide-file" class="size-3 shrink-0" />
						{{ file.name }}
						<span class="text-gray-400">({{ formatBytes(file.size) }})</span>
						<button class="ml-1 text-gray-400 hover:text-gray-600" @click.stop="removeFile(i)">×</button>
					</div>
				</div>
			</UFormField>

			<!-- ── Error ── -->
			<UAlert
				v-if="errorMsg"
				color="error"
				variant="soft"
				:description="errorMsg"
				icon="i-lucide-circle-alert"
			/>

			<!-- ── Actions ── -->
			<div class="flex justify-end gap-3 pt-2">
				<UButton color="neutral" variant="ghost" to="/dashboard">Annulla</UButton>
				<UButton :disabled="!title.trim()" :loading="loading" @click="createPage">
					Crea documento
				</UButton>
			</div>
		</div>
	</div>
</template>

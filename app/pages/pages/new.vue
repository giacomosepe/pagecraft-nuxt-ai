<script setup lang="ts">
definePageMeta({ middleware: "auth" });

const client = useSupabaseClient();

// ─── Step tracker (0=client, 1=framework, 2=project) ───────────────────────
const currentStep = ref(0);

// ─── Step 0: Client ────────────────────────────────────────────────────────
const { data: clients } = await useAsyncData(
	"clients-for-new-page",
	async () => {
		const { data, error } = await client
			.from("clients")
			.select("id, name")
			.order("name");
		if (error) throw error;
		return data;
	},
	{ server: false },
);

const selectedClientId = ref<string | null>(null);
const clientItems = computed(() =>
	(clients.value ?? []).map((c) => ({ label: c.name, value: c.id })),
);

// ─── Step 1: Frameworks (multi-select) ─────────────────────────────────────
const { data: frameworks, pending: frameworksPending } = await useAsyncData(
	"frameworks-for-new-page",
	async () => {
		const { data, error } = await client
			.from("frameworks")
			.select("id, name, description")
			.eq("is_public", true)
			.is("deprecated_at", null)
			.order("name");
		if (error) throw error;
		return data;
	},
	{ server: false },
);

// Both frameworks pre-checked by default once loaded
const selectedFrameworkIds = ref<string[]>([]);
watch(
	frameworks,
	(fws) => {
		if (fws && selectedFrameworkIds.value.length === 0) {
			selectedFrameworkIds.value = fws.map((fw) => fw.id);
		}
	},
	{ immediate: true },
);

function toggleFramework(id: string) {
	const idx = selectedFrameworkIds.value.indexOf(id);
	if (idx === -1) {
		selectedFrameworkIds.value = [...selectedFrameworkIds.value, id];
	} else {
		selectedFrameworkIds.value = selectedFrameworkIds.value.filter(
			(fid) => fid !== id,
		);
	}
}

// ─── Step 2: Project name + document titles ────────────────────────────────
// Existing folders for the selected client (quick-select chips)
const existingFolders = ref<{ id: string; program_name: string }[]>([]);
const foldersLoading = ref(false);

watch(selectedClientId, async (clientId) => {
	existingFolders.value = [];
	selectedFolderIdFromExisting.value = null;
	projectName.value = "";
	if (!clientId) return;

	foldersLoading.value = true;
	const { data, error } = await client
		.from("folders")
		.select("id, program_name")
		.eq("client_id", clientId)
		.order("program_name");
	foldersLoading.value = false;
	if (!error) existingFolders.value = data ?? [];
});

// Folder resolution: either pick existing or type a new name
const selectedFolderIdFromExisting = ref<string | null>(null);
const projectName = ref("");

function selectExistingFolder(id: string) {
	selectedFolderIdFromExisting.value = id;
	projectName.value = "";
}

function onProjectNameInput() {
	// Typing a new name deselects any existing folder chip
	selectedFolderIdFromExisting.value = null;
}

// Document titles — one per selected framework, keyed by frameworkId.
// Pre-filled with the framework name; user can edit.
const documentTitles = ref<Record<string, string>>({});

watch(
	selectedFrameworkIds,
	(ids) => {
		ids.forEach((id) => {
			if (!documentTitles.value[id]) {
				const fw = frameworks.value?.find((f) => f.id === id);
				documentTitles.value[id] = fw?.name ?? "";
			}
		});
	},
	{ immediate: true },
);

// ─── Navigation helpers ────────────────────────────────────────────────────
const canAdvance = computed(() => {
	if (currentStep.value === 0) return !!selectedClientId.value;
	if (currentStep.value === 1) return selectedFrameworkIds.value.length > 0;
	if (currentStep.value === 2) {
		const folderOk =
			!!selectedFolderIdFromExisting.value || projectName.value.trim().length > 0;
		const titlesOk = selectedFrameworkIds.value.every(
			(id) => documentTitles.value[id]?.trim().length > 0,
		);
		return folderOk && titlesOk;
	}
	return false;
});

function goBack() {
	currentStep.value = Math.max(0, currentStep.value - 1);
}

// ─── Submit ────────────────────────────────────────────────────────────────
const loading = ref(false);
const errorMsg = ref("");

async function submit() {
	if (!canAdvance.value) return;
	loading.value = true;
	errorMsg.value = "";

	try {
		const { folderId } = await $fetch("/api/pages/create-batch", {
			method: "POST",
			body: {
				clientId: selectedClientId.value,
				folderId: selectedFolderIdFromExisting.value ?? undefined,
				newFolderName: selectedFolderIdFromExisting.value
					? undefined
					: projectName.value.trim(),
				pages: selectedFrameworkIds.value.map((id) => ({
					frameworkId: id,
					title: documentTitles.value[id]?.trim(),
				})),
			},
		});
		await navigateTo(`/folders/${folderId}`);
	} catch (e: any) {
		errorMsg.value =
			e?.data?.message ?? "Something went wrong. Please try again.";
		loading.value = false;
	}
}
</script>

<template>
	<div class="mx-auto max-w-2xl px-6 py-10">
		<!-- Step indicator (3 steps: 0, 1, 2) -->
		<div class="mb-8 flex items-center gap-2">
			<template
				v-for="(label, i) in ['Cliente', 'Framework', 'Progetto']"
				:key="i"
			>
				<div class="flex items-center gap-1.5">
					<div
						class="flex size-6 items-center justify-center rounded-full text-xs font-medium"
						:class="
							i < currentStep
								? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
								: i === currentStep
									? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
									: 'bg-gray-100 text-gray-400 dark:bg-gray-800'
						"
					>
						<UIcon
							v-if="i < currentStep"
							name="i-lucide-check"
							class="size-3"
						/>
						<span v-else>{{ i + 1 }}</span>
					</div>
					<span
						class="text-xs font-medium"
						:class="
							i === currentStep
								? 'text-gray-900 dark:text-white'
								: 'text-gray-400'
						"
					>
						{{ label }}
					</span>
				</div>
				<div
					v-if="i < 2"
					class="h-px flex-1 bg-gray-200 dark:bg-gray-700"
				/>
			</template>
		</div>

		<!-- Step content -->
		<div class="flex flex-col gap-6">
			<!-- STEP 0: Client -->
			<template v-if="currentStep === 0">
				<h1 class="text-xl font-semibold text-gray-900 dark:text-white">
					Nuovo documento
				</h1>
				<p class="text-sm text-gray-500">
					Seleziona il cliente per cui stai creando il documento.
				</p>

				<UFormField label="Cliente">
					<USelect
						v-model="selectedClientId"
						:items="clientItems"
						placeholder="Seleziona cliente"
						class="w-full"
					/>
				</UFormField>

				<div class="flex justify-end pt-2">
					<UButton :disabled="!canAdvance" @click="currentStep = 1">
						Avanti: Framework →
					</UButton>
				</div>
			</template>

			<!-- STEP 1: Framework (checkbox cards) -->
			<template v-else-if="currentStep === 1">
				<h2 class="text-lg font-semibold text-gray-900 dark:text-white">
					Framework
				</h2>
				<p class="text-sm text-gray-500">
					Seleziona i tipi di documento da creare. Puoi selezionarne
					più di uno.
				</p>

				<div v-if="frameworksPending" class="flex justify-center py-6">
					<UIcon
						name="i-lucide-loader-circle"
						class="size-5 animate-spin text-gray-400"
					/>
				</div>

				<div v-else class="flex flex-col gap-2">
					<button
						v-for="fw in frameworks"
						:key="fw.id"
						class="w-full text-left rounded-lg border px-4 py-3 transition-colors"
						:class="
							selectedFrameworkIds.includes(fw.id)
								? 'border-primary-500 bg-primary-50 dark:bg-primary-950 dark:border-primary-400'
								: 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
						"
						@click="toggleFramework(fw.id)"
					>
						<div class="flex items-start gap-3">
							<!-- Checkbox indicator (top-right style, left-aligned in row) -->
							<div
								class="mt-0.5 size-4 rounded border-2 flex items-center justify-center shrink-0"
								:class="
									selectedFrameworkIds.includes(fw.id)
										? 'border-primary-500 bg-primary-500'
										: 'border-gray-300 dark:border-gray-600'
								"
							>
								<UIcon
									v-if="selectedFrameworkIds.includes(fw.id)"
									name="i-lucide-check"
									class="size-3 text-white"
								/>
							</div>
							<div class="flex-1">
								<p
									class="text-sm font-medium"
									:class="
										selectedFrameworkIds.includes(fw.id)
											? 'text-primary-700 dark:text-primary-300'
											: 'text-gray-900 dark:text-white'
									"
								>
									{{ fw.name }}
								</p>
								<p
									v-if="fw.description"
									class="mt-0.5 text-xs text-gray-500 dark:text-gray-400"
								>
									{{ fw.description }}
								</p>
							</div>
						</div>
					</button>
				</div>

				<p
					v-if="selectedFrameworkIds.length === 0"
					class="text-xs text-red-500"
				>
					Seleziona almeno un framework per continuare.
				</p>

				<div class="flex justify-between pt-2">
					<UButton color="neutral" variant="ghost" @click="goBack">
						← Indietro
					</UButton>
					<UButton :disabled="!canAdvance" @click="currentStep = 2">
						Avanti: Progetto →
					</UButton>
				</div>
			</template>

			<!-- STEP 2: Project name + document titles -->
			<template v-else-if="currentStep === 2">
				<h2 class="text-lg font-semibold text-gray-900 dark:text-white">
					Progetto
				</h2>
				<p class="text-sm text-gray-500">
					Dai un nome al programma e ai documenti da creare.
				</p>

				<!-- Existing folder chips -->
				<div v-if="foldersLoading" class="flex items-center gap-2">
					<UIcon
						name="i-lucide-loader-circle"
						class="size-4 animate-spin text-gray-400"
					/>
					<span class="text-xs text-gray-400">Caricamento programmi...</span>
				</div>

				<div v-else-if="existingFolders.length" class="flex flex-col gap-2">
					<p class="text-xs text-gray-500">
						Aggiungi a programma esistente:
					</p>
					<div class="flex flex-wrap gap-2">
						<button
							v-for="f in existingFolders"
							:key="f.id"
							class="rounded-full border px-3 py-1 text-xs font-medium transition-colors"
							:class="
								selectedFolderIdFromExisting === f.id
									? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300'
									: 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'
							"
							@click="selectExistingFolder(f.id)"
						>
							{{ f.program_name }}
						</button>
					</div>
				</div>

				<!-- New project name input -->
				<UFormField label="Nome del programma">
					<UInput
						v-model="projectName"
						placeholder="es. Software Gestionale, Piattaforma E-commerce"
						class="w-full"
						:disabled="!!selectedFolderIdFromExisting"
						@input="onProjectNameInput"
					/>
					<template v-if="selectedFolderIdFromExisting" #hint>
						<span class="text-xs text-primary-600 dark:text-primary-400">
							Documento aggiunto al programma esistente
							<button
								class="underline ml-1"
								@click="selectedFolderIdFromExisting = null"
							>
								(cambia)
							</button>
						</span>
					</template>
				</UFormField>

				<!-- Document title fields — one per selected framework -->
				<div class="flex flex-col gap-3">
					<UFormField
						v-for="id in selectedFrameworkIds"
						:key="id"
						:label="
							selectedFrameworkIds.length > 1
								? `Titolo — ${frameworks?.find((f) => f.id === id)?.name}`
								: 'Titolo del documento'
						"
					>
						<UInput
							v-model="documentTitles[id]"
							class="w-full"
							:placeholder="frameworks?.find((f) => f.id === id)?.name"
						/>
					</UFormField>
				</div>

				<UAlert
					v-if="errorMsg"
					color="error"
					variant="soft"
					:description="errorMsg"
					icon="i-lucide-circle-alert"
				/>

				<div class="flex justify-between pt-2">
					<UButton color="neutral" variant="ghost" @click="goBack">
						← Indietro
					</UButton>
					<UButton
						:disabled="!canAdvance"
						:loading="loading"
						@click="submit"
					>
						Crea
						{{
							selectedFrameworkIds.length > 1
								? `${selectedFrameworkIds.length} documenti`
								: "documento"
						}}
					</UButton>
				</div>
			</template>
		</div>
	</div>
</template>

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

const route = useRoute();
const selectedClientId = ref<string | null>(
	(route.query.clientId as string) || null,
);
// If clientId was pre-selected via query param, skip the client step
if (selectedClientId.value) currentStep.value = 1;

const clientItems = computed(() =>
	(clients.value ?? []).map((c) => ({ label: c.name, value: c.id })),
);

// ─── Step 1: Frameworks (multi-select) ─────────────────────────────────────
const { frameworks, pending: frameworksPending } = await useFrameworks();

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
const taxYear = ref<string | number>(new Date().getFullYear());
const referente = ref("");

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
		const year = Number(String(taxYear.value).trim());
		const projectDetailsOk = Number.isInteger(year) && year >= 2020 && year <= 2035;
		const titlesOk = selectedFrameworkIds.value.every(
			(id) => documentTitles.value[id]?.trim().length > 0,
		);
		return folderOk && projectDetailsOk && titlesOk;
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
				taxYear: Number(String(taxYear.value).trim()),
				referente: referente.value.trim() || undefined,
				pages: selectedFrameworkIds.value.map((id) => ({
					frameworkId: id,
					title: documentTitles.value[id]?.trim(),
				})),
			},
		});
		await navigateTo({
			path: `/folders/${folderId}`,
			query: {
				created: "documents",
				count: String(selectedFrameworkIds.value.length),
			},
		});
	} catch (e: any) {
		errorMsg.value =
			e?.data?.message ?? "Si è verificato un errore durante la creazione dei documenti.";
		loading.value = false;
	}
}
</script>

<template>
	<FormPageLayout
		title="Nuovo documento"
		description="Configura il cliente, seleziona i framework e definisci il programma in un unico flusso guidato."
		back-to="/documenti"
		back-label="Documenti"
		eyebrow="Creazione"
		size="lg"
	>
		<template #meta>
			<div class="rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
				<div class="flex items-center gap-2">
					<template v-for="(label, i) in ['Cliente', 'Framework', 'Progetto']" :key="i">
						<div class="flex items-center gap-2">
							<div
								class="flex size-8 items-center justify-center rounded-full text-xs font-semibold"
								:class="
									i < currentStep
										? 'bg-emerald-100 text-emerald-700'
										: i === currentStep
											? 'bg-violet-600 text-white'
											: 'bg-slate-100 text-slate-400'
								"
							>
								<UIcon
									v-if="i < currentStep"
									name="i-lucide-check"
									class="size-4"
								/>
								<span v-else>{{ i + 1 }}</span>
							</div>
							<div class="min-w-0">
								<p
									class="text-xs font-semibold uppercase tracking-[0.08em]"
									:class="i === currentStep ? 'text-slate-900' : 'text-slate-400'"
								>
									{{ label }}
								</p>
							</div>
						</div>
						<div
							v-if="i < 2"
							class="h-px min-w-8 flex-1 bg-slate-200"
						/>
					</template>
				</div>
			</div>
		</template>

		<FormSectionCard
			v-if="currentStep === 0"
			title="Cliente"
			description="Seleziona il cliente per cui stai creando il documento."
		>
			<div v-if="clientItems.length" class="space-y-5">
				<UFormField label="Cliente">
					<USelect
						v-model="selectedClientId"
						:items="clientItems"
						placeholder="Seleziona cliente"
						class="w-full"
						size="lg"
					/>
				</UFormField>

				<InlineHelpBlock title="Suggerimento" tone="info">
					Se arrivi da una scheda cliente, il cliente può essere già preselezionato.
				</InlineHelpBlock>
			</div>

			<BaseStateMessage
				v-else
				compact
				icon="i-lucide-building-2"
				title="Nessun cliente disponibile"
				description="Crea prima un cliente, poi torna qui per avviare un nuovo documento."
			>
				<template #actions>
					<UButton to="/clients/new" icon="i-lucide-plus">
						Crea cliente
					</UButton>
				</template>
			</BaseStateMessage>
		</FormSectionCard>

		<FormSectionCard
			v-else-if="currentStep === 1"
			title="Framework"
			description="Seleziona uno o più tipi di documento da creare."
		>
			<BaseStateMessage
				v-if="frameworksPending"
				compact
				loading
				title="Caricamento framework in corso..."
			/>

			<BaseStateMessage
				v-else-if="!frameworks?.length"
				compact
				icon="i-lucide-files"
				title="Nessun framework disponibile"
				description="Aggiungi o pubblica almeno un framework prima di creare un nuovo documento."
			/>

			<div v-else class="space-y-3">
				<button
					v-for="fw in frameworks"
					:key="fw.id"
					type="button"
					class="w-full rounded-[22px] border px-4 py-4 text-left transition-colors"
					:class="
						selectedFrameworkIds.includes(fw.id)
							? 'border-violet-300 bg-violet-50'
							: 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
					"
					@click="toggleFramework(fw.id)"
				>
					<div class="flex items-start gap-3">
						<div
							class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border-2"
							:class="
								selectedFrameworkIds.includes(fw.id)
									? 'border-violet-600 bg-violet-600 text-white'
									: 'border-slate-300 bg-white text-transparent'
							"
						>
							<UIcon name="i-lucide-check" class="size-3" />
						</div>

						<div class="space-y-1">
							<p
								class="text-sm font-semibold"
								:class="
									selectedFrameworkIds.includes(fw.id)
										? 'text-violet-700'
										: 'text-slate-900'
								"
							>
								{{ fw.name }}
							</p>
							<p
								v-if="fw.description"
								class="text-sm text-slate-500"
							>
								{{ fw.description }}
							</p>
						</div>
					</div>
				</button>
			</div>

			<p
				v-if="selectedFrameworkIds.length === 0"
				class="mt-4 text-sm font-medium text-rose-600"
			>
				Seleziona almeno un framework per continuare.
			</p>
		</FormSectionCard>

		<FormSectionCard
			v-else-if="currentStep === 2"
			title="Progetto"
			description="Dai un nome al programma, compila i dettagli progetto e definisci i titoli dei documenti."
		>
			<div class="space-y-5">
				<div v-if="foldersLoading" class="flex items-center gap-2">
					<UIcon
						name="i-lucide-loader-circle"
						class="size-4 animate-spin text-slate-400"
					/>
					<span class="text-sm text-slate-500">Caricamento programmi...</span>
				</div>

				<div v-else-if="existingFolders.length" class="space-y-3">
					<FormSectionHeader
						title="Programmi esistenti"
						description="Puoi aggiungere i nuovi documenti a un programma già presente."
					/>
					<div class="flex flex-wrap gap-2">
						<button
							v-for="f in existingFolders"
							:key="f.id"
							type="button"
							class="rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
							:class="
								selectedFolderIdFromExisting === f.id
									? 'border-violet-300 bg-violet-50 text-violet-700'
									: 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
							"
							@click="selectExistingFolder(f.id)"
						>
							{{ f.program_name }}
						</button>
					</div>
				</div>

				<UFormField label="Nome del programma">
					<UInput
						v-model="projectName"
						placeholder="es. Software Gestionale, Piattaforma E-commerce"
						class="w-full"
						:disabled="!!selectedFolderIdFromExisting"
						@input="onProjectNameInput"
					/>
					<template v-if="selectedFolderIdFromExisting" #hint>
						<span class="text-xs text-violet-600">
							Documento aggiunto al programma esistente
							<button
								type="button"
								class="ml-1 underline"
								@click="selectedFolderIdFromExisting = null"
							>
								(cambia)
							</button>
						</span>
					</template>
				</UFormField>

				<div class="space-y-3">
					<FormSectionHeader
						title="Dettagli progetto"
						description="Questi dati alimentano le variabili del template nei documenti creati."
					/>

					<div class="grid gap-4 md:grid-cols-2">
						<UFormField label="Anno di imposta *">
							<UInput
								v-model="taxYear"
								type="number"
								min="2020"
								max="2035"
								step="1"
								placeholder="es. 2026"
								class="w-full"
							/>
						</UFormField>

						<UFormField label="Referente">
							<UInput
								v-model="referente"
								placeholder="es. Mario Rossi"
								class="w-full"
							/>
						</UFormField>
					</div>
				</div>

				<div class="space-y-3">
					<FormSectionHeader
						title="Titoli dei documenti"
						description="Ogni framework selezionato genera un documento con il titolo che imposti qui."
					/>

					<div class="space-y-3">
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
				</div>

				<UAlert
					v-if="errorMsg"
					color="error"
					variant="soft"
					:description="errorMsg"
					icon="i-lucide-circle-alert"
				/>
			</div>
		</FormSectionCard>

		<template #footer>
			<FormActionsFooter>
				<template #leading>
					<p class="text-sm text-slate-500">
						{{ currentStep === 2
							? 'Alla conferma creerai il programma e i documenti selezionati in un solo passaggio.'
							: 'Il flusso conserva le scelte fatte negli step precedenti mentre avanzi.' }}
					</p>
				</template>

				<UButton
					v-if="currentStep > 0"
					color="neutral"
					variant="ghost"
					@click="goBack"
				>
					Indietro
				</UButton>
				<UButton
					v-if="currentStep < 2"
					:disabled="!canAdvance"
					@click="currentStep = currentStep + 1"
				>
					Avanti
				</UButton>
				<UButton
					v-else
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
			</FormActionsFooter>
		</template>
	</FormPageLayout>
</template>

<script setup lang="ts">
import type { DocumentListItem, FolderDocument, FolderDocumentSlot } from "~/types/app.types";
import { formatDate } from "~/utils/date";
import { deriveFolderStatus } from "~/utils/folderStatus";
import { statusLabel, statusToneClass } from "~/utils/status";

definePageMeta({ middleware: "auth" });

interface FolderDetailForm {
	program_name: string;
	tax_year: string;
	referente: string;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = [".pdf", ".doc", ".docx", ".xls", ".xlsx"];
const ADMIN_SLOTS: { key: FolderDocumentSlot; label: string }[] = [
	{ key: "contratto", label: "Contratto" },
	{ key: "additional", label: "Documenti aggiuntivi" },
];

const supabase = useSupabaseClient();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const folderId = route.params.id as string;

const { data, pending, refresh } = await useAsyncData(
	`folder-${folderId}`,
	async () => {
		const [folderRes, pagesRes, docsRes] = await Promise.all([
			supabase
				.from("folders")
				.select(
					"id, name, program_name, tax_year, referente, client_id, created_at, updated_at, clients(id, name, company_name)",
				)
				.eq("id", folderId)
				.single(),
			supabase
				.from("pages")
				.select("id, title, framework_name, status, updated_at, folder_id, client_id")
				.eq("folder_id", folderId)
				.order("updated_at", { ascending: false }),
			$fetch<FolderDocument[]>("/api/folder-documents", {
				query: { folderId },
			}),
		]);
		if (folderRes.error) throw folderRes.error;
		if (pagesRes.error) throw pagesRes.error;
		return {
			folder: folderRes.data,
			pages: pagesRes.data ?? [],
			documents: docsRes ?? [],
		};
	},
	{ server: false },
);

const deleteDialogOpen = ref(false);
const isDeleting = ref(false);
const isSaving = ref(false);
const uploadLoading = ref<FolderDocumentSlot | null>(null);
const deleteLoading = ref<FolderDocumentSlot | null>(null);
const downloadLoading = ref<FolderDocumentSlot | null>(null);
const previewLoading = ref<FolderDocumentSlot | null>(null);
const confirmDeleteSlot = ref<FolderDocumentSlot | null>(null);
const feedback = ref<{
	tone: "success" | "error";
	title: string;
	description: string;
} | null>(null);
const fileErrors = reactive<Record<FolderDocumentSlot, string | null>>({
	contratto: null,
	additional: null,
});
const form = reactive<FolderDetailForm>({
	program_name: "",
	tax_year: "",
	referente: "",
});
const initialSnapshot = ref("");

const clientName = computed(() => {
	const client = data.value?.folder?.clients as
		| { id: string; name: string | null; company_name?: string | null }
		| null
		| undefined;
	return client?.company_name?.trim() || client?.name || null;
});

const folderTitle = computed(() =>
	data.value?.folder?.program_name?.trim() || "Progetto senza nome",
);

const folderStatus = computed(() => deriveFolderStatus(data.value?.pages ?? []));

const projectType = computed(() => {
	const names = Array.from(
		new Set(
			(data.value?.pages ?? [])
				.map((page) => page.framework_name?.trim())
				.filter(Boolean),
		),
	);
	if (!names.length) return "—";
	if (names.length === 1) return names[0] ?? "—";
	return "Multiplo";
});

const documentRows = computed<DocumentListItem[]>(() =>
	(data.value?.pages ?? []).map((page) => ({
		id: page.id,
		title: page.title,
		status: page.status,
		updated_at: page.updated_at,
		framework_name: page.framework_name,
		folder_id: page.folder_id,
		client_id: page.client_id,
		folders: data.value?.folder
			? { id: data.value.folder.id, program_name: data.value.folder.program_name }
			: null,
		clients: null,
	})),
);

const documentCountLabel = computed(() => {
	const count = documentRows.value.length;
	return count === 1 ? "1 documento" : `${count} documenti`;
});

const activeNotice = computed(() => {
	if (feedback.value) return feedback.value;
	if (route.query.created !== "documents") return null;

	const count = Number(route.query.count ?? "1");
	return count > 1
		? {
				tone: "success" as const,
				title: "Documenti creati",
				description: `${count} documenti sono stati aggiunti al progetto.`,
			}
		: {
				tone: "success" as const,
				title: "Documento creato",
				description: "Il nuovo documento e stato aggiunto al progetto.",
			};
});

const dirty = computed(() => JSON.stringify(buildPayload()) !== initialSnapshot.value);

watch(
	data,
	(value) => {
		if (!value?.folder) return;
		form.program_name = value.folder.program_name ?? "";
		form.tax_year = value.folder.tax_year?.toString() ?? "";
		form.referente = value.folder.referente ?? "";
		initialSnapshot.value = JSON.stringify(buildPayload());
	},
	{ immediate: true },
);

function cleanText(value: string): string | null {
	const trimmed = value.trim();
	return trimmed ? trimmed : null;
}

function cleanYear(value: string): number | null {
	const trimmed = value.trim();
	if (!trimmed) return null;
	const parsed = Number.parseInt(trimmed, 10);
	return Number.isFinite(parsed) ? parsed : null;
}

function buildPayload() {
	return {
		program_name: cleanText(form.program_name),
		tax_year: cleanYear(form.tax_year),
		referente: cleanText(form.referente),
	};
}

function documentForSlot(slot: FolderDocumentSlot): FolderDocument | null {
	return data.value?.documents.find((document) => document.slot === slot) ?? null;
}

function isPdfFilename(filename: string | null | undefined): boolean {
	return Boolean(filename?.toLowerCase().endsWith(".pdf"));
}

function showFileActionError(): void {
	toast.add({
		title: "Impossibile aprire il file",
		description: "Riprova tra qualche istante.",
		color: "error",
	});
}

async function getFolderDocumentSignedUrl(documentId: string): Promise<string> {
	const res = await $fetch<{ url: string }>("/api/folder-documents/signed-url", {
		query: { id: documentId },
	});
	return res.url;
}

async function downloadFolderDocument(slot: FolderDocumentSlot): Promise<void> {
	const document = documentForSlot(slot);
	if (!document || downloadLoading.value) return;

	downloadLoading.value = slot;
	try {
		const url = await getFolderDocumentSignedUrl(document.id);
		const link = window.document.createElement("a");
		link.href = url;
		link.download = document.filename;
		link.style.display = "none";
		window.document.body.appendChild(link);
		link.click();
		window.document.body.removeChild(link);
	}
	catch {
		showFileActionError();
	}
	finally {
		downloadLoading.value = null;
	}
}

async function previewFolderDocument(slot: FolderDocumentSlot): Promise<void> {
	const document = documentForSlot(slot);
	if (!document || previewLoading.value) return;

	previewLoading.value = slot;
	try {
		const url = await getFolderDocumentSignedUrl(document.id);
		window.open(url, "_blank", "noopener,noreferrer");
	}
	catch {
		showFileActionError();
	}
	finally {
		previewLoading.value = null;
	}
}

function formatFileSize(size: number | null): string {
	if (!size) return "Dimensione non disponibile";
	if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
	return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatUploadedAt(value: string | null): string {
	return value ? formatDate(value) : "data non disponibile";
}

function isAllowedClientFile(file: File): boolean {
	const lower = file.name.toLowerCase();
	return ACCEPTED_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

async function saveFolderDetails(): Promise<void> {
	if (!dirty.value || isSaving.value) return;

	isSaving.value = true;
	feedback.value = null;

	try {
		const payload = buildPayload();
		await $fetch("/api/db/mutate", {
			method: "POST",
			body: {
				table: "folders",
				operation: "update",
				data: payload,
				where: { id: folderId },
			},
		});
		initialSnapshot.value = JSON.stringify(payload);
		await refresh();
		toast.add({
			title: "Progetto salvato",
			description: "I dettagli del progetto sono stati aggiornati.",
			color: "success",
		});
	}
	catch {
		feedback.value = {
			tone: "error",
			title: "Salvataggio non riuscito",
			description: "Non siamo riusciti a salvare i dettagli. Riprova tra qualche istante.",
		};
	}
	finally {
		isSaving.value = false;
	}
}

async function handleFileChange(slot: FolderDocumentSlot, event: Event): Promise<void> {
	const input = event.target as HTMLInputElement;
	const file = input.files?.[0];
	input.value = "";
	if (!file) return;

	fileErrors[slot] = null;

	if (!isAllowedClientFile(file)) {
		fileErrors[slot] = "Sono accettati solo file PDF, Word o Excel.";
		return;
	}

	if (file.size > MAX_FILE_SIZE) {
		fileErrors[slot] = "Il file supera il limite massimo di 20 MB.";
		return;
	}

	uploadLoading.value = slot;
	feedback.value = null;

	try {
		const body = new FormData();
		body.append("folderId", folderId);
		body.append("slot", slot);
		body.append("file", file);

		await $fetch("/api/folder-documents/upload", {
			method: "POST",
			body,
		});
		await refresh();
		toast.add({
			title: "File caricato",
			description: "Il documento amministrativo e stato salvato.",
			color: "success",
		});
	}
	catch {
		fileErrors[slot] = "Upload non riuscito. Riprova tra qualche istante.";
	}
	finally {
		uploadLoading.value = null;
	}
}

async function deleteFolderDocument(slot: FolderDocumentSlot): Promise<void> {
	const document = documentForSlot(slot);
	if (!document) return;

	deleteLoading.value = slot;
	feedback.value = null;

	try {
		await $fetch("/api/folder-documents/delete", {
			method: "POST",
			body: { id: document.id },
		});
		confirmDeleteSlot.value = null;
		await refresh();
		toast.add({
			title: "File eliminato",
			description: "Lo slot e tornato disponibile.",
			color: "success",
		});
	}
	catch {
		fileErrors[slot] = "Eliminazione non riuscita. Riprova tra qualche istante.";
	}
	finally {
		deleteLoading.value = null;
	}
}

function requestDeleteProject(): void {
	feedback.value = null;
	deleteDialogOpen.value = true;
}

async function confirmDeleteProject(): Promise<void> {
	isDeleting.value = true;

	try {
		await $fetch("/api/db/delete", {
			method: "POST",
			body: {
				entity: "project",
				id: folderId,
			},
		});

		await router.push({ path: "/progetti", query: { deleted: "project" } });
	}
	catch {
		feedback.value = {
			tone: "error",
			title: "Eliminazione non riuscita",
			description: "Non siamo riusciti a eliminare il progetto. Riprova tra qualche istante.",
		};
	}
	finally {
		isDeleting.value = false;
		deleteDialogOpen.value = false;
	}
}
</script>

<template>
	<BasePageContainer size="xl">
		<BaseStateMessage
			v-if="pending"
			loading
			title="Caricamento progetto in corso..."
		/>

		<template v-else-if="data">
			<div class="mb-4">
				<NuxtLink
					to="/progetti"
					class="inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-700"
				>
					<UIcon name="i-lucide-arrow-left" class="size-4" />
					Tutti i progetti
				</NuxtLink>
			</div>

			<BasePageHeader
				:title="folderTitle"
				:description="clientName ? `Ragione sociale: ${clientName}` : 'Progetto senza cliente collegato'"
			>
				<template #meta>
					<div class="flex flex-wrap items-center gap-2 pt-1">
						<span
							class="inline-flex rounded-full px-3 py-1 text-xs font-medium"
							:class="statusToneClass(folderStatus)"
						>
							{{ statusLabel[folderStatus] ?? folderStatus }}
						</span>
						<span class="text-sm text-slate-500">
							Aggiornato {{ formatDate(data.folder.updated_at) }}
						</span>
					</div>
				</template>

				<template #actions>
					<UButton
						icon="i-lucide-plus"
						size="lg"
						class="rounded-xl px-5"
						:to="`/pages/new?clientId=${data.folder.client_id}`"
					>
						Nuovo documento
					</UButton>
					<UButton
						color="neutral"
						:variant="dirty ? 'solid' : 'soft'"
						:disabled="!dirty || isSaving"
						:loading="isSaving"
						class="rounded-xl px-5 transition-opacity"
						:class="dirty ? 'opacity-100' : 'opacity-40'"
						@click="saveFolderDetails"
					>
						Salva modifiche
					</UButton>
					<UButton
						color="error"
						variant="soft"
						size="lg"
						class="rounded-xl px-5"
						icon="i-lucide-trash-2"
						@click="requestDeleteProject"
					>
						Elimina progetto
					</UButton>
				</template>
			</BasePageHeader>

			<UAlert
				v-if="activeNotice"
				:color="activeNotice.tone === 'error' ? 'error' : 'success'"
				variant="soft"
				:icon="
					activeNotice.tone === 'error'
						? 'i-lucide-circle-alert'
						: 'i-lucide-circle-check-big'
				"
				:title="activeNotice.title"
				:description="activeNotice.description"
				class="mb-6"
			/>

			<div class="flex flex-col" style="gap: var(--space-section)">
				<BaseDetailSection title="Dettagli progetto">
					<template #actions>
						<span
							class="inline-flex rounded-full px-3 py-1 text-xs font-medium"
							:class="statusToneClass(folderStatus)"
						>
							{{ statusLabel[folderStatus] ?? folderStatus }}
						</span>
					</template>

					<BaseFieldGrid>
						<label class="folder-detail-field">
							<span>Titolo del programma <span class="required-marker">*</span></span>
							<input v-model="form.program_name" placeholder="Titolo del programma" />
						</label>

						<label class="folder-detail-field">
							<span>Anno di imposta <span class="required-marker">*</span></span>
							<input
								v-model="form.tax_year"
								inputmode="numeric"
								placeholder="Anno di imposta"
							/>
						</label>

						<label class="folder-detail-field">
							<span>Referente</span>
							<input v-model="form.referente" placeholder="Referente di progetto" />
						</label>

						<label class="folder-detail-field folder-detail-field--readonly">
							<span>Tipo progetto</span>
							<input :value="projectType" readonly />
						</label>
					</BaseFieldGrid>
				</BaseDetailSection>

				<BaseDetailSection title="Documenti" :description="documentCountLabel">
					<div v-if="!documentRows.length" class="py-12 text-center text-[13px] text-slate-400">
						Nessun documento
					</div>

					<div v-else class="overflow-hidden">
						<DocumentListRow
							v-for="document in documentRows"
							:key="document.id"
							:document="document"
							compact
						/>
					</div>
				</BaseDetailSection>

				<BaseDetailSection title="Documenti amministrativi">
					<div class="grid gap-4 md:grid-cols-2">
						<div
							v-for="slot in ADMIN_SLOTS"
							:key="slot.key"
							class="folder-document-slot"
							:class="documentForSlot(slot.key) ? 'folder-document-slot--filled' : ''"
						>
							<div class="flex items-start justify-between gap-4">
								<div class="min-w-0">
									<p class="folder-document-label">
										{{ slot.label }}
									</p>
									<template v-if="documentForSlot(slot.key)">
										<p class="mt-2 truncate text-sm font-medium text-slate-900">
											{{ documentForSlot(slot.key)?.filename }}
										</p>
										<p class="mt-1 text-xs text-slate-500">
											{{ formatFileSize(documentForSlot(slot.key)?.file_size_bytes ?? null) }}
											· caricato {{ formatUploadedAt(documentForSlot(slot.key)?.uploaded_at ?? null) }}
										</p>
									</template>
									<p v-else class="mt-2 text-sm text-slate-500">
										PDF, Word, Excel · max 20 MB
									</p>
								</div>

								<div
									v-if="documentForSlot(slot.key) && confirmDeleteSlot !== slot.key"
									class="flex shrink-0 items-center gap-1"
								>
									<UButton
										color="neutral"
										variant="ghost"
										icon="i-lucide-download"
										class="size-7 rounded-lg p-0"
										:loading="downloadLoading === slot.key"
										aria-label="Scarica file"
										@click="downloadFolderDocument(slot.key)"
									/>
									<UButton
										v-if="isPdfFilename(documentForSlot(slot.key)?.filename)"
										color="neutral"
										variant="ghost"
										icon="i-lucide-eye"
										class="size-7 rounded-lg p-0"
										:loading="previewLoading === slot.key"
										aria-label="Anteprima file"
										@click="previewFolderDocument(slot.key)"
									/>
									<UButton
										color="error"
										variant="ghost"
										icon="i-lucide-trash-2"
										class="size-7 rounded-lg p-0"
										aria-label="Elimina file"
										@click="confirmDeleteSlot = slot.key"
									/>
								</div>
							</div>

							<div v-if="confirmDeleteSlot === slot.key" class="mt-4 rounded-xl bg-rose-50 p-3">
								<p class="text-xs font-medium text-rose-700">
									Conferma eliminazione?
								</p>
								<div class="mt-2 flex gap-2">
									<UButton
										size="xs"
										color="error"
										:loading="deleteLoading === slot.key"
										@click="deleteFolderDocument(slot.key)"
									>
										Sì
									</UButton>
									<UButton
										size="xs"
										color="neutral"
										variant="ghost"
										@click="confirmDeleteSlot = null"
									>
										Annulla
									</UButton>
								</div>
							</div>

							<p v-if="fileErrors[slot.key]" class="mt-3 text-xs text-rose-600">
								{{ fileErrors[slot.key] }}
							</p>

							<div class="mt-4">
								<input
									:id="`folder-doc-${slot.key}`"
									type="file"
									class="sr-only"
									accept=".pdf,.doc,.docx,.xls,.xlsx"
									@change="handleFileChange(slot.key, $event)"
								/>
								<UButton
									as="label"
									:for="`folder-doc-${slot.key}`"
									color="neutral"
									variant="soft"
									icon="i-lucide-upload"
									class="cursor-pointer rounded-xl"
									:loading="uploadLoading === slot.key"
								>
									{{ documentForSlot(slot.key) ? "Sostituisci file" : "Carica file" }}
								</UButton>
							</div>
						</div>
					</div>
				</BaseDetailSection>
			</div>

			<BaseConfirmDialog
				v-model:open="deleteDialogOpen"
				title="Eliminare il progetto?"
				description="Il progetto e tutti i documenti collegati verranno eliminati definitivamente. Questa azione non puo essere annullata."
				confirm-label="Elimina progetto"
				:loading="isDeleting"
				@confirm="confirmDeleteProject"
			/>
		</template>

		<BaseStateMessage
			v-else
			tone="error"
			icon="i-lucide-circle-alert"
			title="Progetto non trovato"
			description="Il programma richiesto potrebbe essere stato rimosso o non essere più disponibile."
		>
			<template #actions>
				<UButton variant="ghost" color="neutral" to="/progetti">
					Torna ai progetti
				</UButton>
			</template>
		</BaseStateMessage>
	</BasePageContainer>
</template>

<style scoped>
.folder-document-label {
	color: var(--color-text-muted, rgb(100 116 139));
	font-size: 11px;
	font-weight: 500;
	letter-spacing: 0.06em;
	line-height: 1.2;
	text-transform: uppercase;
}

.folder-detail-field {
	display: flex;
	min-width: 0;
	flex-direction: column;
	gap: 7px;
}

.folder-detail-field span {
	color: var(--color-text-tertiary, rgb(148 163 184));
	font-size: 11px;
	font-weight: 500;
	letter-spacing: 0.06em;
	line-height: 1.2;
	text-transform: uppercase;
}

.folder-detail-field .required-marker {
	color: var(--color-required);
}

.folder-detail-field input {
	width: 100%;
	border: 0;
	border-bottom: 1px solid transparent;
	background: transparent;
	border-radius: 0;
	color: var(--color-text, rgb(15 23 42));
	font-size: 13px;
	line-height: 1.6;
	outline: none;
	padding: 3px 0 6px;
	transition: border-color 140ms ease, color 140ms ease;
}

.folder-detail-field:not(.folder-detail-field--readonly) input:hover {
	border-bottom-color: var(--color-border-tertiary, rgb(203 213 225));
}

.folder-detail-field:not(.folder-detail-field--readonly) input:focus {
	border-bottom-color: var(--ui-primary, rgb(124 58 237));
}

.folder-detail-field--readonly input {
	color: rgb(100 116 139);
}

.folder-detail-field input::placeholder {
	color: rgb(148 163 184);
}

.folder-document-slot {
	border: 1px dashed rgb(203 213 225);
	border-radius: 8px;
	padding: 18px;
}

.folder-document-slot--filled {
	border-style: solid;
	border-color: rgb(226 232 240);
}

</style>

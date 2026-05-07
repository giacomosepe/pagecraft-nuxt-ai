<script setup lang="ts">
import type {
	PageContextDocument,
	PageContextSlot,
} from "~/types/app.types";

const props = defineProps<{
	pageId: string;
}>();

const slots: { key: PageContextSlot; label: string; note: string }[] = [
	{
		key: "technical_presentation",
		label: "Presentazione tecnica",
		note: "Fonte primaria per gli step 4-6",
	},
	{
		key: "financial_notes",
		label: "Nota integrativa",
		note: "Fonte primaria per lo step 7",
	},
	{
		key: "additional_docs",
		label: "Documentazione aggiuntiva",
		note: "Contesto secondario",
	},
];

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = [".pdf", ".doc", ".docx"];

const documents = ref<PageContextDocument[]>([]);
const loading = ref(true);
const uploadingSlot = ref<PageContextSlot | null>(null);
const deletingId = ref<string | null>(null);
const confirmDeleteId = ref<string | null>(null);
const errors = ref<Partial<Record<PageContextSlot, string>>>({});
const inputRefs = ref<Partial<Record<PageContextSlot, HTMLInputElement | null>>>({});

function setInputRef(slot: PageContextSlot, el: Element | null): void {
	inputRefs.value[slot] = el instanceof HTMLInputElement ? el : null;
}

function documentForSlot(slot: PageContextSlot): PageContextDocument | null {
	return documents.value.find((document) => document.slot === slot) ?? null;
}

function formatBytes(bytes: number | null): string {
	if (!bytes) return "Dimensione non disponibile";
	if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString("it-IT", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
}

function isAcceptedFile(file: File): boolean {
	const lower = file.name.toLowerCase();
	return ACCEPTED_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

async function loadDocuments(): Promise<void> {
	loading.value = true;
	try {
		documents.value = await $fetch<PageContextDocument[]>("/api/page-context-documents", {
			query: { pageId: props.pageId },
		});
	}
	finally {
		loading.value = false;
	}
}

async function uploadFile(slot: PageContextSlot, file: File): Promise<void> {
	errors.value[slot] = "";

	if (!isAcceptedFile(file)) {
		errors.value[slot] = "Carica un file PDF, DOC o DOCX.";
		return;
	}

	if (file.size > MAX_FILE_SIZE) {
		errors.value[slot] = "Il file supera il limite massimo di 20 MB.";
		return;
	}

	const form = new FormData();
	form.append("pageId", props.pageId);
	form.append("slot", slot);
	form.append("file", file);

	uploadingSlot.value = slot;
	try {
		const uploaded = await $fetch<PageContextDocument>("/api/page-context-documents/upload", {
			method: "POST",
			body: form,
		});

		documents.value = [
			uploaded,
			...documents.value.filter((document) => document.slot !== slot),
		];
	}
	catch {
		errors.value[slot] = "Caricamento non riuscito. Riprova tra qualche istante.";
	}
	finally {
		uploadingSlot.value = null;
		if (inputRefs.value[slot]) inputRefs.value[slot]!.value = "";
	}
}

function onFileChange(slot: PageContextSlot, event: Event): void {
	const file = (event.target as HTMLInputElement).files?.[0] ?? null;
	if (file) void uploadFile(slot, file);
}

async function deleteDocument(document: PageContextDocument): Promise<void> {
	deletingId.value = document.id;
	errors.value[document.slot] = "";

	try {
		await $fetch("/api/page-context-documents/delete", {
			method: "POST",
			body: { id: document.id },
		});
		documents.value = documents.value.filter((item) => item.id !== document.id);
		confirmDeleteId.value = null;
	}
	catch {
		errors.value[document.slot] = "Eliminazione non riuscita. Riprova tra qualche istante.";
	}
	finally {
		deletingId.value = null;
	}
}

onMounted(() => {
	void loadDocuments();
});
</script>

<template>
	<div class="flex h-full flex-col bg-white">
		<div class="border-b border-slate-200 px-6 py-5">
			<div class="flex items-center gap-3">
				<div class="grid size-10 place-items-center rounded-lg border border-slate-200 bg-slate-50">
					<UIcon name="i-lucide-settings" class="size-5 text-slate-600" />
				</div>
				<div>
					<p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
						Configurazione
					</p>
					<h2 class="text-base font-semibold text-slate-950">
						Documenti di contesto
					</h2>
				</div>
			</div>
		</div>

		<div class="flex-1 overflow-y-auto px-6 py-5">
			<BaseStateMessage
				v-if="loading"
				compact
				loading
				title="Caricamento documenti..."
			/>

			<div v-else class="space-y-4">
				<div
					v-for="slot in slots"
					:key="slot.key"
					class="rounded-lg border bg-white p-4 transition-colors"
					:class="documentForSlot(slot.key) ? 'border-slate-200' : 'border-dashed border-slate-300'"
				>
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0">
							<p class="text-sm font-semibold text-slate-950">
								{{ slot.label }}
							</p>
							<p class="mt-1 text-xs leading-5 text-slate-500">
								{{ slot.note }}
							</p>
						</div>

						<input
							:ref="(el) => setInputRef(slot.key, el)"
							type="file"
							accept=".pdf,.doc,.docx"
							class="sr-only"
							:disabled="uploadingSlot === slot.key"
							@change="onFileChange(slot.key, $event)"
						>

						<UButton
							v-if="!documentForSlot(slot.key)"
							size="sm"
							variant="outline"
							color="neutral"
							icon="i-lucide-upload"
							class="rounded-lg"
							:loading="uploadingSlot === slot.key"
							@click="inputRefs[slot.key]?.click()"
						>
							Carica file
						</UButton>
					</div>

					<div
						v-if="documentForSlot(slot.key)"
						class="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3"
					>
						<div class="flex items-start justify-between gap-3">
							<div class="min-w-0">
								<p class="truncate text-sm font-medium text-slate-900">
									{{ documentForSlot(slot.key)?.filename }}
								</p>
								<p class="mt-1 text-xs text-slate-500">
									{{ formatBytes(documentForSlot(slot.key)?.file_size_bytes ?? null) }}
									<span class="mx-1">·</span>
									{{ formatDate(documentForSlot(slot.key)?.uploaded_at ?? '') }}
								</p>
							</div>

							<div class="flex shrink-0 items-center gap-1">
								<UButton
									size="xs"
									variant="ghost"
									color="neutral"
									icon="i-lucide-refresh-cw"
									:loading="uploadingSlot === slot.key"
									aria-label="Sostituisci file"
									@click="inputRefs[slot.key]?.click()"
								/>
								<UButton
									size="xs"
									variant="ghost"
									color="error"
									icon="i-lucide-trash-2"
									aria-label="Elimina file"
									@click="confirmDeleteId = documentForSlot(slot.key)?.id ?? null"
								/>
							</div>
						</div>

						<div
							v-if="confirmDeleteId === documentForSlot(slot.key)?.id"
							class="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2"
						>
							<p class="mr-auto text-xs font-medium text-rose-800">
								Conferma eliminazione?
							</p>
							<UButton
								size="xs"
								color="error"
								variant="solid"
								:loading="deletingId === documentForSlot(slot.key)?.id"
								@click="deleteDocument(documentForSlot(slot.key)!)"
							>
								Sì
							</UButton>
							<UButton
								size="xs"
								color="neutral"
								variant="ghost"
								@click="confirmDeleteId = null"
							>
								Annulla
							</UButton>
						</div>
					</div>

					<UAlert
						v-if="errors[slot.key]"
						class="mt-3"
						color="error"
						variant="soft"
						size="sm"
						icon="i-lucide-circle-alert"
						:description="errors[slot.key]"
					/>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { statusLabel } from "~/utils/status";

definePageMeta({ middleware: "auth" });

const supabase = useSupabaseClient();
const route = useRoute();
const router = useRouter();
const folderId = route.params.id as string;

const { data, pending, refresh } = await useAsyncData(
	`folder-${folderId}`,
	async () => {
		const [folderRes, pagesRes] = await Promise.all([
			supabase
				.from("folders")
				.select(
					"id, program_name, client_id, created_at, clients(name)",
				)
				.eq("id", folderId)
				.single(),
			supabase
				.from("pages")
				.select("id, title, framework_name, status, updated_at")
				.eq("folder_id", folderId)
				.order("created_at", { ascending: true }),
		]);
		if (folderRes.error) throw folderRes.error;
		if (pagesRes.error) throw pagesRes.error;
		return { folder: folderRes.data, pages: pagesRes.data ?? [] };
	},
	{ server: false },
);
const deleteDialogOpen = ref(false);
const deleteIntent = ref<
	| { kind: "project"; id: string }
	| { kind: "document"; id: string; title: string }
	| null
>(null);
const isDeleting = ref(false);
const feedback = ref<{
	tone: "success" | "error";
	title: string;
	description: string;
} | null>(null);

const clientName = computed(() => {
	const c = data.value?.folder?.clients;
	if (!c) return null;
	return (c as { name: string } | null)?.name ?? null;
});

const transitionNotice = computed(() => {
	if (route.query.created !== "documents") return null;

	const count = Number(route.query.count ?? "1");
	return count > 1
		? {
				tone: "success" as const,
				title: "Documenti creati",
				description: `${count} documenti sono stati aggiunti al progetto e sono pronti per essere completati.`,
			}
		: {
				tone: "success" as const,
				title: "Documento creato",
				description: "Il nuovo documento e stato aggiunto al progetto ed e pronto per essere completato.",
			};
});

const activeNotice = computed(() => feedback.value ?? transitionNotice.value);

const deleteTitle = computed(() => {
	if (deleteIntent.value?.kind === "document") {
		return "Eliminare il documento?";
	}

	return "Eliminare il progetto?";
});

const deleteDescription = computed(() => {
	if (deleteIntent.value?.kind === "document") {
		return `Il documento "${deleteIntent.value.title}" verra rimosso definitivamente. Questa azione non puo essere annullata.`;
	}

	return "Il progetto e tutti i documenti collegati verranno eliminati definitivamente. Questa azione non puo essere annullata.";
});

const deleteConfirmLabel = computed(() =>
	deleteIntent.value?.kind === "document"
		? "Elimina documento"
		: "Elimina progetto",
);

function formatDate(iso: string): string {
	const months = [
		"Gen",
		"Feb",
		"Mar",
		"Apr",
		"Mag",
		"Giu",
		"Lug",
		"Ago",
		"Set",
		"Ott",
		"Nov",
		"Dic",
	];
	const d = new Date(iso);
	return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function requestDeleteProject(): void {
	feedback.value = null;
	deleteIntent.value = { kind: "project", id: folderId };
	deleteDialogOpen.value = true;
}

function requestDeleteDocument(pageId: string, title: string): void {
	feedback.value = null;
	deleteIntent.value = { kind: "document", id: pageId, title };
	deleteDialogOpen.value = true;
}

async function confirmDelete(): Promise<void> {
	if (!deleteIntent.value) return;

	isDeleting.value = true;

	try {
		if (deleteIntent.value.kind === "project") {
			await $fetch("/api/db/delete", {
				method: "POST",
				body: {
					entity: "project",
					id: deleteIntent.value.id,
				},
			});

			await router.push({ path: "/progetti", query: { deleted: "project" } });
			return;
		}

		await $fetch("/api/db/delete", {
			method: "POST",
			body: {
				entity: "document",
				id: deleteIntent.value.id,
			},
		});

		await refresh();
		feedback.value = {
			tone: "success",
			title: "Documento eliminato",
			description: "Il documento e stato rimosso correttamente dal progetto.",
		};
		deleteDialogOpen.value = false;
		deleteIntent.value = null;
	}
	catch {
		feedback.value = {
			tone: "error",
			title: "Eliminazione non riuscita",
			description:
				deleteIntent.value?.kind === "project"
					? "Non siamo riusciti a eliminare il progetto. Riprova tra qualche istante."
					: "Non siamo riusciti a eliminare il documento. Riprova tra qualche istante.",
		};
	}
	finally {
		isDeleting.value = false;
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
					class="mb-3 flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-700"
				>
					<UIcon name="i-lucide-arrow-left" class="size-4" />
					Tutti i progetti
				</NuxtLink>

				<BasePageHeader
					:title="data.folder.program_name ?? 'Progetto senza nome'"
					description="Esplora i documenti collegati e il loro stato di avanzamento."
				>
					<template #meta>
						<div class="space-y-2">
							<p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
								Progetto
							</p>
							<div class="flex flex-wrap items-start gap-2 text-sm sm:items-center">
								<NuxtLink
									v-if="clientName"
									:to="`/clients/${data.folder.client_id}`"
									class="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 font-medium text-violet-700"
								>
									Cliente: {{ clientName }}
								</NuxtLink>
								<span class="text-slate-500">
									Creato il
									{{
										new Date(
											data.folder.created_at,
										).toLocaleDateString("it-IT")
									}}
								</span>
							</div>
						</div>
					</template>

					<template #actions>
						<div class="flex w-full flex-col gap-2 sm:items-end">
							<div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
								<UButton
									icon="i-lucide-plus"
									size="lg"
									class="rounded-xl px-5"
									:to="`/pages/new?clientId=${data.folder.client_id}`"
								>
									Nuovo documento
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
								<UBadge color="primary" variant="soft" size="sm">
									{{ data.pages.length }}
									{{
										data.pages.length === 1
											? "documento"
											: "documenti"
									}}
								</UBadge>
							</div>
							<p class="text-xs text-slate-500 sm:max-w-sm sm:text-right">
								L'eliminazione rimuovera anche tutti i documenti collegati.
							</p>
						</div>
					</template>
				</BasePageHeader>
			</div>

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

			<BaseDetailSection
				title="Documenti"
				description="Traccia i documenti collegati e apri subito quello giusto."
			>
				<BaseStateMessage
					v-if="!data.pages.length"
					compact
					icon="i-lucide-file-text"
					title="Nessun documento"
					description="Questo progetto non contiene ancora documenti."
				/>

				<div
					v-else
					class="overflow-x-auto rounded-2xl border border-slate-200"
				>
					<div class="min-w-[720px]">
						<div
							class="grid grid-cols-[minmax(0,2fr)_minmax(120px,1fr)_120px_72px] gap-4 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500"
						>
							<p>Documento</p>
							<p>Stato</p>
							<p>Ultima attività</p>
							<p class="text-right">Azioni</p>
						</div>

						<div
							v-for="page in data.pages"
							:key="page.id"
							class="grid grid-cols-[minmax(0,2fr)_minmax(120px,1fr)_120px_72px] items-center gap-4 border-t border-slate-200 px-5 py-4 transition-colors hover:bg-slate-50"
						>
							<div
								class="interactive-row col-span-3 grid grid-cols-[minmax(0,2fr)_minmax(120px,1fr)_120px] items-center gap-4"
								role="button"
								tabindex="0"
								@click="router.push(`/pages/${page.id}`)"
								@keydown.enter="router.push(`/pages/${page.id}`)"
								@keydown.space.prevent="router.push(`/pages/${page.id}`)"
							>
								<div class="min-w-0">
									<p
										class="truncate text-sm font-semibold text-slate-900"
									>
										{{ page.title }}
									</p>
									<p class="truncate text-xs text-slate-500">
										{{ page.framework_name ?? "—" }}
									</p>
								</div>

								<div>
									<span
										class="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200"
									>
										{{ statusLabel[page.status] ?? page.status }}
									</span>
								</div>

								<p class="text-sm text-slate-500">
									{{ formatDate(page.updated_at) }}
								</p>
							</div>

							<div class="flex justify-end">
								<UButton
									color="error"
									variant="soft"
									icon="i-lucide-trash-2"
									class="rounded-xl"
									:loading="
										isDeleting &&
										deleteIntent?.kind === 'document' &&
										deleteIntent.id === page.id
									"
									@click="requestDeleteDocument(page.id, page.title)"
								/>
							</div>
						</div>
					</div>
				</div>
			</BaseDetailSection>

			<BaseConfirmDialog
				v-model:open="deleteDialogOpen"
				:title="deleteTitle"
				:description="deleteDescription"
				:confirm-label="deleteConfirmLabel"
				:loading="isDeleting"
				@confirm="confirmDelete"
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

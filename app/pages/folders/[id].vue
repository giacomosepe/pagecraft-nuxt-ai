<script setup lang="ts">
import { statusLabel } from "~/utils/status";

definePageMeta({ middleware: "auth" });

const supabase = useSupabaseClient();
const route = useRoute();
const folderId = route.params.id as string;

const { data, pending } = await useAsyncData(
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
				title: "Documenti creati",
				description: `${count} documenti sono stati aggiunti al progetto e sono pronti per essere completati.`,
			}
		: {
				title: "Documento creato",
				description: "Il nuovo documento e stato aggiunto al progetto ed e pronto per essere completato.",
			};
});

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
						<UButton
							icon="i-lucide-plus"
							size="lg"
							class="rounded-xl px-5"
							:to="`/pages/new?clientId=${data.folder.client_id}`"
						>
							Nuovo documento
						</UButton>
						<UBadge color="primary" variant="soft" size="sm">
							{{ data.pages.length }}
							{{
								data.pages.length === 1
									? "documento"
									: "documenti"
							}}
						</UBadge>
					</template>
				</BasePageHeader>
			</div>

			<UAlert
				v-if="transitionNotice"
				color="success"
				variant="soft"
				icon="i-lucide-circle-check-big"
				:title="transitionNotice.title"
				:description="transitionNotice.description"
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
					description="Questo programma non contiene ancora documenti."
				/>

				<div
					v-else
					class="overflow-x-auto rounded-2xl border border-slate-200"
				>
					<div class="min-w-[640px]">
						<div
							class="grid grid-cols-[minmax(0,2fr)_minmax(120px,1fr)_120px] gap-4 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500"
						>
							<p>Documento</p>
							<p>Stato</p>
							<p>Ultima attività</p>
						</div>

						<NuxtLink
							v-for="page in data.pages"
							:key="page.id"
							:to="`/pages/${page.id}`"
							class="grid grid-cols-[minmax(0,2fr)_minmax(120px,1fr)_120px] items-center gap-4 border-t border-slate-200 px-5 py-4 transition-colors hover:bg-slate-50"
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
						</NuxtLink>
					</div>
				</div>
			</BaseDetailSection>
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

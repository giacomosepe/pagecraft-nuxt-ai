<script setup lang="ts">
import { statusColor, statusLabel } from "~/utils/status";

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
				.select("id, program_name, client_id, created_at, clients(name)")
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
	<BasePageContainer size="lg">
		<!-- Loading -->
		<div v-if="pending" class="flex justify-center py-24">
			<UIcon
				name="i-lucide-loader-circle"
				class="size-6 animate-spin text-gray-400"
			/>
		</div>

		<template v-else-if="data">
			<div class="mb-4">
				<NuxtLink
					:to="data.folder.client_id ? `/clients/${data.folder.client_id}` : '/dashboard'"
					class="mb-3 flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-700"
				>
					<UIcon name="i-lucide-arrow-left" class="size-4" />
					{{ clientName ?? "Dashboard" }}
				</NuxtLink>

				<BasePageHeader
					:title="data.folder.program_name ?? 'Programma senza nome'"
					description="Esplora i documenti collegati e il loro stato di avanzamento."
				>
					<template #meta>
						<p class="text-sm text-slate-500">
							<span v-if="clientName">{{ clientName }} · </span>
							Creato il
							{{ new Date(data.folder.created_at).toLocaleDateString("it-IT") }}
						</p>
					</template>

					<template #actions>
						<UBadge color="primary" variant="soft" size="sm">
						{{ data.pages.length }}
						{{ data.pages.length === 1 ? "documento" : "documenti" }}
						</UBadge>
					</template>
				</BasePageHeader>
			</div>

			<div class="mb-4">
				<h2 class="text-sm font-semibold text-slate-700">
					Documenti
				</h2>
			</div>

			<div
				v-if="!data.pages.length"
				class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 py-16 text-center"
			>
				<UIcon
					name="i-lucide-file-text"
					class="mb-3 size-9 text-slate-300"
				/>
				<p class="text-sm font-medium text-slate-900">
					Nessun documento
				</p>
				<p class="mt-1 text-sm text-slate-500">
					Questo programma non contiene ancora documenti
				</p>
			</div>

			<div v-else class="flex flex-col gap-2">
				<NuxtLink
					v-for="page in data.pages"
					:key="page.id"
					:to="`/pages/${page.id}`"
					class="block rounded-lg border border-(--ui-border) bg-(--ui-bg) px-4 py-3 transition-colors hover:bg-(--ui-bg-elevated)"
				>
					<div class="flex items-start justify-between gap-3">
						<p class="text-sm font-medium text-(--ui-text-highlighted)">
							{{ page.framework_name ?? "—" }}
						</p>
						<UBadge
							:color="statusColor[page.status] ?? 'neutral'"
							variant="soft"
							size="sm"
							class="shrink-0"
						>
							{{ statusLabel[page.status] ?? page.status }}
						</UBadge>
					</div>
					<p class="mt-1 text-xs text-(--ui-text-muted)">
						Ultima modifica: {{ formatDate(page.updated_at) }}
					</p>
				</NuxtLink>
			</div>
		</template>

		<!-- Not found -->
		<div v-else class="flex flex-col items-center justify-center py-24 text-center">
			<UIcon
				name="i-lucide-circle-alert"
				class="mb-3 size-9 text-slate-300"
			/>
			<p class="text-sm font-medium text-slate-900">
				Programma non trovato
			</p>
			<NuxtLink
				to="/dashboard"
				class="mt-3 text-sm text-primary-600 hover:underline"
			>
				Torna al dashboard
			</NuxtLink>
		</div>
	</BasePageContainer>
</template>

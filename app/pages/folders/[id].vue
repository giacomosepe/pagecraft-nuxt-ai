<script setup lang="ts">
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

const statusColor: Record<string, string> = {
	DRAFT: "neutral",
	IN_PROGRESS: "info",
	COMPLETED: "success",
	ARCHIVED: "neutral",
};

const statusLabel: Record<string, string> = {
	DRAFT: "Bozza",
	IN_PROGRESS: "In corso",
	COMPLETED: "Completato",
	ARCHIVED: "Archiviato",
};
</script>

<template>
	<div class="mx-auto max-w-4xl px-6 py-8">
		<!-- Loading -->
		<div v-if="pending" class="flex justify-center py-24">
			<UIcon
				name="i-lucide-loader-circle"
				class="size-6 animate-spin text-gray-400"
			/>
		</div>

		<template v-else-if="data">
			<!-- Header -->
			<div class="mb-8">
				<NuxtLink
					:to="data.folder.client_id ? `/clients/${data.folder.client_id}` : '/dashboard'"
					class="mb-2 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
				>
					<UIcon name="i-lucide-arrow-left" class="size-4" />
					{{ clientName ?? "Dashboard" }}
				</NuxtLink>

				<div class="flex items-start justify-between gap-4">
					<div>
						<h1 class="text-xl font-semibold text-gray-900 dark:text-white">
							{{ data.folder.program_name ?? "Programma senza nome" }}
						</h1>
						<p class="mt-1 text-xs text-gray-400 dark:text-gray-500">
							<span v-if="clientName">{{ clientName }} · </span>
							Creato il
							{{ new Date(data.folder.created_at).toLocaleDateString("it-IT") }}
						</p>
					</div>
					<UBadge color="primary" variant="soft" size="sm">
						{{ data.pages.length }}
						{{ data.pages.length === 1 ? "documento" : "documenti" }}
					</UBadge>
				</div>
			</div>

			<!-- Section label -->
			<div class="mb-4">
				<h2 class="text-sm font-semibold text-gray-700 dark:text-gray-300">
					Documenti
				</h2>
			</div>

			<!-- Empty state -->
			<div
				v-if="!data.pages.length"
				class="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-16 text-center dark:border-gray-700"
			>
				<UIcon
					name="i-lucide-file-text"
					class="mb-3 size-9 text-gray-300 dark:text-gray-600"
				/>
				<p class="text-sm font-medium text-gray-900 dark:text-white">
					Nessun documento
				</p>
				<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
					Questo programma non contiene ancora documenti
				</p>
			</div>

			<!-- Document list -->
			<div v-else class="flex flex-col gap-2">
				<NuxtLink
					v-for="page in data.pages"
					:key="page.id"
					:to="`/pages/${page.id}`"
					class="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
				>
					<div class="min-w-0">
						<p class="truncate text-sm font-medium text-gray-900 dark:text-white">
							{{ page.title }}
						</p>
						<p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
							{{ page.framework_name ?? "—" }}
						</p>
					</div>
					<div class="ml-4 flex shrink-0 items-center gap-3">
						<UBadge
							:color="statusColor[page.status] ?? 'neutral'"
							variant="soft"
							size="sm"
						>
							{{ statusLabel[page.status] ?? page.status }}
						</UBadge>
						<span class="text-xs text-gray-400">
							{{ new Date(page.updated_at).toLocaleDateString("it-IT") }}
						</span>
						<UIcon
							name="i-lucide-chevron-right"
							class="size-4 text-gray-400"
						/>
					</div>
				</NuxtLink>
			</div>
		</template>

		<!-- Not found -->
		<div v-else class="flex flex-col items-center justify-center py-24 text-center">
			<UIcon
				name="i-lucide-circle-alert"
				class="mb-3 size-9 text-gray-300 dark:text-gray-600"
			/>
			<p class="text-sm font-medium text-gray-900 dark:text-white">
				Programma non trovato
			</p>
			<NuxtLink
				to="/dashboard"
				class="mt-3 text-sm text-primary-600 hover:underline dark:text-primary-400"
			>
				Torna al dashboard
			</NuxtLink>
		</div>
	</div>
</template>

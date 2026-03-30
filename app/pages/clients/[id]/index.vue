<script setup lang="ts">
definePageMeta({ middleware: "auth" });

const supabase = useSupabaseClient();
const route = useRoute();
const clientId = route.params.id as string;

const { data, pending } = await useAsyncData(
	`client-${clientId}`,
	async () => {
		const [clientRes, foldersRes] = await Promise.all([
			supabase
				.from("clients")
				.select(`
					id, name, created_at,
					company_name, industry_sector, employee_count,
					legal_representative, vat_number, codice_fiscale,
					registered_address, company_form
				`)
				.eq("id", clientId)
				.single(),
			supabase
				.from("folders")
				.select("id, program_name, created_at, pages(count)")
				.eq("client_id", clientId)
				.order("created_at", { ascending: false }),
		]);
		if (clientRes.error) throw clientRes.error;
		if (foldersRes.error) throw foldersRes.error;
		return { client: clientRes.data, folders: foldersRes.data ?? [] };
	},
	{ server: false },
);

function pageCount(folder: { pages: { count: number }[] | null }): number {
	return folder.pages?.[0]?.count ?? 0;
}
</script>

<template>
	<div class="mx-auto max-w-4xl px-6 py-8">

		<!-- Loading -->
		<div v-if="pending" class="flex justify-center py-24">
			<UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-gray-400" />
		</div>

		<template v-else-if="data">
			<!-- Header -->
			<div class="mb-8 flex items-start justify-between">
				<div>
					<NuxtLink
						to="/dashboard"
						class="mb-2 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
					>
						<UIcon name="i-lucide-arrow-left" class="size-4" />
						Clienti
					</NuxtLink>
					<h1 class="text-xl font-semibold text-gray-900 dark:text-white">
						{{ data.client.name }}
					</h1>
					<p class="mt-1 text-xs text-gray-400 dark:text-gray-500">
						Creato il {{ new Date(data.client.created_at).toLocaleDateString("it-IT") }}
					</p>
				</div>
				<UButton
					icon="i-lucide-pencil"
					size="sm"
					variant="outline"
					color="neutral"
					:to="`/clients/${clientId}/edit`"
				>
					Modifica
				</UButton>
			</div>

			<!-- Company info -->
			<div class="mb-8 rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
				<div class="px-4 py-3">
					<h2 class="text-sm font-semibold text-gray-700 dark:text-gray-300">Dati aziendali</h2>
				</div>
				<div class="grid grid-cols-1 sm:grid-cols-2">
					<div class="px-4 py-3 border-b border-gray-100 dark:border-gray-800 sm:border-r">
						<p class="text-xs text-gray-400">Ragione sociale</p>
						<p class="mt-0.5 text-sm text-gray-900 dark:text-white">{{ data.client.company_name ?? '—' }}</p>
					</div>
					<div class="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
						<p class="text-xs text-gray-400">Forma giuridica</p>
						<p class="mt-0.5 text-sm text-gray-900 dark:text-white">{{ data.client.company_form ?? '—' }}</p>
					</div>
					<div class="px-4 py-3 border-b border-gray-100 dark:border-gray-800 sm:border-r">
						<p class="text-xs text-gray-400">Partita IVA</p>
						<p class="mt-0.5 text-sm text-gray-900 dark:text-white">{{ data.client.vat_number ?? '—' }}</p>
					</div>
					<div class="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
						<p class="text-xs text-gray-400">Codice fiscale</p>
						<p class="mt-0.5 text-sm text-gray-900 dark:text-white">{{ data.client.codice_fiscale ?? '—' }}</p>
					</div>
					<div class="px-4 py-3 border-b border-gray-100 dark:border-gray-800 sm:border-r">
						<p class="text-xs text-gray-400">Settore</p>
						<p class="mt-0.5 text-sm text-gray-900 dark:text-white">{{ data.client.industry_sector ?? '—' }}</p>
					</div>
					<div class="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
						<p class="text-xs text-gray-400">Dipendenti</p>
						<p class="mt-0.5 text-sm text-gray-900 dark:text-white">{{ data.client.employee_count ?? '—' }}</p>
					</div>
					<div class="px-4 py-3 border-b border-gray-100 dark:border-gray-800 sm:border-r">
						<p class="text-xs text-gray-400">Rappresentante legale</p>
						<p class="mt-0.5 text-sm text-gray-900 dark:text-white">{{ data.client.legal_representative ?? '—' }}</p>
					</div>
					<div class="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
						<p class="text-xs text-gray-400">Sede legale</p>
						<p class="mt-0.5 text-sm text-gray-900 dark:text-white">{{ data.client.registered_address ?? '—' }}</p>
					</div>
				</div>
			</div>

			<!-- Folders section -->
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-sm font-semibold text-gray-700 dark:text-gray-300">
					Programmi
				</h2>
				<UButton
					icon="i-lucide-plus"
					size="xs"
					variant="outline"
					color="neutral"
					:to="`/pages/new?clientId=${clientId}`"
				>
					Nuovo programma
				</UButton>
			</div>

			<div
				v-if="!data.folders.length"
				class="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-16 text-center dark:border-gray-700"
			>
				<UIcon name="i-lucide-folder" class="mb-3 size-9 text-gray-300 dark:text-gray-600" />
				<p class="text-sm font-medium text-gray-900 dark:text-white">Nessun programma</p>
				<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
					Crea il primo programma per questo cliente
				</p>
				<UButton
					class="mt-5"
					icon="i-lucide-plus"
					size="sm"
					:to="`/pages/new?clientId=${clientId}`"
				>
					Nuovo programma
				</UButton>
			</div>

			<div v-else class="flex flex-col gap-2">
				<NuxtLink
					v-for="folder in data.folders"
					:key="folder.id"
					:to="`/folders/${folder.id}`"
					class="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
				>
					<div class="flex items-center gap-3">
						<UIcon name="i-lucide-folder" class="size-4 shrink-0 text-gray-400" />
						<p class="text-sm font-medium text-gray-900 dark:text-white">
							{{ folder.program_name ?? "Programma senza nome" }}
						</p>
					</div>
					<div class="flex items-center gap-3">
						<UBadge color="neutral" variant="soft" size="sm">
							{{ pageCount(folder) }}
							{{ pageCount(folder) === 1 ? "doc" : "doc" }}
						</UBadge>
						<UIcon name="i-lucide-chevron-right" class="size-4 text-gray-400" />
					</div>
				</NuxtLink>
			</div>
		</template>

		<!-- Not found -->
		<div v-else class="flex flex-col items-center justify-center py-24 text-center">
			<UIcon name="i-lucide-circle-alert" class="mb-3 size-9 text-gray-300 dark:text-gray-600" />
			<p class="text-sm font-medium text-gray-900 dark:text-white">Cliente non trovato</p>
			<NuxtLink to="/dashboard" class="mt-3 text-sm text-primary-600 hover:underline dark:text-primary-400">
				Torna ai clienti
			</NuxtLink>
		</div>

	</div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: "auth" });

const client = useSupabaseClient();
const route = useRoute();
const clientId = route.params.id as string;

const { data, pending } = useAsyncData(
	`client-${clientId}`,
	async () => {
		const [clientRes, profilesRes] = await Promise.all([
			client
				.from("clients")
				.select("id, name, created_at")
				.eq("id", clientId)
				.single(),
			client
				.from("company_profiles")
				.select("id, company_name, tax_year, industry_sector")
				.eq("client_id", clientId)
				.order("created_at", { ascending: false }),
		]);
		if (clientRes.error) throw clientRes.error;
		if (profilesRes.error) throw profilesRes.error;
		return { client: clientRes.data, profiles: profilesRes.data };
	},
	{ server: false },
);
</script>

<template>
	<div class="mx-auto max-w-4xl px-6 py-8">
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
					to="/clients"
					class="mb-4 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
				>
					<UIcon name="i-lucide-arrow-left" class="size-4" />
					Clienti
				</NuxtLink>
				<h1 class="text-xl font-semibold text-gray-900 dark:text-white">
					{{ data.client.name }}
				</h1>
			</div>

			<!-- Company profiles section -->
			<div class="mb-6 flex items-center justify-between">
				<h2
					class="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
				>
					Profili aziendali
				</h2>
				<UButton
					icon="i-lucide-plus"
					size="xs"
					variant="outline"
					:to="`/clients/${clientId}/profiles/new`"
				>
					Aggiungi profilo
				</UButton>
			</div>

			<div
				v-if="!data.profiles.length"
				class="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-16 text-center dark:border-gray-700"
			>
				<UIcon
					name="i-lucide-file-text"
					class="mb-3 size-9 text-gray-300 dark:text-gray-600"
				/>
				<p class="text-sm font-medium text-gray-900 dark:text-white">
					Nessun profilo aziendale
				</p>
				<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
					Aggiungi le informazioni aziendali per alimentare
					automaticamente i documenti
				</p>
				<UButton
					class="mt-5"
					icon="i-lucide-plus"
					size="sm"
					:to="`/clients/${clientId}/profiles/new`"
				>
					Aggiungi profilo
				</UButton>
			</div>

			<div v-else class="flex flex-col gap-2">
				<NuxtLink
					v-for="profile in data.profiles"
					:key="profile.id"
					:to="`/clients/${clientId}/profiles/${profile.id}`"
					class="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
				>
					<div>
						<p
							class="text-sm font-medium text-gray-900 dark:text-white"
						>
							{{ profile.company_name ?? "Profilo senza nome" }}
						</p>
						<p class="text-xs text-gray-500 dark:text-gray-400">
							Anno fiscale: {{ profile.tax_year ?? "—" }}
							<span v-if="profile.industry_sector">
								· {{ profile.industry_sector }}</span
							>
						</p>
					</div>
					<UIcon
						name="i-lucide-chevron-right"
						class="size-4 text-gray-400"
					/>
				</NuxtLink>
			</div>
		</template>
	</div>
</template>

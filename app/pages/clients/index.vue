<script setup lang="ts">
definePageMeta({ middleware: "auth" });

const client = useSupabaseClient();

const { data: clients, pending } = await useAsyncData(
	"clients-list",
	async () => {
		const { data, error } = await client
			.from("clients")
			.select("id, name, created_at")
			.order("name");
		if (error) throw error;
		return data ?? [];
	},
	{ server: false },
);
</script>

<template>
	<div class="mx-auto max-w-4xl px-6 py-8">
		<div class="mb-6 flex items-center justify-between">
			<h1 class="text-xl font-semibold text-gray-900 dark:text-white">
				Clienti
			</h1>
			<UButton icon="i-lucide-plus" size="sm" to="/clients/new">
				Nuovo cliente
			</UButton>
		</div>

		<div v-if="pending" class="flex justify-center py-24">
			<UIcon
				name="i-lucide-loader-circle"
				class="size-6 animate-spin text-gray-400"
			/>
		</div>

		<div
			v-else-if="!clients?.length"
			class="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-24 text-center dark:border-gray-700"
		>
			<UIcon
				name="i-lucide-building-2"
				class="mb-3 size-10 text-gray-300 dark:text-gray-600"
			/>
			<p class="text-sm font-medium text-gray-900 dark:text-white">
				Nessun cliente
			</p>
			<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
				Aggiungi il tuo primo cliente per iniziare
			</p>
			<UButton
				class="mt-5"
				icon="i-lucide-plus"
				size="sm"
				to="/clients/new"
			>
				Nuovo cliente
			</UButton>
		</div>

		<div v-else class="flex flex-col gap-2">
			<NuxtLink
				v-for="c in clients"
				:key="c.id"
				:to="`/clients/${c.id}`"
				class="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
			>
				<div class="flex items-center gap-3">
					<div
						class="flex size-8 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900"
					>
						<span
							class="text-xs font-semibold text-primary-700 dark:text-primary-300"
						>
							{{ c.name.charAt(0).toUpperCase() }}
						</span>
					</div>
					<p
						class="text-sm font-medium text-gray-900 dark:text-white"
					>
						{{ c.name }}
					</p>
				</div>
				<UIcon
					name="i-lucide-chevron-right"
					class="size-4 text-gray-400"
				/>
			</NuxtLink>
		</div>
	</div>
</template>

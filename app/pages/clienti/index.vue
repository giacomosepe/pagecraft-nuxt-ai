<script setup lang="ts">
definePageMeta({ middleware: "auth" });

const supabase = useSupabaseClient();

type ClientRow = {
	id: string;
	name: string;
	company_name: string | null;
	status: string;
	created_at: string;
};

const { data: clients, pending } = await useAsyncData(
	"clienti-list",
	async () => {
		const { data, error } = await supabase
			.from("clients")
			.select("id, name, company_name, status, created_at")
			.order("name");
		if (error) throw error;
		return (data ?? []) as ClientRow[];
	},
	{ server: false },
);

const statusColor: Record<string, string> = {
	aperto: "primary",
	completato: "success",
};

const statusLabel: Record<string, string> = {
	aperto: "Aperto",
	completato: "Completato",
};
</script>

<template>
	<div class="mx-auto max-w-4xl px-6 py-8">
		<!-- Header -->
		<div class="mb-6 flex items-center justify-between">
			<h1 class="text-xl font-semibold text-(--ui-text-highlighted)">
				Clienti
			</h1>
			<UButton icon="i-lucide-plus" size="sm" to="/clients/new">
				Nuovo cliente
			</UButton>
		</div>

		<!-- Loading -->
		<div v-if="pending" class="flex justify-center py-24">
			<UIcon
				name="i-lucide-loader-circle"
				class="size-6 animate-spin text-(--ui-text-muted)"
			/>
		</div>

		<!-- Empty state -->
		<div
			v-else-if="!clients?.length"
			class="flex flex-col items-center justify-center rounded-xl border border-dashed border-(--ui-border) py-24 text-center"
		>
			<UIcon
				name="i-lucide-building-2"
				class="mb-3 size-10 text-(--ui-text-muted)"
			/>
			<p class="text-sm font-medium text-(--ui-text-highlighted)">
				Nessun cliente
			</p>
			<p class="mt-1 text-sm text-(--ui-text-muted)">
				Aggiungi il tuo primo cliente per iniziare
			</p>
			<UButton class="mt-5" icon="i-lucide-plus" size="sm" to="/clients/new">
				Nuovo cliente
			</UButton>
		</div>

		<!-- Client list -->
		<div v-else class="flex flex-col gap-2">
			<NuxtLink
				v-for="c in clients"
				:key="c.id"
				:to="`/clients/${c.id}`"
				class="flex items-center justify-between rounded-lg border border-(--ui-border) bg-(--ui-bg) px-4 py-3 transition-colors hover:bg-(--ui-bg-elevated)"
			>
				<div class="flex items-center gap-3">
					<UAvatar :alt="c.name" size="sm" />
					<div>
						<p class="text-sm font-medium text-(--ui-text-highlighted)">
							{{ c.name }}
						</p>
						<p
							v-if="c.company_name"
							class="text-xs text-(--ui-text-muted)"
						>
							{{ c.company_name }}
						</p>
					</div>
				</div>
				<div class="flex items-center gap-3">
					<UBadge
						:color="statusColor[c.status] ?? 'neutral'"
						variant="soft"
						size="sm"
					>
						{{ statusLabel[c.status] ?? c.status }}
					</UBadge>
					<UIcon
						name="i-lucide-chevron-right"
						class="size-4 text-(--ui-text-muted)"
					/>
				</div>
			</NuxtLink>
		</div>
	</div>
</template>

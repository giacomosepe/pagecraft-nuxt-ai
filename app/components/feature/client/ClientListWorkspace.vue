<script setup lang="ts">
import type { ClientListItem } from "~/types/app.types";

const props = defineProps<{
	clients?: ClientListItem[] | null;
	pending?: boolean;
}>();

const search = ref("");
const route = useRoute();
const router = useRouter();

const activeFilter = ref<"recenti" | "attivi" | "chiusi" | "tutti">("tutti");

const filters = [
	{ key: "recenti", label: "Recenti", icon: "i-lucide-history" },
	{ key: "attivi", label: "Attivi", icon: "i-lucide-circle-check-big" },
	{ key: "chiusi", label: "Chiusi", icon: "i-lucide-archive" },
	{ key: "tutti", label: "Tutti i clienti", icon: "i-lucide-building-2" },
] as const;

const normalizedClients = computed(() => props.clients ?? []);

watchEffect(() => {
	const status = route.query.status;
	const view = route.query.view;

	if (view === "recenti") {
		activeFilter.value = "recenti";
		return;
	}

	if (status === "aperto") {
		activeFilter.value = "attivi";
		return;
	}

	if (status === "chiuso" || status === "completato") {
		activeFilter.value = "chiusi";
		return;
	}

	activeFilter.value = "tutti";
});

const filteredClients = computed(() => {
	const query = search.value.trim().toLowerCase();

	return normalizedClients.value.filter((client, index) => {
		if (activeFilter.value === "recenti" && index >= 6) return false;
		if (activeFilter.value === "attivi" && client.status !== "aperto")
			return false;
		if (
			activeFilter.value === "chiusi" &&
			!["chiuso", "completato"].includes(client.status)
		) {
			return false;
		}

		if (!query) return true;

		return [client.name, client.company_name, client.industry_sector]
			.filter(Boolean)
			.some((value) => value?.toLowerCase().includes(query));
	});
});

const headerTitle = computed(() => {
	switch (activeFilter.value) {
		case "recenti":
			return "Clienti recenti";
		case "attivi":
			return "Clienti attivi";
		case "chiusi":
			return "Clienti chiusi";
		default:
			return "Clienti";
	}
});

const headerSubtitle = computed(() => {
	const count = filteredClients.value.length;
	if (!count) return "Nessun cliente trovato.";
	return count === 1
		? "1 cliente nella vista corrente."
		: `${count} clienti nella vista corrente.`;
});

async function selectFilter(
	filterKey: "recenti" | "attivi" | "chiusi" | "tutti",
): Promise<void> {
	activeFilter.value = filterKey;

	if (filterKey === "recenti") {
		await router.push({ query: { view: "recenti" } });
		return;
	}

	const query =
		filterKey === "attivi"
			? { status: "aperto" }
			: filterKey === "chiusi"
				? { status: "completato" }
				: {};

	await router.push({ query });
}
</script>

<template>
	<BasePageContainer size="full">
		<BasePageHeader
			:title="headerTitle"
			description="Gestisci i clienti e i loro programmi in un'unica vista."
		>
			<template #actions>
				<UButton
					to="/clients/new"
					icon="i-lucide-plus"
					size="lg"
					class="justify-center rounded-xl px-5"
				>
					Aggiungi cliente
				</UButton>
			</template>
		</BasePageHeader>

		<section class="rounded-[28px] border border-slate-200 bg-white shadow-sm">
			<div class="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
				<div class="flex flex-wrap gap-2">
					<UButton
						v-for="filter in filters"
						:key="filter.key"
						:icon="filter.icon"
						:variant="activeFilter === filter.key ? 'soft' : 'ghost'"
						color="neutral"
						class="rounded-xl"
						@click="selectFilter(filter.key)"
					>
						{{ filter.label }}
					</UButton>
				</div>

				<UInput
					v-model="search"
					icon="i-lucide-search"
					size="lg"
					placeholder="Cerca cliente..."
					class="w-full lg:max-w-sm"
				/>
			</div>

			<div v-if="pending" class="flex flex-col items-center justify-center gap-3 px-6 py-20">
				<UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-slate-400" />
				<p class="text-sm text-slate-500">Caricamento clienti in corso...</p>
			</div>

			<div v-else-if="!filteredClients.length" class="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
				<div class="flex size-14 items-center justify-center rounded-2xl bg-slate-100">
					<UIcon name="i-lucide-building-2" class="size-7 text-slate-400" />
				</div>
				<div class="space-y-1">
					<p class="text-sm font-semibold text-slate-900">Nessun cliente trovato</p>
					<p class="text-sm text-slate-500">
						Prova a cambiare filtro o aggiungi un nuovo cliente.
					</p>
				</div>
			</div>

			<div v-else class="overflow-x-auto">
				<div class="min-w-[860px]">
					<div class="grid grid-cols-[minmax(0,2.4fr)_minmax(120px,1.2fr)_minmax(110px,0.9fr)_minmax(110px,0.9fr)_minmax(120px,0.9fr)] gap-4 bg-slate-50 px-6 py-4 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
						<p>Cliente</p>
						<p>Settore</p>
						<p>Stato</p>
						<p>Programmi</p>
						<p>Ultima attività</p>
					</div>

					<ClientListRow
						v-for="client in filteredClients"
						:key="client.id"
						:client="client"
					/>
				</div>
			</div>
		</section>

		<p class="text-sm text-slate-500">
			{{ headerSubtitle }}
		</p>
	</BasePageContainer>
</template>

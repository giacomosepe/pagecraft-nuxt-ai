<script setup lang="ts">
import type { ProjectListItem } from "~/types/app.types";
import { deriveFolderStatus } from "~/utils/folderStatus";

const props = defineProps<{
	projects?: ProjectListItem[] | null;
	pending?: boolean;
}>();

const route = useRoute();
const router = useRouter();
const search = ref("");

const activeFilter = computed(() => {
	const status = route.query.status as string | undefined;
	switch (status) {
		case "in_attesa":
			return "In attesa";
		case "in_lavorazione":
			return "In lavorazione";
		case "completato":
			return "Completati";
		default:
			return "Tutti i progetti";
	}
});

const headerTitle = computed(() => {
	switch (route.query.status as string | undefined) {
		case "in_attesa":
			return "Progetti in attesa";
		case "in_lavorazione":
			return "Progetti in lavorazione";
		case "completato":
			return "Progetti completati";
		default:
			return "Progetti";
	}
});

const headerSubtitle = computed(() => {
	const count = filteredProjects.value.length;
	if (!count) return "Nessun progetto nella vista corrente.";
	return count === 1
		? "1 progetto nella vista corrente."
		: `${count} progetti nella vista corrente.`;
});

const tabs = [
	{ label: "Tutti i progetti", status: undefined },
	{ label: "In attesa", status: "in_attesa" },
	{ label: "In lavorazione", status: "in_lavorazione" },
	{ label: "Completati", status: "completato" },
] as const;

const filteredProjects = computed(() => {
	const query = search.value.trim().toLowerCase();
	const selectedStatus = route.query.status as string | undefined;

	return (props.projects ?? []).filter((project) => {
		if (
			selectedStatus &&
			deriveFolderStatus(project.pages ?? []) !== selectedStatus
		) {
			return false;
		}

		if (!query) return true;

		return [project.program_name, project.clients?.name]
			.filter(Boolean)
			.some((value) => value?.toLowerCase().includes(query));
	});
});

async function selectTab(status?: string): Promise<void> {
	if (status) {
		await router.push({ query: { status } });
		return;
	}

	await router.push({ query: {} });
}
</script>

<template>
	<BasePageContainer size="full">
		<BasePageHeader
			:title="headerTitle"
			description="Gestisci i programmi e i documenti collegati in un'unica vista."
		>
			<template #actions>
				<UButton
					to="/pages/new"
					icon="i-lucide-plus"
					size="lg"
					class="rounded-xl px-5"
				>
					Nuovo programma
				</UButton>
			</template>
		</BasePageHeader>

		<section class="rounded-[28px] border border-slate-200 bg-white shadow-sm">
			<div class="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
				<div class="flex flex-wrap gap-2">
					<UButton
						v-for="tab in tabs"
						:key="tab.label"
						color="neutral"
						:variant="activeFilter === tab.label ? 'soft' : 'ghost'"
						class="rounded-xl"
						@click="selectTab(tab.status)"
					>
						{{ tab.label }}
					</UButton>
				</div>

				<UInput
					v-model="search"
					icon="i-lucide-search"
					size="lg"
					placeholder="Cerca progetto o cliente..."
					class="w-full lg:max-w-sm"
				/>
			</div>

			<div v-if="pending" class="flex flex-col items-center justify-center gap-3 px-6 py-20">
				<UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-slate-400" />
				<p class="text-sm text-slate-500">Caricamento progetti in corso...</p>
			</div>

			<div v-else-if="!filteredProjects.length" class="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
				<div class="flex size-14 items-center justify-center rounded-2xl bg-slate-100">
					<UIcon name="i-lucide-folder-open" class="size-7 text-slate-400" />
				</div>
				<div class="space-y-1">
					<p class="text-sm font-semibold text-slate-900">Nessun progetto trovato</p>
					<p class="text-sm text-slate-500">
						Prova a cambiare filtro o crea un nuovo programma.
					</p>
				</div>
			</div>

			<div v-else class="overflow-x-auto">
				<div class="min-w-[980px]">
					<div class="grid grid-cols-[minmax(0,2.2fr)_minmax(140px,1.1fr)_minmax(180px,1.1fr)_minmax(125px,0.9fr)_minmax(120px,0.85fr)] gap-4 bg-slate-50 px-6 py-4 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
						<p>Progetto</p>
						<p>Cliente</p>
						<p>Documenti</p>
						<p>Stato</p>
						<p>Modificato</p>
					</div>

					<ProjectListRow
						v-for="project in filteredProjects"
						:key="project.id"
						:project="project"
					/>
				</div>
			</div>
		</section>

		<p class="text-sm text-slate-500">
			{{ headerSubtitle }}
		</p>
	</BasePageContainer>
</template>

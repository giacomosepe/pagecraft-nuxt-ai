<script setup lang="ts">
import type { ProjectListItem } from "~/types/app.types";
import { deriveFolderStatus } from "~/utils/folderStatus";
import { projectListCols } from "~/utils/listLayout";

const props = defineProps<{
	projects?: ProjectListItem[] | null;
	pending?: boolean;
	refreshProjects?: () => Promise<unknown>;
}>();

const route = useRoute();
const router = useRouter();
const search = ref("");
const deleteDialogOpen = ref(false);
const deleteTarget = ref<ProjectListItem | null>(null);
const isDeleting = ref(false);
const feedback = ref<{
	tone: "success" | "error";
	title: string;
	description: string;
} | null>(null);
const transitionNotice = computed(() => {
	if (route.query.deleted === "project") {
		return {
			title: "Progetto eliminato",
			description: "Il progetto e stato rimosso correttamente dall'area progetti.",
		};
	}

	return null;
});
const activeNotice = computed(() => feedback.value ?? transitionNotice.value);

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

const normalizedProjects = computed(() => props.projects ?? []);
const showLoadingState = computed(
	() => Boolean(props.pending) && normalizedProjects.value.length === 0,
);

const filteredProjects = computed(() => {
	const query = search.value.trim().toLowerCase();
	const selectedStatus = route.query.status as string | undefined;

	return normalizedProjects.value.filter((project) => {
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

const deleteDescription = computed(() => {
	if (!deleteTarget.value) return "";
	const title = deleteTarget.value.program_name ?? "questo progetto";
	return `Il progetto "${title}" e tutti i documenti collegati verranno eliminati definitivamente. Questa azione non puo essere annullata.`;
});

async function selectTab(status?: string): Promise<void> {
	if (status) {
		await router.push({ query: { status } });
		return;
	}

	await router.push({ query: {} });
}

function requestDelete(project: ProjectListItem): void {
	feedback.value = null;
	deleteTarget.value = project;
	deleteDialogOpen.value = true;
}

async function confirmDelete(): Promise<void> {
	if (!deleteTarget.value) return;

	isDeleting.value = true;

	try {
		await $fetch("/api/db/delete", {
			method: "POST",
			body: {
				entity: "project",
				id: deleteTarget.value.id,
			},
		});

		await props.refreshProjects?.();

		feedback.value = {
			tone: "success",
			title: "Progetto eliminato",
			description: "Il progetto e i documenti collegati sono stati rimossi correttamente.",
		};
		deleteDialogOpen.value = false;
		deleteTarget.value = null;
	}
	catch {
		feedback.value = {
			tone: "error",
			title: "Eliminazione non riuscita",
			description: "Non siamo riusciti a eliminare il progetto. Riprova tra qualche istante.",
		};
	}
	finally {
		isDeleting.value = false;
	}
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
					Nuovo progetto
				</UButton>
			</template>
		</BasePageHeader>

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

		<BaseWorkspaceSurface>
			<template #toolbar>
				<div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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
			</template>

			<BaseStateMessage
				v-if="showLoadingState"
				loading
				title="Caricamento progetti in corso..."
			/>

			<BaseStateMessage
				v-else-if="!filteredProjects.length"
				icon="i-lucide-folder-open"
				title="Nessun progetto trovato"
				description="Prova a cambiare filtro o crea un nuovo progetto."
			/>

			<div v-else class="overflow-x-auto">
				<div class="min-w-[940px]">
					<div class="grid gap-4 bg-slate-50 px-6 py-4 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500" :class="projectListCols">
						<p>Progetto</p>
						<p>Cliente</p>
						<p>Documenti</p>
						<p>Stato</p>
						<p>Modificato</p>
						<p class="text-right">Azioni</p>
					</div>

					<ProjectListRow
						v-for="project in filteredProjects"
						:key="project.id"
						:project="project"
						:delete-loading="isDeleting && deleteTarget?.id === project.id"
						@delete="requestDelete"
					/>
				</div>
			</div>
		</BaseWorkspaceSurface>

		<p class="text-sm text-slate-500">
			{{ headerSubtitle }}
		</p>

		<BaseConfirmDialog
			v-model:open="deleteDialogOpen"
			title="Eliminare il progetto?"
			:description="deleteDescription"
			confirm-label="Elimina progetto"
			:loading="isDeleting"
			@confirm="confirmDelete"
		/>
	</BasePageContainer>
</template>

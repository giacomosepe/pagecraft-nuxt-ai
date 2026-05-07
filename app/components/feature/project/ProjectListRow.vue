<script setup lang="ts">
import type { ProjectListItem } from "~/types/app.types";
import { formatDate } from "~/utils/date";
import { deriveFolderStatus } from "~/utils/folderStatus";
import { statusLabel } from "~/utils/status";

const props = defineProps<{
	project: ProjectListItem;
	deleteLoading?: boolean;
	showClient?: boolean;
	showActions?: boolean;
	showYear?: boolean;
}>();

const emit = defineEmits<{
	delete: [project: ProjectListItem];
}>();

const router = useRouter();

const documentCount = computed((): number => props.project.pages?.length ?? 0);

const primaryPage = computed(() => props.project.pages?.[0] ?? null);

const completedCount = computed((): number =>
	(props.project.pages ?? []).filter((page) => page.status === "completato").length,
);

const projectStatus = computed((): string =>
	deriveFolderStatus(props.project.pages ?? []),
);

const statusTone = computed((): string => {
	switch (projectStatus.value) {
		case "completato":
			return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
		case "in_attesa":
			return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
		default:
			return "bg-blue-50 text-blue-700 ring-1 ring-blue-200";
	}
});

const lastActivity = computed((): string => {
	const pageDates = props.project.pages?.map((page) => page.updated_at) ?? [];
	const latest = [props.project.updated_at, ...pageDates].reduce((max, value) =>
		new Date(value) > new Date(max) ? value : max,
	);
	return formatDate(latest);
});

const typeLabel = computed((): string => {
	const programName = props.project.program_name?.toLowerCase() ?? "";
	if (programName.includes("patent box")) return "Nuovo Patent Box";
	return "Relazione Tecnica";
});

const secondaryColumnLabel = computed((): string => {
	if (props.showYear) return primaryPage.value?.tax_year?.toString() ?? "—";
	return props.project.clients?.name ?? "—";
});

const secondaryColumnHint = computed((): string => {
	if (props.showYear) return primaryPage.value?.title ?? "Anno fiscale";
	return "";
});

function openProject(): void {
	router.push(`/folders/${props.project.id}`);
}

function handleDeleteClick(event: MouseEvent): void {
	event.stopPropagation();
	emit("delete", props.project);
}
</script>

<template>
	<div
		class="grid w-full grid-cols-[minmax(0,2.2fr)_minmax(140px,1.1fr)_minmax(180px,1.1fr)_minmax(125px,0.9fr)_minmax(120px,0.85fr)_72px] items-center gap-4 border-t border-slate-200 px-6 py-4 transition-colors hover:bg-slate-50"
	>
		<div
			class="interactive-row col-span-5 grid grid-cols-[minmax(0,2.2fr)_minmax(140px,1.1fr)_minmax(180px,1.1fr)_minmax(125px,0.9fr)_minmax(120px,0.85fr)] items-center gap-4 text-left"
			role="button"
			tabindex="0"
			@click="openProject"
			@keydown.enter="openProject"
			@keydown.space.prevent="openProject"
		>
			<div class="flex min-w-0 items-start gap-3">
			<div class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
				<UIcon name="i-lucide-file-text" class="size-4" />
			</div>
			<div class="min-w-0">
				<p class="truncate text-sm font-semibold text-slate-900">
					{{ project.program_name ?? "Programma senza nome" }}
				</p>
				<p class="truncate text-xs text-slate-500">
					{{ typeLabel }}
				</p>
			</div>
		</div>

		<div v-if="showClient !== false || showYear" class="min-w-0">
			<p class="truncate text-sm text-slate-600">
				{{ secondaryColumnLabel }}
			</p>
			<p v-if="secondaryColumnHint" class="truncate text-xs text-slate-400">
				{{ secondaryColumnHint }}
			</p>
		</div>

		<p class="text-sm text-slate-600">
			{{ completedCount }} / {{ documentCount }} documenti
		</p>

		<div>
			<span
				class="inline-flex rounded-full px-3 py-1 text-xs font-medium"
				:class="statusTone"
			>
				{{ statusLabel[projectStatus] ?? projectStatus }}
			</span>
		</div>

		<p class="text-sm text-slate-500">
			{{ lastActivity }}
		</p>
		</div>

		<div v-if="showActions !== false" class="flex justify-end">
			<UButton
				color="error"
				variant="soft"
				icon="i-lucide-trash-2"
				class="rounded-xl"
				:loading="deleteLoading"
				@click="handleDeleteClick"
			/>
		</div>
	</div>
</template>

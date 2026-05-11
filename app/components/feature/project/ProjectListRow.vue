<script setup lang="ts">
import type { ProjectListItem } from "~/types/app.types";
import { formatDate } from "~/utils/date";
import { deriveFolderStatus } from "~/utils/folderStatus";
import { projectListCols } from "~/utils/listLayout";
import { statusLabel, statusToneClass } from "~/utils/status";
import { DOCUMENT_STATUS } from "~/utils/statuses";

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
	(props.project.pages ?? []).filter((page) => page.status === DOCUMENT_STATUS.COMPLETED).length,
);

const projectStatus = computed((): string =>
	deriveFolderStatus(props.project.pages ?? []),
);

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
		class="interactive-row grid w-full items-center gap-4 border-t border-slate-200 px-6 py-4 text-left transition-colors hover:bg-slate-50"
		:class="projectListCols"
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

		<div class="min-w-0">
			<template v-if="showClient !== false || showYear">
				<p class="truncate text-sm text-slate-600">
					{{ secondaryColumnLabel }}
				</p>
				<p v-if="secondaryColumnHint" class="truncate text-xs text-slate-400">
					{{ secondaryColumnHint }}
				</p>
			</template>
		</div>

		<p class="text-sm text-slate-600">
			{{ completedCount }} / {{ documentCount }} documenti
		</p>

		<div>
			<span
				class="inline-flex rounded-full px-3 py-1 text-xs font-medium"
				:class="statusToneClass(projectStatus)"
			>
				{{ statusLabel[projectStatus] ?? projectStatus }}
			</span>
		</div>

		<p class="text-sm text-slate-500">
			{{ lastActivity }}
		</p>

		<div class="flex justify-end">
			<UButton
				v-if="showActions !== false"
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

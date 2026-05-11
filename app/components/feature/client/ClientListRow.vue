<script setup lang="ts">
import type { ClientListItem } from "~/types/app.types";
import { formatDate } from "~/utils/date";
import { clientListCols } from "~/utils/listLayout";
import { statusLabel, statusToneClass } from "~/utils/status";
import { CLIENT_STATUS } from "~/utils/statuses";

const props = defineProps<{
	client: ClientListItem;
	deleteLoading?: boolean;
}>();

const emit = defineEmits<{
	delete: [client: ClientListItem];
}>();

const router = useRouter();

const initials = computed((): string => {
	const source = props.client.company_name || props.client.name;
	const words = source
		.trim()
		.split(/\s+/)
		.filter((word) => word.length > 1);

	if (words.length >= 2) {
		return `${words[0]?.[0] ?? ""}${words[1]?.[0] ?? ""}`.toUpperCase();
	}

	return source.slice(0, 2).toUpperCase();
});

const displayName = computed((): string =>
	props.client.company_name || props.client.name,
);

const subtitle = computed((): string | null =>
	props.client.company_name ? props.client.name : null,
);

const projectCount = computed((): number => props.client.folders?.length ?? 0);

const lastActivity = computed((): string => {
	const folderDates =
		props.client.folders?.flatMap((folder) => {
			const pageDates = folder.pages?.map((page) => page.updated_at) ?? [];
			return [folder.updated_at, ...pageDates];
		}) ?? [];

	const latest = [props.client.updated_at, ...folderDates].reduce((max, value) =>
		new Date(value) > new Date(max) ? value : max,
	);

	return formatDate(latest);
});

const statusText = computed((): string => {
	if (props.client.status === CLIENT_STATUS.OPEN) return "Attivo";
	if (props.client.status === CLIENT_STATUS.CLOSED) return "Chiuso";
	return statusLabel[props.client.status] ?? props.client.status;
});

const projectsLabel = computed((): string =>
	projectCount.value === 1 ? "1 programma" : `${projectCount.value} programmi`,
);

function navigate(): void {
	router.push(`/clients/${props.client.id}`);
}

function handleDeleteClick(event: MouseEvent): void {
	event.stopPropagation();
	emit("delete", props.client);
}
</script>

<template>
	<div
		class="interactive-row grid w-full items-center gap-4 border-t border-slate-200 px-6 py-4 text-left transition-colors hover:bg-slate-50"
		:class="clientListCols"
		role="button"
		tabindex="0"
		@click="navigate"
		@keydown.enter="navigate"
		@keydown.space.prevent="navigate"
	>
		<div class="flex min-w-0 items-center gap-3">
			<div
				class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-semibold text-slate-500"
			>
				{{ initials }}
			</div>

			<div class="min-w-0">
				<div class="flex items-center gap-2">
					<p class="truncate text-sm font-semibold text-slate-900">
						{{ displayName }}
					</p>
				</div>
				<p
					v-if="subtitle"
					class="truncate text-xs text-slate-500"
				>
					{{ subtitle }}
				</p>
			</div>
		</div>

		<p class="truncate text-sm text-slate-600">
			{{ client.industry_sector || "—" }}
		</p>

		<div>
			<span
				class="inline-flex rounded-full px-3 py-1 text-xs font-medium"
				:class="statusToneClass(props.client.status)"
			>
				{{ statusText }}
			</span>
		</div>

		<p class="text-sm text-slate-600">
			{{ projectsLabel }}
		</p>

		<p class="text-sm text-slate-500">
			{{ lastActivity }}
		</p>

		<div class="flex justify-end">
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

<script setup lang="ts">
import type { ClientListItem } from "~/types/app.types";
import { formatDate } from "~/utils/date";
import { statusLabel } from "~/utils/status";

const props = defineProps<{
	client: ClientListItem;
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

const statusTone = computed((): string => {
	switch (props.client.status) {
		case "aperto":
			return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
		case "chiuso":
		case "completato":
			return "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
		default:
			return "bg-blue-50 text-blue-700 ring-1 ring-blue-200";
	}
});

const statusText = computed((): string => {
	if (props.client.status === "aperto") return "Attivo";
	if (props.client.status === "chiuso") return "Chiuso";
	return statusLabel[props.client.status] ?? props.client.status;
});

const projectsLabel = computed((): string =>
	projectCount.value === 1 ? "1 programma" : `${projectCount.value} programmi`,
);

function navigate(): void {
	router.push(`/clients/${props.client.id}`);
}
</script>

<template>
	<button
		type="button"
		class="grid w-full grid-cols-[minmax(0,2.4fr)_minmax(120px,1.2fr)_minmax(110px,0.9fr)_minmax(110px,0.9fr)_minmax(120px,0.9fr)] items-center gap-4 border-t border-slate-200 px-6 py-4 text-left transition-colors hover:bg-slate-50"
		@click="navigate"
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
				:class="statusTone"
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
	</button>
</template>

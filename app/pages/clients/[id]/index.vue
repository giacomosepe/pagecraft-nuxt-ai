<script setup lang="ts">
import type { TableColumn, TableRow } from "@nuxt/ui";
import { formatDate } from "~/utils/date";
import { deriveFolderStatus } from "~/utils/folderStatus";
import { statusColor, statusLabel } from "~/utils/status";
import type { ClientDetail, FolderItem, FolderTableRow } from "~/types/app.types";

definePageMeta({ middleware: "auth" });

const supabase = useSupabaseClient();
const route = useRoute();
const clientId = route.params.id as string;

const { data, pending } = await useAsyncData(
	`client-${clientId}`,
	async () => {
		const { data, error } = await supabase
			.from("clients")
			.select(
				"id, name, status, updated_at, folders(id, program_name, updated_at, pages(id, status, updated_at))",
			)
			.eq("id", clientId)
			.single();
		if (error) throw error;
		return data as ClientDetail;
	},
	{ server: false },
);

// --- Status control ---

const statusOptions = [
	{ label: "Aperto", value: "aperto" },
	{ label: "Completato", value: "completato" },
];

const clientStatus = ref<string>("");
watchEffect(() => {
	clientStatus.value = data.value?.status ?? "";
});

async function onStatusChange(val: unknown): Promise<void> {
	const newStatus = val as string;
	clientStatus.value = newStatus;
	await $fetch("/api/db/mutate", {
		method: "POST",
		body: {
			table: "clients",
			operation: "update",
			data: { status: newStatus },
			where: { id: clientId },
		},
	});
}

// --- Derived folder helpers ---

function lastModified(folder: FolderItem): string {
	const pages = folder.pages ?? [];
	if (!pages.length) return formatDate(folder.updated_at);
	const latest = pages.reduce(
		(max, p) =>
			new Date(p.updated_at) > new Date(max) ? p.updated_at : max,
		pages[0].updated_at,
	);
	return formatDate(latest);
}

function documenti(folder: FolderItem): string {
	const pages = folder.pages ?? [];
	const completed = pages.filter((p) => p.status === "completato").length;
	return `${completed} / ${pages.length}`;
}

// --- Table ---

const tableData = computed<FolderTableRow[]>(() =>
	(data.value?.folders ?? []).map((f) => ({
		id: f.id,
		programName: f.program_name ?? "—",
		documenti: documenti(f),
		lastModified: lastModified(f),
		status: deriveFolderStatus(f.pages ?? []),
	})),
);

const columns: TableColumn<FolderTableRow>[] = [
	{ accessorKey: "programName", header: "Programma" },
	{ accessorKey: "documenti", header: "Documenti" },
	{ accessorKey: "lastModified", header: "Ultima modifica" },
	{ accessorKey: "status", header: "Stato" },
	{ accessorKey: "id", header: "" },
];

const tableMeta = { class: { tr: "cursor-pointer" } };

function onSelect(_e: Event, row: TableRow<FolderTableRow>): void {
	navigateTo(`/folders/${row.original.id}`);
}
</script>

<template>
	<div class="mx-auto max-w-5xl px-6 py-8">
		<!-- Loading -->
		<div v-if="pending" class="flex justify-center py-24">
			<UIcon
				name="i-lucide-loader-circle"
				class="size-6 animate-spin text-(--ui-text-muted)"
			/>
		</div>

		<!-- Not found -->
		<div
			v-else-if="!data"
			class="flex flex-col items-center justify-center py-24 text-center"
		>
			<UIcon
				name="i-lucide-circle-alert"
				class="mb-3 size-9 text-(--ui-text-muted)"
			/>
			<p class="text-sm font-medium text-(--ui-text-highlighted)">
				Cliente non trovato
			</p>
			<NuxtLink
				to="/clienti"
				class="mt-3 text-sm text-primary-500 hover:underline"
			>
				Torna ai clienti
			</NuxtLink>
		</div>

		<template v-else>
			<!-- Header -->
			<div class="mb-8 flex items-start justify-between gap-4">
				<div>
					<h1
						class="text-xl font-semibold text-(--ui-text-highlighted)"
					>
						{{ data.name }}
					</h1>
					<p class="mt-1 text-sm text-(--ui-text-muted)">
						{{ data.folders?.length ?? 0 }} programmi · ultimo aggiornamento
						{{ formatDate(data.updated_at) }}
					</p>
					<USelect
						:model-value="clientStatus"
						:items="statusOptions"
						size="sm"
						class="mt-3 w-44"
						@update:model-value="onStatusChange"
					/>
				</div>
				<div class="flex shrink-0 items-center gap-2">
					<UButton
						variant="outline"
						color="neutral"
						size="sm"
						:to="`/clients/${clientId}/edit`"
					>
						Modifica profilo
					</UButton>
					<UButton
						icon="i-lucide-plus"
						size="sm"
						:to="`/pages/new?clientId=${clientId}`"
					>
						Nuovo programma
					</UButton>
				</div>
			</div>

			<!-- Programmi table -->
			<UTable
				:data="tableData"
				:columns="columns"
				:meta="tableMeta"
				:on-select="onSelect"
			>
				<template #status-cell="{ row }">
					<UBadge
						:color="statusColor[row.original.status] ?? 'neutral'"
						variant="soft"
						size="sm"
					>
						{{ statusLabel[row.original.status] ?? row.original.status }}
					</UBadge>
				</template>
				<template #id-cell="{ row }">
					<NuxtLink
						:to="`/folders/${row.original.id}`"
						class="text-sm text-(--ui-text-muted) transition-colors hover:text-(--ui-text)"
						@click.stop
					>
						Apri →
					</NuxtLink>
				</template>
			</UTable>
		</template>
	</div>
</template>

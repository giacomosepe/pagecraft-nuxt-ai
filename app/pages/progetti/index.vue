<script setup lang="ts">
import type { TableColumn, TableRow } from "@nuxt/ui";
import { statusColor, statusLabel } from "~/utils/status";
import { deriveFolderStatus } from "~/utils/folderStatus";

definePageMeta({ middleware: "auth" });

const supabase = useSupabaseClient();
const route = useRoute();
const router = useRouter();

type PageItem = { id: string; status: string; updated_at: string };
type FolderItem = {
	id: string;
	program_name: string | null;
	updated_at: string;
	client_id: string | null;
	clients: { id: string; name: string } | null;
	pages: PageItem[] | null;
};

type RowItem = {
	id: string;
	programName: string;
	clientName: string;
	documenti: string;
	lastModified: string;
	status: string;
};

const { data } = await useAsyncData(
	"progetti",
	async () => {
		const { data, error } = await supabase
			.from("folders")
			.select(
				"id, program_name, updated_at, client_id, clients(id, name), pages(id, status, updated_at)",
			)
			.order("updated_at", { ascending: false });
		if (error) throw error;
		return data as FolderItem[];
	},
	{ server: false },
);

const statusFilter = computed(() => (route.query.status as string) || "");
const search = ref("");

const pageTitle = computed(() => {
	switch (statusFilter.value) {
		case "in_attesa":
			return "Progetti in attesa";
		case "in_lavorazione":
			return "Progetti in lavorazione";
		case "completato":
			return "Progetti completati";
		case "archiviato":
			return "Progetti archiviati";
		default:
			return "Tutti i progetti";
	}
});

function formatDate(iso: string): string {
	const months = [
		"Gen",
		"Feb",
		"Mar",
		"Apr",
		"Mag",
		"Giu",
		"Lug",
		"Ago",
		"Set",
		"Ott",
		"Nov",
		"Dic",
	];
	const d = new Date(iso);
	return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

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

const filtered = computed(() => {
	let list = (data.value ?? []).map((f) => ({
		...f,
		derivedStatus: deriveFolderStatus(f.pages ?? []),
	}));
	if (statusFilter.value)
		list = list.filter((f) => f.derivedStatus === statusFilter.value);
	if (search.value) {
		const q = search.value.toLowerCase();
		list = list.filter(
			(f) =>
				f.program_name?.toLowerCase().includes(q) ||
				f.clients?.name?.toLowerCase().includes(q),
		);
	}
	return list;
});

const tableData = computed<RowItem[]>(() =>
	filtered.value.map((f) => ({
		id: f.id,
		programName: f.program_name ?? "—",
		clientName: f.clients?.name ?? "—",
		documenti: documenti(f),
		lastModified: lastModified(f),
		status: f.derivedStatus,
	})),
);

const columns: TableColumn<RowItem>[] = [
	{ accessorKey: "programName", header: "Progetto" },
	{ accessorKey: "clientName", header: "Cliente" },
	{ accessorKey: "documenti", header: "Documenti" },
	{ accessorKey: "lastModified", header: "Ultima modifica" },
	{ accessorKey: "status", header: "Stato" },
];

const tableMeta = { class: { tr: "cursor-pointer" } };

function onSelect(_e: Event, row: TableRow<RowItem>): void {
	navigateTo(`/folders/${row.original.id}`);
}
</script>

<template>
	<BasePageContainer size="xl">
		<BasePageHeader
			:title="pageTitle"
			description="Segui lo stato dei programmi e apri rapidamente i documenti collegati."
		>
			<template #actions>
				<UInput
					v-model="search"
					placeholder="Cerca progetto o cliente..."
					icon="i-lucide-search"
					size="lg"
					class="w-full sm:w-80"
				/>
				<UButton icon="i-lucide-plus" size="lg" to="/pages/new">
					Nuovo programma
				</UButton>
			</template>
		</BasePageHeader>

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
		</UTable>
	</BasePageContainer>
</template>

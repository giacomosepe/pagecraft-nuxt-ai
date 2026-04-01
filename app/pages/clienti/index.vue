<script setup lang="ts">
import type { TableColumn, TableRow } from "@nuxt/ui";

definePageMeta({ middleware: "auth" });

const supabase = useSupabaseClient();
const route = useRoute();
const router = useRouter();

type PageItem = { id: string; updated_at: string };
type FolderItem = {
	id: string;
	updated_at: string;
	pages: PageItem[] | null;
};
type ClientItem = {
	id: string;
	name: string;
	status: string;
	updated_at: string;
	folders: FolderItem[] | null;
};

type RowItem = {
	id: string;
	name: string;
	status: string;
	programCount: number;
	documentCount: number;
	lastModified: string;
};

const { data } = await useAsyncData(
	"clienti",
	async () => {
		const { data, error } = await supabase
			.from("clients")
			.select(
				"id, name, status, updated_at, folders(id, updated_at, pages(id, updated_at))",
			)
			.order("updated_at", { ascending: false });
		if (error) throw error;
		return data as ClientItem[];
	},
	{ server: false },
);

const statusFilter = computed(() => (route.query.status as string) || "");
const search = ref("");

const pageTitle = computed(() => {
	if (statusFilter.value === "aperto") return "Clienti aperti";
	if (statusFilter.value === "completato") return "Clienti completati";
	return "Tutti i clienti";
});

const showNewButton = computed(() => statusFilter.value !== "completato");
const showFilterChips = computed(() => !statusFilter.value);

function programCount(client: ClientItem): number {
	return client.folders?.length ?? 0;
}

function documentCount(client: ClientItem): number {
	return (
		client.folders?.reduce((sum, f) => sum + (f.pages?.length ?? 0), 0) ?? 0
	);
}

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

function lastModified(client: ClientItem): string {
	const allPages = client.folders?.flatMap((f) => f.pages ?? []) ?? [];
	if (!allPages.length) return formatDate(client.updated_at);
	const latest = allPages.reduce(
		(max, p) =>
			new Date(p.updated_at) > new Date(max) ? p.updated_at : max,
		allPages[0].updated_at,
	);
	return formatDate(latest);
}

const filtered = computed(() => {
	let list = data.value ?? [];
	if (statusFilter.value)
		list = list.filter((c) => c.status === statusFilter.value);
	if (search.value)
		list = list.filter((c) =>
			c.name.toLowerCase().includes(search.value.toLowerCase()),
		);
	return list;
});

const tableData = computed<RowItem[]>(() =>
	filtered.value.map((c) => ({
		id: c.id,
		name: c.name,
		status: c.status,
		programCount: programCount(c),
		documentCount: documentCount(c),
		lastModified: lastModified(c),
	})),
);

const columns: TableColumn<RowItem>[] = [
	{ accessorKey: "name", header: "Cliente" },
	{ accessorKey: "programCount", header: "Programmi" },
	{ accessorKey: "documentCount", header: "Documenti" },
	{ accessorKey: "lastModified", header: "Ultima modifica" },
	{ accessorKey: "status", header: "Stato" },
];

const tableMeta = { class: { tr: "cursor-pointer" } };

function onSelect(_e: Event, row: TableRow<RowItem>): void {
	navigateTo(`/clients/${row.original.id}`);
}
</script>

<template>
	<div class="mx-auto max-w-5xl px-6 py-8">
		<!-- Header -->
		<div class="mb-4 flex items-center justify-between gap-4">
			<h1 class="text-xl font-semibold text-(--ui-text-highlighted)">
				{{ pageTitle }}
			</h1>
			<div class="flex items-center gap-3">
				<UInput
					v-model="search"
					placeholder="Cerca cliente..."
					icon="i-lucide-search"
				/>
				<UButton
					v-if="showNewButton"
					icon="i-lucide-plus"
					size="sm"
					to="/clients/new"
				>
					Nuovo cliente
				</UButton>
			</div>
		</div>

		<!-- Filter chips — Tutti view only -->
		<div v-if="showFilterChips" class="mb-4 flex gap-2">
			<UButton
				variant="soft"
				color="neutral"
				size="sm"
				@click="router.push('/clienti')"
			>
				Tutti
			</UButton>
			<UButton
				variant="soft"
				color="neutral"
				size="sm"
				@click="router.push('/clienti?status=aperto')"
			>
				Aperti
			</UButton>
			<UButton
				variant="soft"
				color="neutral"
				size="sm"
				@click="router.push('/clienti?status=completato')"
			>
				Completati
			</UButton>
		</div>

		<!-- Table -->
		<UTable
			:data="tableData"
			:columns="columns"
			:meta="tableMeta"
			:on-select="onSelect"
		>
			<template #status-cell="{ row }">
				<UBadge
					:color="row.original.status === 'completato' ? 'success' : 'primary'"
					variant="soft"
					size="sm"
				>
					{{ row.original.status === "completato" ? "Completato" : "Aperto" }}
				</UBadge>
			</template>
		</UTable>
	</div>
</template>

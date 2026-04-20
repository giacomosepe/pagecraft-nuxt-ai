<script setup lang="ts">
import { formatDate } from "~/utils/date";

definePageMeta({ middleware: "auth" });

const route = useRoute();
const clientId = route.params.id as string;

const { data, folders, pending, updateStatus } = useClient(clientId);

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
	await updateStatus(val as string);
}

const summaryItems = computed(() => {
	const foldersCount = data.value?.folders?.length ?? 0;
	const documentsCount =
		data.value?.folders?.reduce(
			(total, folder) => total + (folder.pages?.length ?? 0),
			0,
		) ?? 0;

	return [
		{ label: "Programmi", value: String(foldersCount) },
		{ label: "Documenti", value: String(documentsCount) },
		{
			label: "Ultimo aggiornamento",
			value: data.value ? formatDate(data.value.updated_at) : "—",
		},
	];
});
</script>

<template>
	<BasePageContainer size="xl">
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
			<BasePageHeader
				:title="data.name"
				description="Panoramica del cliente e dei programmi attivi."
			>
				<template #meta>
					<p class="text-sm text-(--ui-text-muted)">
						{{ data.folders?.length ?? 0 }} programmi · ultimo
						aggiornamento
						{{ formatDate(data.updated_at) }}
					</p>
					<USelect
						:model-value="clientStatus"
						:items="statusOptions"
						size="sm"
						class="mt-3 w-44"
						@update:model-value="onStatusChange"
					/>
				</template>

				<template #actions>
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
				</template>
			</BasePageHeader>

			<BaseDetailSection
				title="Panoramica"
				description="Metriche rapide per orientarsi prima di entrare nei singoli programmi."
				class="mb-6"
			>
				<div class="grid gap-4 md:grid-cols-3">
					<div
						v-for="item in summaryItems"
						:key="item.label"
						class="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4"
					>
						<p
							class="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400"
						>
							{{ item.label }}
						</p>
						<p class="mt-2 text-2xl font-semibold text-slate-900">
							{{ item.value }}
						</p>
					</div>
				</div>
			</BaseDetailSection>

			<FolderTable :folders="folders" />
		</template>
	</BasePageContainer>
</template>

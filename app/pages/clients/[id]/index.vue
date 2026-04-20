<script setup lang="ts">
import { formatDate } from "~/utils/date";

definePageMeta({ middleware: "auth" });

const route = useRoute();
const clientId = route.params.id as string;
const router = useRouter();

const { data, folders, pending, updateStatus } = useClient(clientId);
const deleteDialogOpen = ref(false);
const isDeleting = ref(false);
const deleteError = ref<string | null>(null);

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
		{ label: "Progetti", value: String(foldersCount) },
		{ label: "Documenti", value: String(documentsCount) },
		{
			label: "Ultimo aggiornamento",
			value: data.value ? formatDate(data.value.updated_at) : "—",
		},
	];
});

const transitionNotice = computed(() => {
	if (route.query.created === "client") {
		return {
			title: "Cliente creato",
			description: "Il cliente e stato creato correttamente. Puoi completare i dettagli o avviare subito un nuovo progetto.",
		};
	}

	if (route.query.updated === "client") {
		return {
			title: "Cliente aggiornato",
			description: "Le modifiche sono state salvate correttamente e sono gia disponibili nelle viste collegate.",
		};
	}

	return null;
});

async function confirmDeleteClient(): Promise<void> {
	if (!data.value) return;

	isDeleting.value = true;
	deleteError.value = null;

	try {
		await $fetch("/api/db/delete", {
			method: "POST",
			body: {
				entity: "client",
				id: clientId,
			},
		});

		await router.push({ path: "/clienti", query: { deleted: "client" } });
	}
	catch {
		deleteError.value =
			"Non siamo riusciti a eliminare il cliente. Riprova tra qualche istante.";
	}
	finally {
		isDeleting.value = false;
		deleteDialogOpen.value = false;
	}
}
</script>

<template>
	<BasePageContainer size="xl">
		<BaseStateMessage
			v-if="pending"
			loading
			title="Caricamento cliente in corso..."
		/>

		<BaseStateMessage
			v-else-if="!data"
			tone="error"
			icon="i-lucide-circle-alert"
			title="Cliente non trovato"
			description="Il cliente richiesto potrebbe essere stato rimosso o non essere più disponibile."
		>
			<template #actions>
				<UButton variant="ghost" color="neutral" to="/clienti">
					Torna ai clienti
				</UButton>
			</template>
		</BaseStateMessage>

		<template v-else>
			<div class="mb-4">
				<NuxtLink
					to="/clienti"
					class="inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-700"
				>
					<UIcon name="i-lucide-arrow-left" class="size-4" />
					Tutti i clienti
				</NuxtLink>
			</div>

			<BasePageHeader
				:title="data.name"
				description="Panoramica del cliente e dei progetti attivi."
			>
				<template #meta>
					<div class="space-y-2">
						<p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
							Cliente
						</p>
						<div class="flex flex-wrap items-center gap-2 text-sm">
							<USelect
								:model-value="clientStatus"
								:items="statusOptions"
								size="sm"
								class="w-full sm:w-44"
								@update:model-value="onStatusChange"
							/>
							<span class="text-slate-500">
								{{ data.folders?.length ?? 0 }} progetti · ultimo aggiornamento
								{{ formatDate(data.updated_at) }}
							</span>
						</div>
					</div>
				</template>

				<template #actions>
					<div class="flex w-full flex-col gap-2 sm:items-end">
						<div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
							<UButton
								variant="outline"
								color="neutral"
								size="lg"
								class="rounded-xl px-5"
								:to="`/clients/${clientId}/edit`"
							>
								Modifica profilo
							</UButton>
							<UButton
								icon="i-lucide-plus"
								size="lg"
								class="rounded-xl px-5"
								:to="`/pages/new?clientId=${clientId}`"
							>
								Nuovo progetto
							</UButton>
							<UButton
								color="error"
								variant="soft"
								size="lg"
								class="rounded-xl px-5"
								icon="i-lucide-trash-2"
								@click="deleteDialogOpen = true"
							>
								Elimina cliente
							</UButton>
						</div>
						<p class="text-xs text-slate-500 sm:max-w-sm sm:text-right">
							L'eliminazione rimuovera anche i progetti e i documenti collegati.
						</p>
					</div>
				</template>
			</BasePageHeader>

			<UAlert
				v-if="transitionNotice"
				color="success"
				variant="soft"
				icon="i-lucide-circle-check-big"
				:title="transitionNotice.title"
				:description="transitionNotice.description"
				class="mb-6"
			/>

			<UAlert
				v-if="deleteError"
				color="error"
				variant="soft"
				icon="i-lucide-circle-alert"
				title="Eliminazione non riuscita"
				:description="deleteError"
				class="mb-6"
			/>

			<BaseDetailSection
				title="Panoramica"
				description="Metriche rapide per orientarsi prima di entrare nei singoli progetti."
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

			<BaseConfirmDialog
				v-model:open="deleteDialogOpen"
				title="Eliminare il cliente?"
				description="Il cliente, i progetti collegati e tutti i documenti associati verranno eliminati definitivamente. Questa azione non puo essere annullata."
				confirm-label="Elimina cliente"
				:loading="isDeleting"
				@confirm="confirmDeleteClient"
			/>
		</template>
	</BasePageContainer>
</template>

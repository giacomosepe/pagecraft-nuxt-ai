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
			<FolderTable :folders="folders" />
		</template>
	</div>
</template>

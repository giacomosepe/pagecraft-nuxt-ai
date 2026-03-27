<script setup lang="ts">
definePageMeta({ middleware: "auth" });

const client = useSupabaseClient();
const user = useSupabaseUser();

// ─── Step state ────────────────────────────────────────────────────────────
// currentStep goes 0 → 3. Think of it as "which screen are we on?"
const currentStep = ref(0);

// ─── Step 1: Client ────────────────────────────────────────────────────────
const { data: clients } = await useAsyncData(
	"clients-for-new-page",
	async () => {
		const { data, error } = await client
			.from("clients")
			.select("id, name")
			.order("name");
		if (error) throw error;
		return data;
	},
	{ server: false },
);

const selectedClientId = ref<string | null>(null);

const hasClients = computed(() => (clients.value?.length ?? 0) > 0);
const clientItems = computed(() =>
	(clients.value ?? []).map((c) => ({ label: c.name, value: c.id })),
);

// ─── Step 2: Folders ───────────────────────────────────────────────────────
// folders is null until we load them. It reloads every time selectedClientId changes.
const folders = ref<{ id: string; program_name: string }[]>([]);
const foldersLoading = ref(false);
const selectedFolderId = ref<string | null>(null);
const isCreatingFolder = ref(false);
const newFolderName = ref("");

// watch() runs a function whenever a reactive value changes.
// Here: when the user picks a client, we fetch that client's folders.
watch(selectedClientId, async (clientId) => {
	// Reset folder state when client changes
	selectedFolderId.value = null;
	isCreatingFolder.value = false;
	newFolderName.value = "";
	folders.value = [];

	if (!clientId) return;

	foldersLoading.value = true;
	const { data, error } = await client
		.from("folders")
		.select("id, program_name")
		.eq("client_id", clientId)
		.order("program_name");

	foldersLoading.value = false;
	if (!error) folders.value = data ?? [];
});

// ─── Step 3: Framework ─────────────────────────────────────────────────────
const selectedFrameworkId = ref<string | null>(null);
const selectedFrameworkName = ref<string | null>(null);

// Called by the FrameworkPicker component when user picks one
function onFrameworkPicked(id: string, name: string) {
	selectedFrameworkId.value = id;
	selectedFrameworkName.value = name;
}

// ─── Step 4: Title + files ─────────────────────────────────────────────────
// Title pre-fills from framework name, but user can edit it
const title = ref("");
watch(selectedFrameworkName, (name) => {
	if (name && !title.value) title.value = name;
});
</script>

<template>
	<div class="p-5 flex flex-col gap-5">
		<!-- Header -->
		<div>
			<h2 class="text-base font-semibold text-gray-900 dark:text-white">
				Choose a framework
			</h2>
			<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
				The framework defines the structure of your document
			</p>
		</div>

		<!-- Framework list -->
		<div v-if="pending" class="flex justify-center py-6">
			<UIcon
				name="i-lucide-loader-circle"
				class="size-5 animate-spin text-gray-400"
			/>
		</div>

		<div v-else class="flex flex-col gap-2">
			<button
				v-for="fw in frameworks"
				:key="fw.id"
				class="w-full text-left rounded-lg border px-4 py-3 transition-colors"
				:class="
					selected === fw.id
						? 'border-primary-500 bg-primary-50 dark:bg-primary-950 dark:border-primary-400'
						: 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
				"
				@click="selected = fw.id"
			>
				<div class="flex items-start gap-3">
					<!-- Radio indicator -->
					<div
						class="mt-0.5 size-4 rounded-full border-2 flex items-center justify-center shrink-0"
						:class="
							selected === fw.id
								? 'border-primary-500'
								: 'border-gray-300 dark:border-gray-600'
						"
					>
						<div
							v-if="selected === fw.id"
							class="size-1.5 rounded-full bg-primary-500"
						/>
					</div>
					<div>
						<p
							class="text-sm font-medium"
							:class="
								selected === fw.id
									? 'text-primary-700 dark:text-primary-300'
									: 'text-gray-900 dark:text-white'
							"
						>
							{{ fw.name }}
						</p>
						<p
							v-if="fw.description"
							class="mt-0.5 text-xs text-gray-500 dark:text-gray-400"
						>
							{{ fw.description }}
						</p>
					</div>
				</div>
			</button>
		</div>

		<!-- Actions -->
		<div
			class="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800"
		>
			<UButton color="neutral" variant="ghost" @click="emit('cancel')">
				Cancel
			</UButton>
			<UButton :disabled="!selected" @click="confirm">
				Continue →
			</UButton>
		</div>
	</div>
</template>

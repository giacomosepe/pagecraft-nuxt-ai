<script setup lang="ts">
const client = useSupabaseClient();

const emit = defineEmits<{
	select: [frameworkId: string, frameworkSlug: string];
	cancel: [];
}>();

// Load available frameworks — public and not deprecated
const { data: frameworks, pending, error } = await useAsyncData(
	"frameworks",
	async () => {
		const { data, error } = await client
			.from("frameworks")
			.select("id, name, slug, description")
			.eq("is_public", true)
			.is("deprecated_at", null)
			.order("name");
		if (error) throw error;
		return data;
	},
	{ server: false },  // must run client-side so the user session is available
);

const selected = ref<string | null>(null);

function confirm() {
	const fw = frameworks.value?.find((f) => f.id === selected.value);
	if (!fw) return;
	emit("select", fw.id, fw.name); //<!-- changed fw.slug to fw.name -->
}
</script>

<template>
	<SelectionModalLayout
		title="Seleziona un framework"
		description="Scegli la struttura di partenza del documento. La selezione definisce lo scheletro che verrà creato."
	>
		<BaseStateMessage
			v-if="pending"
			loading
			compact
			title="Caricamento framework in corso..."
		/>

		<BaseStateMessage
			v-else-if="error"
			compact
			tone="error"
			icon="i-lucide-circle-alert"
			title="Impossibile caricare i framework"
			description="Chiudi la finestra e riprova tra qualche istante."
		/>

		<BaseStateMessage
			v-else-if="!frameworks?.length"
			compact
			icon="i-lucide-files"
			title="Nessun framework disponibile"
			description="Non ci sono framework selezionabili in questo momento."
		/>

		<div v-else class="space-y-3">
			<button
				v-for="fw in frameworks"
				:key="fw.id"
				type="button"
				class="w-full rounded-[22px] border px-4 py-4 text-left transition-colors"
				:class="
					selected === fw.id
						? 'border-violet-300 bg-violet-50'
						: 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
				"
				@click="selected = fw.id"
			>
				<div class="flex items-start gap-3">
					<div
						class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2"
						:class="
							selected === fw.id
								? 'border-violet-600'
								: 'border-slate-300'
						"
					>
						<div
							v-if="selected === fw.id"
							class="size-2 rounded-full bg-violet-600"
						/>
					</div>
					<div class="space-y-1">
						<p
							class="text-sm font-semibold"
							:class="
								selected === fw.id
									? 'text-violet-700'
									: 'text-slate-900'
							"
						>
							{{ fw.name }}
						</p>
						<p
							v-if="fw.description"
							class="text-sm leading-6 text-slate-500"
						>
							{{ fw.description }}
						</p>
					</div>
				</div>
			</button>
		</div>

		<template #footer>
			<div class="flex justify-end gap-2">
				<UButton color="neutral" variant="ghost" @click="emit('cancel')">
					Annulla
				</UButton>
				<UButton :disabled="!selected || !!error || !frameworks?.length" @click="confirm">
					Continua
				</UButton>
			</div>
		</template>
	</SelectionModalLayout>
</template>

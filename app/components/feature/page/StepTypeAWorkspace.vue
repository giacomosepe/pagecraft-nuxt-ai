<script setup lang="ts">
const props = defineProps<{
	stepId: string;
	templateContent: string;
	isGenerating: boolean;
	actionDisabled: boolean;
}>();

const emit = defineEmits<{
	produce: [appliedRule: string | null];
}>();

const modalOpen = ref(false);

watch(
	() => props.stepId,
	() => {
		modalOpen.value = false;
	},
);
</script>

<template>
	<div class="flex flex-col items-end gap-2 border-t border-slate-200 pt-5">
		<StepTypeAActionButton
			label="Inserisci variabili"
			:loading="isGenerating"
			:disabled="actionDisabled"
			@click="emit('produce', null)"
		/>
		<UButton
			variant="link"
			color="neutral"
			size="sm"
			icon="i-lucide-eye"
			class="px-0 text-slate-600 hover:text-slate-900"
			@click="modalOpen = true"
		>
			Template documento
		</UButton>

		<UModal
			v-model:open="modalOpen"
			:ui="{ content: 'max-w-[min(860px,calc(100vw-32px))]' }"
		>
			<template #content>
				<div class="flex max-h-[82vh] flex-col bg-white">
					<div class="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
						<div>
							<p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
								Template
							</p>
							<h3 class="mt-1 text-base font-semibold text-slate-900">
								Template documento
							</h3>
						</div>
						<UButton
							icon="i-lucide-x"
							color="neutral"
							variant="ghost"
							size="sm"
							aria-label="Chiudi"
							@click="modalOpen = false"
						/>
					</div>
					<div class="flex-1 overflow-y-auto px-5 py-5">
						<p class="whitespace-pre-wrap text-justify text-[12px] leading-7 text-slate-700">
							{{ templateContent }}
						</p>
					</div>
				</div>
			</template>
		</UModal>
	</div>
</template>

<script setup lang="ts">
defineProps<{
	output: string;
	status: string;
	isGenerating: boolean;
	isCommitting: boolean;
	canGoNext: boolean;
}>();

const emit = defineEmits<{
	commit: [];
	discard: [];
	next: [];
}>();
</script>

<template>
	<div class="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
		<div class="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
			<div>
				<p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
					Output generato
				</p>
				<p class="mt-1 text-sm text-slate-500">
					Testo assemblato dai campi compilati per questo step.
				</p>
			</div>
			<StepStatusPill :status="status" />
		</div>

		<p class="whitespace-pre-wrap text-sm leading-7 text-slate-700">
			{{ output }}
		</p>

		<div
			v-if="!isGenerating"
			class="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-4"
		>
			<UButton
				color="neutral"
				variant="ghost"
				size="sm"
				class="rounded-xl"
				@click="emit('discard')"
			>
				Scarta
			</UButton>
			<UButton
				size="sm"
				class="rounded-xl"
				:loading="isCommitting"
				@click="emit('commit')"
			>
				Salva
			</UButton>
			<UButton
				v-if="canGoNext"
				size="sm"
				class="rounded-xl"
				icon="i-lucide-arrow-right"
				trailing
				@click="emit('next')"
			>
				Avanti
			</UButton>
		</div>
	</div>
</template>

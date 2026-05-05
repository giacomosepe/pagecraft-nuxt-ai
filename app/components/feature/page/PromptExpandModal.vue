<script setup lang="ts">
const props = defineProps<{
	open: boolean;
	prompt: string;
}>();

const emit = defineEmits<{
	"update:open": [value: boolean];
	cancel: [];
	save: [value: string];
}>();

const draftPrompt = ref("");

watch(
	() => props.open,
	(isOpen) => {
		if (isOpen) draftPrompt.value = props.prompt;
	},
	{ immediate: true },
);

function cancel(): void {
	draftPrompt.value = props.prompt;
	emit("cancel");
	emit("update:open", false);
}

function save(): void {
	emit("save", draftPrompt.value);
	emit("update:open", false);
}
</script>

<template>
	<UModal
		:open="open"
		:ui="{ content: 'max-w-[min(1120px,calc(100vw-32px))]' }"
		@update:open="emit('update:open', $event)"
	>
		<template #content>
			<div class="flex max-h-[86vh] flex-col bg-white">
				<div class="border-b border-slate-200 px-5 py-4">
					<p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
						Prompt
					</p>
					<h3 class="mt-1 text-base font-semibold text-slate-900">
						Modifica prompt
					</h3>
				</div>

				<div class="flex-1 overflow-hidden px-5 py-5">
					<UTextarea
						v-model="draftPrompt"
						:rows="20"
						class="h-full w-full"
						:ui="{
							base: 'h-full min-h-[420px] w-full resize-none rounded-xl border-slate-200 bg-white px-4 py-3 font-mono text-xs leading-6 text-slate-700 focus:border-violet-300 focus:ring-violet-200',
						}"
					/>
				</div>

				<div class="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
					<UButton
						color="neutral"
						variant="ghost"
						class="rounded-xl"
						@click="cancel"
					>
						Annulla
					</UButton>
					<UButton
						class="rounded-xl"
						@click="save"
					>
						Salva
					</UButton>
				</div>
			</div>
		</template>
	</UModal>
</template>

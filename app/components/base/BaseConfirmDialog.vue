<script setup lang="ts">
const props = withDefaults(
	defineProps<{
		open: boolean;
		title: string;
		description: string;
		confirmLabel?: string;
		cancelLabel?: string;
		loading?: boolean;
	}>(),
	{
		confirmLabel: "Elimina",
		cancelLabel: "Annulla",
		loading: false,
	},
);

const emit = defineEmits<{
	"update:open": [value: boolean];
	confirm: [];
}>();

function closeDialog(): void {
	if (props.loading) return;
	emit("update:open", false);
}
</script>

<template>
	<UModal
		:open="open"
		:ui="{ content: 'max-w-lg' }"
		@update:open="emit('update:open', $event)"
	>
		<template #content>
			<div class="bg-white">
				<div class="border-b border-slate-200 px-5 py-4">
					<p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
						Conferma eliminazione
					</p>
					<h2 class="mt-1 text-lg font-semibold text-slate-900">
						{{ title }}
					</h2>
				</div>

				<div class="px-5 py-5">
					<p class="text-sm leading-6 text-slate-600">
						{{ description }}
					</p>
				</div>

				<div class="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
					<UButton
						color="neutral"
						variant="ghost"
						class="rounded-xl"
						:disabled="loading"
						@click="closeDialog"
					>
						{{ cancelLabel }}
					</UButton>
					<UButton
						color="error"
						class="rounded-xl"
						:loading="loading"
						@click="emit('confirm')"
					>
						{{ confirmLabel }}
					</UButton>
				</div>
			</div>
		</template>
	</UModal>
</template>

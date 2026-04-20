<script setup lang="ts">
defineProps<{
	title: string;
	description?: string | null;
}>();
</script>

<template>
	<section class="rounded-[28px] border border-slate-200 bg-white shadow-sm">
		<div class="border-b border-slate-200 px-6 py-5">
			<div class="flex items-start justify-between gap-4">
				<FormSectionHeader :title="title" :description="description" />

				<div v-if="$slots.actions" class="shrink-0">
					<slot name="actions" />
				</div>
			</div>
		</div>

		<div class="px-6 py-5">
			<slot />
		</div>
	</section>
</template>

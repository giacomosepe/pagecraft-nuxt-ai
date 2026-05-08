<script setup lang="ts">
defineProps<{
	title: string;
	description?: string | null;
}>();
</script>

<template>
	<section class="rounded-xl border border-slate-200 bg-white shadow-sm">
		<div class="border-b border-slate-200 px-6 py-4">
			<div class="flex items-start justify-between gap-4">
				<div class="space-y-1">
					<h2 class="text-xs font-medium text-slate-600">
						{{ title }}
					</h2>
					<p v-if="description" class="text-sm leading-6 text-slate-500">
						{{ description }}
					</p>
				</div>

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

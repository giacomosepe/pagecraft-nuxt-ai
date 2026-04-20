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
				<div class="space-y-1">
					<h2 class="text-base font-semibold text-slate-900">
						{{ title }}
					</h2>
					<p
						v-if="description"
						class="text-sm text-slate-500"
					>
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

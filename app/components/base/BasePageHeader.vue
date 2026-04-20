<script setup lang="ts">
defineProps<{
	title: string;
	description?: string | null;
}>();
</script>

<template>
	<header
		class="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
	>
		<div class="min-w-0 space-y-1.5">
			<h1 class="text-2xl font-semibold tracking-tight text-slate-900">
				{{ title }}
			</h1>
			<p
				v-if="description"
				class="text-sm text-slate-500"
			>
				{{ description }}
			</p>
			<div
				v-if="$slots.meta"
				class="pt-1"
			>
				<slot name="meta" />
			</div>
		</div>

		<div
			v-if="$slots.actions"
			class="flex shrink-0 flex-wrap items-center gap-2"
		>
			<slot name="actions" />
		</div>
	</header>
</template>

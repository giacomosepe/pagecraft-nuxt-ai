<script setup lang="ts">
withDefaults(
	defineProps<{
		title: string;
		description?: string | null;
		icon?: string;
		loading?: boolean;
		tone?: "neutral" | "error";
		compact?: boolean;
		surface?: boolean;
	}>(),
	{
		description: null,
		icon: "i-lucide-circle",
		loading: false,
		tone: "neutral",
		compact: false,
		surface: false,
	},
);
</script>

<template>
	<div
		class="flex flex-col items-center justify-center gap-3 px-6 text-center"
		:class="[
			compact ? 'py-10' : 'py-20',
			surface ? 'rounded-[28px] border border-slate-200 bg-white shadow-sm' : '',
		]"
	>
		<div
			class="flex size-14 items-center justify-center rounded-2xl"
			:class="
				tone === 'error'
					? 'bg-rose-50 text-rose-500'
					: 'bg-slate-100 text-slate-400'
			"
		>
			<UIcon
				:name="loading ? 'i-lucide-loader-circle' : icon"
				class="size-7"
				:class="loading ? 'animate-spin' : ''"
			/>
		</div>

		<div class="space-y-1">
			<p class="text-sm font-semibold text-slate-900">
				{{ title }}
			</p>
			<p v-if="description" class="text-sm leading-6 text-slate-500">
				{{ description }}
			</p>
		</div>

		<div v-if="$slots.actions" class="pt-1">
			<slot name="actions" />
		</div>
	</div>
</template>

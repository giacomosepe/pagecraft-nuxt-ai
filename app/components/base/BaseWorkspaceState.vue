<script setup lang="ts">
withDefaults(
	defineProps<{
		icon?: string;
		title: string;
		description?: string | null;
		loading?: boolean;
	}>(),
	{
		icon: "i-lucide-circle",
		description: null,
		loading: false,
	},
);
</script>

<template>
	<BaseStateMessage
		:title="title"
		:description="description"
		:icon="icon"
		:loading="loading"
	/>
</template>

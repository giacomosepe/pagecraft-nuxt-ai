<script setup lang="ts">
defineProps<{
	label?: string;
	loading?: boolean;
	disabled?: boolean;
}>();

const emit = defineEmits<{
	click: [];
}>();
</script>

<template>
	<UButton
		icon="i-lucide-file-text"
		size="sm"
		class="min-w-36 justify-center rounded-xl px-4"
		:loading="loading"
		:disabled="disabled"
		@click="emit('click')"
	>
		{{ label ?? "Produci testo" }}
	</UButton>
</template>

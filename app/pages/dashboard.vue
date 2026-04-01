<script setup lang="ts">
definePageMeta({ middleware: "auth" });
await navigateTo("/clienti", { replace: true });
</script>

<template>
	<div />
</template>

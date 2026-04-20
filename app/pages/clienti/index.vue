<script setup lang="ts">
definePageMeta({ middleware: "auth" });

const { clients, pending, refresh } = useClients();
</script>

<template>
	<ClientListWorkspace
		:clients="clients"
		:pending="pending"
		:refresh-clients="refresh"
	/>
</template>

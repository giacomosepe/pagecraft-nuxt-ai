<script setup lang="ts">
definePageMeta({ middleware: "auth" });

const { clients, pending } = useClients();
</script>

<template>
	<ClientListWorkspace :clients="clients" :pending="pending" />
</template>

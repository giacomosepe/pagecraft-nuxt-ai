<script setup lang="ts">
definePageMeta({ middleware: "auth" });

const { documents, pending } = useDocuments();
</script>

<template>
  <DocumentListWorkspace :documents="documents" :pending="pending" />
</template>

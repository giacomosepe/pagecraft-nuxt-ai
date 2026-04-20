<script setup lang="ts">
definePageMeta({ middleware: "auth" });

const { documents, pending, refresh } = useDocuments();
</script>

<template>
  <DocumentListWorkspace
    :documents="documents"
    :pending="pending"
    :refresh-documents="refresh"
  />
</template>

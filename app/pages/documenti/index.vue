<script setup lang="ts">
definePageMeta({ middleware: "auth" });

const { documents, pending, refresh, errorMsg } = useDocuments();
</script>

<template>
  <DocumentListWorkspace
    :documents="documents"
    :pending="pending"
    :error-msg="errorMsg"
    :refresh-documents="refresh"
  />
</template>

<script setup lang="ts">
definePageMeta({ middleware: "auth" });

const { projects, pending } = useProjects();
</script>

<template>
	<ProjectListWorkspace :projects="projects" :pending="pending" />
</template>

<script setup lang="ts">
definePageMeta({ middleware: "auth" });

const { projects, pending, refresh } = useProjects();
</script>

<template>
	<ProjectListWorkspace
		:projects="projects"
		:pending="pending"
		:refresh-projects="refresh"
	/>
</template>

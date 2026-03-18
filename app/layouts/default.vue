<script setup lang="ts">
definePageMeta({ middleware: "auth" });
</script>

<template>
	<div class="flex h-screen bg-gray-50 dark:bg-gray-950">
		<!-- Sidebar — desktop only -->
		<AppSidebar class="hidden md:flex" />

		<!-- Main content area -->
		<div class="flex flex-1 flex-col overflow-hidden">
			<!-- Page content scrolls here -->
			<main class="flex-1 overflow-y-auto">
				<slot />
			</main>

			<!-- Bottom bar — mobile only -->
			<AppBottomBar class="md:hidden" />
		</div>
	</div>
</template>

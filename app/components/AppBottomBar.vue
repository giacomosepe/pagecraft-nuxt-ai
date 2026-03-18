<script setup lang="ts">
const tabs = [
	{ label: "Pages", to: "/dashboard", icon: "i-lucide-file-text" },
	{ label: "Clients", to: "/clients", icon: "i-lucide-building-2" },
	{ label: "Folders", to: "/folders", icon: "i-lucide-folder" },
	{ label: "Settings", to: "/settings", icon: "i-lucide-settings" },
];
</script>

<template>
	<nav
		class="flex border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
	>
		<NuxtLink
			v-for="tab in tabs"
			:key="tab.to"
			:to="tab.to"
			class="flex flex-1 flex-col items-center gap-1 py-2 text-gray-500 dark:text-gray-400"
			active-class="text-primary-600 dark:text-primary-400"
		>
			<UIcon :name="tab.icon" class="size-5" />
			<span class="text-xs">{{ tab.label }}</span>
		</NuxtLink>
	</nav>
</template>

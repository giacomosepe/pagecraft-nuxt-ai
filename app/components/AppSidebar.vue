<script setup lang="ts">
const supabase = useSupabaseClient();

const navMain = [
	{ label: "Pages", to: "/dashboard", icon: "i-lucide-file-text" },
	{ label: "Clients", to: "/clients", icon: "i-lucide-building-2" },
	{ label: "Folders", to: "/folders", icon: "i-lucide-folder" },
];

const navBottom = [
	{ label: "Settings", to: "/settings", icon: "i-lucide-settings" },
];

async function signOut() {
	await supabase.auth.signOut();
	await navigateTo("/login");
}
</script>

<template>
	<aside
		class="flex h-full w-52 flex-col border-r border-gray-200 bg-white px-3 py-4 dark:border-gray-800 dark:bg-gray-950"
	>
		<!-- Logo -->
		<div class="mb-4 px-2">
			<span class="text-sm font-semibold text-gray-900 dark:text-white"
				>PageCraft</span
			>
		</div>

		<!-- Main nav -->
		<nav class="flex flex-col gap-0.5">
			<NuxtLink
				v-for="item in navMain"
				:key="item.to"
				:to="item.to"
				class="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-white"
				active-class="bg-gray-100 text-gray-900 font-medium dark:bg-gray-900 dark:text-white"
			>
				<UIcon :name="item.icon" class="size-4 shrink-0" />
				{{ item.label }}
			</NuxtLink>
		</nav>

		<!-- Spacer -->
		<div class="flex-1" />

		<!-- Bottom nav -->
		<nav class="flex flex-col gap-0.5">
			<NuxtLink
				v-for="item in navBottom"
				:key="item.to"
				:to="item.to"
				class="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-white"
				active-class="bg-gray-100 text-gray-900 font-medium dark:bg-gray-900 dark:text-white"
			>
				<UIcon :name="item.icon" class="size-4 shrink-0" />
				{{ item.label }}
			</NuxtLink>

			<button
				class="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-white"
				@click="signOut"
			>
				<UIcon name="i-lucide-log-out" class="size-4 shrink-0" />
				Sign out
			</button>
		</nav>
	</aside>
</template>

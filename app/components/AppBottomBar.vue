<script setup lang="ts">
import { appBottomTabs } from "~/utils/appNavigation";
</script>

<template>
	<nav
		class="grid grid-cols-4 border-t border-slate-200 bg-white px-2 py-2 shadow-[0_-8px_20px_rgba(15,23,42,0.04)]"
	>
		<NuxtLink
			v-for="tab in appBottomTabs"
			:key="tab.to"
			:to="tab.to"
			class="flex min-w-0 flex-col items-center gap-1 rounded-xl px-2 py-2 text-slate-500 transition-colors"
			active-class="bg-violet-50 text-violet-700"
		>
			<UIcon :name="tab.icon" class="size-5" />
			<span class="text-xs">{{ tab.label }}</span>
		</NuxtLink>
	</nav>
</template>

<!-- pages/index.vue -->
<script setup lang="ts">
definePageMeta({ layout: "public-layout" });

// If already logged in, skip the landing page
const user = useSupabaseUser();
if (user.value) {
	await navigateTo("/dashboard");
}
</script>

<template>
	<div class="text-center">
		<h1 class="text-4xl font-semibold text-gray-900 dark:text-white">
			PageCraft
		</h1>
		<p class="mt-3 text-gray-500 dark:text-gray-400">
			AI-assisted Patent Box documentation
		</p>
		<NuxtLink
			to="/login"
			class="mt-6 inline-block px-5 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
		>
			Get started
		</NuxtLink>
	</div>
</template>

<script setup lang="ts">
// @nuxtjs/supabase handles the token exchange automatically when this page mounts.
// We just show a loading state. On success the module redirects to the saved cookie
// URL (saveRedirectToCookie: true in nuxt.config) or falls back to '/dashboard'.
definePageMeta({ layout: "auth" });
</script>

<template>
	<div
		class="min-h-screen flex flex-col items-center justify-center gap-3 bg-gray-50 dark:bg-gray-950"
	>
		<UIcon
			name="i-lucide-loader-circle"
			class="size-8 animate-spin text-primary-500"
		/>
		<p class="text-sm text-gray-500 dark:text-gray-400">
			{{ $t("auth.confirming") }}
		</p>
	</div>
</template>

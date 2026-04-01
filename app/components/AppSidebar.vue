<script setup lang="ts">
const supabase = useSupabaseClient();
const route = useRoute();

const isActive = (path: string): boolean => route.path.startsWith(path);

async function signOut(): Promise<void> {
	await supabase.auth.signOut();
	await navigateTo("/login");
}
</script>

<template>
	<aside
		class="flex h-full w-52 flex-col border-r border-(--ui-border) bg-(--ui-bg) px-3 py-4"
	>
		<!-- Logo -->
		<div class="mb-6 px-2">
			<span class="text-sm font-semibold text-(--ui-text-highlighted)"
				>PageCraft</span
			>
		</div>

		<!-- Main nav -->
		<nav class="flex flex-col gap-0.5">
			<UButton
				to="/clienti"
				variant="ghost"
				color="neutral"
				icon="i-lucide-building-2"
				block
				class="justify-start"
				:class="isActive('/clienti') ? 'bg-(--ui-bg-elevated) font-medium' : ''"
			>
				Clienti
			</UButton>
			<UButton
				to="/progetti"
				variant="ghost"
				color="neutral"
				icon="i-lucide-folder-open"
				block
				class="justify-start"
				:class="isActive('/progetti') ? 'bg-(--ui-bg-elevated) font-medium' : ''"
			>
				Progetti
			</UButton>
		</nav>

		<!-- Spacer -->
		<div class="flex-1" />

		<!-- Bottom nav -->
		<nav class="flex flex-col gap-0.5">
			<UButton
				to="/impostazioni"
				variant="ghost"
				color="neutral"
				icon="i-lucide-settings"
				block
				class="justify-start"
				:class="
					isActive('/impostazioni') ? 'bg-(--ui-bg-elevated) font-medium' : ''
				"
			>
				Impostazioni
			</UButton>
			<UButton
				variant="ghost"
				color="neutral"
				icon="i-lucide-log-out"
				block
				class="justify-start"
				@click="signOut"
			>
				Esci
			</UButton>
		</nav>
	</aside>
</template>

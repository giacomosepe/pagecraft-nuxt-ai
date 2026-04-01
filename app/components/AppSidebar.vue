<script setup lang="ts">
const supabase = useSupabaseClient();
const route = useRoute();

function isSubActive(path: string, status?: string): boolean {
	if (!route.path.startsWith(path)) return false;
	if (status) return route.query.status === status;
	return !route.query.status;
}

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
			<!-- Clienti section -->
			<p
				class="px-2 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-(--ui-text-muted)"
			>
				Clienti
			</p>
			<UButton
				to="/clienti?status=aperto"
				variant="ghost"
				color="neutral"
				size="sm"
				block
				class="justify-start pl-4"
				:class="
					isSubActive('/clienti', 'aperto')
						? 'bg-(--ui-bg-elevated) font-medium'
						: ''
				"
			>
				Aperti
			</UButton>
			<UButton
				to="/clienti?status=completato"
				variant="ghost"
				color="neutral"
				size="sm"
				block
				class="justify-start pl-4"
				:class="
					isSubActive('/clienti', 'completato')
						? 'bg-(--ui-bg-elevated) font-medium'
						: ''
				"
			>
				Completati
			</UButton>
			<UButton
				to="/clienti"
				variant="ghost"
				color="neutral"
				size="sm"
				block
				class="justify-start pl-4"
				:class="
					isSubActive('/clienti') ? 'bg-(--ui-bg-elevated) font-medium' : ''
				"
			>
				Tutti
			</UButton>

			<!-- Progetti section -->
			<p
				class="px-2 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-(--ui-text-muted)"
			>
				Progetti
			</p>
			<UButton
				to="/progetti?status=in_attesa"
				variant="ghost"
				color="neutral"
				size="sm"
				block
				class="justify-start pl-4"
				:class="
					isSubActive('/progetti', 'in_attesa')
						? 'bg-(--ui-bg-elevated) font-medium'
						: ''
				"
			>
				In attesa
			</UButton>
			<UButton
				to="/progetti?status=in_lavorazione"
				variant="ghost"
				color="neutral"
				size="sm"
				block
				class="justify-start pl-4"
				:class="
					isSubActive('/progetti', 'in_lavorazione')
						? 'bg-(--ui-bg-elevated) font-medium'
						: ''
				"
			>
				In lavorazione
			</UButton>
			<UButton
				to="/progetti?status=completato"
				variant="ghost"
				color="neutral"
				size="sm"
				block
				class="justify-start pl-4"
				:class="
					isSubActive('/progetti', 'completato')
						? 'bg-(--ui-bg-elevated) font-medium'
						: ''
				"
			>
				Completati
			</UButton>
			<UButton
				to="/progetti?status=archiviato"
				variant="ghost"
				color="neutral"
				size="sm"
				block
				class="justify-start pl-4"
				:class="
					isSubActive('/progetti', 'archiviato')
						? 'bg-(--ui-bg-elevated) font-medium'
						: ''
				"
			>
				Archiviati
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
					route.path.startsWith('/impostazioni')
						? 'bg-(--ui-bg-elevated) font-medium'
						: ''
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

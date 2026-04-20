<script setup lang="ts">
import { appSidebarSections } from "~/utils/appNavigation";

const supabase = useSupabaseClient();
const route = useRoute();
const user = useSupabaseUser();

function isItemActive(path: string, status?: string): boolean {
	if (!route.path.startsWith(path)) return false;
	if (status) return route.query.status === status;
	return !route.query.status;
}

async function signOut(): Promise<void> {
	await supabase.auth.signOut();
	await navigateTo("/login");
}

const accountInitials = computed(() => {
	const email = user.value?.email ?? "pagecraft";
	return email.slice(0, 2).toUpperCase();
});
</script>

<template>
	<aside
		class="hidden h-full w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex"
	>
		<div class="flex h-16 items-center justify-between border-b border-slate-200 px-4">
			<div class="flex items-center gap-3">
				<div
					class="flex size-8 items-center justify-center rounded-md bg-violet-600 text-sm font-bold text-white"
				>
					P
				</div>
				<div>
					<p class="text-sm font-semibold text-slate-900">PageCraft</p>
					<p class="text-xs text-slate-500">Workspace principale</p>
				</div>
			</div>

			<div class="flex items-center gap-1">
				<UButton
					variant="ghost"
					color="neutral"
					icon="i-lucide-square-pen"
					size="xs"
					class="rounded-lg text-violet-600"
					to="/pages/new"
				/>
			</div>
		</div>

		<div class="border-b border-slate-100 px-3 py-3">
			<div
				class="flex items-center gap-3 rounded-xl px-2 py-2"
			>
				<div
					class="flex size-6 items-center justify-center rounded-full bg-violet-600 text-[10px] font-semibold text-white"
				>
					{{ accountInitials }}
				</div>
				<div class="min-w-0">
					<p class="truncate text-sm font-medium text-slate-700">
						Account personale
					</p>
					<p class="truncate text-xs text-slate-500">
						{{ user?.email ?? "Configurazione account" }}
					</p>
				</div>
			</div>
		</div>

		<nav class="min-h-0 flex-1 overflow-y-auto px-3 py-4">
			<div
				v-for="section in appSidebarSections"
				:key="section.label"
				class="mb-6 last:mb-0"
			>
				<p class="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
					{{ section.label }}
				</p>
				<div class="space-y-1">
					<UButton
						v-for="item in section.items"
						:key="item.to"
						:to="item.to"
						variant="ghost"
						color="neutral"
						size="sm"
						block
						:icon="item.icon"
						class="justify-start rounded-lg px-2.5 py-2 text-slate-600"
						:class="
							isItemActive(item.match?.path ?? item.to, item.match?.status)
								? 'bg-violet-50 font-medium text-violet-700'
								: 'hover:bg-slate-50 hover:text-slate-900'
						"
					>
						{{ item.label }}
					</UButton>
				</div>
			</div>
		</nav>

		<nav class="border-t border-slate-100 px-3 py-3">
			<UButton
				to="/about"
				variant="ghost"
				color="neutral"
				icon="i-lucide-info"
				block
				class="justify-start rounded-lg px-2.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
				:class="
					route.path.startsWith('/about')
						? 'bg-slate-100 font-medium text-slate-900'
						: ''
				"
			>
				Info
			</UButton>
			<UButton
				variant="ghost"
				color="neutral"
				icon="i-lucide-log-out"
				block
				class="justify-start rounded-lg px-2.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
				@click="signOut"
			>
				Esci
			</UButton>
		</nav>
	</aside>
</template>

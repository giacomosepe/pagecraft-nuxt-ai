<script setup lang="ts">
import { appSidebarSections } from "~/utils/appNavigation";

const supabase = useSupabaseClient();
const route = useRoute();
const user = useSupabaseUser();
const isCollapsed = ref(false);
const sidebarStorageKey = "pagecraft:sidebar-collapsed";

function isItemActive(path: string, status?: string): boolean {
	if (!route.path.startsWith(path)) return false;
	if (status) return route.query.status === status;
	return !route.query.status;
}

async function signOut(): Promise<void> {
	await supabase.auth.signOut();
	await navigateTo("/login");
}

onMounted(() => {
	isCollapsed.value = localStorage.getItem(sidebarStorageKey) === "true";
});

watch(isCollapsed, (value) => {
	if (!import.meta.client) return;
	localStorage.setItem(sidebarStorageKey, String(value));
});

const accountInitials = computed(() => {
	const email = user.value?.email ?? "pagecraft";
	return email.slice(0, 2).toUpperCase();
});
</script>

<template>
	<aside
		class="hidden h-screen shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] duration-200 md:sticky md:top-0 md:flex"
		:class="isCollapsed ? 'w-[72px]' : 'w-64'"
	>
		<div
			class="relative flex h-16 items-center border-b border-slate-200 px-3"
			:class="isCollapsed ? 'justify-center' : 'justify-between'"
		>
			<div
				class="flex min-w-0 items-center"
				:class="isCollapsed ? 'justify-center' : 'gap-3'"
			>
				<div
					class="flex size-8 items-center justify-center rounded-md bg-violet-600 text-sm font-bold text-white"
				>
					P
				</div>
				<div v-if="!isCollapsed" class="min-w-0">
					<p class="text-sm font-semibold text-slate-900">PageCraft</p>
					<p class="text-xs text-slate-500">Workspace principale</p>
				</div>
			</div>

			<div v-if="!isCollapsed" class="flex items-center gap-1">
				<UButton
					variant="ghost"
					color="neutral"
					icon="i-lucide-square-pen"
					size="xs"
					class="rounded-lg text-violet-600 hover:bg-violet-50"
					to="/pages/new"
					aria-label="Nuovo documento"
				/>
				<UButton
					variant="ghost"
					color="neutral"
					icon="i-lucide-panel-left-close"
					size="xs"
					class="rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-900"
					aria-label="Comprimi sidebar"
					@click="isCollapsed = true"
				/>
			</div>

			<UTooltip v-else text="Espandi sidebar">
				<UButton
					variant="ghost"
					color="neutral"
					icon="i-lucide-panel-left-open"
					size="xs"
					class="absolute right-2 top-5 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-900"
					aria-label="Espandi sidebar"
					@click="isCollapsed = false"
				/>
			</UTooltip>
		</div>

		<div class="border-b border-slate-100 px-3 py-3">
			<div
				class="flex items-center rounded-xl px-2 py-2"
				:class="isCollapsed ? 'justify-center' : 'gap-3'"
			>
				<div
					class="flex size-6 items-center justify-center rounded-full bg-violet-600 text-[10px] font-semibold text-white"
				>
					{{ accountInitials }}
				</div>
				<div v-if="!isCollapsed" class="min-w-0">
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
				:class="isCollapsed ? 'mb-3 last:mb-0' : 'mb-6 last:mb-0'"
			>
				<p
					v-if="!isCollapsed"
					class="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400"
				>
					{{ section.label }}
				</p>
				<div class="space-y-1">
					<template v-if="isCollapsed">
						<UTooltip
							v-for="item in section.items"
							:key="item.to"
							:text="item.label"
						>
							<UButton
								:to="item.to"
								variant="ghost"
								color="neutral"
								size="sm"
								block
								:icon="item.icon"
								:aria-label="item.label"
								class="justify-center rounded-xl px-2.5 py-2.5 text-[13px] font-medium text-slate-600"
								:class="
									isItemActive(item.match?.path ?? item.to, item.match?.status)
										? 'bg-violet-50 text-violet-700'
										: 'hover:bg-slate-50 hover:text-slate-900'
								"
							/>
						</UTooltip>
					</template>

					<template v-else>
						<UButton
							v-for="item in section.items"
							:key="item.to"
							:to="item.to"
							variant="ghost"
							color="neutral"
							size="sm"
							block
							:icon="item.icon"
							:aria-label="item.label"
							class="justify-start rounded-xl px-2.5 py-2.5 text-[13px] font-medium text-slate-600"
							:class="
								isItemActive(item.match?.path ?? item.to, item.match?.status)
									? 'bg-violet-50 text-violet-700'
									: 'hover:bg-slate-50 hover:text-slate-900'
							"
						>
							<span>{{ item.label }}</span>
						</UButton>
					</template>
				</div>
			</div>
		</nav>

		<nav class="border-t border-slate-100 px-3 py-3">
			<UTooltip v-if="isCollapsed" text="Info">
				<UButton
					to="/about"
					variant="ghost"
					color="neutral"
					icon="i-lucide-info"
					block
					aria-label="Info"
					class="rounded-xl px-2.5 py-2.5 text-[13px] font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
					:class="[
						'justify-center',
						route.path.startsWith('/about')
							? 'bg-slate-100 text-slate-900'
							: '',
					]"
				/>
			</UTooltip>
			<UButton
				v-else
				to="/about"
				variant="ghost"
				color="neutral"
				icon="i-lucide-info"
				block
				aria-label="Info"
				class="justify-start rounded-xl px-2.5 py-2.5 text-[13px] font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
				:class="route.path.startsWith('/about') ? 'bg-slate-100 text-slate-900' : ''"
			>
				<span>Info</span>
			</UButton>

			<UTooltip v-if="isCollapsed" text="Esci">
				<UButton
					variant="ghost"
					color="neutral"
					icon="i-lucide-log-out"
					block
					aria-label="Esci"
					class="rounded-xl px-2.5 py-2.5 text-[13px] font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
					:class="'justify-center'"
					@click="signOut"
				/>
			</UTooltip>
			<UButton
				v-else
				variant="ghost"
				color="neutral"
				icon="i-lucide-log-out"
				block
				aria-label="Esci"
				class="justify-start rounded-xl px-2.5 py-2.5 text-[13px] font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
				@click="signOut"
			>
				<span>Esci</span>
			</UButton>
		</nav>
	</aside>
</template>

<script setup lang="ts">
import { defineComponent, h, resolveComponent } from "vue";
import type { PropType } from "vue";
import type { AppNavItem } from "~/utils/appNavigation";
import { appSidebarSections } from "~/utils/appNavigation";

type SidebarNavButtonItem = Pick<AppNavItem, "label" | "icon"> & {
	to?: string;
};

const SidebarNavButton = defineComponent({
	props: {
		item: {
			type: Object as PropType<SidebarNavButtonItem>,
			required: true,
		},
		isCollapsed: {
			type: Boolean,
			required: true,
		},
		isActive: {
			type: Boolean,
			default: false,
		},
		activeClass: {
			type: String,
			default: "bg-violet-50 text-violet-700",
		},
	},
	emits: ["click"],
	setup(props, { emit }) {
		const renderButton = () =>
			h(
				resolveComponent("UButton"),
				{
					to: props.item.to,
					variant: "ghost",
					color: "neutral",
					size: "sm",
					block: true,
					icon: props.item.icon,
					"aria-label": props.item.label,
					class: [
						props.isCollapsed ? "justify-center" : "justify-start",
						"rounded-xl px-2.5 py-2.5 text-[13px] font-medium text-slate-600",
						props.isActive
							? props.activeClass
							: "hover:bg-slate-50 hover:text-slate-900",
					],
					onClick: (event: MouseEvent) => emit("click", event),
				},
				props.isCollapsed
					? undefined
					: {
							default: () => h("span", props.item.label),
						},
			);

		return () =>
			props.isCollapsed
				? h(
						resolveComponent("UTooltip"),
						{ text: props.item.label },
						{ default: renderButton },
					)
				: renderButton();
	},
});

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
					<SidebarNavButton
						v-for="item in section.items"
						:key="item.to"
						:item="item"
						:is-collapsed="isCollapsed"
						:is-active="isItemActive(item.match?.path ?? item.to, item.match?.status)"
					/>
				</div>
			</div>
		</nav>

		<nav class="border-t border-slate-100 px-3 py-3">
			<div class="space-y-1">
				<SidebarNavButton
					:item="{ label: 'Info', to: '/about', icon: 'i-lucide-info' }"
					:is-collapsed="isCollapsed"
					:is-active="route.path.startsWith('/about')"
					active-class="bg-slate-100 text-slate-900"
				/>

				<SidebarNavButton
					:item="{ label: 'Esci', icon: 'i-lucide-log-out' }"
					:is-collapsed="isCollapsed"
					@click="signOut"
				/>
			</div>
		</nav>
	</aside>
</template>

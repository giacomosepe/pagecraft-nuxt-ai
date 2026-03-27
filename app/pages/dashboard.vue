<script setup lang="ts">
definePageMeta({ middleware: "auth" });

const client = useSupabaseClient();

const { data: pages, pending } = await useAsyncData(
	"pages-list",
	async () => {
		const { data, error } = await client
			.from("pages")
			.select("id, title, status, framework_name, updated_at, client_id")
			.order("updated_at", { ascending: false });
		if (error) throw error;
		return data ?? [];
	},
	{ server: false },
);

const statusColor: Record<string, string> = {
	DRAFT: "neutral",
	IN_PROGRESS: "info",
	COMPLETED: "success",
	ARCHIVED: "neutral",
};
</script>

<template>
	<div class="mx-auto max-w-5xl px-6 py-8">
		<!-- Header row -->
		<div class="mb-6 flex items-center justify-between">
			<h1 class="text-xl font-semibold text-gray-900 dark:text-white">
				Pages
			</h1>
			<UButton icon="i-lucide-plus" size="sm" to="/pages/new">
				New page
			</UButton>
		</div>

		<!-- Loading -->
		<div v-if="pending" class="flex items-center justify-center py-24">
			<UIcon
				name="i-lucide-loader-circle"
				class="size-6 animate-spin text-gray-400"
			/>
		</div>

		<!-- Empty state -->
		<div
			v-else-if="!pages?.length"
			class="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-24 text-center dark:border-gray-700"
		>
			<UIcon
				name="i-lucide-file-text"
				class="mb-3 size-10 text-gray-300 dark:text-gray-600"
			/>
			<p class="text-sm font-medium text-gray-900 dark:text-white">
				No pages yet
			</p>
			<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
				Create your first Patent Box document to get started
			</p>
			<UButton class="mt-5" icon="i-lucide-plus" size="sm" to="/pages/new">
				Create your first page
			</UButton>
		</div>

		<!-- Pages list -->
		<div v-else class="flex flex-col gap-2">
			<NuxtLink
				v-for="page in pages"
				:key="page.id"
				:to="`/pages/${page.id}`"
				class="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
			>
				<div class="min-w-0">
					<p
						class="truncate text-sm font-medium text-gray-900 dark:text-white"
					>
						{{ page.title }}
					</p>
					<p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
						{{ page.framework_name }}
					</p>
				</div>
				<div class="ml-4 flex shrink-0 items-center gap-3">
					<UBadge
						:color="statusColor[page.status]"
						variant="soft"
						size="sm"
					>
						{{ page.status.replace("_", " ") }}
					</UBadge>
					<span class="text-xs text-gray-400 dark:text-gray-500">
						{{
							new Date(page.updated_at).toLocaleDateString(
								"it-IT",
							)
						}}
					</span>
				</div>
			</NuxtLink>
		</div>
	</div>
</template>

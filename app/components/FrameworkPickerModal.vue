<script setup lang="ts">
const client = useSupabaseClient();

const emit = defineEmits<{
	select: [frameworkId: string, frameworkSlug: string];
	cancel: [];
}>();

// Load available frameworks — public and not deprecated
const { data: frameworks, pending } = await useAsyncData(
	"frameworks",
	async () => {
		const { data, error } = await client
			.from("frameworks")
			.select("id, name, slug, description")
			.eq("is_public", true)
			.is("deprecated_at", null)
			.order("name");
		if (error) throw error;
		return data;
	},
);

const selected = ref<string | null>(null);

function confirm() {
	const fw = frameworks.value?.find((f) => f.id === selected.value);
	if (!fw) return;
	emit("select", fw.id, fw.name); //<!-- changed fw.slug to fw.name -->
}
</script>

<template>
	<div class="p-5 flex flex-col gap-5">
		<!-- Header -->
		<div>
			<h2 class="text-base font-semibold text-gray-900 dark:text-white">
				Choose a framework
			</h2>
			<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
				The framework defines the structure of your document
			</p>
		</div>

		<!-- Framework list -->
		<div v-if="pending" class="flex justify-center py-6">
			<UIcon
				name="i-lucide-loader-circle"
				class="size-5 animate-spin text-gray-400"
			/>
		</div>

		<div v-else class="flex flex-col gap-2">
			<button
				v-for="fw in frameworks"
				:key="fw.id"
				class="w-full text-left rounded-lg border px-4 py-3 transition-colors"
				:class="
					selected === fw.id
						? 'border-primary-500 bg-primary-50 dark:bg-primary-950 dark:border-primary-400'
						: 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
				"
				@click="selected = fw.id"
			>
				<div class="flex items-start gap-3">
					<!-- Radio indicator -->
					<div
						class="mt-0.5 size-4 rounded-full border-2 flex items-center justify-center shrink-0"
						:class="
							selected === fw.id
								? 'border-primary-500'
								: 'border-gray-300 dark:border-gray-600'
						"
					>
						<div
							v-if="selected === fw.id"
							class="size-1.5 rounded-full bg-primary-500"
						/>
					</div>
					<div>
						<p
							class="text-sm font-medium"
							:class="
								selected === fw.id
									? 'text-primary-700 dark:text-primary-300'
									: 'text-gray-900 dark:text-white'
							"
						>
							{{ fw.name }}
						</p>
						<p
							v-if="fw.description"
							class="mt-0.5 text-xs text-gray-500 dark:text-gray-400"
						>
							{{ fw.description }}
						</p>
					</div>
				</div>
			</button>
		</div>

		<!-- Actions -->
		<div
			class="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800"
		>
			<UButton color="neutral" variant="ghost" @click="emit('cancel')">
				Cancel
			</UButton>
			<UButton :disabled="!selected" @click="confirm">
				Continue →
			</UButton>
		</div>
	</div>
</template>

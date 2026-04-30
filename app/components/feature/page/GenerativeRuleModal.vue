<script setup lang="ts">
import type { GenerativeRuleSection } from "~/types/generative-rule";

const props = withDefaults(
	defineProps<{
		open: boolean;
		title: string;
		sections: GenerativeRuleSection[];
		confirmLabel?: string;
	}>(),
	{
		confirmLabel: "Applica",
	},
);

const emit = defineEmits<{
	"update:open": [value: boolean];
	cancel: [];
	save: [sections: GenerativeRuleSection[]];
}>();

const draftSections = ref<GenerativeRuleSection[]>([]);

function cloneSections(sections: GenerativeRuleSection[]): GenerativeRuleSection[] {
	return sections.map((section) => ({ ...section }));
}

watch(
	() => props.open,
	(isOpen) => {
		if (isOpen) draftSections.value = cloneSections(props.sections);
	},
);

watch(
	() => props.sections,
	(sections) => {
		draftSections.value = cloneSections(sections);
	},
	{ deep: true, immediate: true },
);

function cancel(): void {
	draftSections.value = cloneSections(props.sections);
	emit("cancel");
	emit("update:open", false);
}

function save(): void {
	emit("save", cloneSections(draftSections.value));
	emit("update:open", false);
}
</script>

<template>
	<UModal
		:open="open"
		:ui="{ content: 'max-w-[min(920px,calc(100vw-32px))]' }"
		@update:open="emit('update:open', $event)"
	>
		<template #content>
			<div class="flex max-h-[84vh] flex-col bg-white">
				<div class="border-b border-slate-200 px-5 py-4">
					<p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
						Editor
					</p>
					<h3 class="mt-1 text-base font-semibold text-slate-900">
						{{ title }}
					</h3>
					<p class="mt-2 text-sm leading-6 text-slate-500">
						Modifica valida solo per questa sessione. Ricaricando la pagina tornerà la regola originale.
					</p>
				</div>

				<div class="flex-1 space-y-5 overflow-y-auto px-5 py-5">
					<section
						v-for="section in draftSections"
						:key="section.key"
						class="space-y-2"
					>
						<label
							:for="`generative-rule-${section.key}`"
							class="block text-sm font-semibold text-slate-900"
						>
							{{ section.label }}
						</label>
						<UTextarea
							:id="`generative-rule-${section.key}`"
							v-model="section.content"
							:rows="section.content.length > 700 ? 12 : 6"
							class="w-full"
							:ui="{
								base: 'w-full rounded-2xl border-slate-200 bg-slate-50 px-4 py-3 font-mono text-xs leading-6 text-slate-700 focus:border-violet-300 focus:ring-violet-200',
							}"
						/>
					</section>
				</div>

				<div class="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
					<UButton
						color="neutral"
						variant="ghost"
						class="rounded-xl"
						@click="cancel"
					>
						Annulla
					</UButton>
					<UButton
						class="rounded-xl"
						@click="save"
					>
						{{ confirmLabel }}
					</UButton>
				</div>
			</div>
		</template>
	</UModal>
</template>

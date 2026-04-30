<script setup lang="ts">
import type { GenerativeRuleSection } from "~/types/generative-rule";

const props = defineProps<{
	stepId: string;
	templateContent: string;
	isGenerating: boolean;
	actionDisabled: boolean;
}>();

const emit = defineEmits<{
	produce: [appliedRule: string | null];
}>();

const modalOpen = ref(false);
const appliedRules = ref<Record<string, GenerativeRuleSection[]>>({});

const baseRuleSections = computed<GenerativeRuleSection[]>(() => [
	{
		key: "template",
		label: "Regola",
		content: props.templateContent,
	},
]);
const appliedRuleSections = computed(
	() => appliedRules.value[props.stepId] ?? null,
);
const activeRuleSections = computed(
	() => appliedRuleSections.value ?? baseRuleSections.value,
);
const appliedRuleContent = computed(
	() => appliedRuleSections.value?.find((section) => section.key === "template")?.content ?? null,
);

watch(
	() => props.stepId,
	() => {
		modalOpen.value = false;
	},
);

function applyRule(sections: GenerativeRuleSection[]): void {
	appliedRules.value = {
		...appliedRules.value,
		[props.stepId]: sections,
	};
}

function cancelRuleEdit(): void {
	modalOpen.value = false;
}
</script>

<template>
	<div class="flex flex-col items-end gap-2 border-t border-slate-200 pt-5">
		<StepTypeAActionButton
			:loading="isGenerating"
			:disabled="actionDisabled"
			@click="emit('produce', appliedRuleContent)"
		/>
		<UButton
			variant="link"
			color="neutral"
			size="sm"
			icon="i-lucide-eye"
			class="px-0 text-slate-600 hover:text-slate-900"
			@click="modalOpen = true"
		>
			Regola di generazione
		</UButton>

		<GenerativeRuleModal
			v-model:open="modalOpen"
			title="Regola di generazione"
			:sections="activeRuleSections"
			confirm-label="Applica"
			@cancel="cancelRuleEdit"
			@save="applyRule"
		/>
	</div>
</template>

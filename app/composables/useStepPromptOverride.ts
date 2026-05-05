import type { ComputedRef } from "vue";

interface PromptStep {
	id: string;
	system_prompt_template: string | null;
}

interface UseStepPromptOverrideParams {
	activeStep: ComputedRef<PromptStep>;
	isEditable: ComputedRef<boolean>;
	onGenerate: (promptOverride: string | null) => void;
}

export function useStepPromptOverride({
	activeStep,
	isEditable,
	onGenerate,
}: UseStepPromptOverrideParams) {
	const promptModalOpen = ref(false);
	const promptReadOnlyValue = "Non serve un prompt per questo step.";
	// TODO: Decide whether type_c prompt overrides should persist across sessions.
	const promptDrafts = ref<Record<string, string>>({});

	const editablePrompt = computed({
		get: () =>
			promptDrafts.value[activeStep.value.id] ??
			activeStep.value.system_prompt_template ??
			"",
		set: (value: string) => {
			promptDrafts.value = {
				...promptDrafts.value,
				[activeStep.value.id]: value,
			};
		},
	});

	watch(
		() => activeStep.value.id,
		() => {
			promptModalOpen.value = false;
		},
	);

	function openPromptModal(): void {
		promptModalOpen.value = true;
	}

	function cancelPromptEdit(): void {
		promptModalOpen.value = false;
	}

	function savePromptEdit(value: string): void {
		editablePrompt.value = value;
		promptModalOpen.value = false;
	}

	function onGenerateText(): void {
		onGenerate(isEditable.value ? editablePrompt.value : null);
	}

	return {
		promptModalOpen,
		promptReadOnlyValue,
		editablePrompt,
		openPromptModal,
		cancelPromptEdit,
		savePromptEdit,
		onGenerateText,
	};
}

import type { ComputedRef } from "vue";

interface UseStepUploadFieldsParams {
	activeStepId: ComputedRef<string>;
	clearFormSaveError: () => void;
	saveFormField: (
		fieldKey: string,
		value: unknown,
		options?: { throwOnError?: boolean },
	) => Promise<void>;
}

export function useStepUploadFields({
	activeStepId,
	clearFormSaveError,
	saveFormField,
}: UseStepUploadFieldsParams) {
	const fileUploading = ref<Record<string, boolean>>({});
	const fileUploadError = ref<Record<string, string | null>>({});

	const isAnyFileUploading = computed(() =>
		Object.values(fileUploading.value).some(Boolean),
	);

	watch(
		activeStepId,
		() => {
			fileUploading.value = {};
			fileUploadError.value = {};
		},
	);

	async function onFileChange(fieldKey: string, file: File | null): Promise<void> {
		const filename = file?.name ?? "";
		fileUploading.value = { ...fileUploading.value, [fieldKey]: true };
		fileUploadError.value = { ...fileUploadError.value, [fieldKey]: null };

		try {
			clearFormSaveError();
			await saveFormField(fieldKey, filename, { throwOnError: true });
		} catch (err: unknown) {
			const msg =
				err instanceof Error ? err.message : "Errore durante il salvataggio del file";
			fileUploadError.value = { ...fileUploadError.value, [fieldKey]: msg };
			console.error("[StepEditor] file save error:", err);
		} finally {
			fileUploading.value = { ...fileUploading.value, [fieldKey]: false };
		}
	}

	return {
		fileUploading,
		fileUploadError,
		isAnyFileUploading,
		onFileChange,
	};
}

import type { ComputedRef } from "vue";
import type { StepFormField } from "~/types/app.types";
import type { ExtractionResult } from "~/utils/visuraExtraction";
import { normalizeExtractionResult } from "~/utils/visuraExtraction";

export interface VisuraExtractResult {
	soci?: unknown[];
	partecipate?: unknown[];
	board?: unknown[];
	legale_rappresentante_societa?: string | null;
	shareholders: unknown[];
	subsidiaries: unknown[];
	missing: {
		soci?: { index: number; name: string; missing: string[] }[];
		partecipate?: { index: number; name: string; missing: string[] }[];
		shareholders: { index: number; name: string; missing: string[] }[];
		subsidiaries: { index: number; name: string; missing: string[] }[];
	};
}

interface ReviewedVisuraPayload extends VisuraExtractResult {
	filename: string;
	extracted_at: string;
}

interface UseVisuraExtractionReviewParams {
	activeStepId: ComputedRef<string>;
	clearFormSaveError: () => void;
	saveFormField: (
		fieldKey: string,
		value: unknown,
		options?: { throwOnError?: boolean },
	) => Promise<void>;
	getExtractionRule: (fieldKey: string) => string | null;
	onInsert: (fieldKey: string, payload: ReviewedVisuraPayload) => void;
	onReset?: () => void;
}

function buildReviewedVisuraPayload(
	result: ExtractionResult,
	filename: string | null,
): ReviewedVisuraPayload {
	return {
		filename: filename ?? "visura.pdf",
		soci: result.soci,
		partecipate: result.partecipate,
		board: result.board,
		legale_rappresentante_societa: result.legale_rappresentante_societa,
		shareholders: result.soci,
		subsidiaries: result.partecipate,
		missing: {
			soci: result.missing?.soci ?? [],
			partecipate: result.missing?.partecipate ?? [],
			shareholders: result.missing?.shareholders ?? result.missing?.soci ?? [],
			subsidiaries: result.missing?.subsidiaries ?? result.missing?.partecipate ?? [],
		},
		extracted_at: new Date().toISOString(),
	};
}

export function useVisuraExtractionReview({
	activeStepId,
	clearFormSaveError,
	saveFormField,
	getExtractionRule,
	onInsert,
	onReset,
}: UseVisuraExtractionReviewParams) {
	const visuraFile = ref<Record<string, File | null>>({});
	const visuraExtracting = ref<Record<string, boolean>>({});
	const visuraError = ref<Record<string, string | null>>({});
	const visuraResult = ref<Record<string, VisuraExtractResult | null>>({});
	const visuraReviewResult = ref<Record<string, ExtractionResult | null>>({});
	const extractionReviewOpen = ref(false);
	const activeExtractionReviewFieldKey = ref<string | null>(null);
	const extractionReviewFilename = ref<string | null>(null);

	function reset(): void {
		visuraFile.value = {};
		visuraExtracting.value = {};
		visuraError.value = {};
		visuraResult.value = {};
		visuraReviewResult.value = {};
		extractionReviewOpen.value = false;
		activeExtractionReviewFieldKey.value = null;
		extractionReviewFilename.value = null;
		onReset?.();
	}

	watch(activeStepId, reset);

	function onVisuraFileChange(fieldKey: string, file: File | null): void {
		visuraFile.value = { ...visuraFile.value, [fieldKey]: file };
		visuraError.value = { ...visuraError.value, [fieldKey]: null };
		visuraResult.value = { ...visuraResult.value, [fieldKey]: null };
		visuraReviewResult.value = { ...visuraReviewResult.value, [fieldKey]: null };
		onReset?.();
	}

	async function clearVisuraFile(fieldKey: string): Promise<void> {
		onVisuraFileChange(fieldKey, null);
		extractionReviewOpen.value = false;
		activeExtractionReviewFieldKey.value = null;
		extractionReviewFilename.value = null;

		try {
			clearFormSaveError();
			await saveFormField(fieldKey, null, { throwOnError: true });
		} catch (err: unknown) {
			const msg =
				err instanceof Error ? err.message : "Errore durante la cancellazione del file";
			visuraError.value = { ...visuraError.value, [fieldKey]: msg };
			console.error("[StepEditor] visura clear error:", err);
		}
	}

	async function extractVisura(field: StepFormField): Promise<void> {
		const file = visuraFile.value[field.key];
		if (!file) return;

		visuraExtracting.value = { ...visuraExtracting.value, [field.key]: true };
		visuraError.value = { ...visuraError.value, [field.key]: null };
		visuraResult.value = { ...visuraResult.value, [field.key]: null };

		try {
			const formData = new FormData();
			formData.append("file", file);
			const extractionRule = getExtractionRule(field.key);
			if (extractionRule?.trim()) {
				formData.append("extractionRule", extractionRule);
			}

			const result = await $fetch<VisuraExtractResult>("/api/visura/extract-pdf", {
				method: "POST",
				body: formData,
			});

			visuraResult.value = { ...visuraResult.value, [field.key]: result };
			visuraReviewResult.value = {
				...visuraReviewResult.value,
				[field.key]: normalizeExtractionResult(result),
			};
			activeExtractionReviewFieldKey.value = field.key;
			extractionReviewFilename.value = file.name;
			onReset?.();
			extractionReviewOpen.value = true;
		} catch (err: unknown) {
			const msg =
				err instanceof Error ? err.message : "Errore durante l''estrazione dalla visura";
			visuraError.value = { ...visuraError.value, [field.key]: msg };
			console.error("[StepEditor] visura extraction error:", err);
		} finally {
			visuraExtracting.value = { ...visuraExtracting.value, [field.key]: false };
		}
	}

	async function insertReviewedVisura(result: ExtractionResult): Promise<void> {
		const fieldKey = activeExtractionReviewFieldKey.value;
		if (!fieldKey) return;

		const payload = buildReviewedVisuraPayload(result, extractionReviewFilename.value);

		try {
			clearFormSaveError();
			await saveFormField(fieldKey, payload, { throwOnError: true });
			visuraResult.value = { ...visuraResult.value, [fieldKey]: payload };
			visuraReviewResult.value = {
				...visuraReviewResult.value,
				[fieldKey]: normalizeExtractionResult(payload),
			};
			onInsert(fieldKey, payload);
			extractionReviewOpen.value = false;
		} catch (err: unknown) {
			const msg =
				err instanceof Error ? err.message : "Errore durante il salvataggio dei dati estratti";
			visuraError.value = { ...visuraError.value, [fieldKey]: msg };
			console.error("[StepEditor] visura insert error:", err);
		}
	}

	return {
		visuraFile,
		visuraExtracting,
		visuraError,
		visuraResult,
		visuraReviewResult,
		extractionReviewOpen,
		activeExtractionReviewFieldKey,
		extractionReviewFilename,
		onVisuraFileChange,
		clearVisuraFile,
		extractVisura,
		insertReviewedVisura,
	};
}

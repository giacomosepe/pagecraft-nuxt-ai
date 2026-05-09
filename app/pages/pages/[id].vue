<script setup lang="ts">
// app/pages/pages/[id].vue
//
// Three-panel document editor — thin orchestrator.
// All data fetching: usePage. All generation state: useGeneration.
// All UI: StepNav, StepEditor, StepOutput.

import type { Ref } from "vue";
import type { StepRecord } from "~/types/app.types";
import { buildIntestazione } from "~/utils/buildIntestazione";
import { buildStepPreview, stepPreviewToText } from "~/utils/buildStepPreview";
import { STEP_STATUS } from "~/utils/statuses";

definePageMeta({ middleware: "auth" });

const route = useRoute();
const pageId = route.params.id as string;

const { page, steps, clientData, pending, error, patchPage } = usePage(pageId);

// ─── Active step state ────────────────────────────────────────────────────────
const activeStepIndex = ref(0);
const configurationActive = ref(false);

const activeStep = computed<StepRecord | undefined>(
	() => steps.value?.[activeStepIndex.value],
);

// ─── Generation ───────────────────────────────────────────────────────────────
const {
	output,
	isGenerating,
	isCommitting,
	errorMsg,
	commitSuccess,
	generate,
	refine,
	commit,
	discard,
	generatePremessa,
} = useGeneration({
	pageId,
	activeStep,
	steps: steps as Ref<StepRecord[] | null | undefined>,
	activeStepIndex,
});

const hasUnsavedOutputChanges = computed(
	() => Boolean(output.value) && output.value !== (activeStep.value?.committed_output ?? ""),
);

const canGoNext = computed(
	() =>
		activeStep.value?.status === STEP_STATUS.COMMITTED &&
		!hasUnsavedOutputChanges.value &&
		activeStepIndex.value < ((steps.value?.length ?? 0) - 1),
);

// Initialise output from DB on first load
watch(
	steps,
	(currentSteps) => {
		if (!currentSteps) return;
		output.value = activeStep.value?.committed_output ?? "";
	},
	{ immediate: true },
);

// ─── Commit toast ─────────────────────────────────────────────────────────────
const toast = useToast();

watch(commitSuccess, (val) => {
	if (val) {
		toast.add({
			title: "Step salvato",
			description: "Il contenuto è stato salvato. Puoi continuare con lo step successivo.",
			color: "success",
			duration: 2000,
		});
	}
});

// ─── Type-A output assembly + auto-commit ────────────────────────────────────
const stepFormValues = ref<Record<string, unknown>>({});

function onFormValuesChange(values: Record<string, unknown>): void {
	stepFormValues.value = values;
}

function firstFormText(...values: unknown[]): string {
	for (const value of values) {
		const text = String(value ?? "").trim();
		if (text) return text;
	}
	return "";
}

// Reset on step navigation
watch(activeStepIndex, () => {
	configurationActive.value = false;
	output.value = activeStep.value?.committed_output ?? "";
	errorMsg.value = "";
	stepFormValues.value = {};
});

function buildTypeAOutput(templateOverride: string | null = null): string | null {
	if (activeStep.value?.step_type !== "type_a") return null;
	if (activeStep.value.order !== 1) return null;
	const c = clientData.value;
	const p = page.value;
	return buildIntestazione({
		programTitle: firstFormText(stepFormValues.value.program_title, p?.title),
		companyName: firstFormText(
			stepFormValues.value.company_name,
			stepFormValues.value.ragione_sociale,
			c?.company_name,
			"[RAGIONE SOCIALE]",
		),
		companyForm: c?.company_form ?? "",
		legalRepresentative: firstFormText(
			stepFormValues.value.legal_representative,
			stepFormValues.value.legale_rappresentante,
			c?.legal_representative,
			"[LEGALE RAPPRESENTANTE]",
		),
		taxYear: firstFormText(
			stepFormValues.value.tax_year,
			stepFormValues.value.anno_di_imposta,
			stepFormValues.value.esercizio_fiscale,
			p?.tax_year,
		) || null,
		templateOverride,
	});
}

const stepPreview = computed(() =>
	buildStepPreview({
		step: activeStep.value ?? null,
		client: clientData.value,
		pageTitle: page.value?.title ?? null,
		taxYear: page.value?.tax_year ?? null,
		formValues: stepFormValues.value,
		showTokensOnly: activeStep.value?.step_type === "type_a" && !output.value,
	}),
);

const typeATemplateText = computed(() =>
	stepPreviewToText(
		buildStepPreview({
			step: activeStep.value ?? null,
			client: clientData.value,
			pageTitle: page.value?.title ?? null,
			taxYear: page.value?.tax_year ?? null,
			formValues: {},
			showTokensOnly: activeStep.value?.step_type === "type_a",
		}),
	),
);

const projectBackTo = computed(() =>
	page.value?.folder_id ? `/folders/${page.value.folder_id}` : "/progetti",
);

function produceTypeA(templateOverride: string | null): void {
	const nextOutput = buildTypeAOutput(templateOverride);
	if (nextOutput !== null) output.value = nextOutput;
}

function discardOutput(): void {
	if (activeStep.value?.step_type === "type_a") {
		output.value = "";
		errorMsg.value = "";
		return;
	}

	discard();
}

function goNext(): void {
	if (!canGoNext.value) return;
	activeStepIndex.value++;
}

function selectStep(index: number): void {
	configurationActive.value = false;
	activeStepIndex.value = index;
}

function selectConfiguration(): void {
	configurationActive.value = true;
	errorMsg.value = "";
}

// ─── Word export ──────────────────────────────────────────────────────────────
const isExporting = ref(false);
const exportError = ref("");

const allCommitted = computed(
	() =>
		(steps.value?.length ?? 0) > 0 &&
		(steps.value ?? []).every((s) => s.committed_output !== null),
);

async function exportWord(): Promise<void> {
	if (!allCommitted.value || isExporting.value) return;
	isExporting.value = true;
	exportError.value = "";
	try {
		const res = await fetch("/api/export/word", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ pageId }),
		});
		if (!res.ok) throw new Error("Export failed");
		const blob = await res.blob();
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "patent-box.docx";
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	} catch {
		exportError.value = "Non siamo riusciti a esportare il documento Word. Riprova tra qualche istante.";
	} finally {
		isExporting.value = false;
	}
}
</script>

<template>
	<BasePageContainer size="full">
		<BaseStateMessage
			v-if="pending"
			loading
			surface
			class="min-h-[60vh]"
			title="Caricamento documento in corso..."
		/>

		<BaseStateMessage
			v-else-if="error || !page"
			surface
			tone="error"
			class="min-h-[60vh]"
			icon="i-lucide-circle-alert"
			title="Impossibile caricare il documento"
			description="Controlla che il documento esista ancora oppure torna all'elenco per riprovare."
		>
			<template #actions>
				<UButton variant="ghost" color="neutral" to="/documenti">
					Torna ai documenti
				</UButton>
			</template>
		</BaseStateMessage>

		<template v-else>
			<BasePageHeader
				:title="page.title"
				description="Lavora step per step sul documento, compila i dati necessari e salva l’output finale senza uscire dal flusso."
			>
				<template #meta>
					<div class="flex flex-wrap items-center gap-2 text-xs">
						<span class="rounded-full border border-slate-200 bg-white px-3 py-1 font-medium text-slate-600">
							{{ page.framework_name ?? "Framework non definito" }}
						</span>
						<span
							v-if="page.tax_year"
							class="rounded-full border border-slate-200 bg-white px-3 py-1 font-medium text-slate-600"
						>
							Anno fiscale {{ page.tax_year }}
						</span>
						<span
							v-if="!page.client_id"
							class="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 font-medium text-amber-700"
						>
							Nessun cliente collegato
						</span>
					</div>
				</template>

				<template #actions>
					<UButton
						variant="outline"
						color="neutral"
						size="lg"
						icon="i-lucide-download"
						class="rounded-xl border-slate-300 bg-white px-5"
						:disabled="!allCommitted || isExporting"
						:loading="isExporting"
						@click="exportWord"
					>
						Esporta Word
					</UButton>
				</template>
			</BasePageHeader>

			<UAlert
				v-if="exportError"
				color="error"
				variant="soft"
				icon="i-lucide-circle-alert"
				:description="exportError"
				class="mb-4"
			/>

			<EditorShell>
				<template #nav>
					<div class="flex h-full min-h-0 flex-col">
						<div class="border-b border-slate-200 px-4 py-3">
							<NuxtLink
								:to="projectBackTo"
								class="inline-flex items-center gap-1 text-xs font-medium text-slate-500 transition-colors hover:text-slate-900"
							>
								<UIcon name="i-lucide-arrow-left" class="size-3.5" />
								Progetto
							</NuxtLink>
						</div>

						<StepNav
							:steps="steps ?? []"
							:active-index="activeStepIndex"
							:configuration-active="configurationActive"
							@select="selectStep"
							@select-configuration="selectConfiguration"
						/>

						<div class="border-t border-slate-200 px-4 py-4">
							<p class="text-xs leading-5 text-slate-500">
								Quando tutti gli step sono completati puoi esportare il documento in Word.
							</p>
						</div>
					</div>
				</template>

				<template #document>
					<StepOutput
						v-if="!configurationActive"
						:output="output"
						:preview="stepPreview"
						:is-generating="isGenerating"
						:is-committing="isCommitting"
						:active-step="activeStep ?? null"
						:can-go-next="canGoNext"
						:has-unsaved-changes="hasUnsavedOutputChanges"
						@commit="commit"
						@discard="discardOutput"
						@refine="refine"
						@update-output="output = $event"
						@next="goNext"
					/>

					<div
						v-else
						class="flex h-full min-h-[420px] items-center justify-center bg-slate-50 px-6"
					>
						<div class="max-w-sm text-center">
							<div class="mx-auto grid size-12 place-items-center rounded-lg border border-slate-200 bg-white">
								<UIcon name="i-lucide-settings" class="size-6 text-slate-500" />
							</div>
							<h2 class="mt-4 text-base font-semibold text-slate-950">
								Configurazione documento
							</h2>
							<p class="mt-2 text-sm leading-6 text-slate-500">
								I documenti caricati qui saranno disponibili come contesto per gli step supportati.
							</p>
						</div>
					</div>
				</template>

				<template #work>
					<ContextDocumentsPanel
						v-if="configurationActive"
						:page-id="pageId"
					/>
					<StepEditor
						v-else-if="activeStep"
						:page-id="pageId"
						:active-step="activeStep"
						:is-generating="isGenerating"
						:is-committing="isCommitting"
						:can-go-next="canGoNext"
						:error-msg="errorMsg"
						:output="output"
						:client-data="clientData"
						:page-title="page.title"
						:tax-year="page.tax_year"
						:type-a-template-content="typeATemplateText"
						@generate="generate"
						@refine="refine"
						@form-values-change="onFormValuesChange"
						@produce-type-a="produceTypeA"
						@generate-premessa="generatePremessa"
						@commit="commit"
						@discard="discardOutput"
						@next="goNext"
						@conferma-struttura="output = $event"
						@project-detail-change="patchPage"
					/>
				</template>
			</EditorShell>
		</template>
	</BasePageContainer>
</template>

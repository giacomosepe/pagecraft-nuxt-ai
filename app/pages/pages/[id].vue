<script setup lang="ts">
// app/pages/pages/[id].vue
//
// Three-panel document editor — thin orchestrator.
// All data fetching: usePage. All generation state: useGeneration.
// All UI: StepNav, StepEditor, StepOutput.

import type { Ref } from "vue";
import type { StepFormField, StepRecord } from "~/types/app.types";
import { buildIntestazione } from "~/utils/buildIntestazione";

definePageMeta({ middleware: "auth" });

const route = useRoute();
const pageId = route.params.id as string;

const { page, steps, clientData, pending, error } = usePage(pageId);

// ─── Active step state ────────────────────────────────────────────────────────
const activeStepIndex = ref(0);

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

// Initialise output from DB on first load
watch(
	steps,
	() => {
		output.value = activeStep.value?.committed_output ?? "";
	},
	{ once: true },
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
const typeAFormValues = ref<Record<string, unknown>>({});
let autoCommitTimer: ReturnType<typeof setTimeout> | null = null;

function onFormValuesChange(values: Record<string, unknown>): void {
	if (activeStep.value?.step_type !== "type_a") return;
	typeAFormValues.value = values;
}

// Reset on step navigation
watch(activeStepIndex, () => {
	output.value = activeStep.value?.committed_output ?? "";
	errorMsg.value = "";
	typeAFormValues.value = {};
	if (autoCommitTimer) {
		clearTimeout(autoCommitTimer);
		autoCommitTimer = null;
	}
});

const typeAOutput = computed<string | null>(() => {
	if (activeStep.value?.step_type !== "type_a") return null;
	const c = clientData.value;
	const p = page.value;
	return buildIntestazione({
		programTitle: String(typeAFormValues.value.program_title ?? ""),
		legalCitation: String(typeAFormValues.value.legal_citation ?? ""),
		companyName: c?.company_name ?? "[RAGIONE SOCIALE]",
		companyForm: c?.company_form ?? "",
		legalRepresentative: c?.legal_representative ?? "[LEGALE RAPPRESENTANTE]",
		taxYear: p?.tax_year ?? null,
	});
});

// Push assembled text into the shared output ref so StepOutput renders it live
watch(typeAOutput, (val) => {
	if (val !== null) output.value = val;
});

// Auto-commit when all user-fillable fields are non-empty (debounced 800ms)
watch(typeAOutput, (val) => {
	if (val === null) return;
	if (autoCommitTimer) clearTimeout(autoCommitTimer);

	const schema = (activeStep.value?.form_schema as StepFormField[] | null) ?? [];
	// Fields without a defaultValue are the ones users must fill manually
	const userFillable = schema.filter((f) => f.defaultValue === undefined);
	const allFilled = userFillable.every((f) => {
		const v = typeAFormValues.value[f.key];
		return v !== null && v !== undefined && String(v).trim() !== "";
	});

	if (!allFilled) return;
	if (val === activeStep.value?.committed_output) return;

	autoCommitTimer = setTimeout(() => {
		commit();
		autoCommitTimer = null;
	}, 800);
});

// ─── Word export ──────────────────────────────────────────────────────────────
const isExporting = ref(false);

const allCommitted = computed(
	() =>
		(steps.value?.length ?? 0) > 0 &&
		(steps.value ?? []).every((s) => s.committed_output !== null),
);

async function exportWord(): Promise<void> {
	if (!allCommitted.value || isExporting.value) return;
	isExporting.value = true;
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
		// Silent fail — button returns to normal state
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
				description="Lavora step per step sul documento, genera le bozze AI e salva l’output finale senza uscire dal flusso."
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

			<EditorShell>
				<template #nav>
					<EditorPanel body-class="overflow-hidden p-0">
						<template #header>
							<EditorPanelHeader
								title="Mappa del documento"
								description="Segui i passaggi, controlla l’avanzamento e passa rapidamente allo step successivo."
								eyebrow="Navigazione"
							>
								<template #meta>
									<NuxtLink
										to="/clienti"
										class="inline-flex items-center gap-1 text-xs font-medium text-slate-400 transition-colors hover:text-slate-600"
									>
										<UIcon name="i-lucide-arrow-left" class="size-3.5" />
										Clienti
									</NuxtLink>
								</template>
							</EditorPanelHeader>
						</template>

						<StepNav
							:steps="steps ?? []"
							:active-index="activeStepIndex"
							@select="activeStepIndex = $event"
						/>

						<template #footer>
							<p class="text-xs leading-5 text-slate-500">
								Quando tutti gli step sono completati puoi esportare il documento in Word.
							</p>
						</template>
					</EditorPanel>
				</template>

				<template #main>
					<StepEditor
						v-if="activeStep"
						:active-step="activeStep"
						:is-generating="isGenerating"
						:error-msg="errorMsg"
						:output="output"
						@generate="generate"
						@refine="refine"
						@form-values-change="onFormValuesChange"
						@generate-premessa="generatePremessa(page?.tax_year ?? 0, page?.tax_year ?? 0)"
						@conferma-struttura="output = $event"
					/>
				</template>

				<template #output>
					<StepOutput
						:output="output"
						:is-generating="isGenerating"
						:is-committing="isCommitting"
						:active-step="activeStep ?? null"
						@commit="commit"
						@discard="discard"
					/>
				</template>
			</EditorShell>
		</template>
	</BasePageContainer>
</template>

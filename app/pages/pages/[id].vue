<script setup lang="ts">
// app/pages/pages/[id].vue
//
// Three-panel document editor — thin orchestrator.
// All data fetching: usePage. All generation state: useGeneration.
// All UI: StepNav, StepEditor, StepOutput.

import type { Ref } from "vue";
import type { StepRecord } from "~/types/app.types";

definePageMeta({ middleware: "auth" });

const route = useRoute();
const pageId = route.params.id as string;

const { page, steps, pending, error } = usePage(pageId);

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
	generate,
	refine,
	commit,
	discard,
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

// Reset on step navigation
watch(activeStepIndex, () => {
	output.value = activeStep.value?.committed_output ?? "";
	errorMsg.value = "";
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
		<div v-if="pending" class="flex min-h-[60vh] items-center justify-center">
			<UIcon
				name="i-lucide-loader-circle"
				class="size-6 animate-spin text-slate-400"
			/>
		</div>

		<div
			v-else-if="error || !page"
			class="flex min-h-[60vh] flex-col items-center justify-center gap-3 rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm"
		>
			<p class="text-sm text-slate-500">Impossibile caricare il documento.</p>
			<UButton variant="ghost" to="/clienti">Torna ai clienti</UButton>
		</div>

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
						@generate="generate"
						@refine="refine"
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

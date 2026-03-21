<script setup lang="ts">
definePageMeta({ middleware: "auth" });

const supabase = useSupabaseClient();
const route = useRoute();
const pageId = route.params.id as string;

// ─── Load page + steps ────────────────────────────────────────────────────
const { data, pending, error } = await useAsyncData(
	`page-${pageId}`,
	async () => {
		const [pageRes, stepsRes] = await Promise.all([
			supabase
				.from("pages")
				.select("id, title, status, framework_name, client_id, tax_year")
				.eq("id", pageId)
				.single(),
			supabase
				.from("steps")
				.select("id, order, title, status, user_context, committed_output, system_prompt_template, refine_prompt_template, form_schema, form_data")
				.eq("page_id", pageId)
				.order("order", { ascending: true }),
		]);
		if (pageRes.error) throw pageRes.error;
		if (stepsRes.error) throw stepsRes.error;
		return { page: pageRes.data, steps: stepsRes.data };
	},
	{ server: false },
);

// ─── Load client data for AI context ─────────────────────────────────────
// Client data is loaded lazily after page loads, only if a client is linked.
// This replaces the old company_profiles query.
const clientData = ref<Record<string, any> | null>(null);
watch(data, async (val) => {
	const clientId = val?.page?.client_id;
	if (!clientId || clientData.value) return;
	const { data: c } = await supabase
		.from("clients")
		.select("id, name, company_name, industry_sector, employee_count, legal_representative, vat_number, codice_fiscale, registered_address, company_form, board_members, shareholders, subsidiaries")
		.eq("id", clientId)
		.single();
	clientData.value = c;
}, { once: true });

// ─── Active step state ────────────────────────────────────────────────────
const activeStepIndex = ref(0);
const userContext = ref("");
const output = ref("");
const isGenerating = ref(false);
const isCommitting = ref(false);
const errorMsg = ref("");

const activeStep = computed(() => data.value?.steps?.[activeStepIndex.value]);

watch(activeStepIndex, () => {
	userContext.value = activeStep.value?.user_context ?? "";
	output.value = activeStep.value?.committed_output ?? "";
	errorMsg.value = "";
});

watch(data, () => {
	userContext.value = activeStep.value?.user_context ?? "";
	output.value = activeStep.value?.committed_output ?? "";
}, { once: true });

// ─── Progress ─────────────────────────────────────────────────────────────
const committedCount = computed(() =>
	data.value?.steps?.filter((s) => s.status === "COMMITTED").length ?? 0,
);
const totalSteps = computed(() => data.value?.steps?.length ?? 0);
const progressPct = computed(() =>
	totalSteps.value ? Math.round((committedCount.value / totalSteps.value) * 100) : 0,
);

// ─── Generate ─────────────────────────────────────────────────────────────
async function generate() {
	if (!activeStep.value || isGenerating.value) return;
	isGenerating.value = true;
	output.value = "";
	errorMsg.value = "";

	try {
		const res = await fetch("/api/generations/create", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				stepId: activeStep.value.id,
				pageId,
				userContext: userContext.value,
				mode: "generate",
			}),
		});
		if (!res.ok) {
			const err = await res.json();
			throw new Error(err.message ?? "Generation failed");
		}
		const reader = res.body?.getReader();
		const decoder = new TextDecoder();
		if (!reader) throw new Error("No response stream");
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			output.value += decoder.decode(value, { stream: true });
		}
	} catch (e: any) {
		errorMsg.value = e.message ?? "Something went wrong";
		output.value = "";
	} finally {
		isGenerating.value = false;
	}
}

// ─── Refine ───────────────────────────────────────────────────────────────
async function refine() {
	if (!activeStep.value || isGenerating.value || !output.value) return;
	isGenerating.value = true;
	errorMsg.value = "";
	const previousOutput = output.value;
	output.value = "";

	try {
		const res = await fetch("/api/generations/create", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				stepId: activeStep.value.id,
				pageId,
				userContext: userContext.value,
				mode: "refine",
				existingOutput: previousOutput,
			}),
		});
		if (!res.ok) {
			const err = await res.json();
			throw new Error(err.message ?? "Refinement failed");
		}
		const reader = res.body?.getReader();
		const decoder = new TextDecoder();
		if (!reader) throw new Error("No response stream");
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			output.value += decoder.decode(value, { stream: true });
		}
	} catch (e: any) {
		errorMsg.value = e.message ?? "Something went wrong";
		output.value = previousOutput;
	} finally {
		isGenerating.value = false;
	}
}

// ─── Commit ───────────────────────────────────────────────────────────────
async function commit() {
	if (!activeStep.value || !output.value || isGenerating.value) return;
	isCommitting.value = true;
	errorMsg.value = "";

	try {
		await $fetch("/api/db/mutate", {
			method: "POST",
			body: {
				table: "steps",
				operation: "update",
				data: {
					committed_output: output.value,
					user_context: userContext.value,
					status: "COMMITTED",
				},
				where: { id: activeStep.value.id },
			},
		});
		if (data.value?.steps) {
			data.value.steps[activeStepIndex.value].status = "COMMITTED";
			data.value.steps[activeStepIndex.value].committed_output = output.value;
			data.value.steps[activeStepIndex.value].user_context = userContext.value;
		}
		if (activeStepIndex.value < totalSteps.value - 1) {
			activeStepIndex.value++;
		}
	} catch (e: any) {
		errorMsg.value = "Could not save. Please try again.";
	} finally {
		isCommitting.value = false;
	}
}

// ─── Discard ─────────────────────────────────────────────────────────────
function discard() {
	output.value = activeStep.value?.committed_output ?? "";
	errorMsg.value = "";
}

// ─── System prompt toggle ─────────────────────────────────────────────────
const showSystemPrompt = ref(false);

// ─── Guided modal ─────────────────────────────────────────────────────────
const showContextModal = ref(false);

function onModalConfirm(assembledContext: string) {
	userContext.value = assembledContext;
	showContextModal.value = false;
}
</script>

<template>
	<div class="flex h-screen overflow-hidden">
		<!-- Loading -->
		<div v-if="pending" class="flex flex-1 items-center justify-center">
			<UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-gray-400" />
		</div>

		<!-- Error -->
		<div v-else-if="error || !data" class="flex flex-1 flex-col items-center justify-center gap-3">
			<p class="text-sm text-gray-500">Could not load this page.</p>
			<UButton variant="ghost" to="/dashboard">Back to dashboard</UButton>
		</div>

		<!-- Three-panel editor -->
		<template v-else>
			<!-- ── Left panel: step navigation ── -->
			<aside class="flex w-48 shrink-0 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
				<!-- Page title -->
				<div class="border-b border-gray-100 px-3 py-3 dark:border-gray-800">
					<p class="truncate text-xs font-medium text-gray-900 dark:text-white">
						{{ data.page.title }}
					</p>
					<p class="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
						{{ data.page.framework_name }}
					</p>
				</div>

				<!-- No client warning -->
				<div
					v-if="!data.page.client_id"
					class="flex items-start gap-2 border-b border-yellow-200 bg-yellow-50 px-3 py-2 dark:border-yellow-800 dark:bg-yellow-950"
				>
					<UIcon name="i-lucide-triangle-alert" class="mt-0.5 size-3 shrink-0 text-yellow-600 dark:text-yellow-400" />
					<p class="text-xs text-yellow-700 dark:text-yellow-300">
						Nessun cliente collegato
					</p>
				</div>

				<!-- Progress bar -->
				<div class="px-3 pt-3">
					<div class="h-1 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
						<div
							class="h-full rounded-full bg-primary-500 transition-all duration-300"
							:style="{ width: `${progressPct}%` }"
						/>
					</div>
					<p class="mt-1 text-xs text-gray-400">
						{{ committedCount }}/{{ totalSteps }} committed
					</p>
				</div>

				<!-- Step list -->
				<nav class="flex-1 overflow-y-auto px-2 py-2">
					<button
						v-for="(step, index) in data.steps"
						:key="step.id"
						class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors"
						:class="index === activeStepIndex ? 'bg-gray-100 dark:bg-gray-900' : 'hover:bg-gray-50 dark:hover:bg-gray-900'"
						@click="activeStepIndex = index"
					>
						<div
							class="flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-medium"
							:class="{
								'bg-primary-500 text-white': step.status === 'COMMITTED',
								'border-2 border-primary-500 text-primary-600 dark:text-primary-400': index === activeStepIndex && step.status !== 'COMMITTED',
								'border border-gray-300 text-gray-400 dark:border-gray-600': index !== activeStepIndex && step.status !== 'COMMITTED',
							}"
						>
							<UIcon v-if="step.status === 'COMMITTED'" name="i-lucide-check" class="size-3" />
							<span v-else>{{ step.order }}</span>
						</div>
						<span
							class="truncate text-xs"
							:class="index === activeStepIndex ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'"
						>
							{{ step.title }}
						</span>
					</button>
				</nav>

				<!-- Export -->
				<div class="border-t border-gray-100 p-2 dark:border-gray-800">
					<UButton variant="ghost" color="neutral" size="xs" icon="i-lucide-download" class="w-full justify-center" disabled>
						Export Word
					</UButton>
				</div>
			</aside>

			<!-- ── Center panel: prompt + controls ── -->
			<div class="flex w-96 shrink-0 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
				<div class="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
					<div>
						<h2 class="text-sm font-semibold text-gray-900 dark:text-white">
							{{ activeStep?.title }}
						</h2>
						<p class="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
							Descrivi cosa approfondire — l'AI combina le tue istruzioni con il profilo aziendale automaticamente.
						</p>
					</div>

					<div class="flex items-center justify-between">
						<span class="text-xs text-gray-400 dark:text-gray-500">Contesto aggiuntivo</span>
						<UButton
							variant="ghost"
							color="primary"
							size="xs"
							icon="i-lucide-list-plus"
							:disabled="isGenerating"
							@click="showContextModal = true"
						>
							Usa modulo guidato
						</UButton>
					</div>

					<UTextarea
						v-model="userContext"
						:rows="6"
						placeholder="es. Concentrati sull'algoritmo di riconoscimento immagini sviluppato nel 2023…"
						class="w-full text-sm"
						:disabled="isGenerating"
					/>

					<div>
						<button
							class="text-xs text-primary-600 underline underline-offset-2 hover:text-primary-700 dark:text-primary-400"
							@click="showSystemPrompt = !showSystemPrompt"
						>
							{{ showSystemPrompt ? "Nascondi" : "Mostra" }} system prompt
						</button>
						<div v-if="showSystemPrompt" class="mt-2 rounded-md bg-gray-50 p-3 dark:bg-gray-900">
							<pre class="whitespace-pre-wrap text-xs text-gray-500 dark:text-gray-400">{{ activeStep?.system_prompt_template }}</pre>
						</div>
					</div>

					<UAlert
						v-if="errorMsg"
						color="error"
						variant="soft"
						:description="errorMsg"
						icon="i-lucide-circle-alert"
						size="sm"
					/>
				</div>

				<!-- Action buttons -->
				<div class="border-t border-gray-100 p-3 dark:border-gray-800">
					<div class="flex gap-2">
						<UButton class="flex-1 justify-center" variant="outline" size="sm" :loading="isGenerating" :disabled="isGenerating" @click="generate">
							Genera
						</UButton>
						<UButton class="flex-1 justify-center" variant="outline" size="sm" :disabled="isGenerating || !output" @click="refine">
							Raffina
						</UButton>
					</div>
					<div class="mt-2 flex gap-2">
						<UButton variant="ghost" color="neutral" size="sm" class="flex-1 justify-center" :disabled="activeStepIndex === 0" @click="activeStepIndex--">
							← Indietro
						</UButton>
						<UButton size="sm" class="flex-1 justify-center" :disabled="!output || isGenerating" :loading="isCommitting" @click="commit">
							Salva →
						</UButton>
					</div>
				</div>
			</div>

			<!-- ── Right panel: output ── -->
			<div class="flex flex-1 flex-col bg-gray-50 dark:bg-gray-950">
				<div class="flex items-center justify-between border-b border-gray-200 px-5 py-3 dark:border-gray-800">
					<span class="text-xs font-medium text-gray-500 dark:text-gray-400">Output generato</span>
					<div v-if="isGenerating" class="flex items-center gap-1.5">
						<span class="size-1.5 animate-pulse rounded-full bg-primary-500" />
						<span class="text-xs text-primary-600 dark:text-primary-400">Generazione…</span>
					</div>
					<UBadge v-else-if="activeStep?.status === 'COMMITTED'" color="success" variant="soft" size="xs">
						Salvato
					</UBadge>
				</div>

				<div class="flex-1 overflow-y-auto px-6 py-5">
					<div v-if="output" class="prose prose-sm max-w-none dark:prose-invert">
						<p class="whitespace-pre-wrap text-sm leading-relaxed text-gray-800 dark:text-gray-200">
							{{ output }}
						</p>
					</div>
					<div v-else class="flex h-full items-center justify-center">
						<div class="text-center">
							<UIcon name="i-lucide-sparkles" class="mx-auto mb-3 size-8 text-gray-300 dark:text-gray-700" />
							<p class="text-sm text-gray-400 dark:text-gray-500">
								Aggiungi contesto e clicca Genera per creare il contenuto
							</p>
						</div>
					</div>
				</div>

				<div v-if="output && !isGenerating" class="flex items-center justify-end gap-2 border-t border-gray-200 px-5 py-3 dark:border-gray-800">
					<UButton color="neutral" variant="ghost" size="sm" @click="discard">Scarta</UButton>
					<UButton size="sm" :loading="isCommitting" @click="commit">Salva</UButton>
				</div>
			</div>
		</template>
	</div>

	<!-- Guided context modal -->
	<UModal v-model:open="showContextModal" :ui="{ content: 'max-w-lg' }">
		<template #content>
			<StepContextModal
				v-if="activeStep"
				:step-order="activeStep.order"
				:step-title="activeStep.title"
				:client-data="clientData"
				@confirm="onModalConfirm"
				@cancel="showContextModal = false"
			/>
		</template>
	</UModal>
</template>

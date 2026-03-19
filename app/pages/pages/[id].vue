<script setup lang="ts">
definePageMeta({ middleware: "auth" });

const client = useSupabaseClient();
const route = useRoute();
const pageId = route.params.id as string;

// ─── Load page + steps ────────────────────────────────────────────────────
// We load the page metadata and all its steps in parallel.
// Steps are ordered by `order` — always use Step rows, never FrameworkStep.
const { data, pending, error } = await useAsyncData(
	`page-${pageId}`,
	async () => {
		const [pageRes, stepsRes] = await Promise.all([
			client
				.from("pages")
				.select(
					"id, title, status, framework_name, client_id, company_profile_id",
				)
				.eq("id", pageId)
				.single(),
			client
				.from("steps")
				.select(
					"id, order, title, status, user_context, committed_output, system_prompt_template, refine_prompt_template",
				)
				.eq("page_id", pageId)
				.order("order", { ascending: true }),
		]);

		if (pageRes.error) throw pageRes.error;
		if (stepsRes.error) throw stepsRes.error;

		return { page: pageRes.data, steps: stepsRes.data };
	},
	{ server: false },
);

// ─── Load company profile for the guided modal ────────────────────────────
// Loaded lazily after page data is available. Used only by StepContextModal.
const companyProfile = ref<Record<string, any> | null>(null);
watch(
	data,
	async (val) => {
		const profileId = val?.page?.company_profile_id;
		if (!profileId || companyProfile.value) return;
		const { data: profile } = await client
			.from("company_profiles")
			.select(
				"company_name, tax_year, industry_sector, employee_count, legal_representative, board_members, shareholders, subsidiaries",
			)
			.eq("id", profileId)
			.single();
		companyProfile.value = profile;
	},
	{ once: true },
);

// ─── Active step state ────────────────────────────────────────────────────
// activeStepIndex tracks which step the user is on.
// userContext is the textarea content for the current step.
// output is the generated text shown in the right panel.
// isGenerating tracks streaming state.
const activeStepIndex = ref(0);
const userContext = ref("");
const output = ref("");
const isGenerating = ref(false);
const isCommitting = ref(false);
const errorMsg = ref("");

// Computed shorthand for the currently active step
const activeStep = computed(() => data.value?.steps?.[activeStepIndex.value]);

// When user switches steps, load that step's saved context and output
watch(activeStepIndex, () => {
	userContext.value = activeStep.value?.user_context ?? "";
	output.value = activeStep.value?.committed_output ?? "";
	errorMsg.value = "";
});

// Initialise on first load
watch(
	data,
	() => {
		userContext.value = activeStep.value?.user_context ?? "";
		output.value = activeStep.value?.committed_output ?? "";
	},
	{ once: true },
);

// ─── Progress calculation ─────────────────────────────────────────────────
const committedCount = computed(
	() =>
		data.value?.steps?.filter((s) => s.status === "COMMITTED").length ?? 0,
);
const totalSteps = computed(() => data.value?.steps?.length ?? 0);
const progressPct = computed(() =>
	totalSteps.value
		? Math.round((committedCount.value / totalSteps.value) * 100)
		: 0,
);

// ─── Step status helpers ──────────────────────────────────────────────────
function stepIcon(step: NonNullable<typeof data.value>["steps"][number]) {
	if (step.status === "COMMITTED") return "i-lucide-check";
	if (step.status === "IN_PROGRESS") return "i-lucide-pencil";
	return null;
}

// ─── Generate ─────────────────────────────────────────────────────────────
// Calls the server route which streams Claude output back.
// We read the stream chunk by chunk and append to `output`.
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

		// Read the streaming response
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
// Saves the current output to the step's committed_output and marks it COMMITTED.
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

		// Update local state
		if (data.value?.steps) {
			data.value.steps[activeStepIndex.value].status = "COMMITTED";
			data.value.steps[activeStepIndex.value].committed_output =
				output.value;
			data.value.steps[activeStepIndex.value].user_context =
				userContext.value;
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

// ─── Premessa template route (step order 2) ───────────────────────────────
// No Claude call — returns fixed legal text with company + year substituted.
async function generatePremessa(payload: {
	taxYearStart: number;
	taxYearEnd: number;
}) {
	if (isGenerating.value) return;
	isGenerating.value = true;
	output.value = "";
	errorMsg.value = "";
	try {
		const res = await fetch("/api/generations/premessa", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ pageId, ...payload }),
		});
		if (!res.ok) {
			const err = await res.json();
			throw new Error(err.message ?? "Template generation failed");
		}
		output.value = await res.text();
	} catch (e: any) {
		errorMsg.value = e.message ?? "Something went wrong";
	} finally {
		isGenerating.value = false;
	}
}

// ─── Guided modal state ───────────────────────────────────────────────────
const showContextModal = ref(false);

function onModalConfirm(assembledContext: string) {
	userContext.value = assembledContext;
	showContextModal.value = false;
}

function onModalConfirmPremessa(payload: {
	taxYearStart: number;
	taxYearEnd: number;
}) {
	showContextModal.value = false;
	generatePremessa(payload);
}

// ─── Show/hide system prompt ──────────────────────────────────────────────
const showSystemPrompt = ref(false);

// ─── Client / profile link ────────────────────────────────────────────────
// Allows linking a page to a client profile after creation.
// Shown in the page header when company_profile_id is not set.
const showProfilePicker = ref(false);
const profilePickerClientId = ref<string | null>(null);
const profilePickerProfileId = ref<string | null>(null);
const profilePickerLoading = ref(false);

const { data: allClients } = await useAsyncData(
	"clients-for-picker",
	async () => {
		const { data } = await client
			.from("clients")
			.select("id, name")
			.order("name");
		return data ?? [];
	},
	{ server: false },
);

const { data: pickerProfiles } = await useAsyncData(
	() => `picker-profiles-${profilePickerClientId.value}`,
	async () => {
		if (!profilePickerClientId.value) return [];
		const { data } = await client
			.from("company_profiles")
			.select("id, name, tax_year")
			.eq("client_id", profilePickerClientId.value)
			.order("tax_year", { ascending: false });
		return data ?? [];
	},
	{ watch: [profilePickerClientId] },
);

watch(profilePickerClientId, () => {
	profilePickerProfileId.value = null;
});

async function linkProfile() {
	if (!profilePickerProfileId.value || !profilePickerClientId.value) return;
	profilePickerLoading.value = true;
	try {
		await $fetch("/api/db/mutate", {
			method: "POST",
			body: {
				table: "pages",
				operation: "update",
				data: {
					client_id: profilePickerClientId.value,
					company_profile_id: profilePickerProfileId.value,
				},
				where: { id: pageId },
			},
		});
		// Update local state so the banner disappears without a reload
		if (data.value?.page) {
			data.value.page.company_profile_id = profilePickerProfileId.value;
		}
		// Also trigger the company profile load for the modal
		const { data: profile } = await client
			.from("company_profiles")
			.select(
				"company_name, tax_year, industry_sector, employee_count, legal_representative, board_members, shareholders, subsidiaries",
			)
			.eq("id", profilePickerProfileId.value)
			.single();
		companyProfile.value = profile;
		showProfilePicker.value = false;
	} catch {
		errorMsg.value = "Non è stato possibile collegare il profilo. Riprova.";
	} finally {
		profilePickerLoading.value = false;
	}
}
</script>

<template>
	<div class="flex h-screen overflow-hidden">
		<!-- Loading state -->
		<div v-if="pending" class="flex flex-1 items-center justify-center">
			<UIcon
				name="i-lucide-loader-circle"
				class="size-6 animate-spin text-gray-400"
			/>
		</div>

		<!-- Error state -->
		<div
			v-else-if="error || !data"
			class="flex flex-1 flex-col items-center justify-center gap-3"
		>
			<p class="text-sm text-gray-500">Could not load this page.</p>
			<UButton variant="ghost" to="/dashboard">Back to dashboard</UButton>
		</div>

		<!-- Three-panel editor -->
		<template v-else>
			<!-- ── Left panel: step navigation ── -->
			<aside
				class="flex w-48 shrink-0 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
			>
				<!-- Page title -->
				<div
					class="border-b border-gray-100 px-3 py-3 dark:border-gray-800"
				>
					<p
						class="truncate text-xs font-medium text-gray-900 dark:text-white"
					>
						{{ data.page.title }}
					</p>
					<p class="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
						{{ data.page.framework_name }}
					</p>
				</div>

				<!-- No profile warning banner -->
				<button
					v-if="!data.page.company_profile_id"
					class="flex items-start gap-2 border-b border-yellow-200 bg-yellow-50 px-3 py-2 text-left dark:border-yellow-800 dark:bg-yellow-950"
					@click="showProfilePicker = true"
				>
					<UIcon name="i-lucide-triangle-alert" class="mt-0.5 size-3 shrink-0 text-yellow-600 dark:text-yellow-400" />
					<p class="text-xs text-yellow-700 dark:text-yellow-300">
						Nessun profilo collegato.
						<span class="underline">Collega ora</span>
					</p>
				</button>

				<!-- Progress bar -->
				<div class="px-3 pt-3">
					<div
						class="h-1 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"
					>
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
						:class="
							index === activeStepIndex
								? 'bg-gray-100 dark:bg-gray-900'
								: 'hover:bg-gray-50 dark:hover:bg-gray-900'
						"
						@click="activeStepIndex = index"
					>
						<!-- Step number / status indicator -->
						<div
							class="flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-medium"
							:class="{
								'bg-primary-500 text-white':
									step.status === 'COMMITTED',
								'border-2 border-primary-500 text-primary-600 dark:text-primary-400':
									index === activeStepIndex &&
									step.status !== 'COMMITTED',
								'border border-gray-300 text-gray-400 dark:border-gray-600':
									index !== activeStepIndex &&
									step.status !== 'COMMITTED',
							}"
						>
							<UIcon
								v-if="step.status === 'COMMITTED'"
								name="i-lucide-check"
								class="size-3"
							/>
							<span v-else>{{ step.order }}</span>
						</div>

						<!-- Step title -->
						<span
							class="truncate text-xs"
							:class="
								index === activeStepIndex
									? 'font-medium text-gray-900 dark:text-white'
									: 'text-gray-500 dark:text-gray-400'
							"
						>
							{{ step.title }}
						</span>
					</button>
				</nav>

				<!-- Export button -->
				<div class="border-t border-gray-100 p-2 dark:border-gray-800">
					<UButton
						variant="ghost"
						color="neutral"
						size="xs"
						icon="i-lucide-download"
						class="w-full justify-center"
						disabled
					>
						Export Word
					</UButton>
				</div>
			</aside>

			<!-- ── Center panel: prompt + controls ── -->
			<div
				class="flex w-96 shrink-0 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
			>
				<div class="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
					<!-- Step title + description -->
					<div>
						<h2
							class="text-sm font-semibold text-gray-900 dark:text-white"
						>
							{{ activeStep?.title }}
						</h2>
						<p
							class="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400"
						>
							Describe what to focus on — AI combines your input
							with the system prompt and company profile
							automatically.
						</p>
					</div>

					<!-- Guided form button + textarea row -->
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

					<!-- User context textarea -->
					<UTextarea
						v-model="userContext"
						:rows="6"
						placeholder="e.g. Focus on the image recognition algorithm developed in 2023, highlight novelty vs prior art…"
						class="w-full text-sm"
						:disabled="isGenerating"
					/>

					<!-- View system prompt toggle -->
					<div>
						<button
							class="text-xs text-primary-600 underline underline-offset-2 hover:text-primary-700 dark:text-primary-400"
							@click="showSystemPrompt = !showSystemPrompt"
						>
							{{ showSystemPrompt ? "Hide" : "View" }} system
							prompt
						</button>
						<div
							v-if="showSystemPrompt"
							class="mt-2 rounded-md bg-gray-50 p-3 dark:bg-gray-900"
						>
							<pre
								class="whitespace-pre-wrap text-xs text-gray-500 dark:text-gray-400"
								>{{ activeStep?.system_prompt_template }}</pre
							>
						</div>
					</div>

					<!-- Error message -->
					<UAlert
						v-if="errorMsg"
						color="error"
						variant="soft"
						:description="errorMsg"
						icon="i-lucide-circle-alert"
						size="sm"
					/>
				</div>

				<!-- Action buttons — pinned to bottom -->
				<div class="border-t border-gray-100 p-3 dark:border-gray-800">
					<div class="flex gap-2">
						<UButton
							class="flex-1 justify-center"
							variant="outline"
							size="sm"
							:loading="isGenerating"
							:disabled="isGenerating"
							@click="generate"
						>
							Generate
						</UButton>
						<UButton
							class="flex-1 justify-center"
							variant="outline"
							size="sm"
							:disabled="isGenerating || !output"
							@click="refine"
						>
							Refine
						</UButton>
					</div>
					<div class="mt-2 flex gap-2">
						<UButton
							variant="ghost"
							color="neutral"
							size="sm"
							class="flex-1 justify-center"
							:disabled="activeStepIndex === 0"
							@click="activeStepIndex--"
						>
							← Back
						</UButton>
						<UButton
							size="sm"
							class="flex-1 justify-center"
							:disabled="!output || isGenerating"
							:loading="isCommitting"
							@click="commit"
						>
							Commit →
						</UButton>
					</div>
				</div>
			</div>

			<!-- ── Right panel: output ── -->
			<div class="flex flex-1 flex-col bg-gray-50 dark:bg-gray-950">
				<!-- Output header -->
				<div
					class="flex items-center justify-between border-b border-gray-200 px-5 py-3 dark:border-gray-800"
				>
					<span
						class="text-xs font-medium text-gray-500 dark:text-gray-400"
					>
						Generated output
					</span>
					<div v-if="isGenerating" class="flex items-center gap-1.5">
						<span
							class="size-1.5 animate-pulse rounded-full bg-primary-500"
						/>
						<span
							class="text-xs text-primary-600 dark:text-primary-400"
							>Generating…</span
						>
					</div>
					<UBadge
						v-else-if="activeStep?.status === 'COMMITTED'"
						color="success"
						variant="soft"
						size="xs"
					>
						Committed
					</UBadge>
				</div>

				<!-- Output content -->
				<div class="flex-1 overflow-y-auto px-6 py-5">
					<div
						v-if="output"
						class="prose prose-sm max-w-none dark:prose-invert"
					>
						<p
							class="whitespace-pre-wrap text-sm leading-relaxed text-gray-800 dark:text-gray-200"
						>
							{{ output }}
						</p>
					</div>
					<div v-else class="flex h-full items-center justify-center">
						<div class="text-center">
							<UIcon
								name="i-lucide-sparkles"
								class="mx-auto mb-3 size-8 text-gray-300 dark:text-gray-700"
							/>
							<p class="text-sm text-gray-400 dark:text-gray-500">
								Add context and click Generate to create content
								for this step
							</p>
						</div>
					</div>
				</div>

				<!-- Output actions -->
				<div
					v-if="output && !isGenerating"
					class="flex items-center justify-end gap-2 border-t border-gray-200 px-5 py-3 dark:border-gray-800"
				>
					<UButton
						color="neutral"
						variant="ghost"
						size="sm"
						@click="discard"
					>
						Discard
					</UButton>
					<UButton size="sm" :loading="isCommitting" @click="commit">
						Commit
					</UButton>
				</div>
			</div>
		</template>
	</div>

	<!-- ── Guided context modal ── -->
	<UModal v-model:open="showContextModal" :ui="{ content: 'max-w-lg' }">
		<template #content>
			<StepContextModal
				v-if="activeStep"
				:step-order="activeStep.order"
				:step-title="activeStep.title"
				:company-profile="companyProfile"
				@confirm="onModalConfirm"
				@confirm-premessa="onModalConfirmPremessa"
				@cancel="showContextModal = false"
			/>
		</template>
	</UModal>

	<!-- ── Profile picker modal ── -->
	<UModal v-model:open="showProfilePicker" :ui="{ content: 'max-w-sm' }">
		<template #content>
			<div class="flex flex-col gap-5 p-5">
				<div>
					<h2 class="text-base font-semibold text-gray-900 dark:text-white">
						Collega un profilo aziendale
					</h2>
					<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
						I dati del profilo verranno usati automaticamente dall'AI in tutte le sezioni.
					</p>
				</div>

				<UFormField label="Cliente">
					<USelect
						v-model="profilePickerClientId"
						:items="(allClients ?? []).map((c) => ({ label: c.name, value: c.id }))"
						placeholder="Seleziona cliente"
						class="w-full"
					/>
				</UFormField>

				<UFormField label="Profilo aziendale">
					<USelect
						v-model="profilePickerProfileId"
						:items="(pickerProfiles ?? []).map((p) => ({ label: `${p.name ?? p.tax_year} · ${p.tax_year}`, value: p.id }))"
						placeholder="Seleziona profilo"
						:disabled="!profilePickerClientId"
						class="w-full"
					/>
				</UFormField>

				<div
					v-if="profilePickerClientId && !(pickerProfiles ?? []).length"
					class="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-300"
				>
					Questo cliente non ha profili.
					<NuxtLink
						:to="`/clients/${profilePickerClientId}/profiles/new`"
						target="_blank"
						class="font-medium underline"
					>
						Creane uno ora →
					</NuxtLink>
				</div>

				<div class="flex justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
					<UButton color="neutral" variant="ghost" @click="showProfilePicker = false">Annulla</UButton>
					<UButton
						:disabled="!profilePickerProfileId"
						:loading="profilePickerLoading"
						@click="linkProfile"
					>
						Collega profilo
					</UButton>
				</div>
			</div>
		</template>
	</UModal>
</template>

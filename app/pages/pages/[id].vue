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

const { page, steps, clientData, pending, error } = await usePage(pageId);

// ─── Active step state ────────────────────────────────────────────────────────
const activeStepIndex = ref(0);
const userContext = ref("");

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
  userContext,
  steps: steps as Ref<StepRecord[] | null | undefined>,
  activeStepIndex,
});

// Initialise userContext + output from DB on first load
watch(
  steps,
  () => {
    userContext.value = activeStep.value?.user_context ?? "";
    output.value = activeStep.value?.committed_output ?? "";
  },
  { once: true },
);

// Reset on step navigation
watch(activeStepIndex, () => {
  userContext.value = activeStep.value?.user_context ?? "";
  output.value = activeStep.value?.committed_output ?? "";
  errorMsg.value = "";
});

// ─── Modals ───────────────────────────────────────────────────────────────────
const showContextModal = ref(false);

function onModalConfirm(text: string): void {
  userContext.value = text;
  showContextModal.value = false;
}
</script>

<template>
  <div class="flex h-screen overflow-hidden">
    <!-- Loading -->
    <div v-if="pending" class="flex flex-1 items-center justify-center">
      <UIcon
        name="i-lucide-loader-circle"
        class="size-6 animate-spin"
        style="color: var(--color-text-placeholder)"
      />
    </div>

    <!-- Error -->
    <div
      v-else-if="error || !page"
      class="flex flex-1 flex-col items-center justify-center gap-3"
    >
      <p class="text-sm" style="color: var(--color-text-muted)">
        Impossibile caricare il documento.
      </p>
      <UButton variant="ghost" to="/clienti">Torna ai clienti</UButton>
    </div>

    <!-- Three-panel editor -->
    <template v-else>
      <!-- Left panel: navigation -->
      <aside
        class="flex w-48 shrink-0 flex-col border-r"
        style="
          border-color: var(--color-border);
          background-color: var(--color-surface);
        "
      >
        <!-- Back + page title -->
        <div
          class="border-b px-3 py-3"
          style="border-color: var(--color-border-subtle)"
        >
          <NuxtLink
            to="/clienti"
            class="mb-2 flex items-center gap-1 text-xs hover:underline"
            style="color: var(--color-text-placeholder)"
          >
            <UIcon name="i-lucide-arrow-left" class="size-3" />
            Clienti
          </NuxtLink>
          <p
            class="truncate text-xs font-medium"
            style="color: var(--color-text-primary)"
          >
            {{ page.title }}
          </p>
          <p class="mt-0.5 text-xs" style="color: var(--color-text-muted)">
            {{ page.framework_name }}
          </p>
        </div>

        <!-- No client warning -->
        <div
          v-if="!page.client_id"
          class="flex items-start gap-2 border-b border-yellow-200 bg-yellow-50 px-3 py-2 dark:border-yellow-800 dark:bg-yellow-950"
        >
          <UIcon
            name="i-lucide-triangle-alert"
            class="mt-0.5 size-3 shrink-0 text-yellow-600 dark:text-yellow-400"
          />
          <p class="text-xs text-yellow-700 dark:text-yellow-300">
            Nessun cliente collegato
          </p>
        </div>

        <!-- Step navigation -->
        <div class="min-h-0 flex-1">
          <StepNav
            :steps="steps ?? []"
            :active-index="activeStepIndex"
            @select="activeStepIndex = $event"
          />
        </div>

        <!-- Export -->
        <div
          class="border-t p-2"
          style="border-color: var(--color-border-subtle)"
        >
          <UButton
            variant="ghost"
            color="neutral"
            size="xs"
            icon="i-lucide-download"
            class="w-full justify-center"
            disabled
          >
            Esporta Word
          </UButton>
        </div>
      </aside>

      <!-- Center + Right panels -->
      <div
        class="grid min-w-0 flex-1"
        style="grid-template-columns: 2fr 1fr"
      >
        <!-- Center: input + controls -->
        <StepEditor
          v-if="activeStep"
          :active-step="activeStep"
          :is-generating="isGenerating"
          :error-msg="errorMsg"
          v-model:user-context="userContext"
          @generate="generate"
          @refine="refine"
          @open-context-modal="showContextModal = true"
        />

        <!-- Right: generated output -->
        <StepOutput
          :output="output"
          :is-generating="isGenerating"
          :is-committing="isCommitting"
          :active-step="activeStep ?? null"
          @commit="commit"
          @discard="discard"
        />
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

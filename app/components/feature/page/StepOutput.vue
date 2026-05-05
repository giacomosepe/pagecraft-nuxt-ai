<script setup lang="ts">
// app/components/feature/page/StepOutput.vue
//
// Right panel of the document editor.
// Displays the AI-generated output for the active step.
// Pure display component — no generation logic here.
// Emits commit and discard up to the page.

import type { StepRecord } from "~/types/app.types";
import type { StepPreview } from "~/utils/buildStepPreview";
import { isRichTextHtml, sanitizeRichTextHtml } from "~/utils/richText";

const props = defineProps<{
  output: string;
  preview: StepPreview;
  isGenerating: boolean;
  isCommitting: boolean;
  activeStep: StepRecord | null;
  canGoNext: boolean;
  hasUnsavedChanges?: boolean;
}>();

const emit = defineEmits<{
  commit: [];
  discard: [];
  refine: [];
  updateOutput: [value: string];
  next: [];
}>();

const showExpandModal = ref(false);
const showEditorModal = ref(false);

const shouldFormatStruttura = computed(() => props.activeStep?.order === 3);
const outputIsRichHtml = computed(() => isRichTextHtml(props.output));
const safeOutputHtml = computed(() => sanitizeRichTextHtml(props.output));
const canRefineWithAi = computed(() =>
  props.activeStep?.step_type === "type_c" && Boolean(props.output) && !props.isGenerating,
);

function confirmEditedOutput(value: string): void {
  emit("updateOutput", value);
  showEditorModal.value = false;
}

function openEditor(): void {
  showExpandModal.value = false;
  showEditorModal.value = true;
}

function cancelEditOutput(): void {
  showEditorModal.value = false;
}

function outputSections(text: string): { title: string; paragraphs: string[] }[] {
  const sections: { title: string; paragraphs: string[] }[] = [];
  const lines = text.split("\n");
  let current: { title: string; paragraphs: string[] } | null = null;

  for (const line of lines) {
    const value = line.trim();
    if (!value) continue;

    if (value === value.toUpperCase() && !value.includes(".")) {
      current = { title: value, paragraphs: [] };
      sections.push(current);
      continue;
    }

    if (!current) {
      current = { title: props.activeStep?.title ?? "Output", paragraphs: [] };
      sections.push(current);
    }

    current.paragraphs.push(value);
  }

  return sections;
}

function highlightedParts(paragraph: string): { text: string; isPlaceholder: boolean }[] {
  return paragraph.split(/(\[DA COMPLETARE\])/g)
    .filter(Boolean)
    .map((text) => ({
      text,
      isPlaceholder: text === "[DA COMPLETARE]",
    }));
}
</script>

<template>
  <EditorPanel flush body-class="overflow-y-auto px-6 py-5">
    <template #header>
      <EditorPanelHeader
        title="Output generato"
        :description="activeStep?.title ?? 'Contenuto dello step attivo'"
        :eyebrow="output ? 'Documento' : preview.eyebrow"
      >
        <template #badge>
          <StepStatusPill
            v-if="activeStep"
            :status="activeStep.status"
          />
        </template>

        <template #actions>
          <div class="flex items-center gap-2">
            <div
              v-if="isGenerating"
              class="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-1.5 text-xs font-medium text-violet-700"
            >
              <UIcon name="i-lucide-loader-circle" class="size-3.5 animate-spin" />
              Generazione…
            </div>

            <UButton
              v-if="output"
              variant="ghost"
              color="neutral"
              size="sm"
              icon="i-lucide-expand"
              class="rounded-xl"
              @click="showExpandModal = true"
            />
          </div>
        </template>
      </EditorPanelHeader>
    </template>

    <div
      v-if="output"
      class="mx-auto w-full max-w-3xl bg-white px-1 py-2 sm:px-4"
    >
      <div
        v-if="outputIsRichHtml"
        class="rich-output text-sm leading-7 text-slate-700"
        v-html="safeOutputHtml"
      />

      <div
        v-else-if="shouldFormatStruttura"
        class="space-y-5"
      >
        <section
          v-for="section in outputSections(output)"
          :key="section.title"
          class="space-y-3"
        >
          <h3 class="border-b border-slate-200 pb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            {{ section.title }}
          </h3>
          <p
            v-for="paragraph in section.paragraphs"
            :key="paragraph"
            class="text-sm leading-7 text-slate-700"
          >
            <template
              v-for="(part, index) in highlightedParts(paragraph)"
              :key="`${paragraph}-${index}`"
            >
              <span
                v-if="part.isPlaceholder"
                class="inline-flex rounded-md bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200"
              >
                {{ part.text }}
              </span>
              <template v-else>{{ part.text }}</template>
            </template>
          </p>
        </section>
      </div>

      <p
        v-else
        class="whitespace-pre-wrap text-sm leading-7 text-slate-700"
      >
        {{ output }}
      </p>
    </div>

    <div
      v-else
      class="mx-auto flex min-h-[320px] w-full max-w-3xl flex-col justify-center bg-white px-1 py-2 sm:px-4"
    >
      <div class="space-y-6 border-l-2 border-violet-200 pl-5">
        <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
          {{ preview.eyebrow }}
        </p>
        <h3 class="mt-2 text-base font-semibold text-slate-900">
          {{ preview.title }}
        </h3>

        <section
          v-for="(section, sectionIndex) in preview.sections"
          :key="`${section.title ?? 'preview'}-${sectionIndex}`"
          class="space-y-3"
        >
          <h4
            v-if="section.title"
            class="border-b border-slate-200 pb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500"
          >
            {{ section.title }}
          </h4>
          <p class="whitespace-pre-wrap text-sm leading-7 text-slate-600">
            <template
              v-for="(part, partIndex) in section.parts"
              :key="`${sectionIndex}-${partIndex}`"
            >
              <span
                v-if="part.isToken"
                class="inline-flex rounded-md bg-violet-50 px-1.5 py-0.5 text-xs font-semibold text-violet-700 ring-1 ring-violet-100"
              >
                {{ "{\u007b " }}{{ part.text }}{{ " \u007d}" }}
              </span>
              <template v-else>{{ part.text }}</template>
            </template>
          </p>
        </section>

        <div
          v-if="preview.tokens.length"
          class="mt-6 flex flex-wrap gap-2"
        >
          <span
            v-for="field in preview.tokens"
            :key="field.key"
            class="inline-flex items-center rounded-md bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-700 ring-1 ring-violet-100"
          >
            {{ field.label }}
          </span>
        </div>

        <div
          v-else
          class="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500"
        >
          Nessuna variabile richiesta per questo step.
        </div>
      </div>
    </div>

    <template #footer>
      <div
        v-if="output && !isGenerating"
        class="flex items-center justify-end gap-2"
      >
        <span
          v-if="hasUnsavedChanges"
          class="mr-auto text-xs font-medium text-amber-700"
        >
          Modifiche da salvare
        </span>
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          class="rounded-xl"
          @click="emit('discard')"
        >
          Scarta
        </UButton>
        <UButton
          color="neutral"
          variant="outline"
          size="sm"
          icon="i-lucide-pencil"
          class="rounded-xl bg-white"
          @click="openEditor"
        >
          Modifica testo
        </UButton>
        <UButton
          v-if="activeStep?.step_type === 'type_c'"
          color="neutral"
          variant="outline"
          size="sm"
          icon="i-lucide-sparkles"
          class="rounded-xl bg-white"
          :loading="isGenerating"
          :disabled="!canRefineWithAi"
          @click="emit('refine')"
        >
          Affina con AI
        </UButton>
        <UButton
          size="sm"
          class="rounded-xl"
          :loading="isCommitting"
          @click="emit('commit')"
        >
          Salva
        </UButton>
        <UButton
          v-if="canGoNext"
          size="sm"
          class="rounded-xl"
          icon="i-lucide-arrow-right"
          trailing
          @click="emit('next')"
        >
          Avanti
        </UButton>
      </div>
    </template>
  </EditorPanel>

  <!-- Expand modal -->
  <UModal v-model:open="showExpandModal" :ui="{ content: 'max-w-4xl' }">
    <template #content>
      <div class="flex max-h-[80vh] flex-col bg-white">
        <div class="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Output completo
            </p>
            <span class="text-sm font-medium text-slate-900">
              {{ activeStep?.title }}
            </span>
          </div>
          <UButton
            variant="ghost"
            color="neutral"
            size="sm"
            class="rounded-xl"
            icon="i-lucide-x"
            @click="showExpandModal = false"
          />
        </div>
        <div class="flex-1 overflow-y-auto px-6 py-6">
          <div
            v-if="outputIsRichHtml"
            class="rich-output text-sm leading-7 text-slate-700"
            v-html="safeOutputHtml"
          />
          <p
            v-else
            class="whitespace-pre-wrap text-sm leading-7 text-slate-700"
          >
            {{ output }}
          </p>
        </div>
        <div class="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            class="rounded-xl"
            @click="showExpandModal = false"
          >
            Chiudi
          </UButton>
          <UButton
            color="neutral"
            variant="outline"
            size="sm"
            icon="i-lucide-pencil"
            class="rounded-xl bg-white"
            @click="openEditor"
          >
            Modifica testo
          </UButton>
          <UButton
            v-if="activeStep?.step_type === 'type_c'"
            color="neutral"
            variant="outline"
            size="sm"
            icon="i-lucide-sparkles"
            class="rounded-xl bg-white"
            :loading="isGenerating"
            :disabled="!canRefineWithAi"
            @click="emit('refine'); showExpandModal = false"
          >
            Affina con AI
          </UButton>
          <UButton
            size="sm"
            class="rounded-xl"
            :loading="isCommitting"
            @click="emit('commit'); showExpandModal = false"
          >
            Salva
          </UButton>
          <UButton
            v-if="canGoNext"
            size="sm"
            class="rounded-xl"
            icon="i-lucide-arrow-right"
            trailing
            @click="emit('next'); showExpandModal = false"
          >
            Avanti
          </UButton>
        </div>
      </div>
    </template>
  </UModal>

  <TextEditorModal
    v-if="showEditorModal"
    title="Modifica testo"
    :content="output"
    confirm-label="Applica modifiche"
    :on-confirm="confirmEditedOutput"
    :on-cancel="cancelEditOutput"
  />
</template>

<style scoped>
.rich-output :deep(p) {
  margin: 0 0 1rem;
}

.rich-output :deep(ul),
.rich-output :deep(ol) {
  margin: 0 0 1rem 1.25rem;
  list-style-position: outside;
}

.rich-output :deep(ul) {
  list-style-type: disc;
}

.rich-output :deep(ol) {
  list-style-type: decimal;
}

.rich-output :deep(li) {
  margin: 0.25rem 0;
}
</style>

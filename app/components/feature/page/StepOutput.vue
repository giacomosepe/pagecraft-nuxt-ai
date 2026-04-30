<script setup lang="ts">
// app/components/feature/page/StepOutput.vue
//
// Right panel of the document editor.
// Displays the AI-generated output for the active step.
// Pure display component — no generation logic here.
// Emits commit and discard up to the page.

import type { StepRecord } from "~/types/app.types";

const props = defineProps<{
  output: string;
  isGenerating: boolean;
  isCommitting: boolean;
  activeStep: StepRecord | null;
  canGoNext: boolean;
}>();

const emit = defineEmits<{
  commit: [];
  discard: [];
  next: [];
}>();

const showExpandModal = ref(false);

const shouldFormatStruttura = computed(() => props.activeStep?.order === 3);

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
  <EditorPanel tone="subtle" body-class="overflow-y-auto px-6 py-5">
    <template #header>
      <EditorPanelHeader
        title="Output generato"
        description="Qui trovi la bozza corrente del contenuto prodotto per lo step attivo."
        eyebrow="Bozza AI"
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
      class="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div
        v-if="shouldFormatStruttura"
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
      class="flex h-full min-h-[320px] items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-white/70 p-8 text-center"
    >
      <div class="max-w-xs">
        <div class="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
          <UIcon name="i-lucide-sparkles" class="size-7" />
        </div>
        <p class="text-sm font-medium text-slate-900">
          Nessuna bozza disponibile
        </p>
        <p class="mt-2 text-sm leading-6 text-slate-500">
          Avvia la generazione dal pannello centrale per vedere qui il contenuto proposto.
        </p>
      </div>
    </div>

    <template #footer>
      <div
        v-if="output && !isGenerating"
        class="flex items-center justify-end gap-2"
      >
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
          <p class="whitespace-pre-wrap text-sm leading-7 text-slate-700">
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
</template>

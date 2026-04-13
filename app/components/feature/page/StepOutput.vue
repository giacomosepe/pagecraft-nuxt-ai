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
}>();

const emit = defineEmits<{
  commit: [];
  discard: [];
}>();

const showExpandModal = ref(false);
</script>

<template>
  <div
    class="flex min-w-0 flex-col"
    style="background-color: var(--color-surface-subtle)"
  >
    <!-- Header -->
    <div
      class="flex items-center justify-between border-b px-4 py-3"
      style="border-color: var(--color-border)"
    >
      <span class="text-xs font-medium" style="color: var(--color-text-muted)">
        Output generato
      </span>
      <div class="flex items-center gap-2">
        <!-- Streaming indicator -->
        <div v-if="isGenerating" class="flex items-center gap-1.5">
          <span
            class="size-1.5 animate-pulse rounded-full"
            style="background-color: var(--color-brand)"
          />
          <span class="text-xs" style="color: var(--color-brand-text)">
            Generazione…
          </span>
        </div>
        <!-- Committed badge -->
        <UBadge
          v-else-if="activeStep?.status === 'COMMITTED'"
          color="success"
          variant="soft"
          size="xs"
        >
          Salvato
        </UBadge>
        <!-- Expand -->
        <UButton
          v-if="output"
          variant="ghost"
          color="neutral"
          size="xs"
          icon="i-lucide-expand"
          @click="showExpandModal = true"
        />
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto px-4 py-4">
      <p
        v-if="output"
        class="whitespace-pre-wrap text-sm leading-relaxed"
        style="color: var(--color-text-primary)"
      >
        {{ output }}
      </p>
      <div v-else class="flex h-full items-center justify-center">
        <div class="text-center">
          <UIcon
            name="i-lucide-sparkles"
            class="mx-auto mb-3 size-8"
            style="color: var(--color-text-placeholder)"
          />
          <p class="text-xs" style="color: var(--color-text-placeholder)">
            Clicca Genera per creare il contenuto
          </p>
        </div>
      </div>
    </div>

    <!-- Footer actions -->
    <div
      v-if="output && !isGenerating"
      class="flex items-center justify-end gap-2 border-t px-4 py-3"
      style="border-color: var(--color-border)"
    >
      <UButton
        color="neutral"
        variant="ghost"
        size="sm"
        @click="emit('discard')"
      >
        Scarta
      </UButton>
      <UButton size="sm" :loading="isCommitting" @click="emit('commit')">
        Salva
      </UButton>
    </div>
  </div>

  <!-- Expand modal -->
  <UModal v-model:open="showExpandModal" :ui="{ content: 'max-w-4xl' }">
    <template #content>
      <div class="flex flex-col" style="max-height: 80vh">
        <div
          class="flex items-center justify-between border-b px-5 py-3"
          style="border-color: var(--color-border)"
        >
          <span
            class="text-sm font-medium"
            style="color: var(--color-text-primary)"
          >
            {{ activeStep?.title }} — Output completo
          </span>
          <UButton
            variant="ghost"
            color="neutral"
            size="xs"
            icon="i-lucide-x"
            @click="showExpandModal = false"
          />
        </div>
        <div class="flex-1 overflow-y-auto px-6 py-5">
          <p
            class="whitespace-pre-wrap text-sm leading-relaxed"
            style="color: var(--color-text-primary)"
          >
            {{ output }}
          </p>
        </div>
        <div
          class="flex justify-end gap-2 border-t px-5 py-3"
          style="border-color: var(--color-border)"
        >
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            @click="showExpandModal = false"
          >
            Chiudi
          </UButton>
          <UButton
            size="sm"
            :loading="isCommitting"
            @click="emit('commit'); showExpandModal = false"
          >
            Salva
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

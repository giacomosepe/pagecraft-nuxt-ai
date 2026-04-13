<script setup lang="ts">
// app/components/feature/page/StepEditor.vue
//
// Center panel of the document editor for a single step.
// Renders step title, form fields from form_schema, userContext textarea,
// and the AI generation action buttons.
//
// Generation state lives in the parent page (via useGeneration).
// This component receives generate/refine as emits and isGenerating as prop
// so that output is shared with StepOutput on the same page.

import type { StepRecord } from "~/types/app.types";

// ─── Form field schema (cast from form_schema JSONB) ──────────────────────────
interface FormField {
  key: string;
  label: string;
  type: "text" | "textarea" | "select" | "number";
  options?: string[];
  placeholder?: string;
}

// ─── Props ────────────────────────────────────────────────────────────────────
const props = defineProps<{
  activeStep: StepRecord;
  isGenerating: boolean;
  errorMsg?: string;
}>();

// Two-way binding for the userContext textarea — owned by the parent page
const userContext = defineModel<string>("userContext", { required: true });

const emit = defineEmits<{
  generate: [];
  refine: [];
  openContextModal: [];
}>();

// ─── Form schema ──────────────────────────────────────────────────────────────
const formFields = computed<FormField[]>(() => {
  const schema = props.activeStep.form_schema;
  if (!schema || !Array.isArray(schema)) return [];
  return schema as FormField[];
});

const formValues = ref<Record<string, unknown>>({});

watch(
  () => props.activeStep,
  (step) => {
    const data = step.form_data;
    formValues.value =
      data && typeof data === "object" && !Array.isArray(data)
        ? (data as Record<string, unknown>)
        : {};
  },
  { immediate: true },
);

async function saveFormField(key: string, value: unknown): Promise<void> {
  const updated = { ...formValues.value, [key]: value };
  formValues.value = updated;
  try {
    await $fetch("/api/db/mutate", {
      method: "POST",
      body: {
        table: "steps",
        operation: "update",
        data: { form_data: updated },
        where: { id: props.activeStep.id },
      },
    });
  } catch {
    // Non-blocking — local state already updated optimistically
  }
}

// ─── UI state ─────────────────────────────────────────────────────────────────
const showSystemPrompt = ref(false);
const isAiStep = computed(() => !!props.activeStep.system_prompt_template);

watch(
  () => props.activeStep.id,
  () => {
    showSystemPrompt.value = false;
  },
);
</script>

<template>
  <div
    class="flex h-full flex-col"
    style="background-color: var(--color-surface)"
  >
    <!-- Step header -->
    <div
      class="border-b px-4 py-3"
      style="border-color: var(--color-border-subtle)"
    >
      <div class="flex items-center gap-2">
        <div
          class="flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
          style="background-color: var(--color-brand)"
        >
          {{ activeStep.order }}
        </div>
        <h2
          class="text-sm font-semibold"
          style="color: var(--color-text-primary)"
        >
          {{ activeStep.title }}
        </h2>
      </div>
      <p class="mt-1 text-xs" style="color: var(--color-text-muted)">
        Descrivi cosa approfondire — l'AI combina le tue istruzioni con il
        profilo aziendale automaticamente.
      </p>
    </div>

    <!-- Generate action bar (AI steps only) -->
    <div
      v-if="isAiStep"
      class="border-b px-4 py-3"
      style="border-color: var(--color-border-subtle)"
    >
      <div class="flex gap-2">
        <UButton
          class="flex-1 justify-center"
          size="sm"
          icon="i-lucide-sparkles"
          :loading="isGenerating"
          :disabled="isGenerating"
          @click="emit('generate')"
        >
          Genera bozza AI
        </UButton>
        <UButton
          class="flex-1 justify-center"
          variant="outline"
          color="neutral"
          size="sm"
          :disabled="isGenerating"
          @click="emit('refine')"
        >
          Raffina
        </UButton>
      </div>
    </div>

    <!-- Scrollable content -->
    <div class="flex flex-1 flex-col gap-4 overflow-y-auto p-4">

      <!-- Form fields (type_a / type_b steps) -->
      <template v-if="formFields.length">
        <div class="flex flex-col gap-3">
          <div v-for="field in formFields" :key="field.key">
            <label
              class="mb-1 block text-xs font-medium"
              style="color: var(--color-text-secondary)"
            >
              {{ field.label }}
            </label>
            <UTextarea
              v-if="field.type === 'textarea'"
              :model-value="String(formValues[field.key] ?? '')"
              :placeholder="field.placeholder ?? ''"
              :rows="5"
              class="w-full text-sm"
              :disabled="isGenerating"
              @update:model-value="saveFormField(field.key, $event)"
            />
            <USelect
              v-else-if="field.type === 'select'"
              :model-value="String(formValues[field.key] ?? '')"
              :options="field.options ?? []"
              class="w-full"
              :disabled="isGenerating"
              @update:model-value="saveFormField(field.key, $event)"
            />
            <UInput
              v-else
              :model-value="String(formValues[field.key] ?? '')"
              :placeholder="field.placeholder ?? ''"
              :type="field.type === 'number' ? 'number' : 'text'"
              class="w-full"
              :disabled="isGenerating"
              @update:model-value="saveFormField(field.key, $event)"
            />
          </div>
        </div>
      </template>

      <!-- User context textarea (AI steps) -->
      <template v-if="isAiStep">
        <div class="flex items-center justify-between">
          <span class="text-xs" style="color: var(--color-text-placeholder)">
            Contesto aggiuntivo
          </span>
          <UButton
            variant="ghost"
            color="primary"
            size="xs"
            icon="i-lucide-list-plus"
            :disabled="isGenerating"
            @click="emit('openContextModal')"
          >
            Usa modulo guidato
          </UButton>
        </div>

        <UTextarea
          v-model="userContext"
          :rows="8"
          placeholder="es. Concentrati sull'algoritmo di riconoscimento immagini sviluppato nel 2023…"
          class="w-full text-sm"
          :disabled="isGenerating"
        />

        <!-- System prompt toggle -->
        <div v-if="activeStep.system_prompt_template">
          <UButton
            variant="ghost"
            color="neutral"
            size="xs"
            :icon="showSystemPrompt ? 'i-lucide-eye-off' : 'i-lucide-eye'"
            @click="showSystemPrompt = !showSystemPrompt"
          >
            {{ showSystemPrompt ? "Nascondi" : "Mostra" }} system prompt
          </UButton>
          <div
            v-if="showSystemPrompt"
            class="mt-2 rounded-md p-3"
            style="background-color: var(--color-surface-subtle)"
          >
            <pre
              class="whitespace-pre-wrap text-xs"
              style="color: var(--color-text-muted)"
              >{{ activeStep.system_prompt_template }}</pre
            >
          </div>
        </div>
      </template>

      <!-- Generation in progress -->
      <div v-if="isGenerating" class="flex items-center gap-2">
        <span
          class="size-1.5 animate-pulse rounded-full"
          style="background-color: var(--color-brand)"
        />
        <span class="text-xs" style="color: var(--color-brand-text)">
          Generazione in corso…
        </span>
      </div>

      <!-- Error -->
      <UAlert
        v-if="errorMsg"
        color="error"
        variant="soft"
        :description="errorMsg"
        icon="i-lucide-circle-alert"
        size="sm"
      />
    </div>
  </div>
</template>

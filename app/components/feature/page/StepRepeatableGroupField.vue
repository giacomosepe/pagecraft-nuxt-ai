<script setup lang="ts">
import type { StepFormField } from "~/types/app.types";

const props = defineProps<{
  field: StepFormField;
  instances: Record<string, unknown>[];
  disabled: boolean;
  isCollapsed: (index: number) => boolean;
  instanceSummary: (instance: Record<string, unknown>) => string;
}>();

const emit = defineEmits<{
  add: [];
  remove: [index: number];
  toggleCollapse: [index: number];
  updateSubField: [payload: { index: number; subKey: string; value: unknown }];
}>();
</script>

<template>
  <div class="flex flex-col gap-3">
    <StepFieldShell
      :label="field.label"
      :hint="field.hint"
      :required="field.required"
    />

    <div
      v-for="(instance, idx) in instances"
      :key="idx"
      class="rounded-lg border p-3"
      style="border-color: var(--color-border-subtle); background-color: var(--color-surface-subtle)"
    >
      <div class="mb-2 flex items-center justify-between">
        <button
          v-if="instances.length >= 3"
          class="flex items-center gap-1 text-xs"
          style="color: var(--color-text-muted)"
          type="button"
          @click="emit('toggleCollapse', idx)"
        >
          <UIcon
            :name="isCollapsed(idx) ? 'i-lucide-chevron-right' : 'i-lucide-chevron-down'"
            class="size-3"
          />
          <span v-if="isCollapsed(idx)">
            {{ instanceSummary(instance) }}
          </span>
          <span v-else>Comprimi</span>
        </button>
        <span
          v-else
          class="text-xs font-medium"
          style="color: var(--color-text-muted)"
        >
          #{{ idx + 1 }}
        </span>

        <UButton
          variant="ghost"
          color="neutral"
          size="xs"
          icon="i-lucide-x"
          :disabled="instances.length <= (field.minItems ?? 1) || disabled"
          @click="emit('remove', idx)"
        />
      </div>

      <div
        v-if="!isCollapsed(idx)"
        class="flex flex-col gap-3"
      >
        <StepSimpleField
          v-for="subField in field.fields"
          :key="subField.key"
          :field="subField"
          :model-value="instance[subField.key]"
          :disabled="disabled"
          @update:model-value="emit('updateSubField', {
            index: idx,
            subKey: subField.key,
            value: $event,
          })"
        />
      </div>
    </div>

    <UButton
      variant="outline"
      color="neutral"
      size="xs"
      icon="i-lucide-plus"
      :disabled="disabled"
      @click="emit('add')"
    >
      {{ field.addLabel ?? 'Aggiungi' }}
    </UButton>
  </div>
</template>

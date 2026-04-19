<script setup lang="ts">
import type { StepFormField } from "~/types/app.types";

const props = defineProps<{
  field: StepFormField;
  modelValue: unknown;
  disabled: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: unknown];
}>();

function toggleMultiselectValue(option: string): void {
  const current = Array.isArray(props.modelValue)
    ? (props.modelValue as string[])
    : [];

  const next = current.includes(option)
    ? current.filter((value) => value !== option)
    : [...current, option];

  emit("update:modelValue", next);
}
</script>

<template>
  <StepFieldShell
    :label="field.label"
    :hint="field.hint"
    :required="field.required"
  >
    <div
      v-if="field.type === 'multiselect'"
      class="flex flex-col gap-1.5"
    >
      <label
        v-for="opt in field.options ?? []"
        :key="opt"
        class="flex cursor-pointer items-center gap-2 text-xs"
        style="color: var(--color-text-primary)"
      >
        <input
          type="checkbox"
          :value="opt"
          :checked="Array.isArray(modelValue) && (modelValue as string[]).includes(opt)"
          :disabled="disabled"
          class="rounded"
          @change="toggleMultiselectValue(opt)"
        />
        {{ opt }}
      </label>
    </div>

    <UTextarea
      v-else-if="field.type === 'textarea'"
      :model-value="String(modelValue ?? '')"
      :placeholder="field.placeholder ?? ''"
      :rows="5"
      class="w-full text-sm"
      :disabled="disabled"
      @update:model-value="emit('update:modelValue', $event)"
    />

    <USelect
      v-else-if="field.type === 'select'"
      :model-value="String(modelValue ?? '')"
      :items="field.options ?? []"
      class="w-full"
      :disabled="disabled"
      @update:model-value="emit('update:modelValue', $event)"
    />

    <UInput
      v-else
      :model-value="String(modelValue ?? '')"
      :placeholder="field.placeholder ?? ''"
      :type="field.type === 'number' ? 'number' : 'text'"
      class="w-full"
      :disabled="disabled"
      @update:model-value="emit('update:modelValue', $event)"
    />
  </StepFieldShell>
</template>

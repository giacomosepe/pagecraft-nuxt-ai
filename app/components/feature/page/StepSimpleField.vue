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

const inputType = computed(() => {
  if (props.field.key === "esercizio_fiscale") return "number";
  return props.field.type === "number" ? "number" : "text";
});

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
    :variable-key="field.key"
  >
    <div
      v-if="field.type === 'multiselect'"
      class="grid gap-2 sm:grid-cols-2"
    >
      <label
        v-for="opt in field.options ?? []"
        :key="opt"
        class="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 transition-colors hover:border-violet-200 hover:bg-violet-50/40"
      >
        <input
          type="checkbox"
          :value="opt"
          :checked="Array.isArray(modelValue) && (modelValue as string[]).includes(opt)"
          :disabled="disabled"
          class="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
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
      class="w-full"
      :ui="{
        base: 'w-full rounded-2xl border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-violet-300 focus:ring-violet-200',
      }"
      :disabled="disabled"
      @update:model-value="emit('update:modelValue', $event)"
    />

    <USelect
      v-else-if="field.type === 'select'"
      :model-value="String(modelValue ?? '')"
      :items="field.options ?? []"
      class="w-full"
      :ui="{
        base: 'w-full rounded-2xl border-slate-200 bg-white text-sm text-slate-700',
      }"
      :disabled="disabled"
      @update:model-value="emit('update:modelValue', $event)"
    />

    <UInput
      v-else
      :model-value="String(modelValue ?? '')"
      :placeholder="field.placeholder ?? ''"
      :type="inputType"
      :min="field.key === 'esercizio_fiscale' ? 2020 : undefined"
      :max="field.key === 'esercizio_fiscale' ? 2035 : undefined"
      :step="field.key === 'esercizio_fiscale' ? 1 : undefined"
      class="w-full"
      :ui="{
        base: 'w-full rounded-2xl border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-violet-300 focus:ring-violet-200',
      }"
      :disabled="disabled"
      @update:model-value="emit('update:modelValue', $event)"
    />
  </StepFieldShell>
</template>

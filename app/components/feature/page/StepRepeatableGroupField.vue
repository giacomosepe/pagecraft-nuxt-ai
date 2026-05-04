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
  <div class="flex flex-col gap-4 rounded-[24px] border border-slate-200 bg-white p-4 sm:p-5">
    <StepFieldShell
      :label="field.label"
      :hint="field.hint"
      :required="field.required"
      :variable-key="field.key"
    />

    <div
      v-for="(instance, idx) in instances"
      :key="idx"
      class="rounded-[22px] border border-slate-200 bg-slate-50 p-4"
    >
      <div class="mb-3 flex items-center justify-between gap-3">
        <button
          v-if="instances.length >= 3"
          class="flex items-center gap-1.5 text-xs font-medium text-slate-500"
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
          <span v-else>Comprimi sezione</span>
        </button>
        <span
          v-else
          class="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400"
        >
          Voce {{ idx + 1 }}
        </span>

        <UButton
          variant="ghost"
          color="neutral"
          size="sm"
          class="rounded-xl"
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
      size="sm"
      icon="i-lucide-plus"
      class="w-full rounded-xl border-dashed border-slate-300 bg-slate-50 justify-center sm:w-auto"
      :disabled="disabled"
      @click="emit('add')"
    >
      {{ field.addLabel ?? 'Aggiungi' }}
    </UButton>
  </div>
</template>

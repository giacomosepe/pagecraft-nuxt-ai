<script setup lang="ts">
defineProps<{
  label: string;
  hint?: string;
  required?: boolean;
  variableKey?: string;
}>();
</script>

<template>
  <div class="space-y-2.5">
    <div class="space-y-1">
      <label class="block text-sm font-semibold text-slate-800">
        {{ label }}
        <span v-if="required" class="ml-0.5 text-rose-500">*</span>
      </label>
      <span
        v-if="variableKey"
        class="inline-flex w-fit rounded-md bg-violet-50 px-1.5 py-0.5 text-[11px] font-medium text-violet-700 ring-1 ring-violet-100"
      >
        {{ "{\u007b " }}{{ variableKey }}{{ " \u007d}" }}
      </span>
      <p v-if="hint" class="text-xs leading-5 text-slate-500">
        {{ hint }}
      </p>
    </div>
    <slot />
  </div>
</template>

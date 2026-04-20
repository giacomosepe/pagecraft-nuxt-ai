<script setup lang="ts">
defineProps<{
  label: string;
  hint?: string;
  required?: boolean;
}>();
</script>

<template>
  <div class="space-y-2.5">
    <div class="space-y-1">
      <label class="block text-sm font-semibold text-slate-800">
        {{ label }}
        <span v-if="required" class="ml-0.5 text-rose-500">*</span>
      </label>
      <p v-if="hint" class="text-xs leading-5 text-slate-500">
        {{ hint }}
      </p>
    </div>
    <slot />
  </div>
</template>

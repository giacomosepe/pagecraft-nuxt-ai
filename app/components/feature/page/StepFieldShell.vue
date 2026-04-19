<script setup lang="ts">
defineProps<{
  label: string;
  hint?: string;
  required?: boolean;
}>();
</script>

<template>
  <div>
    <label
      class="mb-1 block text-xs font-medium"
      style="color: var(--color-text-secondary)"
    >
      {{ label }}
      <span v-if="required" class="ml-0.5 text-red-500">*</span>
    </label>
    <p v-if="hint" class="mb-1.5 text-xs" style="color: var(--color-text-muted)">
      {{ hint }}
    </p>
    <slot />
  </div>
</template>

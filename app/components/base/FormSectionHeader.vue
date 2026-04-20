<script setup lang="ts">
defineProps<{
  title: string;
  description?: string | null;
}>();
</script>

<template>
  <div class="space-y-1">
    <h2 class="text-base font-semibold text-slate-900">
      {{ title }}
    </h2>
    <p v-if="description" class="text-sm leading-6 text-slate-500">
      {{ description }}
    </p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  description?: string | null;
}>();
</script>

<template>
  <div class="flex max-h-[80vh] flex-col overflow-hidden rounded-xl bg-white">
    <div class="border-b border-slate-200 px-6 py-5">
      <div class="space-y-1">
        <h2 class="text-base font-semibold text-slate-900">
          {{ title }}
        </h2>
        <p v-if="description" class="text-sm leading-6 text-slate-500">
          {{ description }}
        </p>
      </div>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto px-6 py-5">
      <slot />
    </div>

    <div
      v-if="$slots.footer"
      class="border-t border-slate-200 px-6 py-4"
    >
      <slot name="footer" />
    </div>
  </div>
</template>

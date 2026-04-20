<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string;
    tone?: "neutral" | "info";
  }>(),
  {
    title: "",
    tone: "neutral",
  },
);
</script>

<template>
  <div
    class="rounded-[20px] border px-4 py-3"
    :class="
      tone === 'info'
        ? 'border-violet-200 bg-violet-50 text-violet-700'
        : 'border-slate-200 bg-slate-50 text-slate-600'
    "
  >
    <p v-if="title" class="text-sm font-semibold">
      {{ title }}
    </p>
    <div class="text-sm leading-6">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    tone?: "surface" | "subtle";
    bodyClass?: string;
  }>(),
  {
    tone: "surface",
    bodyClass: "overflow-y-auto px-5 py-5",
  },
);
</script>

<template>
  <section
    class="flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-slate-200 shadow-sm"
    :class="tone === 'subtle' ? 'bg-slate-50/70' : 'bg-white'"
  >
    <div
      v-if="$slots.header"
      class="border-b border-slate-200 px-5 py-4"
    >
      <slot name="header" />
    </div>

    <div class="min-h-0 flex-1" :class="bodyClass">
      <slot />
    </div>

    <div
      v-if="$slots.footer"
      class="border-t border-slate-200 px-5 py-4"
    >
      <slot name="footer" />
    </div>
  </section>
</template>

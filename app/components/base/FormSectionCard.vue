<script setup lang="ts">
defineProps<{
  title?: string;
  description?: string | null;
}>();
</script>

<template>
  <section class="rounded-xl border border-slate-200 bg-white shadow-sm">
    <div
      v-if="title || description || $slots.header"
      class="border-b border-slate-200 px-6 py-5"
    >
      <slot name="header">
        <FormSectionHeader v-if="title" :title="title" :description="description" />
      </slot>
    </div>

    <div class="px-6 py-5">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    hideOutput?: boolean;
  }>(),
  {
    hideOutput: false,
  },
);
</script>

<template>
  <div
    class="grid min-h-[calc(100vh-13rem)] gap-5"
    :class="
      hideOutput
        ? 'lg:grid-cols-[260px_minmax(0,1fr)] 2xl:grid-cols-[280px_minmax(0,1fr)]'
        : 'lg:grid-cols-[260px_minmax(0,1fr)] 2xl:grid-cols-[280px_minmax(0,1.55fr)_minmax(320px,1fr)]'
    "
  >
    <div class="min-h-0">
      <slot name="nav" />
    </div>

    <div class="min-h-0">
      <slot name="main" />
    </div>

    <div
      v-if="!hideOutput"
      class="min-h-0 lg:col-span-2 2xl:col-span-1"
    >
      <slot name="output" />
    </div>
  </div>
</template>

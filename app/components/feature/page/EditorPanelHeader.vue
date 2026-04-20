<script setup lang="ts">
defineProps<{
  title: string;
  description?: string | null;
  eyebrow?: string | null;
}>();
</script>

<template>
  <div class="flex items-start justify-between gap-4">
    <div class="min-w-0 space-y-1.5">
      <p
        v-if="eyebrow"
        class="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400"
      >
        {{ eyebrow }}
      </p>

      <div class="flex min-w-0 items-center gap-2">
        <h2 class="truncate text-base font-semibold text-slate-900">
          {{ title }}
        </h2>
        <slot name="badge" />
      </div>

      <p
        v-if="description"
        class="max-w-xl text-sm leading-6 text-slate-500"
      >
        {{ description }}
      </p>

      <div v-if="$slots.meta" class="pt-1">
        <slot name="meta" />
      </div>
    </div>

    <div
      v-if="$slots.actions"
      class="flex shrink-0 flex-wrap items-center gap-2"
    >
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { StepRecord } from "~/types/app.types";

const props = defineProps<{
  steps: StepRecord[];
  activeIndex: number;
}>();

const emit = defineEmits<{
  select: [index: number];
}>();

const committedCount = computed(
  () => props.steps.filter((s) => s.status === "COMMITTED").length,
);

const progressPct = computed(() =>
  props.steps.length
    ? Math.round((committedCount.value / props.steps.length) * 100)
    : 0,
);

function bubbleStyle(step: StepRecord, index: number): Record<string, string> {
  if (step.status === "COMMITTED") {
    return {
      backgroundColor: "var(--color-status-complete-bg)",
      color: "var(--color-status-complete-text)",
    };
  }
  if (index === props.activeIndex) {
    return { backgroundColor: "var(--color-brand)", color: "white" };
  }
  return {
    border: "1px solid var(--color-border)",
    color: "var(--color-text-placeholder)",
  };
}
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- Progress bar -->
    <div class="border-b px-3 py-3" style="border-color: var(--color-border-subtle)">
      <div class="h-1 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div
          class="h-full rounded-full transition-all duration-300"
          :style="{ width: `${progressPct}%`, backgroundColor: 'var(--color-brand)' }"
        />
      </div>
      <p class="mt-1 text-xs" style="color: var(--color-text-muted)">
        {{ committedCount }}/{{ steps.length }} completati
      </p>
    </div>

    <!-- Step list -->
    <nav class="flex-1 overflow-y-auto px-2 py-2">
      <button
        v-for="(step, index) in steps"
        :key="step.id"
        class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors"
        :style="index === activeIndex ? 'background-color: var(--color-brand-bg)' : ''"
        @click="emit('select', index)"
      >
        <!-- Step number / completion indicator -->
        <div
          class="flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-bold"
          :style="bubbleStyle(step, index)"
        >
          <UIcon v-if="step.status === 'COMMITTED'" name="i-lucide-check" class="size-3" />
          <span v-else>{{ step.order }}</span>
        </div>

        <!-- Step title -->
        <span
          class="truncate text-xs"
          :class="index === activeIndex ? 'font-semibold' : 'font-normal'"
          :style="
            index === activeIndex
              ? 'color: var(--color-text-primary)'
              : 'color: var(--color-text-secondary)'
          "
        >
          {{ step.title }}
        </span>
      </button>
    </nav>
  </div>
</template>

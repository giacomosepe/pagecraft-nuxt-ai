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
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="border-b border-slate-200 px-4 py-4">
      <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div class="flex items-start justify-between gap-3">
          <div class="space-y-1">
            <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Avanzamento
            </p>
            <p class="text-sm font-semibold text-slate-900">
              {{ committedCount }}/{{ steps.length }} step completati
            </p>
            <p class="text-xs text-slate-500">
              Continua dallo step attivo o rivedi quelli già salvati.
            </p>
          </div>

          <div class="rounded-full bg-white px-3 py-1 text-xs font-semibold text-violet-700">
            {{ progressPct }}%
          </div>
        </div>

        <div class="mt-4 h-2 w-full overflow-hidden rounded-full bg-white">
          <div
            class="h-full rounded-full bg-violet-600 transition-all duration-300"
            :style="{ width: `${progressPct}%` }"
          />
        </div>
      </div>
    </div>

    <nav class="flex-1 overflow-y-auto px-3 py-3">
      <div class="space-y-2">
        <button
          v-for="(step, index) in steps"
          :key="step.id"
          class="flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition-all"
          :class="
            index === activeIndex
              ? 'border-violet-200 bg-violet-50 shadow-sm'
              : 'border-transparent bg-white hover:border-slate-200 hover:bg-slate-50'
          "
          @click="emit('select', index)"
        >
          <div
            class="flex size-9 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold"
            :class="
              step.status === 'COMMITTED'
                ? 'bg-emerald-100 text-emerald-700'
                : index === activeIndex
                  ? 'bg-violet-600 text-white'
                  : 'border border-slate-200 bg-white text-slate-400'
            "
          >
            <UIcon v-if="step.status === 'COMMITTED'" name="i-lucide-check" class="size-4" />
            <span v-else>{{ step.order }}</span>
          </div>

          <div class="min-w-0 flex-1 space-y-1">
            <div class="flex items-start justify-between gap-2">
              <p
                class="line-clamp-2 text-sm font-medium"
                :class="index === activeIndex ? 'text-slate-900' : 'text-slate-700'"
              >
                {{ step.title }}
              </p>
              <StepStatusPill :status="step.status" :active="index === activeIndex" />
            </div>

            <p class="text-xs text-slate-500">
              Step {{ step.order }} di {{ steps.length }}
            </p>
          </div>
        </button>
      </div>
    </nav>
  </div>
</template>

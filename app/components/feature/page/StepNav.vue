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

function stepTypeLabel(step: StepRecord): string {
  if (step.step_type === "type_a") return "Inserimento variabili";
  if (step.step_type === "type_b") return "Generazione testo con info";
  if (step.step_type === "type_c") return "Generazione testo con AI";
  return "Step documento";
}

function stepState(step: StepRecord, index: number): "saved" | "active" | "todo" {
  if (index === props.activeIndex) return "active";
  return step.status === "COMMITTED" ? "saved" : "todo";
}
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
          class="step-row"
          :class="`step-row--${stepState(step, index)}`"
          @click="emit('select', index)"
        >
          <div class="step-row__index">
            <span class="step-row__dot" />
            <span class="step-row__number">{{ step.order }}</span>
          </div>

          <div class="min-w-0 flex-1 space-y-1">
            <div class="flex items-start justify-between gap-2">
              <p class="step-row__title">
                {{ step.title }}
              </p>
            </div>

            <p class="step-row__type">
              {{ stepTypeLabel(step) }}
            </p>
          </div>
        </button>
      </div>
    </nav>
  </div>
</template>

<style scoped>
.step-row {
  display: flex;
  width: 100%;
  align-items: flex-start;
  gap: 0.75rem;
  border-left: 2px solid transparent;
  border-radius: 0;
  padding: 0.625rem 0.625rem 0.625rem 0.75rem;
  text-align: left;
  transition: background-color 160ms ease, border-color 160ms ease;
}

.step-row:hover {
  background: var(--color-surface-subtle);
}

.step-row--saved {
  background: var(--color-surface);
}

.step-row--active {
  border-left-color: var(--purple, var(--color-brand));
  background: var(--color-brand-bg);
}

.step-row--todo {
  background: var(--color-surface);
}

.step-row__index {
  display: flex;
  width: 1.5rem;
  flex-shrink: 0;
  align-items: center;
  gap: 0.375rem;
  padding-top: 0.25rem;
}

.step-row__dot {
  display: block;
  width: 6px;
  height: 6px;
  flex-shrink: 0;
  border-radius: 50%;
}

.step-row--saved .step-row__dot {
  background: #639922;
}

.step-row--active .step-row__dot {
  background: var(--purple, var(--color-brand));
}

.step-row--todo .step-row__dot {
  background: var(--border-md, var(--color-border));
}

.step-row__number {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--color-text-placeholder);
}

.step-row__title {
  display: -webkit-box;
  overflow: hidden;
  color: var(--color-text-primary);
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1.05rem;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.step-row--saved .step-row__title {
  opacity: 0.68;
}

.step-row--active .step-row__title {
  opacity: 1;
}

.step-row--todo .step-row__title {
  opacity: 0.42;
}

.step-row__type {
  max-width: 100%;
  overflow: hidden;
  color: var(--color-text-muted);
  font-size: 11px;
  line-height: 1rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>

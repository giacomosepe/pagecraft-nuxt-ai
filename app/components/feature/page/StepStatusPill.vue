<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    status: string;
    active?: boolean;
  }>(),
  {
    active: false,
  },
);

const tone = computed(() => {
  if (props.status === "COMMITTED") {
    return {
      label: "Completato",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  if (props.active) {
    return {
      label: "Attivo",
      className: "border-violet-200 bg-violet-50 text-violet-700",
    };
  }

  if (props.status === "IN_PROGRESS") {
    return {
      label: "In corso",
      className: "border-blue-200 bg-blue-50 text-blue-700",
    };
  }

  if (props.status === "SKIPPED") {
    return {
      label: "Saltato",
      className: "border-slate-200 bg-slate-100 text-slate-600",
    };
  }

  return {
    label: "Da fare",
    className: "border-slate-200 bg-white text-slate-500",
  };
});
</script>

<template>
  <span
    class="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium"
    :class="tone.className"
  >
    {{ tone.label }}
  </span>
</template>

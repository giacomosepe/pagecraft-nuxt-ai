<script setup lang="ts">
defineProps<{
  isGenerating: boolean;
  disableGenerate: boolean;
  disableRefine: boolean;
}>();

const emit = defineEmits<{
  generate: [];
  refine: [];
}>();
</script>

<template>
  <div class="rounded-[24px] border border-violet-100 bg-violet-50/70 p-4">
    <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div class="space-y-1">
        <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-violet-500">
          Assistente AI
        </p>
        <p class="text-sm font-medium text-slate-900">
          Genera o raffina la bozza partendo dal contenuto di questo step.
        </p>
        <p class="text-xs text-slate-500">
          Genera una nuova bozza o raffina quella corrente a partire dai dati di questo step.
        </p>
      </div>

      <div
        v-if="isGenerating"
        class="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-1.5 text-xs font-medium text-violet-700"
      >
        <UIcon name="i-lucide-loader-circle" class="size-3.5 animate-spin" />
        Generazione in corso
      </div>
    </div>

    <div class="mt-4 grid gap-2 sm:grid-cols-2">
      <UButton
        size="md"
        icon="i-lucide-sparkles"
        class="justify-center rounded-xl"
        :loading="isGenerating"
        :disabled="disableGenerate"
        @click="emit('generate')"
      >
        Genera bozza AI
      </UButton>

      <UButton
        size="md"
        variant="outline"
        color="neutral"
        class="justify-center rounded-xl border-slate-300 bg-white"
        :disabled="disableRefine"
        @click="emit('refine')"
      >
        Raffina
      </UButton>
    </div>
  </div>
</template>

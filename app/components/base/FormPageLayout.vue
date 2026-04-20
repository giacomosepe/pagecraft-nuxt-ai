<script setup lang="ts">
defineProps<{
  title: string;
  description?: string | null;
  backTo?: string | null;
  backLabel?: string | null;
  eyebrow?: string | null;
  size?: "md" | "lg" | "xl" | "full";
}>();
</script>

<template>
  <BasePageContainer :size="size ?? 'lg'">
    <div class="space-y-6">
      <div v-if="backTo && backLabel">
        <NuxtLink
          :to="backTo"
          class="inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-700"
        >
          <UIcon name="i-lucide-arrow-left" class="size-4" />
          {{ backLabel }}
        </NuxtLink>
      </div>

      <BasePageHeader :title="title" :description="description">
        <template #meta>
          <div v-if="eyebrow || $slots.meta" class="space-y-2">
            <p
              v-if="eyebrow"
              class="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400"
            >
              {{ eyebrow }}
            </p>

            <slot name="meta" />
          </div>
        </template>

        <template v-if="$slots.actions" #actions>
          <slot name="actions" />
        </template>
      </BasePageHeader>

      <slot />

      <slot name="footer" />
    </div>
  </BasePageContainer>
</template>

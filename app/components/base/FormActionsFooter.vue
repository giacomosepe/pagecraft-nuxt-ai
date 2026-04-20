<template>
  <div class="flex flex-col gap-3 rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
    <div v-if="$slots.leading" class="min-w-0">
      <slot name="leading" />
    </div>

    <div class="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
      <slot />
    </div>
  </div>
</template>

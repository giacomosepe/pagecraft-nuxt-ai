<template>
  <div
    class="grid min-h-[calc(100vh-11rem)] gap-0 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_300px] 2xl:grid-cols-[240px_minmax(0,1fr)_320px]"
  >
    <div class="min-h-0 border-b border-slate-200 lg:border-r lg:border-b-0">
      <slot name="nav" />
    </div>

    <div class="min-h-0 border-b border-slate-200 xl:border-r xl:border-b-0">
      <slot name="document">
        <slot name="output" />
      </slot>
    </div>

    <div
      class="min-h-0 lg:col-span-2 xl:col-span-1"
    >
      <slot name="work">
        <slot name="main" />
      </slot>
    </div>
  </div>
</template>

<template>
  <div
    class="grid min-h-[calc(100vh-13rem)] gap-5 xl:grid-cols-[280px_minmax(0,1.55fr)_minmax(320px,1fr)]"
  >
    <div class="min-h-0">
      <slot name="nav" />
    </div>

    <div class="min-h-0">
      <slot name="main" />
    </div>

    <div class="min-h-0">
      <slot name="output" />
    </div>
  </div>
</template>

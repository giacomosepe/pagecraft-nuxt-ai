<template>
  <div
    style="
      min-height: 100vh;
      background-color: var(--color-page-bg);
      font-family: var(--font-sans);
    "
  >
    <!-- Brand header -->
    <header
      class="flex h-14 items-center px-6"
      style="
        background-color: var(--color-surface);
        border-bottom: 1px solid var(--color-border-subtle);
      "
    >
      <div class="flex items-center gap-2.5">
        <div
          class="flex size-7 items-center justify-center text-sm font-bold text-white"
          style="
            background-color: var(--color-brand);
            border-radius: var(--radius-md);
          "
        >
          A
        </div>
        <span
          class="font-semibold"
          style="
            font-size: var(--text-base);
            color: var(--color-text-primary);
          "
        >
          PageCraft
        </span>
      </div>
    </header>

    <!-- Centered content -->
    <main
      class="flex items-center justify-center px-4"
      style="min-height: calc(100vh - 3.5rem)"
    >
      <slot />
    </main>
  </div>
</template>

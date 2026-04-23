<script setup lang="ts">
import { publicCopy } from "~/utils/publicCopy";

const route = useRoute();
const user = useSupabaseUser();

const primaryAction = computed(() => {
  if (user.value) {
    return {
      label: publicCopy.nav.dashboardLabel,
      to: "/dashboard",
    };
  }

  return {
    label: publicCopy.nav.loginLabel,
    to: "/login",
  };
});

const navLinks = computed(() =>
  publicCopy.nav.links.map((link) => {
    if (route.path === "/") return { ...link, to: link.href };
    return { ...link, to: link.href.startsWith("/") ? link.href : `/${link.href}` };
  }),
);
</script>

<template>
  <div
    style="
      min-height: 100vh;
      background:
        radial-gradient(circle at top, rgba(124, 58, 237, 0.08), transparent 35%),
        var(--color-page-bg);
      font-family: var(--font-sans);
      color: var(--color-text-primary);
    "
  >
    <header
      class="sticky top-0 z-30"
      style="
        backdrop-filter: blur(16px);
        background: rgba(248, 250, 252, 0.78);
        border-bottom: 1px solid rgba(241, 245, 249, 0.9);
      "
    >
      <div class="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <NuxtLink to="/" class="flex items-center gap-3">
          <div
            class="flex size-8 items-center justify-center text-sm font-bold text-white"
            style="
              background-color: var(--color-brand);
              border-radius: var(--radius-md);
              box-shadow: 0 10px 24px rgba(124, 58, 237, 0.18);
            "
          >
            A
          </div>
          <span class="font-semibold" style="font-size: var(--text-base)">
            PageCraft
          </span>
        </NuxtLink>

        <nav class="hidden items-center gap-7 md:flex">
          <NuxtLink
            v-for="link in navLinks"
            :key="link.label"
            :to="link.to"
            class="text-sm font-medium transition-colors hover:opacity-100"
            style="color: var(--color-text-muted); opacity: 0.92"
          >
            {{ link.label }}
          </NuxtLink>
        </nav>

        <div class="flex items-center gap-3">
          <NuxtLink
            :to="primaryAction.to"
            class="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white"
            style="
              background-color: var(--color-brand);
              border-radius: var(--radius-md);
              box-shadow: 0 10px 24px rgba(124, 58, 237, 0.18);
            "
          >
            {{ primaryAction.label }}
          </NuxtLink>
        </div>
      </div>
    </header>

    <main class="min-h-[calc(100vh-8rem)]">
      <slot />
    </main>

    <footer
      class="mt-10"
      style="
        border-top: 1px solid var(--color-border-subtle);
        background: rgba(255, 255, 255, 0.72);
      "
    >
      <div class="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 sm:px-6 lg:px-8 md:flex-row md:items-center md:justify-between">
        <div class="flex items-center gap-3">
          <div
            class="flex size-8 items-center justify-center text-sm font-bold text-white"
            style="background-color: var(--color-brand); border-radius: var(--radius-md)"
          >
            A
          </div>
          <div>
            <p class="text-sm font-semibold">PageCraft</p>
            <p class="text-sm" style="color: var(--color-text-muted)">
              {{ publicCopy.footer.summary }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <NuxtLink
            :to="primaryAction.to"
            class="text-sm font-medium"
            style="color: var(--color-brand)"
          >
            {{ primaryAction.label }}
          </NuxtLink>
        </div>
      </div>
    </footer>
  </div>
</template>

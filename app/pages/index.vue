<script setup lang="ts">
import { publicCopy } from "~/utils/publicCopy";

definePageMeta({ layout: "public-layout" });

const user = useSupabaseUser();
if (user.value) await navigateTo("/dashboard");

const primaryCta = computed(() =>
  user.value
    ? {
        label: publicCopy.hero.primaryCtaLoggedIn,
        to: "/dashboard",
      }
    : {
        label: publicCopy.hero.primaryCtaLoggedOut,
        to: "/login",
      },
);
</script>

<template>
  <div>
    <section class="px-4 pb-12 pt-14 sm:px-6 sm:pt-20 lg:px-8 lg:pb-16">
      <div class="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(24rem,0.95fr)] lg:items-center">
        <div class="max-w-2xl">
          <p
            class="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium"
            style="
              background-color: rgba(124, 58, 237, 0.08);
              color: var(--color-brand);
              border: 1px solid rgba(124, 58, 237, 0.12);
            "
          >
            {{ publicCopy.hero.eyebrow }}
          </p>

          <h1
            class="mt-6 font-semibold tracking-tight"
            style="
              font-size: clamp(2.6rem, 5vw, 4.8rem);
              line-height: 0.96;
              color: var(--color-text-primary);
            "
          >
            {{ publicCopy.hero.title }}
          </h1>

          <p
            class="mt-5 max-w-xl text-lg sm:text-xl"
            style="color: var(--color-text-muted); line-height: 1.55"
          >
            {{ publicCopy.hero.subtitle }}
          </p>

          <div class="mt-8 flex flex-col gap-3 sm:flex-row">
            <NuxtLink
              :to="primaryCta.to"
              class="inline-flex items-center justify-center px-5 py-3 text-sm font-semibold text-white"
              style="
                background-color: var(--color-brand);
                border-radius: var(--radius-md);
                box-shadow: 0 18px 32px rgba(124, 58, 237, 0.18);
              "
            >
              {{ primaryCta.label }}
            </NuxtLink>
            <NuxtLink
              to="/#come-funziona"
              class="inline-flex items-center justify-center px-5 py-3 text-sm font-semibold"
              style="
                background-color: rgba(255, 255, 255, 0.8);
                color: var(--color-text-primary);
                border: 1px solid var(--color-border-subtle);
                border-radius: var(--radius-md);
              "
            >
              {{ publicCopy.hero.secondaryCta }}
            </NuxtLink>
          </div>

          <ul class="mt-8 grid gap-3 sm:grid-cols-3">
            <li
              v-for="note in publicCopy.hero.notes"
              :key="note"
              class="rounded-xl px-4 py-3 text-sm"
              style="
                background-color: rgba(255, 255, 255, 0.74);
                border: 1px solid var(--color-border-subtle);
                color: var(--color-text-muted);
              "
            >
              {{ note }}
            </li>
          </ul>
        </div>

        <div>
          <div
            class="overflow-hidden rounded-[1.5rem] p-3"
            style="
              background:
                linear-gradient(180deg, rgba(255,255,255,0.94), rgba(255,255,255,0.82));
              border: 1px solid rgba(226, 232, 240, 0.9);
              box-shadow: 0 30px 80px rgba(15, 23, 42, 0.08);
            "
          >
            <div
              class="rounded-[1.1rem] p-4 sm:p-5"
              style="
                background:
                  linear-gradient(180deg, rgba(248, 250, 252, 1), rgba(255, 255, 255, 1));
                border: 1px solid var(--color-border-subtle);
              "
            >
              <div class="flex items-center justify-between gap-4">
                <div>
                  <p class="text-sm font-semibold">Workspace di scrittura guidata</p>
                  <p class="mt-1 text-sm" style="color: var(--color-text-muted)">
                    Struttura, contesto e output nello stesso flusso.
                  </p>
                </div>
                <div
                  class="rounded-full px-3 py-1 text-xs font-semibold"
                  style="background-color: var(--color-brand-bg); color: var(--color-brand)"
                >
                  PageCraft
                </div>
              </div>

              <div class="mt-5 grid gap-3 lg:grid-cols-[0.9fr_1.2fr]">
                <div
                  class="rounded-2xl p-4"
                  style="
                    background-color: rgba(255, 255, 255, 0.86);
                    border: 1px solid var(--color-border-subtle);
                  "
                >
                  <p class="text-xs font-semibold uppercase tracking-[0.16em]" style="color: var(--color-text-muted)">
                    Sezioni
                  </p>
                  <div class="mt-3 space-y-2">
                    <div
                      v-for="n in 4"
                      :key="n"
                      class="flex items-center justify-between rounded-xl px-3 py-2"
                      :style="n === 2
                        ? 'background-color: var(--color-brand-bg); color: var(--color-brand)'
                        : 'background-color: var(--color-surface-subtle); color: var(--color-text-primary)'"
                    >
                      <span class="text-sm font-medium">Step {{ n }}</span>
                      <span class="text-xs" style="opacity: 0.78">
                        {{ n === 2 ? "In lavorazione" : "Pronto" }}
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  class="rounded-2xl p-4"
                  style="
                    background-color: rgba(255, 255, 255, 0.86);
                    border: 1px solid var(--color-border-subtle);
                  "
                >
                  <div class="flex items-center justify-between">
                    <p class="text-xs font-semibold uppercase tracking-[0.16em]" style="color: var(--color-text-muted)">
                      Generazione assistita
                    </p>
                    <span class="text-xs font-medium" style="color: var(--color-brand)">
                      Output controllabile
                    </span>
                  </div>

                  <div class="mt-4 space-y-3">
                    <div
                      v-for="(bar, index) in [72, 94, 58, 80]"
                      :key="index"
                      class="space-y-2"
                    >
                      <div class="h-2.5 rounded-full" style="background-color: var(--color-border-subtle)">
                        <div
                          class="h-2.5 rounded-full"
                          :style="`width: ${bar}%; background-color: ${index === 1 ? 'var(--color-brand)' : 'rgba(124, 58, 237, 0.28)'}`"
                        />
                      </div>
                    </div>
                  </div>

                  <div
                    class="mt-5 rounded-2xl p-4"
                    style="
                      background-color: var(--color-surface-subtle);
                      border: 1px solid var(--color-border-subtle);
                    "
                  >
                    <p class="text-sm font-medium">Documento costruito con istruzioni e contesto reale</p>
                    <p class="mt-2 text-sm" style="color: var(--color-text-muted)">
                      Qui potrai inserire uno screenshot dello step editor o della sezione di lavoro quando sarà pronto.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section id="come-funziona" class="px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div class="mx-auto max-w-7xl">
        <div class="max-w-2xl">
          <p class="text-sm font-semibold uppercase tracking-[0.16em]" style="color: var(--color-brand)">
            Come funziona
          </p>
          <h2 class="mt-3 text-3xl font-semibold sm:text-4xl">
            {{ publicCopy.howItWorks.title }}
          </h2>
          <p class="mt-4 text-lg" style="color: var(--color-text-muted)">
            {{ publicCopy.howItWorks.intro }}
          </p>
        </div>

        <div class="mt-10 grid gap-4 lg:grid-cols-3">
          <article
            v-for="(step, index) in publicCopy.howItWorks.steps"
            :key="step.title"
            class="rounded-[1.25rem] p-6"
            style="
              background-color: rgba(255, 255, 255, 0.84);
              border: 1px solid var(--color-border-subtle);
              box-shadow: 0 20px 50px rgba(15, 23, 42, 0.04);
            "
          >
            <div
              class="flex size-10 items-center justify-center text-sm font-semibold"
              style="
                background-color: var(--color-brand-bg);
                color: var(--color-brand);
                border-radius: var(--radius-full);
              "
            >
              0{{ index + 1 }}
            </div>
            <h3 class="mt-5 text-xl font-semibold">
              {{ step.title }}
            </h3>
            <p class="mt-3 text-base leading-7" style="color: var(--color-text-muted)">
              {{ step.description }}
            </p>
          </article>
        </div>
      </div>
    </section>

    <section class="px-4 py-12 sm:px-6 lg:px-8 lg:pb-20">
      <div class="mx-auto max-w-7xl">
        <div class="max-w-2xl">
          <p class="text-sm font-semibold uppercase tracking-[0.16em]" style="color: var(--color-brand)">
            Benefici
          </p>
          <h2 class="mt-3 text-3xl font-semibold sm:text-4xl">
            {{ publicCopy.benefits.title }}
          </h2>
        </div>

        <div class="mt-10 grid gap-4 lg:grid-cols-3">
          <article
            v-for="benefit in publicCopy.benefits.items"
            :key="benefit.title"
            class="rounded-[1.25rem] p-6"
            style="
              background-color: rgba(255, 255, 255, 0.84);
              border: 1px solid var(--color-border-subtle);
              box-shadow: 0 20px 50px rgba(15, 23, 42, 0.04);
            "
          >
            <h3 class="text-xl font-semibold">
              {{ benefit.title }}
            </h3>
            <p class="mt-3 text-base leading-7" style="color: var(--color-text-muted)">
              {{ benefit.description }}
            </p>
          </article>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "public-layout" });

const user = useSupabaseUser();
if (user.value) await navigateTo("/dashboard");
</script>

<template>
  <div class="text-center" style="width: 100%; max-width: 22rem">
    <div class="mb-5 flex justify-center">
      <div
        class="flex size-14 items-center justify-center text-2xl font-bold text-white"
        style="background-color: var(--color-brand); border-radius: var(--radius-lg)"
      >
        A
      </div>
    </div>
    <h1
      class="font-semibold"
      style="font-size: var(--text-xl); color: var(--color-text-primary)"
    >
      PageCraft
    </h1>
    <p class="mt-2" style="font-size: var(--text-base); color: var(--color-text-muted)">
      AI-assisted Patent Box documentation
    </p>
    <UButton to="/login" class="mt-8 w-full justify-center" size="md">
      Accedi
    </UButton>
  </div>
</template>

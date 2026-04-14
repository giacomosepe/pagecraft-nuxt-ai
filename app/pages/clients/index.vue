<script setup lang="ts">
definePageMeta({ middleware: "auth" });

const { clients, pending } = useClients();
</script>

<template>
  <div class="mx-auto max-w-5xl px-6 py-8">
    <div class="mb-6 flex items-center justify-between">
      <h1
        class="text-xl font-semibold"
        style="color: var(--color-text-primary)"
      >
        Clienti
      </h1>
      <UButton icon="i-lucide-plus" size="sm" to="/clients/new">
        Nuovo cliente
      </UButton>
    </div>

    <div v-if="pending" class="flex justify-center py-24">
      <UIcon
        name="i-lucide-loader-circle"
        class="size-6 animate-spin"
        style="color: var(--color-text-placeholder)"
      />
    </div>

    <div
      v-else-if="!clients?.length"
      class="flex flex-col items-center justify-center rounded-xl border border-dashed py-24 text-center"
      style="border-color: var(--color-border)"
    >
      <UIcon
        name="i-lucide-building-2"
        class="mb-3 size-10"
        style="color: var(--color-text-placeholder)"
      />
      <p class="text-sm font-medium" style="color: var(--color-text-primary)">
        Nessun cliente
      </p>
      <p class="mt-1 text-sm" style="color: var(--color-text-muted)">
        Aggiungi il tuo primo cliente per iniziare
      </p>
      <UButton class="mt-5" icon="i-lucide-plus" size="sm" to="/clients/new">
        Nuovo cliente
      </UButton>
    </div>

    <div
      v-else
      class="overflow-hidden rounded-xl border shadow-[var(--shadow-card)]"
      style="
        border-color: var(--color-border);
        background-color: var(--color-surface);
      "
    >
      <!-- Table header -->
      <div
        class="grid px-0 py-0 text-xs font-medium"
        style="
          grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
          background-color: var(--color-surface-subtle);
          color: var(--color-text-muted);
        "
      >
        <div class="py-[18px] pl-6">Cliente</div>
        <div class="py-[18px] pl-6">Settore</div>
        <div class="py-[18px] pl-6">Stato</div>
        <div class="py-[18px] pl-6">Programmi</div>
        <div class="py-[18px] pl-6">Ultima attività</div>
      </div>

      <!-- Rows -->
      <ClientCard
        v-for="c in clients"
        :key="c.id"
        :client="c"
      />
    </div>
  </div>
</template>

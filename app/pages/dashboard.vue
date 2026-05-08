<script setup lang="ts">
import { deriveFolderStatus } from "~/utils/folderStatus";

definePageMeta({ middleware: "auth" });

const { clients, pending: clientsPending } = useClients();
const { projects, pending: projectsPending } = useProjects();
const { documents, pending: documentsPending } = useDocuments();

function toArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

type SummaryCard = {
  key: string;
  title: string;
  description: string;
  to: string;
  icon: string;
  counts: {
    aperti: number;
    inLavorazione: number;
    chiusi: number;
  };
};

const isLoading = computed(
  () => clientsPending.value || projectsPending.value || documentsPending.value,
);

const summaryCards = computed<SummaryCard[]>(() => {
  const clientItems = toArray(clients.value);
  const projectItems = toArray(projects.value);
  const documentItems = toArray(documents.value);

  const clientCounts = {
    aperti: clientItems.filter((client) => client.status === "aperto").length,
    inLavorazione: 0,
    chiusi: clientItems.filter((client) => client.status === "chiuso").length,
  };

  const projectStatuses = projectItems.map((project) =>
    deriveFolderStatus(toArray(project.pages)),
  );

  const projectCounts = {
    aperti: projectStatuses.filter((status) => status === "in_attesa").length,
    inLavorazione: projectStatuses.filter((status) => status === "in_lavorazione").length,
    chiusi: projectStatuses.filter((status) =>
      ["completato", "archiviato"].includes(status),
    ).length,
  };

  const documentCounts = {
    aperti: documentItems.filter((document) => document.status === "in_attesa").length,
    inLavorazione: documentItems.filter(
      (document) => document.status === "in_lavorazione",
    ).length,
    chiusi: documentItems.filter((document) =>
      ["completato", "archiviato"].includes(document.status),
    ).length,
  };

  return [
    {
      key: "clienti",
      title: "Clienti",
      description: "Panoramica dei clienti attivi e archiviati.",
      to: "/clienti",
      icon: "i-lucide-building-2",
      counts: clientCounts,
    },
    {
      key: "progetti",
      title: "Progetti",
      description: "Stato sintetico dei programmi in corso.",
      to: "/progetti",
      icon: "i-lucide-briefcase-business",
      counts: projectCounts,
    },
    {
      key: "documenti",
      title: "Documenti",
      description: "Avanzamento dei documenti nel workspace.",
      to: "/documenti",
      icon: "i-lucide-files",
      counts: documentCounts,
    },
  ];
});
</script>

<template>
  <BasePageContainer size="full">
    <BasePageHeader
      title="Dashboard"
      description="Accedi rapidamente alle aree principali e controlla lo stato generale del workspace."
    />

    <BaseWorkspaceSurface>
      <BaseStateMessage
        v-if="isLoading"
        loading
        title="Caricamento dashboard in corso..."
        description="Stiamo preparando il riepilogo di clienti, progetti e documenti."
      />

      <div
        v-else
        class="grid gap-4 p-5 lg:grid-cols-3"
      >
        <NuxtLink
          v-for="card in summaryCards"
          :key="card.key"
          :to="card.to"
          class="group rounded-xl border border-slate-200 bg-white p-6 transition-all duration-150 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Area
              </p>
              <h2 class="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                {{ card.title }}
              </h2>
              <p class="mt-2 text-sm leading-6 text-slate-500">
                {{ card.description }}
              </p>
            </div>

            <div
              class="flex size-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600"
            >
              <UIcon :name="card.icon" class="size-5" />
            </div>
          </div>

          <div class="mt-6 grid grid-cols-3 gap-3">
            <div class="rounded-xl bg-slate-50 px-4 py-3">
              <p class="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                Aperti
              </p>
              <p class="mt-2 text-2xl font-semibold text-slate-900">
                {{ card.counts.aperti }}
              </p>
            </div>

            <div class="rounded-xl bg-slate-50 px-4 py-3">
              <p class="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                In lavorazione
              </p>
              <p class="mt-2 text-2xl font-semibold text-slate-900">
                {{ card.counts.inLavorazione }}
              </p>
            </div>

            <div class="rounded-xl bg-slate-50 px-4 py-3">
              <p class="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                Chiusi
              </p>
              <p class="mt-2 text-2xl font-semibold text-slate-900">
                {{ card.counts.chiusi }}
              </p>
            </div>
          </div>

          <div class="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
            <span class="text-sm font-medium text-slate-900">
              Apri {{ card.title.toLowerCase() }}
            </span>
            <UIcon
              name="i-lucide-arrow-right"
              class="size-4 text-slate-400 transition-transform duration-150 group-hover:translate-x-0.5"
            />
          </div>
        </NuxtLink>
      </div>
    </BaseWorkspaceSurface>
  </BasePageContainer>
</template>

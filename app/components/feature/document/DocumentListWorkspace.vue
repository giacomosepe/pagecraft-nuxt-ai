<script setup lang="ts">
import type { DocumentListItem } from "~/types/app.types";

const props = defineProps<{
  documents?: DocumentListItem[] | null;
  pending?: boolean;
  errorMsg?: string;
  refreshDocuments?: () => Promise<unknown>;
}>();

const route = useRoute();
const router = useRouter();
const search = ref("");
const deleteDialogOpen = ref(false);
const deleteTarget = ref<DocumentListItem | null>(null);
const isDeleting = ref(false);
const feedback = ref<{
  tone: "success" | "error";
  title: string;
  description: string;
} | null>(null);

const filters = [
  { key: "recenti", label: "Recenti", icon: "i-lucide-history" },
  { key: "in_lavorazione", label: "In lavorazione", icon: "i-lucide-loader-circle" },
  { key: "completato", label: "Completati", icon: "i-lucide-circle-check-big" },
  { key: "tutti", label: "Tutti i documenti", icon: "i-lucide-files" },
] as const;

const activeFilter = ref<"recenti" | "in_lavorazione" | "completato" | "tutti">(
  "tutti",
);

const normalizedDocuments = computed(() => props.documents ?? []);
const showLoadingState = computed(
  () => Boolean(props.pending) && normalizedDocuments.value.length === 0,
);

watchEffect(() => {
  const view = route.query.view as string | undefined;
  const status = route.query.status as string | undefined;

  if (view === "recenti") {
    activeFilter.value = "recenti";
    return;
  }

  if (status === "in_lavorazione") {
    activeFilter.value = "in_lavorazione";
    return;
  }

  if (status === "completato") {
    activeFilter.value = "completato";
    return;
  }

  activeFilter.value = "tutti";
});

const filteredDocuments = computed(() => {
  const query = search.value.trim().toLowerCase();

  return normalizedDocuments.value.filter((document, index) => {
    if (activeFilter.value === "recenti" && index >= 8) return false;
    if (
      activeFilter.value === "in_lavorazione" &&
      document.status !== "in_lavorazione"
    ) {
      return false;
    }
    if (activeFilter.value === "completato" && document.status !== "completato") {
      return false;
    }

    if (!query) return true;

    return [
      document.title,
      document.framework_name,
      document.folders?.program_name,
      document.clients?.name,
    ]
      .filter(Boolean)
      .some((value) => value?.toLowerCase().includes(query));
  });
});

const deleteDescription = computed(() => {
  if (!deleteTarget.value) return "";
  return `Il documento "${deleteTarget.value.title}" verra rimosso definitivamente. Questa azione non puo essere annullata.`;
});

const headerTitle = computed(() => {
  switch (activeFilter.value) {
    case "recenti":
      return "Documenti recenti";
    case "in_lavorazione":
      return "Documenti in lavorazione";
    case "completato":
      return "Documenti completati";
    default:
      return "Documenti";
  }
});

const headerSubtitle = computed(() => {
  const count = filteredDocuments.value.length;
  if (!count) return "Nessun documento trovato.";
  return count === 1
    ? "1 documento nella vista corrente."
    : `${count} documenti nella vista corrente.`;
});

async function selectFilter(
  filterKey: "recenti" | "in_lavorazione" | "completato" | "tutti",
): Promise<void> {
  activeFilter.value = filterKey;

  if (filterKey === "recenti") {
    await router.push({ query: { view: "recenti" } });
    return;
  }

  if (filterKey === "in_lavorazione" || filterKey === "completato") {
    await router.push({ query: { status: filterKey } });
    return;
  }

  await router.push({ query: {} });
}

function requestDelete(document: DocumentListItem): void {
  feedback.value = null;
  deleteTarget.value = document;
  deleteDialogOpen.value = true;
}

async function confirmDelete(): Promise<void> {
  if (!deleteTarget.value) return;

  isDeleting.value = true;

  try {
    await $fetch("/api/db/delete", {
      method: "POST",
      body: {
        entity: "document",
        id: deleteTarget.value.id,
      },
    });

    await props.refreshDocuments?.();

    feedback.value = {
      tone: "success",
      title: "Documento eliminato",
      description: "Il documento e stato rimosso correttamente dall'elenco.",
    };
    deleteDialogOpen.value = false;
    deleteTarget.value = null;
  }
  catch {
    feedback.value = {
      tone: "error",
      title: "Eliminazione non riuscita",
      description: "Non siamo riusciti a eliminare il documento. Riprova tra qualche istante.",
    };
  }
  finally {
    isDeleting.value = false;
  }
}
</script>

<template>
  <BasePageContainer size="full">
    <BasePageHeader
      :title="headerTitle"
      description="Consulta i documenti esistenti, riprendi quelli recenti e crea nuovi documenti quando serve."
    >
      <template #actions>
        <UButton
          to="/pages/new"
          icon="i-lucide-plus"
          size="lg"
          class="justify-center rounded-xl px-5"
        >
          Nuovo documento
        </UButton>
      </template>
    </BasePageHeader>

    <UAlert
      v-if="errorMsg"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Caricamento documenti non riuscito"
      :description="errorMsg"
      class="mb-6"
    />

    <UAlert
      v-if="feedback"
      :color="feedback.tone === 'error' ? 'error' : 'success'"
      variant="soft"
      :icon="
        feedback.tone === 'error'
          ? 'i-lucide-circle-alert'
          : 'i-lucide-circle-check-big'
      "
      :title="feedback.title"
      :description="feedback.description"
      class="mb-6"
    />

    <BaseWorkspaceSurface>
      <template #toolbar>
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div class="flex flex-wrap gap-2">
            <UButton
              v-for="filter in filters"
              :key="filter.key"
              :icon="filter.icon"
              :variant="activeFilter === filter.key ? 'soft' : 'ghost'"
              color="neutral"
              class="rounded-xl"
              @click="selectFilter(filter.key)"
            >
              {{ filter.label }}
            </UButton>
          </div>

          <UInput
            v-model="search"
            icon="i-lucide-search"
            size="lg"
            placeholder="Cerca documento, progetto o cliente..."
            class="w-full lg:max-w-sm"
          />
        </div>
      </template>

      <BaseWorkspaceState
        v-if="showLoadingState"
        loading
        title="Caricamento documenti in corso..."
      />

      <BaseWorkspaceState
        v-else-if="!filteredDocuments.length"
        icon="i-lucide-file-stack"
        title="Nessun documento trovato"
        description="Prova a cambiare filtro o crea un nuovo documento."
      />

      <div v-else class="overflow-x-auto">
        <div class="min-w-[980px]">
          <div class="grid grid-cols-[minmax(0,2.1fr)_minmax(180px,1.2fr)_minmax(150px,1fr)_minmax(125px,0.9fr)_minmax(120px,0.9fr)_72px] gap-4 bg-slate-50 px-6 py-4 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
            <p>Documento</p>
            <p>Progetto</p>
            <p>Cliente</p>
            <p>Stato</p>
            <p>Ultima attività</p>
            <p class="text-right">Azioni</p>
          </div>

          <DocumentListRow
            v-for="document in filteredDocuments"
            :key="document.id"
            :document="document"
            :delete-loading="isDeleting && deleteTarget?.id === document.id"
            @delete="requestDelete"
          />
        </div>
      </div>
    </BaseWorkspaceSurface>

    <p class="text-sm text-slate-500">
      {{ headerSubtitle }}
    </p>

    <BaseConfirmDialog
      v-model:open="deleteDialogOpen"
      title="Eliminare il documento?"
      :description="deleteDescription"
      confirm-label="Elimina documento"
      :loading="isDeleting"
      @confirm="confirmDelete"
    />
  </BasePageContainer>
</template>

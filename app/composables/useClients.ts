// app/composables/useClients.ts
//
// Wraps the client list fetch for use in clients/index.vue (and anywhere else
// a flat list of clients is needed).
//
// Usage:
//   const { clients, pending } = useClients()

import type { ClientListItem } from "~/types/app.types";

export function useClients() {
  const supabase = useSupabaseClient();

  const { data: clients, pending, refresh } = useAsyncData<ClientListItem[]>(
    "clients-list",
    async () => {
      const { data, error } = await supabase
        .from("clients")
        .select(
          "id, name, company_name, industry_sector, status, created_at, updated_at, folders(id, updated_at, pages(id, updated_at))",
        )
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    {
      default: () => [],
      immediate: false,
      server: false,
    },
  );

  onMounted(() => {
    void refresh();
  });

  return { clients, pending, refresh };
}

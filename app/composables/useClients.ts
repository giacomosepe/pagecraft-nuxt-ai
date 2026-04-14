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

  const { data: clients, pending } = useAsyncData<ClientListItem[]>(
    "clients-list",
    async () => {
      const { data, error } = await supabase
        .from("clients")
        .select(
          "id, name, company_name, industry_sector, status, created_at, updated_at, folders(id, updated_at)",
        )
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
    { server: false },
  );

  return { clients, pending };
}

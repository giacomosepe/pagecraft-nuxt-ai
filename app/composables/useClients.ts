// app/composables/useClients.ts
//
// Wraps the client list fetch for use in clients/index.vue (and anywhere else
// a flat list of clients is needed).
//
// Usage:
//   const { clients, pending } = await useClients()

import type { ClientListItem } from "~/types/app.types";

export async function useClients() {
  const supabase = useSupabaseClient();

  const { data: clients, pending } = await useAsyncData<ClientListItem[]>(
    "clients-list",
    async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, created_at")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
    { server: false },
  );

  return { clients, pending };
}

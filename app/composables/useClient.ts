// app/composables/useClient.ts
//
// Wraps the single client fetch and status mutation.
// Used by both clients/[id]/index.vue (detail + folders) and
// clients/[id]/edit.vue (scalar fields for the edit form).
// A single superset query satisfies both pages — edit.vue simply ignores folders.
//
// Usage:
//   const { data, pending, updateStatus } = await useClient(clientId)

import type { ClientDetail } from "~/types/app.types";

export async function useClient(clientId: string) {
  const supabase = useSupabaseClient();

  const { data, pending } = await useAsyncData<ClientDetail>(
    `client-${clientId}`,
    async () => {
      const { data, error } = await supabase
        .from("clients")
        .select(
          "id, name, status, updated_at, company_name, industry_sector, employee_count, legal_representative, vat_number, codice_fiscale, registered_address, company_form, folders(id, program_name, updated_at, pages(id, status, updated_at))",
        )
        .eq("id", clientId)
        .single();
      if (error) throw error;
      return data as ClientDetail;
    },
    { server: false },
  );

  // Persists a new status value and updates data optimistically so any
  // watchEffect / computed depending on data.value.status stays in sync.
  async function updateStatus(newStatus: string): Promise<void> {
    if (data.value) {
      data.value.status = newStatus;
    }
    await $fetch("/api/db/mutate", {
      method: "POST",
      body: {
        table: "clients",
        operation: "update",
        data: { status: newStatus },
        where: { id: clientId },
      },
    });
  }

  return { data, pending, updateStatus };
}

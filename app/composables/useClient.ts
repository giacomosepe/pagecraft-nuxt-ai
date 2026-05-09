// app/composables/useClient.ts
//
// Wraps the single client fetch and status mutation.
// Used by both clients/[id]/index.vue (detail + folders) and
// clients/[id]/edit.vue (scalar fields for the edit form).
// A single superset query satisfies both pages — edit.vue simply ignores folders.
//
// Usage:
//   const { data, pending, updateStatus } = useClient(clientId)

import type { ClientDetail, FolderItem } from "~/types/app.types";
import type { ClientStatus } from "~/utils/statuses";

export function useClient(clientId: string) {
  const supabase = useSupabaseClient();

  const { data, pending, refresh } = useAsyncData<ClientDetail>(
    `client-${clientId}`,
    async () => {
      const { data, error } = await supabase
        .from("clients")
        .select(
          "id, name, status, updated_at, company_name, industry_sector, employee_count, legal_representative, vat_number, codice_fiscale, registered_address, street_address, city, provincia, cap, revenue, legal_rep_name, legal_rep_cf, legal_rep_dob, contact_name, contact_email, contact_phone, company_form, soci, partecipate, shareholders, subsidiaries, folders(id, program_name, updated_at, pages(id, title, status, updated_at, tax_year))",
        )
        .eq("id", clientId)
        .single();
      if (error) throw error;
      return data as ClientDetail;
    },
    { server: false },
  );

  // Explicit computed so Vue tracks this as a proper reactive dependency
  // rather than relying on nested property access on the shallowRef.
  const folders = computed<FolderItem[] | null>(() => data.value?.folders ?? null);

  // Persists a new status value and updates data optimistically so any
  // watchEffect / computed depending on data.value.status stays in sync.
  async function updateStatus(newStatus: ClientStatus): Promise<void> {
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

  return { data, folders, pending, refresh, updateStatus };
}

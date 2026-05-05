// app/composables/usePage.ts
//
// Wraps the page + steps fetch and the secondary client data fetch
// for the step editor (pages/[id].vue).
// Generation logic is NOT here — that lives in useGeneration.ts.
//
// Usage:
//   const { page, steps, clientData, pending, error } = usePage(pageId)

import type { ClientRecord } from "~/composables/useClientFields";
import type { PageRecord, StepRecord } from "~/types/app.types";

export function usePage(pageId: string) {
  const supabase = useSupabaseClient();

  // ─── Page + steps — parallel fetch ────────────────────────────────────────
  const { data, pending, error } = useAsyncData<{
    page: PageRecord;
    steps: StepRecord[];
  }>(
    `page-${pageId}`,
    async () => {
      const [pageRes, stepsRes] = await Promise.all([
        supabase
          .from("pages")
          .select("id, title, status, framework_name, client_id, tax_year")
          .eq("id", pageId)
          .single(),
        supabase
          .from("steps")
          .select(
            "id, order, title, status, user_context, committed_output, system_prompt_template, refine_prompt_template, form_schema, form_data, framework_steps!framework_step_id(step_type)",
          )
          .eq("page_id", pageId)
          .order("order", { ascending: true }),
      ]);
      if (pageRes.error) throw pageRes.error;
      if (stepsRes.error) {
        console.error("[usePage] steps query error:", stepsRes.error);
        throw stepsRes.error;
      }
      return {
        page: pageRes.data as PageRecord,
        steps: (stepsRes.data ?? []).map((s: Record<string, unknown>) => ({
            ...s,
            step_type: (s.framework_steps as { step_type: string } | null)?.step_type ?? null,
          })) as StepRecord[],
      };
    },
    { server: true },
  );

  // Decompose combined data into separate computed refs for consumers
  const page = computed(() => data.value?.page ?? null);
  const steps = computed(() => data.value?.steps ?? null);

  // ─── Client data — secondary fetch ────────────────────────────────────────
  // Triggered once when page data arrives (client_id may be null).
  // Provides company context for the AI generation pipeline via useClientFields.
  const clientData = ref<ClientRecord | null>(null);
  watch(
    data,
    async (val) => {
      const clientId = val?.page?.client_id;
      if (!clientId || clientData.value) return;
      const { data: c } = await supabase
        .from("clients")
        .select(
          "id, name, company_name, industry_sector, employee_count, legal_representative, vat_number, codice_fiscale, registered_address, company_form, board_members, soci, partecipate, shareholders, subsidiaries",
        )
        .eq("id", clientId)
        .single();
      clientData.value = c as ClientRecord | null;
    },
    { immediate: true },
  );

  return { page, steps, clientData, pending, error };
}

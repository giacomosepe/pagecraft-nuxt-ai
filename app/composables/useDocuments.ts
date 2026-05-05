import type { DocumentListItem } from "~/types/app.types";

export function useDocuments() {
  const supabase = useSupabaseClient();
  const errorMsg = ref("");

  const { data: documents, pending, refresh } = useAsyncData<DocumentListItem[]>(
    "documents-list",
    async () => {
      errorMsg.value = "";
      const { data, error } = await supabase
        .from("pages")
        .select(
          "id, title, status, updated_at, framework_name, folder_id, client_id, folders(id, program_name), clients(id, name)",
        )
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("[useDocuments] pages query error:", error);
        errorMsg.value = error.message;
        return [];
      }
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

  return { documents, pending, refresh, errorMsg };
}

import type { DocumentListItem } from "~/types/app.types";

export function useDocuments() {
  const supabase = useSupabaseClient();

  const { data: documents, pending, refresh } = useAsyncData<DocumentListItem[]>(
    "documents-list",
    async () => {
      const { data, error } = await supabase
        .from("pages")
        .select(
          "id, title, status, updated_at, framework_name, folder_id, client_id, folders(id, program_name), clients(id, name)",
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

  return { documents, pending, refresh };
}

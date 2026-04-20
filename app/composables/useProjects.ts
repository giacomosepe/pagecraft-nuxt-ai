import type { ProjectListItem } from "~/types/app.types";

export function useProjects() {
  const supabase = useSupabaseClient();

  const { data: projects, pending } = useAsyncData<ProjectListItem[]>(
    "projects-list",
    async () => {
      const { data, error } = await supabase
        .from("folders")
        .select(
          "id, program_name, updated_at, client_id, clients(id, name), pages(id, status, updated_at)",
        )
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    { server: false },
  );

  return { projects, pending };
}

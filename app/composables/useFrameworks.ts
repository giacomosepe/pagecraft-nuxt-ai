// app/composables/useFrameworks.ts
//
// Wraps the public framework list fetch.
// Reusable wherever a framework picker is shown (pages/new.vue, future pickers).
//
// Usage:
//   const { frameworks, pending } = await useFrameworks()

import type { FrameworkItem } from "~/types/app.types";

export async function useFrameworks() {
  const supabase = useSupabaseClient();

  const { data: frameworks, pending } = await useAsyncData<FrameworkItem[]>(
    "frameworks",
    async () => {
      const { data, error } = await supabase
        .from("frameworks")
        .select("id, name, description")
        .eq("is_public", true)
        .is("deprecated_at", null)
        .order("name");
      if (error) throw error;
      return (data ?? []) as FrameworkItem[];
    },
    { server: false },
  );

  return { frameworks, pending };
}

# PageCraft — Frontend Rules
# Loaded automatically when reading/writing files in app/

---

## Architecture rules

- Pages are thin orchestrators — ~40 lines max, zero business logic, zero direct Supabase calls
- All data fetching lives in composables (`app/composables/`)
- All UI logic lives in components (`app/components/`)
- Layer order: pages → composables → server/api. Never skip a layer.

---

## Browser data reads

```ts
const supabase = useSupabaseClient();
const { data } = await useAsyncData("key", async () => {
  const { data, error } = await supabase.from("clients").select("id, name").order("name");
  if (error) throw error;
  return data;
}, { server: false });
// data is a shallowRef — wrap nested access in computed:
const items = computed(() => data.value ?? [])
```

No `.eq("user_id", ...)` on browser reads — RLS handles it automatically.
Never declare a composable as `async function` — `useAsyncData` must be called synchronously.

---

## Server writes from client

```ts
await $fetch("/api/db/mutate", {
  method: "POST",
  body: { table: "clients", operation: "insert", data: { name: "Acme" } },
});
```

---

## Shared utilities — always use, never inline

- `~/utils/status.ts` — status→colour and status→label maps. Never define inline.
- `~/utils/date.ts` — all date formatting. Never inline.
- `~/utils/folderStatus.ts` — `deriveFolderStatus()`. Never inline.
- `~/types/app.types.ts` — all shared TypeScript types. Never define shared types inline.
- `~/composables/useClientFields.ts` — client data formatting for AI prompts. Single source of truth.

---

## Design system

- Font: Geist. Primary: brand (OKLCH ~264 indigo). Neutral: zinc.
- Tokens: `app/assets/css/tokens.css`
- NuxtUI: `app.config.ts` → `primary: 'brand', neutral: 'zinc'`
- CSS in nuxt.config: `css: ['./assets/css/main.css']` — relative path, NOT `~/assets`
- Never add `@nuxt/icon` separately — NuxtUI includes it

---

## What NOT to do — frontend

- Never import from `@prisma/client` anywhere in app/
- Never use `~/assets` in nuxt.config.ts CSS paths (use `./assets`)
- Never inline status colours, date formatting, or folderStatus logic
- Never define shared types inline in pages or components
- Never add `status` column to `folders` — derived from pages
- Never use `$t()` or i18n translation keys — write Italian strings directly

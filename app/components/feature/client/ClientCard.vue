<script setup lang="ts">
import type { ClientListItem } from "~/types/app.types";
import { formatDate } from "~/utils/date";

const props = defineProps<{
  client: ClientListItem;
}>();

const router = useRouter();

const initials = computed((): string => {
  const source = props.client.company_name || props.client.name;
  const words = source
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 1);
  if (words.length >= 2)
    return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase();
  return source.slice(0, 2).toUpperCase();
});

const displayName = computed((): string =>
  props.client.company_name || props.client.name,
);

const subtitle = computed((): string | null =>
  props.client.company_name ? props.client.name : null,
);

const folderCount = computed((): number => props.client.folders?.length ?? 0);

const programmiLabel = computed((): string => {
  const n = folderCount.value;
  return n === 1 ? "1 programma" : `${n} programmi`;
});

const lastActivity = computed((): string => {
  const dates: string[] = props.client.folders?.map((f) => f.updated_at) ?? [];
  dates.push(props.client.updated_at);
  // always non-empty because updated_at is always present
  const latest = dates.reduce((max, d) =>
    new Date(d) > new Date(max) ? d : max,
  );
  return formatDate(latest);
});

function navigate(): void {
  router.push(`/clients/${props.client.id}`);
}
</script>

<template>
  <div
    class="grid cursor-pointer items-center border-t py-[17px] transition-colors hover:bg-[var(--color-surface-subtle)]"
    style="
      grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
      border-color: var(--color-border);
    "
    @click="navigate"
  >
    <!-- Client: avatar + name + subtitle -->
    <div class="flex items-center gap-3 pl-6">
      <div
        class="flex size-9 flex-shrink-0 items-center justify-center rounded-lg"
        style="background-color: var(--color-status-neutral-bg)"
      >
        <span
          class="text-xs font-semibold leading-none"
          style="color: var(--color-text-muted)"
        >
          {{ initials }}
        </span>
      </div>
      <div class="min-w-0">
        <p
          class="truncate text-sm font-medium leading-5"
          style="color: var(--color-text-primary)"
        >
          {{ displayName }}
        </p>
        <p
          v-if="subtitle"
          class="truncate text-xs leading-4"
          style="color: var(--color-text-muted)"
        >
          {{ subtitle }}
        </p>
      </div>
    </div>

    <!-- Industry -->
    <div class="pl-6">
      <p class="text-sm" style="color: var(--color-text-secondary)">
        {{ client.industry_sector || "—" }}
      </p>
    </div>

    <!-- Status -->
    <div class="pl-6">
      <BaseStatusBadge :status="client.status" />
    </div>

    <!-- Programmi -->
    <div class="pl-6">
      <p class="text-sm" style="color: var(--color-text-secondary)">
        {{ programmiLabel }}
      </p>
    </div>

    <!-- Ultima attività -->
    <div class="pl-6">
      <p class="text-sm" style="color: var(--color-text-muted)">
        {{ lastActivity }}
      </p>
    </div>
  </div>
</template>

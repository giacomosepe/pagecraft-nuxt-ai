<script setup lang="ts">
import { statusColor, statusLabel } from "~/utils/status";

defineProps<{
  status: string;
}>();
</script>

<template>
  <UBadge
    :color="statusColor[status] ?? 'neutral'"
    variant="soft"
    size="xs"
  >
    {{ statusLabel[status] ?? status }}
  </UBadge>
</template>

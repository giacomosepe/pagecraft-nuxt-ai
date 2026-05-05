<script setup lang="ts">
import type { StepFormField } from "~/types/app.types";

const props = defineProps<{
	field: StepFormField;
	value?: unknown;
}>();

const referenceLabel = computed(() => {
	if (!props.value) return "Nessun documento collegato";
	if (typeof props.value === "string") return props.value;
	if (typeof props.value !== "object" || Array.isArray(props.value)) return "Documento collegato";

	const record = props.value as Record<string, unknown>;
	return String(record.filename ?? record.name ?? record.title ?? "Documento collegato");
});

const referenceUrl = computed(() => {
	if (!props.value || typeof props.value !== "object" || Array.isArray(props.value)) {
		return "";
	}

	const record = props.value as Record<string, unknown>;
	const url = record.url ?? record.href ?? record.path;
	return typeof url === "string" ? url : "";
});
</script>

<template>
	<StepFieldShell
		:label="field.label"
		:hint="field.hint"
		:required="field.required"
	>
		<div class="rounded-lg border border-slate-200 bg-white px-3 py-3">
			<a
				v-if="referenceUrl"
				:href="referenceUrl"
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex max-w-full items-center gap-2 truncate text-xs font-medium text-violet-700 hover:text-violet-900"
			>
				<UIcon name="i-lucide-file-text" class="size-3.5 shrink-0" />
				<span class="truncate">{{ referenceLabel }}</span>
			</a>
			<div
				v-else
				class="inline-flex max-w-full items-center gap-2 text-xs text-slate-500"
			>
				<UIcon name="i-lucide-file-text" class="size-3.5 shrink-0" />
				<span class="truncate">{{ referenceLabel }}</span>
			</div>
		</div>
	</StepFieldShell>
</template>

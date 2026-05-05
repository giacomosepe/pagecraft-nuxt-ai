<script setup lang="ts">
import type {
	BoardMember,
	ExtractionResult,
	Partecipata,
	Socio,
} from "~/utils/visuraExtraction";

type ReviewMode = "read" | "edit";
type EntityKind = "soci" | "partecipate";

interface FieldDef<T extends Record<string, unknown>> {
	key: keyof T & string;
	label: string;
	type?: "text" | "number" | "select";
	options?: { label: string; value: string }[];
	required?: boolean | ((entity: T) => boolean);
}

const props = defineProps<{
	open: boolean;
	result: ExtractionResult | null;
	filename?: string | null;
	canSaveProfile?: boolean;
	isSavingProfile?: boolean;
	profileSaved?: boolean;
}>();

const emit = defineEmits<{
	"update:open": [value: boolean];
	insert: [result: ExtractionResult];
	saveProfile: [result: ExtractionResult];
}>();

const mode = ref<ReviewMode>("read");
const draft = ref<ExtractionResult>(emptyExtractionResult());

const socioFields: FieldDef<Socio>[] = [
	{ key: "nome", label: "Nome", required: true },
	{ key: "percentuale", label: "Quota", type: "number", required: true },
	{
		key: "entity_type",
		label: "Tipo",
		type: "select",
		options: [
			{ label: "Persona fisica", value: "persona_fisica" },
			{ label: "Persona giuridica", value: "persona_giuridica" },
	],
	},
	{
		key: "indirizzo",
		label: "Sede",
		required: (socio) => socio.entity_type === "persona_giuridica",
	},
	{ key: "cf", label: "Codice fiscale / P.IVA", required: true },
	{
		key: "legale_rappresentante",
		label: "Legale rappresentante",
		required: (socio) => socio.entity_type === "persona_giuridica",
	},
	{
		key: "luogo_nascita",
		label: "Luogo di nascita",
		required: (socio) => socio.entity_type === "persona_fisica",
	},
];

const partecipataFields: FieldDef<Partecipata>[] = [
	{ key: "nome", label: "Nome", required: true },
	{ key: "forma_giuridica", label: "Forma giuridica", required: true },
	{ key: "paese", label: "Paese" },
	{ key: "percentuale_detenuta", label: "Quota detenuta", type: "number", required: true },
	{ key: "indirizzo", label: "Indirizzo", required: true },
	{ key: "cf", label: "Codice fiscale / P.IVA", required: true },
	{ key: "legale_rappresentante", label: "Legale rappresentante", required: true },
];

const missingItems = computed(() => buildMissingItems(draft.value));
const missingCount = computed(() => missingItems.value.length);

const sociCount = computed(() => draft.value.soci.length);
const partecipateCount = computed(() => draft.value.partecipate.length);
const extractionStatusLabel = computed(() =>
	props.result ? "Estrazione completata" : "In attesa di estrazione",
);
const missingFooterLabel = computed(() => {
	if (missingCount.value === 0) return "Tutti i campi estratti sono completi.";
	const suffix = missingCount.value === 1 ? "campo ancora mancante" : "campi ancora mancanti";
	return `${missingCount.value} ${suffix}`;
});

watch(
	() => props.open,
	(isOpen) => {
		if (!isOpen) return;
		mode.value = "read";
		draft.value = cloneExtractionResult(props.result);
	},
);

watch(
	() => props.result,
	(result) => {
		if (props.open) draft.value = cloneExtractionResult(result);
	},
	{ deep: true },
);

function emptyExtractionResult(): ExtractionResult {
	return {
		soci: [],
		partecipate: [],
		board: [],
		legale_rappresentante_societa: null,
		missing: {},
	};
}

function cloneExtractionResult(result: ExtractionResult | null): ExtractionResult {
	if (!result) return emptyExtractionResult();
	return {
		soci: result.soci.map((socio) => ({ ...socio })),
		partecipate: result.partecipate.map((partecipata) => ({ ...partecipata })),
		board: (result.board ?? []).map((member: BoardMember) => ({ ...member })),
		legale_rappresentante_societa: result.legale_rappresentante_societa ?? null,
		missing: result.missing ? { ...result.missing } : {},
	};
}

function isEmptyValue(value: unknown): boolean {
	return value === null || value === undefined || String(value).trim() === "";
}

function isRequiredField<T extends Record<string, unknown>>(field: FieldDef<T>, entity: T): boolean {
	if (typeof field.required === "function") return field.required(entity);
	return field.required === true;
}

function fieldValue(entity: Record<string, unknown>, key: string): string | number {
	const value = entity[key];
	if (value === null || value === undefined) return "";
	if (typeof value === "number") return value;
	return String(value);
}

function formattedFieldValue(entity: Record<string, unknown>, key: string): string {
	const value = fieldValue(entity, key);
	if (value === "") return "";
	if (key === "entity_type") {
		return value === "persona_fisica" ? "Persona fisica" : "Persona giuridica";
	}
	if (key === "percentuale" || key === "percentuale_detenuta") return `${value}%`;
	return String(value);
}

function updateSocio(index: number, key: keyof Socio & string, value: string): void {
	const next = [...draft.value.soci];
	const socio = { ...next[index] };
	if (key === "percentuale") {
		socio.percentuale = value.trim() === "" ? null : Number(value);
	} else if (key === "entity_type") {
		socio.entity_type = value === "persona_giuridica" ? "persona_giuridica" : "persona_fisica";
	} else {
		socio[key] = value.trim() || null;
	}
	next[index] = socio;
	draft.value = { ...draft.value, soci: next };
}

function updatePartecipata(index: number, key: keyof Partecipata & string, value: string): void {
	const next = [...draft.value.partecipate];
	const partecipata = { ...next[index] };
	if (key === "percentuale_detenuta") {
		partecipata.percentuale_detenuta = value.trim() === "" ? null : Number(value);
	} else {
		partecipata[key] = value.trim() || null;
	}
	next[index] = partecipata;
	draft.value = { ...draft.value, partecipate: next };
}

function addSocio(): void {
	draft.value = {
		...draft.value,
		soci: [
			...draft.value.soci,
			{
				entity_type: "persona_giuridica",
				nome: null,
				percentuale: null,
				indirizzo: null,
				cf: null,
				legale_rappresentante: null,
				luogo_nascita: null,
			},
		],
	};
	mode.value = "edit";
}

function addPartecipata(): void {
	draft.value = {
		...draft.value,
		partecipate: [
			...draft.value.partecipate,
			{
				nome: null,
				forma_giuridica: null,
				paese: null,
				percentuale_detenuta: null,
				indirizzo: null,
				cf: null,
				legale_rappresentante: null,
			},
		],
	};
	mode.value = "edit";
}

function removeEntity(kind: EntityKind, index: number): void {
	if (kind === "soci") {
		draft.value = {
			...draft.value,
			soci: draft.value.soci.filter((_, itemIndex) => itemIndex !== index),
		};
		return;
	}

	draft.value = {
		...draft.value,
		partecipate: draft.value.partecipate.filter((_, itemIndex) => itemIndex !== index),
	};
}

function isFieldMissing(kind: EntityKind, index: number, key: string): boolean {
	if (kind === "soci") {
		const entity = draft.value.soci[index];
		const field = socioFields.find((item) => item.key === key);
		return Boolean(entity && field && isRequiredField(field, entity) && isEmptyValue(entity[key]));
	}

	const entity = draft.value.partecipate[index];
	const field = partecipataFields.find((item) => item.key === key);
	return Boolean(entity && field && isRequiredField(field, entity) && isEmptyValue(entity[key]));
}

function buildMissingItems(result: ExtractionResult): { kind: EntityKind; index: number; label: string }[] {
	const items: { kind: EntityKind; index: number; label: string }[] = [];

	result.soci.forEach((socio, index) => {
		socioFields.forEach((field) => {
			if (isRequiredField(field, socio) && isEmptyValue((socio as Record<string, unknown>)[field.key])) {
				items.push({ kind: "soci", index, label: field.label });
			}
		});
	});

	result.partecipate.forEach((partecipata, index) => {
		partecipataFields.forEach((field) => {
			if (isRequiredField(field, partecipata) && isEmptyValue((partecipata as Record<string, unknown>)[field.key])) {
				items.push({ kind: "partecipate", index, label: field.label });
			}
		});
	});

	return items;
}

function buildMissingReport(result: ExtractionResult): ExtractionResult["missing"] {
	const sociMissing = result.soci
		.map((socio, index) => ({
			index,
			name: socio.nome ?? `Socio ${index + 1}`,
			missing: socioFields
				.filter((field) => isRequiredField(field, socio) && isEmptyValue((socio as Record<string, unknown>)[field.key]))
				.map((field) => field.label),
		}))
		.filter((entry) => entry.missing.length > 0);

	const partecipateMissing = result.partecipate
		.map((partecipata, index) => ({
			index,
			name: partecipata.nome ?? `Partecipata ${index + 1}`,
			missing: partecipataFields
				.filter((field) => isRequiredField(field, partecipata) && isEmptyValue((partecipata as Record<string, unknown>)[field.key]))
				.map((field) => field.label),
		}))
		.filter((entry) => entry.missing.length > 0);

	return {
		soci: sociMissing,
		partecipate: partecipateMissing,
		shareholders: sociMissing,
		subsidiaries: partecipateMissing,
	};
}

function close(): void {
	emit("update:open", false);
}

function insert(): void {
	emit("insert", {
		...draft.value,
		missing: buildMissingReport(draft.value),
	});
}

function saveProfile(): void {
	emit("saveProfile", {
		...draft.value,
		missing: buildMissingReport(draft.value),
	});
}
</script>

<template>
	<UModal
		:open="open"
		:ui="{ content: 'max-w-[min(1040px,calc(100vw-32px))]' }"
		@update:open="emit('update:open', $event)"
	>
		<template #content>
			<div class="flex max-h-[86vh] flex-col bg-white">
				<header class="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
					<div>
						<p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
							Visura camerale
						</p>
						<h3 class="mt-1 text-base font-semibold text-slate-900">
							Dati estratti dalla visura
						</h3>
						<div class="mt-2 flex flex-wrap items-center gap-2 text-sm leading-6 text-slate-500">
							<span>{{ filename ? filename : "File caricato" }}</span>
							<span class="hidden text-slate-300 sm:inline">·</span>
							<span class="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
								<UIcon name="i-lucide-check-circle" class="size-3.5" />
								{{ extractionStatusLabel }}
							</span>
						</div>
					</div>

					<UButton
						icon="i-lucide-x"
						color="neutral"
						variant="ghost"
						size="sm"
						aria-label="Chiudi"
						@click="close"
					/>
				</header>

				<div class="flex-1 space-y-5 overflow-y-auto px-5 py-5">
					<div class="flex flex-wrap items-center gap-2">
						<span class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
							{{ sociCount }} soci
						</span>
						<span class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
							{{ partecipateCount }} partecipate
						</span>
						<span
							class="rounded-full border px-3 py-1 text-xs font-medium"
							:class="missingCount ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-700'"
						>
							{{ missingCount }} campi mancanti
						</span>
					</div>

					<section class="space-y-3">
						<div class="flex items-center justify-between gap-3">
							<h4 class="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
								Soci
							</h4>
							<UButton
								v-if="mode === 'edit'"
								size="xs"
								color="neutral"
								variant="outline"
								icon="i-lucide-plus"
								class="rounded-lg bg-white"
								@click="addSocio"
							>
								Aggiungi socio
							</UButton>
						</div>

						<div
							v-if="!draft.soci.length"
							class="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500"
						>
							Nessun socio rilevato.
						</div>

						<div
							v-for="(socio, index) in draft.soci"
							:key="`socio-${index}`"
							class="rounded-xl border border-slate-200 bg-slate-50 p-4"
						>
							<div class="mb-3 flex items-center justify-between gap-3">
								<p class="text-sm font-semibold text-slate-900">
									{{ socio.nome || `Socio ${index + 1}` }}
								</p>
								<UButton
									v-if="mode === 'edit'"
									size="xs"
									color="error"
									variant="ghost"
									icon="i-lucide-trash-2"
									aria-label="Rimuovi socio"
									@click="removeEntity('soci', index)"
								/>
							</div>

							<div class="grid gap-3 sm:grid-cols-2">
								<div
									v-for="field in socioFields"
									:key="field.key"
									class="rounded-lg border bg-white p-3"
									:class="isFieldMissing('soci', index, field.key) ? 'border-amber-200 ring-1 ring-amber-100' : 'border-slate-200'"
								>
									<label class="block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
										{{ field.label }}
									</label>

									<template v-if="mode === 'read'">
										<p
											class="mt-1 text-sm font-medium"
											:class="isFieldMissing('soci', index, field.key) ? 'text-amber-800' : 'text-slate-800'"
										>
											{{ formattedFieldValue(socio, field.key) || '[DA COMPLETARE]' }}
										</p>
									</template>

									<select
										v-else-if="field.type === 'select'"
										class="mt-2 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
										:value="fieldValue(socio, field.key)"
										@change="updateSocio(index, field.key, ($event.target as HTMLSelectElement).value)"
									>
										<option
											v-for="option in field.options"
											:key="option.value"
											:value="option.value"
										>
											{{ option.label }}
										</option>
									</select>

									<UInput
										v-else
											:model-value="fieldValue(socio, field.key)"
											:type="field.type === 'number' ? 'number' : 'text'"
											:placeholder="isFieldMissing('soci', index, field.key) ? 'Inserisci valore' : undefined"
											class="mt-2 w-full"
											:ui="{ base: 'h-9 rounded-lg border-slate-200 bg-white text-sm' }"
											@update:model-value="updateSocio(index, field.key, String($event ?? ''))"
									/>
								</div>
							</div>
						</div>
					</section>

					<section class="space-y-3">
						<div class="flex items-center justify-between gap-3">
							<h4 class="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
								Partecipate
							</h4>
							<UButton
								v-if="mode === 'edit'"
								size="xs"
								color="neutral"
								variant="outline"
								icon="i-lucide-plus"
								class="rounded-lg bg-white"
								@click="addPartecipata"
							>
								Aggiungi partecipata
							</UButton>
						</div>

						<div
							v-if="!draft.partecipate.length"
							class="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500"
						>
							Nessuna partecipata rilevata.
						</div>

						<div
							v-for="(partecipata, index) in draft.partecipate"
							:key="`partecipata-${index}`"
							class="rounded-xl border border-slate-200 bg-slate-50 p-4"
						>
							<div class="mb-3 flex items-center justify-between gap-3">
								<p class="text-sm font-semibold text-slate-900">
									{{ partecipata.nome || `Partecipata ${index + 1}` }}
								</p>
								<UButton
									v-if="mode === 'edit'"
									size="xs"
									color="error"
									variant="ghost"
									icon="i-lucide-trash-2"
									aria-label="Rimuovi partecipata"
									@click="removeEntity('partecipate', index)"
								/>
							</div>

							<div class="grid gap-3 sm:grid-cols-2">
								<div
									v-for="field in partecipataFields"
									:key="field.key"
									class="rounded-lg border bg-white p-3"
									:class="isFieldMissing('partecipate', index, field.key) ? 'border-amber-200 ring-1 ring-amber-100' : 'border-slate-200'"
								>
									<label class="block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
										{{ field.label }}
									</label>

									<template v-if="mode === 'read'">
										<p
											class="mt-1 text-sm font-medium"
											:class="isFieldMissing('partecipate', index, field.key) ? 'text-amber-800' : 'text-slate-800'"
										>
											{{ formattedFieldValue(partecipata, field.key) || '[DA COMPLETARE]' }}
										</p>
									</template>

									<UInput
										v-else
										:model-value="fieldValue(partecipata, field.key)"
										:type="field.type === 'number' ? 'number' : 'text'"
										:placeholder="isFieldMissing('partecipate', index, field.key) ? 'Inserisci valore' : undefined"
										class="mt-2 w-full"
										:ui="{ base: 'h-9 rounded-lg border-slate-200 bg-white text-sm' }"
										@update:model-value="updatePartecipata(index, field.key, String($event ?? ''))"
									/>
								</div>
							</div>
						</div>
					</section>
				</div>

				<footer class="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
					<p
						class="text-xs font-medium"
						:class="missingCount ? 'text-amber-700' : 'text-slate-500'"
					>
						<template v-if="mode === 'edit'">
							{{ missingFooterLabel }}
						</template>
						<template v-else>
							{{ missingCount ? `${missingCount} campi mancanti: verranno inseriti come [DA COMPLETARE].` : missingFooterLabel }}
						</template>
					</p>

					<div class="flex justify-end gap-2">
						<UButton
							v-if="canSaveProfile"
							color="neutral"
							variant="outline"
							icon="i-lucide-save"
							class="rounded-xl bg-white"
							:loading="isSavingProfile"
							:disabled="isSavingProfile"
							@click="saveProfile"
						>
							{{ profileSaved ? 'Salvato nel profilo' : 'Salva nel profilo cliente' }}
						</UButton>
						<UButton
							v-if="mode === 'edit'"
							color="neutral"
							variant="ghost"
							class="rounded-xl"
							@click="mode = 'read'"
						>
							Annulla
						</UButton>
						<UButton
							v-else
							color="neutral"
							variant="outline"
							icon="i-lucide-pencil"
							class="rounded-xl bg-white"
							@click="mode = 'edit'"
						>
							Modifica
						</UButton>
						<UButton
							icon="i-lucide-check-circle"
							class="rounded-xl"
							@click="insert"
						>
							Inserisci
						</UButton>
					</div>
				</footer>
			</div>
		</template>
	</UModal>
</template>

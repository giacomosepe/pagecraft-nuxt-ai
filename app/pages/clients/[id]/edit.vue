<script setup lang="ts">
definePageMeta({ middleware: "auth" });

const route = useRoute();
const clientId = route.params.id as string;

// ─── Load existing client data ────────────────────────────────────────────────
const { data: clientData, pending } = useClient(clientId);

// ─── Form state — populated once data loads ───────────────────────────────────
const form = reactive({
	name:                "",
	company_name:        "",
	industry_sector:     "",
	employee_count:      "" as string | number,
	legal_representative:"",
	vat_number:          "",
	codice_fiscale:      "",
	registered_address:  "",
	company_form:        "",
});

// Populate form when data arrives
watch(clientData, (val) => {
	if (!val) return;
	form.name                 = val.name                  ?? "";
	form.company_name         = val.company_name          ?? "";
	form.industry_sector      = val.industry_sector       ?? "";
	form.employee_count       = val.employee_count        ?? "";
	form.legal_representative = val.legal_representative  ?? "";
	form.vat_number           = val.vat_number            ?? "";
	form.codice_fiscale       = val.codice_fiscale        ?? "";
	form.registered_address   = val.registered_address    ?? "";
	form.company_form         = val.company_form          ?? "";
}, { immediate: true });

// ─── Save ─────────────────────────────────────────────────────────────────────
const loading  = ref(false);
const errorMsg = ref("");
const success  = ref(false);

async function save() {
	loading.value  = true;
	errorMsg.value = "";
	success.value  = false;

	try {
		await $fetch("/api/db/mutate", {
			method: "POST",
			body: {
				table:     "clients",
				operation: "update",
				data: {
					name:                 form.name                 || undefined,
					company_name:         form.company_name         || undefined,
					industry_sector:      form.industry_sector      || undefined,
					employee_count:       form.employee_count !== "" ? Number(form.employee_count) : undefined,
					legal_representative: form.legal_representative || undefined,
					vat_number:           form.vat_number           || undefined,
					codice_fiscale:       form.codice_fiscale        || undefined,
					registered_address:   form.registered_address   || undefined,
					company_form:         form.company_form          || undefined,
				},
				where: { id: clientId },
			},
		});
		success.value = true;
		await navigateTo(`/clients/${clientId}`);
	} catch (e: any) {
		errorMsg.value = e?.data?.message ?? "Errore durante il salvataggio.";
	} finally {
		loading.value = false;
	}
}
</script>

<template>
	<FormPageLayout
		title="Modifica cliente"
		description="Aggiorna i dati principali del cliente mantenendo il form coerente con il resto del prodotto."
		:back-to="`/clients/${clientId}`"
		:back-label="clientData?.name ?? 'Cliente'"
		eyebrow="Modifica"
		size="lg"
	>
		<div v-if="pending" class="flex justify-center py-24">
			<UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-slate-400" />
		</div>

		<template v-else-if="clientData">
			<FormSectionCard
				title="Identità aziendale"
				description="Aggiorna il nome principale e i dati anagrafici usati in tutto il workspace."
			>
				<div class="space-y-5">
					<UFormField label="Nome cliente *">
						<UInput v-model="form.name" placeholder="es. Acme S.r.l." class="w-full" />
					</UFormField>

					<UFormField label="Ragione sociale">
						<UInput v-model="form.company_name" placeholder="es. Acme S.r.l." class="w-full" />
					</UFormField>

					<UFormField label="Forma giuridica">
						<UInput v-model="form.company_form" placeholder="es. S.r.l., S.p.A., S.n.c." class="w-full" />
					</UFormField>
				</div>
			</FormSectionCard>

			<FormSectionCard
				title="Dati fiscali e operativi"
				description="Mantieni allineate le informazioni usate nei programmi e nei documenti."
			>
				<div class="space-y-5">
					<div class="grid gap-4 md:grid-cols-2">
						<UFormField label="Partita IVA">
							<UInput v-model="form.vat_number" placeholder="es. 12345678901" class="w-full" />
						</UFormField>
						<UFormField label="Codice fiscale">
							<UInput v-model="form.codice_fiscale" placeholder="es. RSSMRA80A01H501U" class="w-full" />
						</UFormField>
					</div>

					<div class="grid gap-4 md:grid-cols-2">
						<UFormField label="Settore">
							<UInput v-model="form.industry_sector" placeholder="es. Software, Farmaceutica" class="w-full" />
						</UFormField>
						<UFormField label="Numero dipendenti">
							<UInput v-model="form.employee_count" type="number" placeholder="es. 42" class="w-full" />
						</UFormField>
					</div>

					<UFormField label="Rappresentante legale">
						<UInput v-model="form.legal_representative" placeholder="es. Mario Rossi" class="w-full" />
					</UFormField>

					<UFormField label="Sede legale">
						<UInput v-model="form.registered_address" placeholder="es. Via Roma 1, 20100 Milano" class="w-full" />
					</UFormField>
				</div>
			</FormSectionCard>

			<UAlert
				v-if="errorMsg"
				color="error"
				variant="soft"
				:description="errorMsg"
				icon="i-lucide-circle-alert"
			/>
		</template>

		<div v-else class="flex flex-col items-center justify-center py-24 text-center">
			<UIcon name="i-lucide-circle-alert" class="mb-3 size-9 text-slate-300" />
			<p class="text-sm font-medium text-slate-900">Cliente non trovato</p>
			<NuxtLink to="/clients" class="mt-3 text-sm text-primary-600 hover:underline">
				Torna ai clienti
			</NuxtLink>
		</div>

		<template #footer>
			<FormActionsFooter v-if="clientData && !pending">
				<template #leading>
					<p class="text-sm text-slate-500">
						Le modifiche si rifletteranno nelle viste clienti e nei nuovi documenti creati in seguito.
					</p>
				</template>

				<UButton color="neutral" variant="ghost" :to="`/clients/${clientId}`">
					Annulla
				</UButton>
				<UButton :loading="loading" @click="save">
					Salva modifiche
				</UButton>
			</FormActionsFooter>
		</template>
	</FormPageLayout>
</template>

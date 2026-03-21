<script setup lang="ts">
definePageMeta({ middleware: "auth" });

const supabase = useSupabaseClient();
const route = useRoute();
const clientId = route.params.id as string;

// ─── Load existing client data ────────────────────────────────────────────────
const { data: clientData, pending } = await useAsyncData(
	`client-edit-${clientId}`,
	async () => {
		const { data, error } = await supabase
			.from("clients")
			.select(`
				id, name, company_name, industry_sector, employee_count,
				legal_representative, vat_number, codice_fiscale,
				registered_address, company_form
			`)
			.eq("id", clientId)
			.single();
		if (error) throw error;
		return data;
	},
	{ server: false },
);

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
	<div class="mx-auto max-w-2xl px-6 py-10">

		<!-- Loading -->
		<div v-if="pending" class="flex justify-center py-24">
			<UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-gray-400" />
		</div>

		<template v-else-if="clientData">
			<!-- Header -->
			<div class="mb-8">
				<NuxtLink
					:to="`/clients/${clientId}`"
					class="mb-4 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
				>
					<UIcon name="i-lucide-arrow-left" class="size-4" />
					{{ clientData.name }}
				</NuxtLink>
				<h1 class="text-xl font-semibold text-gray-900 dark:text-white">
					Modifica cliente
				</h1>
			</div>

			<div class="flex flex-col gap-5">
				<!-- Name -->
				<UFormField label="Nome cliente *">
					<UInput v-model="form.name" placeholder="es. Acme S.r.l." class="w-full" />
				</UFormField>

				<!-- Company name -->
				<UFormField label="Ragione sociale">
					<UInput v-model="form.company_name" placeholder="es. Acme S.r.l." class="w-full" />
				</UFormField>

				<!-- Company form -->
				<UFormField label="Forma giuridica">
					<UInput v-model="form.company_form" placeholder="es. S.r.l., S.p.A., S.n.c." class="w-full" />
				</UFormField>

				<!-- VAT + Codice fiscale -->
				<div class="grid grid-cols-2 gap-4">
					<UFormField label="Partita IVA">
						<UInput v-model="form.vat_number" placeholder="es. 12345678901" class="w-full" />
					</UFormField>
					<UFormField label="Codice fiscale">
						<UInput v-model="form.codice_fiscale" placeholder="es. RSSMRA80A01H501U" class="w-full" />
					</UFormField>
				</div>

				<!-- Industry + Employees -->
				<div class="grid grid-cols-2 gap-4">
					<UFormField label="Settore">
						<UInput v-model="form.industry_sector" placeholder="es. Software, Farmaceutica" class="w-full" />
					</UFormField>
					<UFormField label="Numero dipendenti">
						<UInput v-model="form.employee_count" type="number" placeholder="es. 42" class="w-full" />
					</UFormField>
				</div>

				<!-- Legal rep -->
				<UFormField label="Rappresentante legale">
					<UInput v-model="form.legal_representative" placeholder="es. Mario Rossi" class="w-full" />
				</UFormField>

				<!-- Address -->
				<UFormField label="Sede legale">
					<UInput v-model="form.registered_address" placeholder="es. Via Roma 1, 20100 Milano" class="w-full" />
				</UFormField>

				<!-- Error -->
				<UAlert
					v-if="errorMsg"
					color="error"
					variant="soft"
					:description="errorMsg"
					icon="i-lucide-circle-alert"
				/>

				<!-- Actions -->
				<div class="flex justify-end gap-3 pt-2">
					<UButton color="neutral" variant="ghost" :to="`/clients/${clientId}`">
						Annulla
					</UButton>
					<UButton :loading="loading" @click="save">
						Salva modifiche
					</UButton>
				</div>
			</div>
		</template>

		<!-- Not found -->
		<div v-else class="flex flex-col items-center justify-center py-24 text-center">
			<UIcon name="i-lucide-circle-alert" class="mb-3 size-9 text-gray-300 dark:text-gray-600" />
			<p class="text-sm font-medium text-gray-900 dark:text-white">Cliente non trovato</p>
			<NuxtLink to="/clients" class="mt-3 text-sm text-primary-600 hover:underline dark:text-primary-400">
				Torna ai clienti
			</NuxtLink>
		</div>

	</div>
</template>

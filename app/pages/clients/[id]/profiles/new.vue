<script setup lang="ts">
definePageMeta({ middleware: "auth" });

const route = useRoute();
const clientId = route.params.id as string;

// ─── Form state ───────────────────────────────────────────────────────────────
const loading = ref(false);
const errorMsg = ref("");

// Basic company info
const form = reactive({
	company_name: "",
	tax_year: "",
	industry_sector: "",
	employee_count: "" as string | number,
	legal_representative: "",
});

// Board members — simple array of strings
const boardMembers = ref<string[]>([""]);

function addBoardMember() {
	boardMembers.value.push("");
}
function removeBoardMember(index: number) {
	boardMembers.value.splice(index, 1);
}

// ─── Shareholders ─────────────────────────────────────────────────────────────
import type { Shareholder, Subsidiary } from "~/types/company.types";

const shareholders = ref<Shareholder[]>([]);

function addShareholder() {
	shareholders.value.push({
		type: "persona_fisica",
		first_name: "",
		last_name: "",
		place_of_birth: "",
		date_of_birth: "",
		address: "",
		codice_fiscale: "",
		quota_pct: null,
	});
}
function removeShareholder(index: number) {
	shareholders.value.splice(index, 1);
}

function toggleShareholderType(index: number, newType: "persona_fisica" | "persona_giuridica") {
	if (newType === "persona_fisica") {
		shareholders.value[index] = {
			type: "persona_fisica",
			first_name: "",
			last_name: "",
			place_of_birth: "",
			date_of_birth: "",
			address: "",
			codice_fiscale: "",
			quota_pct: null,
		};
	} else {
		shareholders.value[index] = {
			type: "persona_giuridica",
			company_name: "",
			company_form: "",
			registered_address: "",
			codice_fiscale: "",
			quota_pct: null,
			legal_rep: null,
			legal_rep_missing: true,
		};
	}
}

// ─── Subsidiaries / Partecipate ───────────────────────────────────────────────
const subsidiaries = ref<Subsidiary[]>([]);

function addSubsidiary() {
	subsidiaries.value.push({
		type: "persona_giuridica",
		company_name: "",
		company_form: "",
		registered_address: "",
		country: "Italia",
		codice_fiscale: null,
		quota_held_pct: null,
		legal_rep: null,
		legal_rep_missing: true,
	});
}
function removeSubsidiary(index: number) {
	subsidiaries.value.splice(index, 1);
}

// ─── Submit ───────────────────────────────────────────────────────────────────
async function save() {
	if (!form.company_name.trim()) {
		errorMsg.value = "La ragione sociale è obbligatoria.";
		return;
	}
	loading.value = true;
	errorMsg.value = "";

	// Clean up board members — remove empty strings
	const cleanedBoardMembers = boardMembers.value.filter((m) => m.trim());

	// Clean up shareholders — remove incomplete entries, normalise nulls
	const cleanedShareholders = shareholders.value
		.filter((s) =>
			s.type === "persona_fisica"
				? (s.first_name.trim() || s.last_name.trim())
				: s.company_name.trim()
		)
		.map((s) => {
			if (s.type === "persona_fisica") {
				return {
					type: "persona_fisica" as const,
					first_name: s.first_name.trim(),
					last_name: s.last_name.trim(),
					place_of_birth: s.place_of_birth.trim() || null,
					date_of_birth: s.date_of_birth || null,
					address: s.address.trim() || null,
					codice_fiscale: s.codice_fiscale.trim() || null,
					quota_pct: s.quota_pct,
				};
			} else {
				return {
					type: "persona_giuridica" as const,
					company_name: s.company_name.trim(),
					company_form: s.company_form.trim() || null,
					registered_address: s.registered_address.trim() || null,
					codice_fiscale: s.codice_fiscale.trim() || null,
					quota_pct: s.quota_pct,
					legal_rep: s.legal_rep?.trim() || null,
					legal_rep_missing: !s.legal_rep?.trim(),
				};
			}
		});

	// Clean up subsidiaries — remove incomplete entries
	const cleanedSubsidiaries = subsidiaries.value
		.filter((s) =>
			s.type === "persona_fisica"
				? (s.first_name.trim() || s.last_name.trim())
				: s.company_name.trim()
		)
		.map((s) => {
			if (s.type === "persona_fisica") {
				return {
					type: "persona_fisica" as const,
					first_name: s.first_name.trim(),
					last_name: s.last_name.trim(),
					country: s.country.trim() || null,
					quota_held_pct: s.quota_held_pct,
				};
			} else {
				return {
					type: "persona_giuridica" as const,
					company_name: s.company_name.trim(),
					company_form: s.company_form.trim() || null,
					registered_address: s.registered_address.trim() || null,
					country: s.country.trim() || null,
					codice_fiscale: s.codice_fiscale?.trim() || null,
					quota_held_pct: s.quota_held_pct,
					legal_rep: s.legal_rep?.trim() || null,
					legal_rep_missing: !s.legal_rep?.trim(),
				};
			}
		});

	try {
		await $fetch("/api/db/mutate", {
			method: "POST",
			body: {
				table: "company_profiles",
				operation: "insert",
				data: {
					client_id: clientId,
					company_name: form.company_name.trim(),
					tax_year: form.tax_year
						? parseInt(form.tax_year as string)
						: null,
					industry_sector: form.industry_sector.trim() || null,
					employee_count: form.employee_count
						? parseInt(form.employee_count as string)
						: null,
					legal_representative:
						form.legal_representative.trim() || null,
					board_members: cleanedBoardMembers.length
						? cleanedBoardMembers
						: null,
					shareholders: cleanedShareholders.length
						? cleanedShareholders
						: null,
					subsidiaries: cleanedSubsidiaries.length
						? cleanedSubsidiaries
						: null,
				},
			},
		});
		await navigateTo(`/clients/${clientId}`);
	} catch (e: any) {
		errorMsg.value = "Errore durante il salvataggio. Riprova.";
		loading.value = false;
	}
}
</script>

<template>
	<div class="mx-auto max-w-2xl px-6 py-10">
		<!-- Header -->
		<div class="mb-8">
			<NuxtLink
				:to="`/clients/${clientId}`"
				class="mb-4 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
			>
				<UIcon name="i-lucide-arrow-left" class="size-4" />
				Cliente
			</NuxtLink>
			<h1 class="text-xl font-semibold text-gray-900 dark:text-white">
				Nuovo profilo aziendale
			</h1>
			<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
				Queste informazioni vengono iniettate automaticamente in tutti i
				passi del documento.
			</p>
		</div>

		<div class="flex flex-col gap-8">
			<!-- ── Sezione 1: Dati aziendali ── -->
			<section>
				<h2
					class="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
				>
					Dati aziendali
				</h2>
				<div class="flex flex-col gap-4">
					<UFormField label="Ragione sociale *">
						<UInput
							v-model="form.company_name"
							placeholder="es. Acme S.r.l."
							class="w-full"
							autofocus
						/>
					</UFormField>

					<div class="grid grid-cols-2 gap-4">
						<UFormField label="Anno fiscale">
							<UInput
								v-model="form.tax_year"
								type="number"
								placeholder="es. 2023"
								class="w-full"
							/>
						</UFormField>

						<UFormField label="Numero dipendenti">
							<UInput
								v-model="form.employee_count"
								type="number"
								placeholder="es. 42"
								class="w-full"
							/>
						</UFormField>
					</div>

					<UFormField label="Settore di attività">
						<UInput
							v-model="form.industry_sector"
							placeholder="es. Tecnologia, Farmaceutico, Manifatturiero…"
							class="w-full"
						/>
					</UFormField>
				</div>
			</section>

			<!-- ── Sezione 2: Rappresentanza ── -->
			<section>
				<h2
					class="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
				>
					Rappresentanza legale
				</h2>
				<div class="flex flex-col gap-4">
					<UFormField label="Legale rappresentante">
						<UInput
							v-model="form.legal_representative"
							placeholder="Nome e cognome"
							class="w-full"
						/>
					</UFormField>

					<!-- Board members — dynamic list -->
					<UFormField label="Membri del Consiglio di Amministrazione">
						<div class="flex flex-col gap-2">
							<div
								v-for="(_, index) in boardMembers"
								:key="index"
								class="flex items-center gap-2"
							>
								<UInput
									v-model="boardMembers[index]"
									:placeholder="`Membro CdA ${index + 1}`"
									class="flex-1"
								/>
								<UButton
									color="neutral"
									variant="ghost"
									icon="i-lucide-x"
									size="sm"
									:disabled="boardMembers.length === 1"
									@click="removeBoardMember(index)"
								/>
							</div>
							<UButton
								variant="ghost"
								color="neutral"
								icon="i-lucide-plus"
								size="xs"
								class="self-start"
								@click="addBoardMember"
							>
								Aggiungi membro
							</UButton>
						</div>
					</UFormField>
				</div>
			</section>

			<!-- ── Sezione 3: Azionisti ── -->
			<section>
				<div class="mb-4 flex items-center justify-between">
					<h2 class="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
						Azionisti
					</h2>
					<UButton variant="ghost" color="neutral" icon="i-lucide-plus" size="xs" @click="addShareholder">
						Aggiungi azionista
					</UButton>
				</div>

				<div
					v-if="!shareholders.length"
					class="rounded-lg border border-dashed border-gray-300 py-8 text-center dark:border-gray-700"
				>
					<p class="text-sm text-gray-400 dark:text-gray-500">Nessun azionista aggiunto</p>
				</div>

				<div v-else class="flex flex-col gap-4">
					<div
						v-for="(shareholder, index) in shareholders"
						:key="index"
						class="relative rounded-lg border border-gray-200 p-4 dark:border-gray-700"
					>
						<UButton
							class="absolute right-3 top-3"
							color="neutral" variant="ghost" icon="i-lucide-x" size="xs"
							@click="removeShareholder(index)"
						/>

						<p class="mb-3 text-xs font-medium text-gray-500 dark:text-gray-400">
							Azionista {{ index + 1 }}
						</p>

						<!-- Type toggle -->
						<div class="mb-3 flex gap-2">
							<UButton
								:variant="shareholder.type === 'persona_fisica' ? 'solid' : 'outline'"
								color="neutral" size="xs"
								@click="toggleShareholderType(index, 'persona_fisica')"
							>
								Persona fisica
							</UButton>
							<UButton
								:variant="shareholder.type === 'persona_giuridica' ? 'solid' : 'outline'"
								color="neutral" size="xs"
								@click="toggleShareholderType(index, 'persona_giuridica')"
							>
								Persona giuridica
							</UButton>
						</div>

						<!-- Persona fisica fields -->
						<template v-if="shareholder.type === 'persona_fisica'">
							<div class="grid grid-cols-2 gap-3">
								<UFormField label="Nome">
									<UInput v-model="(shareholder as any).first_name" placeholder="Mario" class="w-full" />
								</UFormField>
								<UFormField label="Cognome">
									<UInput v-model="(shareholder as any).last_name" placeholder="Rossi" class="w-full" />
								</UFormField>
							</div>
							<div class="grid grid-cols-2 gap-3 mt-3">
								<UFormField label="Luogo di nascita">
									<UInput v-model="(shareholder as any).place_of_birth" placeholder="Milano (MI)" class="w-full" />
								</UFormField>
								<UFormField label="Data di nascita">
									<UInput v-model="(shareholder as any).date_of_birth" type="date" class="w-full" />
								</UFormField>
							</div>
							<div class="grid grid-cols-2 gap-3 mt-3">
								<UFormField label="Codice fiscale">
									<UInput v-model="(shareholder as any).codice_fiscale" placeholder="RSSMRA80A01F205X" class="w-full uppercase" />
								</UFormField>
								<UFormField label="Quota %">
									<UInput v-model="(shareholder as any).quota_pct" type="number" min="0" max="100" step="0.01" placeholder="es. 51.00" class="w-full" />
								</UFormField>
							</div>
							<div class="mt-3">
								<UFormField label="Indirizzo di residenza">
									<UInput v-model="(shareholder as any).address" placeholder="Via Roma 1, 20100 Milano (MI)" class="w-full" />
								</UFormField>
							</div>
						</template>

						<!-- Persona giuridica fields -->
						<template v-else>
							<div class="grid grid-cols-2 gap-3">
								<UFormField label="Ragione sociale">
									<UInput v-model="(shareholder as any).company_name" placeholder="Acme" class="w-full" />
								</UFormField>
								<UFormField label="Forma societaria">
									<USelect
										v-model="(shareholder as any).company_form"
										:options="[
											{ label: 'S.r.l.', value: 'S.r.l.' },
											{ label: 'S.r.l.s.', value: 'S.r.l.s.' },
											{ label: 'S.p.A.', value: 'S.p.A.' },
											{ label: 'S.n.c.', value: 'S.n.c.' },
											{ label: 'S.a.s.', value: 'S.a.s.' },
											{ label: 'Cooperativa', value: 'Cooperativa' },
											{ label: 'Altro', value: 'Altro' },
										]"
										class="w-full"
									/>
								</UFormField>
							</div>
							<div class="grid grid-cols-2 gap-3 mt-3">
								<UFormField label="Codice fiscale / P.IVA">
									<UInput v-model="(shareholder as any).codice_fiscale" placeholder="12345678901" class="w-full" />
								</UFormField>
								<UFormField label="Quota %">
									<UInput v-model="(shareholder as any).quota_pct" type="number" min="0" max="100" step="0.01" placeholder="es. 51.00" class="w-full" />
								</UFormField>
							</div>
							<div class="mt-3">
								<UFormField label="Sede legale">
									<UInput v-model="(shareholder as any).registered_address" placeholder="Via Roma 1, 20100 Milano (MI)" class="w-full" />
								</UFormField>
							</div>
							<div class="mt-3">
								<UFormField
									label="Legale rappresentante"
									:hint="!(shareholder as any).legal_rep ? 'Da verificare e completare manualmente' : ''"
								>
									<UInput
										v-model="(shareholder as any).legal_rep"
										placeholder="Nome e cognome"
										:class="!(shareholder as any).legal_rep ? 'ring-2 ring-yellow-400 rounded-md' : ''"
										class="w-full"
									/>
								</UFormField>
							</div>
						</template>
					</div>
				</div>
			</section>

			<!-- ── Sezione 4: Partecipate ── -->
			<section>
				<div class="mb-4 flex items-center justify-between">
					<h2 class="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
						Società partecipate
					</h2>
					<UButton variant="ghost" color="neutral" icon="i-lucide-plus" size="xs" @click="addSubsidiary">
						Aggiungi partecipata
					</UButton>
				</div>

				<div
					v-if="!subsidiaries.length"
					class="rounded-lg border border-dashed border-gray-300 py-8 text-center dark:border-gray-700"
				>
					<p class="text-sm text-gray-400 dark:text-gray-500">Nessuna società partecipata aggiunta</p>
				</div>

				<div v-else class="flex flex-col gap-4">
					<div
						v-for="(subsidiary, index) in subsidiaries"
						:key="index"
						class="relative rounded-lg border border-gray-200 p-4 dark:border-gray-700"
					>
						<UButton
							class="absolute right-3 top-3"
							color="neutral" variant="ghost" icon="i-lucide-x" size="xs"
							@click="removeSubsidiary(index)"
						/>

						<p class="mb-3 text-xs font-medium text-gray-500 dark:text-gray-400">
							Partecipata {{ index + 1 }}
						</p>

						<div class="grid grid-cols-2 gap-3">
							<UFormField label="Ragione sociale">
								<UInput v-model="(subsidiary as any).company_name" placeholder="Ragione sociale" class="w-full" />
							</UFormField>
							<UFormField label="Forma societaria">
								<USelect
									v-model="(subsidiary as any).company_form"
									:options="[
										{ label: 'S.r.l.', value: 'S.r.l.' },
										{ label: 'S.r.l.s.', value: 'S.r.l.s.' },
										{ label: 'S.p.A.', value: 'S.p.A.' },
										{ label: 'S.n.c.', value: 'S.n.c.' },
										{ label: 'S.a.s.', value: 'S.a.s.' },
										{ label: 'Cooperativa', value: 'Cooperativa' },
										{ label: 'Altro', value: 'Altro' },
									]"
									class="w-full"
								/>
							</UFormField>
						</div>
						<div class="grid grid-cols-2 gap-3 mt-3">
							<UFormField label="Paese">
								<UInput v-model="(subsidiary as any).country" placeholder="es. Italia, Germania…" class="w-full" />
							</UFormField>
							<UFormField label="Quota detenuta %">
								<UInput v-model="(subsidiary as any).quota_held_pct" type="number" min="0" max="100" step="0.01" placeholder="es. 60.00" class="w-full" />
							</UFormField>
						</div>
						<div class="grid grid-cols-2 gap-3 mt-3">
							<UFormField label="Codice fiscale / P.IVA">
								<UInput v-model="(subsidiary as any).codice_fiscale" placeholder="12345678901" class="w-full" />
							</UFormField>
							<UFormField label="Sede legale">
								<UInput v-model="(subsidiary as any).registered_address" placeholder="Via Roma 1, 20100 Milano" class="w-full" />
							</UFormField>
						</div>
						<div class="mt-3">
							<UFormField
								label="Legale rappresentante"
								:hint="!(subsidiary as any).legal_rep ? 'Da verificare e completare manualmente' : ''"
							>
								<UInput
									v-model="(subsidiary as any).legal_rep"
									placeholder="Nome e cognome"
									:class="!(subsidiary as any).legal_rep ? 'ring-2 ring-yellow-400 rounded-md' : ''"
									class="w-full"
								/>
							</UFormField>
						</div>
					</div>
				</div>
			</section>

			<!-- ── Error + Submit ── -->
			<UAlert
				v-if="errorMsg"
				color="error"
				variant="soft"
				:description="errorMsg"
				icon="i-lucide-circle-alert"
			/>

			<div
				class="flex justify-end gap-3 border-t border-gray-100 pt-6 dark:border-gray-800"
			>
				<UButton
					color="neutral"
					variant="ghost"
					:to="`/clients/${clientId}`"
				>
					Annulla
				</UButton>
				<UButton :loading="loading" @click="save">
					Salva profilo
				</UButton>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { ClientDetail, ProjectListItem } from "~/types/app.types";
import { formatDate } from "~/utils/date";
import { deriveFolderStatus } from "~/utils/folderStatus";

definePageMeta({ middleware: "auth" });

type ProjectFilter = "active" | "completed";

interface ClientFormState {
	company_name: string;
	codice_fiscale: string;
	vat_number: string;
	street_address: string;
	city: string;
	provincia: string;
	cap: string;
	employee_count: string;
	revenue: string;
	legal_rep_name: string;
	legal_rep_cf: string;
	legal_rep_dob: string;
	contact_name: string;
	contact_email: string;
	contact_phone: string;
}

const route = useRoute();
const clientId = route.params.id as string;
const router = useRouter();

const { data, pending, refresh } = useClient(clientId);
const toast = useToast();

const deleteDialogOpen = ref(false);
const isDeleting = ref(false);
const isSaving = ref(false);
const deleteError = ref<string | null>(null);
const saveError = ref<string | null>(null);
const projectFilter = ref<ProjectFilter>("active");
const initialSnapshot = ref("");

const form = reactive<ClientFormState>({
	company_name: "",
	codice_fiscale: "",
	vat_number: "",
	street_address: "",
	city: "",
	provincia: "",
	cap: "",
	employee_count: "",
	revenue: "",
	legal_rep_name: "",
	legal_rep_cf: "",
	legal_rep_dob: "",
	contact_name: "",
	contact_email: "",
	contact_phone: "",
});

const displayName = computed(() =>
	data.value?.company_name?.trim() || data.value?.name || "Cliente",
);

const transitionNotice = computed(() => {
	if (route.query.created === "client") {
		return {
			title: "Cliente creato",
			description: "Completa i dati del cliente per riutilizzarli nei documenti.",
		};
	}

	if (route.query.updated === "client") {
		return {
			title: "Cliente aggiornato",
			description: "Le modifiche sono disponibili nelle viste collegate.",
		};
	}

	return null;
});

const projectRows = computed<ProjectListItem[]>(() =>
	(data.value?.folders ?? []).map((folder) => ({
		id: folder.id,
		program_name: folder.program_name,
		updated_at: folder.updated_at,
		client_id: data.value?.id ?? null,
		clients: data.value ? { id: data.value.id, name: displayName.value } : null,
		pages: folder.pages ?? [],
	})),
);

const visibleProjects = computed(() =>
	projectRows.value.filter((project) => {
		const status = deriveFolderStatus(project.pages ?? []);
		if (projectFilter.value === "completed") return status === "completato";
		return ["attesa_info", "in_attesa", "in_lavorazione", "in_revisione"].includes(status);
	}),
);

const visibleProjectsLabel = computed(() => {
	const count = visibleProjects.value.length;
	const noun = count === 1 ? "progetto" : "progetti";
	const suffix = projectFilter.value === "completed" ? "completati" : "attivi";
	return `${count} ${noun} ${suffix}`;
});

const dirty = computed(() => JSON.stringify(buildPayload()) !== initialSnapshot.value);

watch(
	data,
	(client) => {
		if (!client) return;
		resetForm(client);
	},
	{ immediate: true },
);

function cleanText(value: string): string | null {
	const trimmed = value.trim();
	return trimmed ? trimmed : null;
}

function cleanUpper(value: string): string | null {
	const trimmed = value.trim().toUpperCase();
	return trimmed ? trimmed : null;
}

function cleanInteger(value: string): number | null {
	const trimmed = value.trim();
	if (!trimmed) return null;
	const parsed = Number.parseInt(trimmed, 10);
	return Number.isFinite(parsed) ? parsed : null;
}

function cleanDecimal(value: string): number | null {
	const trimmed = value.trim().replace(/\./g, "").replace(",", ".");
	if (!trimmed) return null;
	const parsed = Number.parseFloat(trimmed);
	return Number.isFinite(parsed) ? parsed : null;
}

function toInputDate(value: string | null | undefined): string {
	if (!value) return "";
	return value.slice(0, 10);
}

function resetForm(client: ClientDetail): void {
	form.company_name = client.company_name ?? "";
	form.codice_fiscale = client.codice_fiscale ?? "";
	form.vat_number = client.vat_number ?? "";
	form.street_address = client.street_address ?? "";
	form.city = client.city ?? "";
	form.provincia = client.provincia ?? "";
	form.cap = client.cap ?? "";
	form.employee_count = client.employee_count?.toString() ?? "";
	form.revenue = client.revenue?.toString() ?? "";
	form.legal_rep_name = client.legal_rep_name ?? "";
	form.legal_rep_cf = client.legal_rep_cf ?? "";
	form.legal_rep_dob = toInputDate(client.legal_rep_dob);
	form.contact_name = client.contact_name ?? "";
	form.contact_email = client.contact_email ?? "";
	form.contact_phone = client.contact_phone ?? "";
	initialSnapshot.value = JSON.stringify(buildPayload());
}

function buildPayload() {
	return {
		company_name: cleanText(form.company_name),
		codice_fiscale: cleanUpper(form.codice_fiscale),
		vat_number: cleanText(form.vat_number),
		street_address: cleanText(form.street_address),
		city: cleanText(form.city),
		provincia: cleanUpper(form.provincia),
		cap: cleanText(form.cap),
		employee_count: cleanInteger(form.employee_count),
		revenue: cleanDecimal(form.revenue),
		legal_rep_name: cleanText(form.legal_rep_name),
		legal_rep_cf: cleanUpper(form.legal_rep_cf),
		legal_rep_dob: cleanText(form.legal_rep_dob),
		contact_name: cleanText(form.contact_name),
		contact_email: cleanText(form.contact_email),
		contact_phone: cleanText(form.contact_phone),
	};
}

async function saveClient(): Promise<void> {
	if (!dirty.value || isSaving.value) return;

	isSaving.value = true;
	saveError.value = null;

	try {
		const payload = buildPayload();
		await $fetch("/api/db/mutate", {
			method: "POST",
			body: {
				table: "clients",
				operation: "update",
				data: payload,
				where: { id: clientId },
			},
		});
		initialSnapshot.value = JSON.stringify(payload);
		await refresh();
		toast.add({
			title: "Cliente salvato",
			description: "Le modifiche sono state registrate correttamente.",
			color: "success",
		});
	}
	catch {
		saveError.value = "Non siamo riusciti a salvare il cliente. Riprova tra qualche istante.";
	}
	finally {
		isSaving.value = false;
	}
}

async function confirmDeleteClient(): Promise<void> {
	if (!data.value) return;

	isDeleting.value = true;
	deleteError.value = null;

	try {
		await $fetch("/api/db/delete", {
			method: "POST",
			body: {
				entity: "client",
				id: clientId,
			},
		});

		await router.push({ path: "/clienti", query: { deleted: "client" } });
	}
	catch {
		deleteError.value =
			"Non siamo riusciti a eliminare il cliente. Riprova tra qualche istante.";
	}
	finally {
		isDeleting.value = false;
		deleteDialogOpen.value = false;
	}
}
</script>

<template>
	<BasePageContainer size="xl">
		<BaseStateMessage
			v-if="pending"
			loading
			title="Caricamento cliente in corso..."
		/>

		<BaseStateMessage
			v-else-if="!data"
			tone="error"
			icon="i-lucide-circle-alert"
			title="Cliente non trovato"
			description="Il cliente richiesto potrebbe essere stato rimosso o non essere più disponibile."
		>
			<template #actions>
				<UButton variant="ghost" color="neutral" to="/clienti">
					Torna ai clienti
				</UButton>
			</template>
		</BaseStateMessage>

		<template v-else>
			<div class="mb-4">
				<NuxtLink
					to="/clienti"
					class="inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-700"
				>
					<UIcon name="i-lucide-arrow-left" class="size-4" />
					Tutti i clienti
				</NuxtLink>
			</div>

			<BasePageHeader
				:title="displayName"
				:description="`Ultimo aggiornamento ${formatDate(data.updated_at)}`"
			>
				<template #actions>
					<UButton
						icon="i-lucide-plus"
						size="lg"
						class="rounded-xl px-5"
						:to="`/pages/new?clientId=${clientId}`"
					>
						Nuovo progetto
					</UButton>
					<UButton
						color="error"
						variant="soft"
						size="lg"
						class="rounded-xl px-5"
						icon="i-lucide-trash-2"
						@click="deleteDialogOpen = true"
					>
						Elimina cliente
					</UButton>
				</template>
			</BasePageHeader>

			<UAlert
				v-if="transitionNotice"
				color="success"
				variant="soft"
				icon="i-lucide-circle-check-big"
				:title="transitionNotice.title"
				:description="transitionNotice.description"
				class="mb-6"
			/>

			<UAlert
				v-if="saveError"
				color="error"
				variant="soft"
				icon="i-lucide-circle-alert"
				title="Salvataggio non riuscito"
				:description="saveError"
				class="mb-6"
			/>

			<UAlert
				v-if="deleteError"
				color="error"
				variant="soft"
				icon="i-lucide-circle-alert"
				title="Eliminazione non riuscita"
				:description="deleteError"
				class="mb-6"
			/>

			<div class="space-y-8">
				<section class="client-detail-section">
					<h2 class="client-detail-title">
						ANAGRAFICA
					</h2>
					<div class="client-detail-grid">
						<label class="client-detail-field">
							<span>Ragione sociale</span>
							<input v-model="form.company_name" placeholder="Ragione sociale" />
						</label>
						<label class="client-detail-field">
							<span>Codice fiscale</span>
							<input v-model="form.codice_fiscale" placeholder="Codice fiscale" />
						</label>
						<label class="client-detail-field">
							<span>Partita IVA</span>
							<input v-model="form.vat_number" placeholder="Partita IVA" />
						</label>
						<div class="client-detail-field client-detail-field--full">
							<span>Indirizzo</span>
							<div class="client-address-grid">
								<input v-model="form.street_address" placeholder="Via, piazza o corso" />
								<input v-model="form.city" placeholder="Città" />
								<div class="grid grid-cols-[minmax(0,1fr)_96px] gap-3">
									<input v-model="form.provincia" placeholder="Provincia" />
									<input v-model="form.cap" placeholder="CAP" />
								</div>
							</div>
						</div>
					</div>
				</section>

				<section class="client-detail-section">
					<h2 class="client-detail-title">
						DATI AZIENDALI
					</h2>
					<div class="client-detail-grid">
						<label class="client-detail-field">
							<span>Totale dipendenti</span>
							<input
								v-model="form.employee_count"
								inputmode="numeric"
								placeholder="Totale dipendenti"
							/>
						</label>
						<label class="client-detail-field">
							<span>Fatturato</span>
							<input
								v-model="form.revenue"
								inputmode="decimal"
								placeholder="Fatturato €"
							/>
						</label>
					</div>
				</section>

				<section class="client-detail-section">
					<h2 class="client-detail-title">
						LEGALE RAPPRESENTANTE
					</h2>
					<div class="client-detail-grid">
						<label class="client-detail-field">
							<span>Nome e cognome</span>
							<input v-model="form.legal_rep_name" placeholder="Nome e cognome" />
						</label>
						<label class="client-detail-field">
							<span>Codice fiscale</span>
							<input v-model="form.legal_rep_cf" placeholder="Codice fiscale" />
						</label>
						<label class="client-detail-field">
							<span>Data di nascita</span>
							<input v-model="form.legal_rep_dob" type="date" placeholder="Opzionale" />
						</label>
					</div>
				</section>

				<section class="client-detail-section">
					<div class="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
						<h2 class="client-detail-title">
							REFERENTE
						</h2>
						<UButton
							color="neutral"
							:variant="dirty ? 'solid' : 'soft'"
							:disabled="!dirty || isSaving"
							:loading="isSaving"
							class="rounded-xl px-5 transition-opacity"
							:class="dirty ? 'opacity-100' : 'opacity-40'"
							@click="saveClient"
						>
							Salva modifiche
						</UButton>
					</div>
					<div class="client-detail-grid">
						<label class="client-detail-field">
							<span>Nome</span>
							<input v-model="form.contact_name" placeholder="Nome referente" />
						</label>
						<label class="client-detail-field">
							<span>Email</span>
							<input v-model="form.contact_email" type="email" placeholder="Email" />
						</label>
						<label class="client-detail-field">
							<span>Telefono</span>
							<input v-model="form.contact_phone" placeholder="Telefono" />
						</label>
					</div>
				</section>

				<section class="client-detail-section">
					<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
						<div>
							<h2 class="client-detail-title">
								PROGETTI
							</h2>
							<p class="mt-2 text-sm text-slate-500">
								{{ visibleProjectsLabel }}
							</p>
						</div>
						<div class="flex gap-2">
							<UButton
								color="neutral"
								:variant="projectFilter === 'active' ? 'soft' : 'ghost'"
								class="rounded-xl"
								@click="projectFilter = 'active'"
							>
								Attivi
							</UButton>
							<UButton
								color="neutral"
								:variant="projectFilter === 'completed' ? 'soft' : 'ghost'"
								class="rounded-xl"
								@click="projectFilter = 'completed'"
							>
								Completati
							</UButton>
						</div>
					</div>

					<div v-if="!visibleProjects.length" class="py-12 text-center text-[13px] text-slate-400">
						Nessun progetto
					</div>

					<div v-else class="mt-5 overflow-x-auto border-t border-slate-200">
						<div class="min-w-[860px]">
							<div class="grid grid-cols-[minmax(0,2.2fr)_minmax(140px,1.1fr)_minmax(180px,1.1fr)_minmax(125px,0.9fr)_minmax(120px,0.85fr)_72px] gap-4 bg-slate-50 px-6 py-4 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
								<p>Progetto</p>
								<p>Anno</p>
								<p>Documenti</p>
								<p>Stato</p>
								<p>Modificato</p>
								<p />
							</div>
							<ProjectListRow
								v-for="project in visibleProjects"
								:key="project.id"
								:project="project"
								show-year
								:show-actions="false"
							/>
						</div>
					</div>
				</section>
			</div>

			<BaseConfirmDialog
				v-model:open="deleteDialogOpen"
				title="Eliminare il cliente?"
				description="Il cliente, i progetti collegati e tutti i documenti associati verranno eliminati definitivamente. Questa azione non puo essere annullata."
				confirm-label="Elimina cliente"
				:loading="isDeleting"
				@confirm="confirmDeleteClient"
			/>
		</template>
	</BasePageContainer>
</template>

<style scoped>
.client-detail-section {
	border-top: 1px solid var(--color-border-muted, rgb(226 232 240));
	padding-top: 24px;
}

.client-detail-title {
	color: var(--color-text-muted, rgb(100 116 139));
	font-size: 11px;
	font-weight: 500;
	letter-spacing: 0.06em;
	line-height: 1.2;
	text-transform: uppercase;
}

.client-detail-grid {
	display: grid;
	gap: 22px 32px;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	margin-top: 22px;
}

.client-detail-field {
	display: flex;
	min-width: 0;
	flex-direction: column;
	gap: 7px;
}

.client-detail-field--full {
	grid-column: 1 / -1;
}

.client-detail-field span {
	color: var(--color-text-tertiary, rgb(148 163 184));
	font-size: 11px;
	font-weight: 500;
	letter-spacing: 0.06em;
	line-height: 1.2;
	text-transform: uppercase;
}

.client-detail-field input,
.client-address-grid input {
	width: 100%;
	border: 0;
	border-bottom: 1px solid transparent;
	background: transparent;
	border-radius: 0;
	color: var(--color-text, rgb(15 23 42));
	font-size: 13px;
	line-height: 1.6;
	outline: none;
	padding: 3px 0 6px;
	transition: border-color 140ms ease, color 140ms ease;
}

.client-detail-field input:hover,
.client-address-grid input:hover {
	border-bottom-color: var(--color-border-tertiary, rgb(203 213 225));
}

.client-detail-field input:focus,
.client-address-grid input:focus {
	border-bottom-color: var(--ui-primary, rgb(124 58 237));
}

.client-detail-field input::placeholder,
.client-address-grid input::placeholder {
	color: rgb(148 163 184);
}

.client-address-grid {
	display: grid;
	gap: 16px;
}

@media (max-width: 720px) {
	.client-detail-grid {
		grid-template-columns: 1fr;
	}
}
</style>

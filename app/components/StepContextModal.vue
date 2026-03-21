<script setup lang="ts">
// StepContextModal.vue
//
// Guided input modal for each framework step.
// Receives the step order and emits an assembled userContext string.
// The parent populates its userContext textarea with the result.
//
// For step 2 (Premessa) it emits a special premessaPayload instead,
// which the parent routes to the /api/generations/premessa endpoint.

import type { Shareholder, Subsidiary } from "~/types/company.types";

const props = defineProps<{
	stepOrder: number;
	stepTitle: string;
	clientData: {
		company_name?: string | null;
		industry_sector?: string | null;
		employee_count?: number | null;
		legal_representative?: string | null;
		board_members?: string[] | null;
		shareholders?: any | null;
		subsidiaries?: any | null;
	} | null;
}>();

const emit = defineEmits<{
	// Standard steps: assembled context string for the userContext textarea
	confirm: [userContext: string];
	// Step 2 only: structured payload for the premessa template route
	confirmPremessa: [payload: { taxYearStart: number; taxYearEnd: number }];
	cancel: [];
}>();

// ─── Step 1 — Intestazione ────────────────────────────────────────────────────
const intestazione = reactive({
	programTitle: "",
	legalCitation:
		"Articolo 6 del decreto-legge 21 ottobre 2021, n. 146, convertito, con modificazioni, dalla legge 17 dicembre 2021, n. 215, così come successivamente modificato dalla legge 30 dicembre 2021, n. 234",
});

// ─── Step 2 — Premessa ────────────────────────────────────────────────────────
const premessa = reactive({
	taxYearStart: new Date().getFullYear() - 1,
	taxYearEnd: new Date().getFullYear() - 1,
});

// ─── Step 3 — Struttura Partecipativa ────────────────────────────────────────
const struttura = reactive({
	// Statute fields
	companySince: "",       // founding date
	duration: "",           // "fino al 31/12/2035"
	adminSystem: "",        // "tradizionale (CdA + collegio sindacale)"
	keyStatutoryClauses: "", // free text: prelazione, recesso, etc.
	// Competitive context
	marketPosition: "",     // who the company is in its market
	mainCompetitors: "",    // list of competitors
	geographicScope: "",    // "Italia", "Europa", "globale"
});

// ─── Steps 4–8 — generic guided fields ───────────────────────────────────────
// Each step gets a small set of targeted questions that map to what Claude
// needs to write that section well.

const attivitaRilevanti = reactive({
	ipType: [] as string[],          // multiselect: software / brevetto / know-how / design / marchio
	ipDescription: "",               // brief description of the main asset
	developmentType: "interno",      // "interno" | "misto" | "commissione terzi"
	startYear: "",                   // year R&D began
	keyResults: "",                  // main technical results achieved
});

const attivitaCommissionate = reactive({
	hasThirdParty: false,
	thirdPartyType: "",    // università / ente di ricerca / fornitore terzo / società del gruppo
	workDescription: "",
	contractType: "",      // contratto di ricerca / collaborazione / appalto
});

const modelloOrganizzativo = reactive({
	rdTeamDescription: "",    // who does R&D: team, function, individuals
	costTrackingMethod: "",   // how costs are tracked: contabilità analitica / centri di costo
	ipProtectionMethod: "",   // NDA, registration, internal policy
});

const relazioneTecnica = reactive({
	assetName: "",
	assetType: "",           // software / brevetto / know-how / design
	technicalDescription: "",
	noveltyVsPriorArt: "",
	challengesSolved: "",
	resultsAchieved: "",
	developmentTimeline: "",
});

const funzioniRischiBeni = reactive({
	keyFunctions: "",         // main economic functions performed
	financialRisk: "",        // invested capital at risk
	technicalRisk: "",        // development failure risk
	marketRisk: "",           // commercial uncertainty
	assetLegalStatus: "",     // registered / unregistered, title holder
});

// ─── IP type options ──────────────────────────────────────────────────────────
const ipTypeOptions = [
	{ label: "Software protetto da copyright", value: "software" },
	{ label: "Brevetto industriale", value: "brevetto" },
	{ label: "Know-how", value: "know-how" },
	{ label: "Disegno o modello", value: "design" },
	{ label: "Marchio registrato", value: "marchio" },
];

// ─── Assemble and emit ────────────────────────────────────────────────────────

function confirm() {
	switch (props.stepOrder) {
		case 1:
			return emit(
				"confirm",
				[
					`Titolo del programma: ${intestazione.programTitle || "[DA INSERIRE]"}`,
					`Citazione normativa (pre-compilata): ${intestazione.legalCitation}`,
				].join("\n"),
			);

		case 2:
			return emit("confirmPremessa", {
				taxYearStart: Number(premessa.taxYearStart),
				taxYearEnd: Number(premessa.taxYearEnd),
			});

		case 3: {
			const lines = [
				struttura.companySince
					? `Data di costituzione: ${struttura.companySince}`
					: null,
				struttura.duration
					? `Durata societaria: ${struttura.duration}`
					: null,
				struttura.adminSystem
					? `Sistema amministrativo: ${struttura.adminSystem}`
					: null,
				struttura.keyStatutoryClauses
					? `Clausole statutarie rilevanti:\n${struttura.keyStatutoryClauses}`
					: null,
				struttura.marketPosition
					? `Posizione di mercato:\n${struttura.marketPosition}`
					: null,
				struttura.mainCompetitors
					? `Principali concorrenti: ${struttura.mainCompetitors}`
					: null,
				struttura.geographicScope
					? `Ambito geografico: ${struttura.geographicScope}`
					: null,
			].filter(Boolean);
			return emit("confirm", lines.join("\n\n"));
		}

		case 4: {
			const lines = [
				attivitaRilevanti.ipType.length
					? `Tipologie di beni immateriali: ${attivitaRilevanti.ipType.join(", ")}`
					: null,
				attivitaRilevanti.ipDescription
					? `Descrizione del bene principale:\n${attivitaRilevanti.ipDescription}`
					: null,
				`Sviluppo: ${attivitaRilevanti.developmentType}`,
				attivitaRilevanti.startYear
					? `Anno di inizio R&S: ${attivitaRilevanti.startYear}`
					: null,
				attivitaRilevanti.keyResults
					? `Risultati principali:\n${attivitaRilevanti.keyResults}`
					: null,
			].filter(Boolean);
			return emit("confirm", lines.join("\n\n"));
		}

		case 5: {
			if (!attivitaCommissionate.hasThirdParty) {
				return emit(
					"confirm",
					"Tutte le attività di R&S sono state svolte internamente. Nessuna attività è stata commissionata a terzi.",
				);
			}
			const lines = [
				attivitaCommissionate.thirdPartyType
					? `Tipo di soggetto terzo: ${attivitaCommissionate.thirdPartyType}`
					: null,
				attivitaCommissionate.workDescription
					? `Descrizione del lavoro commissionato:\n${attivitaCommissionate.workDescription}`
					: null,
				attivitaCommissionate.contractType
					? `Tipo di contratto: ${attivitaCommissionate.contractType}`
					: null,
			].filter(Boolean);
			return emit("confirm", lines.join("\n\n"));
		}

		case 6: {
			const lines = [
				modelloOrganizzativo.rdTeamDescription
					? `Struttura R&S:\n${modelloOrganizzativo.rdTeamDescription}`
					: null,
				modelloOrganizzativo.costTrackingMethod
					? `Metodo di tracciamento costi: ${modelloOrganizzativo.costTrackingMethod}`
					: null,
				modelloOrganizzativo.ipProtectionMethod
					? `Metodo di protezione IP: ${modelloOrganizzativo.ipProtectionMethod}`
					: null,
			].filter(Boolean);
			return emit("confirm", lines.join("\n\n"));
		}

		case 7: {
			const lines = [
				relazioneTecnica.assetName
					? `Nome del bene immateriale: ${relazioneTecnica.assetName}`
					: null,
				relazioneTecnica.assetType
					? `Tipologia: ${relazioneTecnica.assetType}`
					: null,
				relazioneTecnica.technicalDescription
					? `Descrizione tecnica:\n${relazioneTecnica.technicalDescription}`
					: null,
				relazioneTecnica.noveltyVsPriorArt
					? `Novità rispetto allo stato dell'arte:\n${relazioneTecnica.noveltyVsPriorArt}`
					: null,
				relazioneTecnica.challengesSolved
					? `Sfide tecniche superate:\n${relazioneTecnica.challengesSolved}`
					: null,
				relazioneTecnica.resultsAchieved
					? `Risultati raggiunti:\n${relazioneTecnica.resultsAchieved}`
					: null,
				relazioneTecnica.developmentTimeline
					? `Timeline di sviluppo: ${relazioneTecnica.developmentTimeline}`
					: null,
			].filter(Boolean);
			return emit("confirm", lines.join("\n\n"));
		}

		case 8: {
			const lines = [
				funzioniRischiBeni.keyFunctions
					? `Funzioni economiche svolte:\n${funzioniRischiBeni.keyFunctions}`
					: null,
				funzioniRischiBeni.financialRisk
					? `Rischio finanziario:\n${funzioniRischiBeni.financialRisk}`
					: null,
				funzioniRischiBeni.technicalRisk
					? `Rischio tecnico:\n${funzioniRischiBeni.technicalRisk}`
					: null,
				funzioniRischiBeni.marketRisk
					? `Rischio di mercato:\n${funzioniRischiBeni.marketRisk}`
					: null,
				funzioniRischiBeni.assetLegalStatus
					? `Status legale dei beni immateriali:\n${funzioniRischiBeni.assetLegalStatus}`
					: null,
			].filter(Boolean);
			return emit("confirm", lines.join("\n\n"));
		}
	}
}
</script>

<template>
	<div class="flex flex-col gap-5 p-5 max-h-[80vh] overflow-y-auto">
		<!-- Header -->
		<div class="shrink-0">
			<h2 class="text-base font-semibold text-gray-900 dark:text-white">
				Guida alla compilazione
			</h2>
			<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
				{{ stepTitle }} — rispondi alle domande e il contesto verrà
				assembleato automaticamente.
			</p>
		</div>

		<!-- ── Step 1: Intestazione ── -->
		<template v-if="stepOrder === 1">
			<UFormField label="Titolo del programma">
				<UInput
					v-model="intestazione.programTitle"
					placeholder="es. Nuovo Patent Box 2025"
					class="w-full"
					autofocus
				/>
			</UFormField>
			<UFormField label="Citazione normativa (pre-compilata)">
				<UTextarea
					:model-value="intestazione.legalCitation"
					:rows="4"
					disabled
					class="w-full text-xs text-gray-500"
				/>
			</UFormField>
		</template>

		<!-- ── Step 2: Premessa ── -->
		<template v-else-if="stepOrder === 2">
			<p class="text-sm text-gray-600 dark:text-gray-400 rounded-lg bg-gray-50 dark:bg-gray-900 p-3">
				La Premessa è un testo normativo standardizzato. Indica solo gli
				esercizi fiscali di riferimento — il testo viene generato
				automaticamente.
			</p>
			<div class="grid grid-cols-2 gap-4">
				<UFormField label="Anno fiscale (inizio)">
					<UInput
						v-model="premessa.taxYearStart"
						type="number"
						:min="2020"
						:max="2035"
						class="w-full"
					/>
				</UFormField>
				<UFormField label="Anno fiscale (fine)">
					<UInput
						v-model="premessa.taxYearEnd"
						type="number"
						:min="2020"
						:max="2035"
						class="w-full"
					/>
				</UFormField>
			</div>
			<p class="text-xs text-gray-400">
				Se stai documentando un solo anno inserisci lo stesso valore in entrambi i campi.
			</p>
		</template>

		<!-- ── Step 3: Struttura Partecipativa ── -->
		<template v-else-if="stepOrder === 3">
			<p class="text-xs text-gray-400 dark:text-gray-500 rounded-lg bg-gray-50 dark:bg-gray-900 p-3">
				I dati di azionisti, CdA e partecipate vengono caricati
				automaticamente dal profilo aziendale. Aggiungi qui le
				informazioni specifiche per questa sezione.
			</p>

			<div class="flex flex-col gap-1">
				<p class="text-xs font-semibold uppercase tracking-wide text-gray-400">Statuto</p>
			</div>

			<div class="grid grid-cols-2 gap-4">
				<UFormField label="Data di costituzione">
					<UInput
						v-model="struttura.companySince"
						placeholder="es. 19/09/2006"
						class="w-full"
					/>
				</UFormField>
				<UFormField label="Durata societaria">
					<UInput
						v-model="struttura.duration"
						placeholder="es. fino al 31/12/2035"
						class="w-full"
					/>
				</UFormField>
			</div>

			<UFormField label="Sistema amministrativo">
				<USelect
					v-model="struttura.adminSystem"
					:options="[
						{ label: 'Tradizionale (CdA + collegio sindacale)', value: 'tradizionale (consiglio di amministrazione e collegio sindacale)' },
						{ label: 'Monistico (CdA + comitato controllo)', value: 'monistico (consiglio di amministrazione con comitato per il controllo sulla gestione)' },
						{ label: 'Dualistico (consiglio di sorveglianza + gestione)', value: 'dualistico (consiglio di sorveglianza e consiglio di gestione)' },
						{ label: 'Amministratore unico', value: 'amministratore unico' },
					]"
					class="w-full"
				/>
			</UFormField>

			<UFormField
				label="Clausole statutarie rilevanti"
				hint="Prelazione, recesso, effetti differiti, poteri del CdA, ecc."
			>
				<UTextarea
					v-model="struttura.keyStatutoryClauses"
					:rows="3"
					placeholder="es. Clausole di prelazione: presenti. Clausole di recesso: presenti. Il CdA ha i più ampi poteri di gestione ordinaria e straordinaria…"
					class="w-full"
				/>
			</UFormField>

			<div class="flex flex-col gap-1 pt-2">
				<p class="text-xs font-semibold uppercase tracking-wide text-gray-400">Contesto competitivo</p>
			</div>

			<UFormField
				label="Posizione di mercato"
				hint="Chi è l'azienda nel suo settore? Quota, dimensione, specializzazione."
			>
				<UTextarea
					v-model="struttura.marketPosition"
					:rows="3"
					placeholder="es. Saco Combimar è uno degli operatori di punta del mercato della logistica e spedizioni internazionali in Italia, specializzato nel consolidamento marittimo LCL…"
					class="w-full"
				/>
			</UFormField>

			<div class="grid grid-cols-2 gap-4">
				<UFormField label="Principali concorrenti">
					<UInput
						v-model="struttura.mainCompetitors"
						placeholder="es. Combi Line, Ecu Worldwide, Boxline…"
						class="w-full"
					/>
				</UFormField>
				<UFormField label="Ambito geografico">
					<USelect
						v-model="struttura.geographicScope"
						:options="[
							{ label: 'Italia', value: 'Italia' },
							{ label: 'Europa', value: 'Europa' },
							{ label: 'Globale', value: 'globale' },
						]"
						class="w-full"
					/>
				</UFormField>
			</div>
		</template>

		<!-- ── Step 4: Attività Rilevanti ── -->
		<template v-else-if="stepOrder === 4">
			<UFormField label="Tipologie di beni immateriali agevolabili">
				<div class="flex flex-col gap-2 mt-1">
					<label
						v-for="opt in ipTypeOptions"
						:key="opt.value"
						class="flex items-center gap-2 text-sm cursor-pointer"
					>
						<input
							type="checkbox"
							:value="opt.value"
							v-model="attivitaRilevanti.ipType"
							class="rounded"
						/>
						{{ opt.label }}
					</label>
				</div>
			</UFormField>

			<UFormField
				label="Descrizione sintetica del bene principale"
				hint="1–3 frasi. Cosa è, cosa fa, perché è stato sviluppato."
			>
				<UTextarea
					v-model="attivitaRilevanti.ipDescription"
					:rows="3"
					placeholder="es. Piattaforma software proprietaria per la gestione automatizzata delle prenotazioni e del tracking delle spedizioni LCL…"
					class="w-full"
				/>
			</UFormField>

			<div class="grid grid-cols-2 gap-4">
				<UFormField label="Modalità di sviluppo">
					<USelect
						v-model="attivitaRilevanti.developmentType"
						:options="[
							{ label: 'Interamente interno', value: 'interamente interno' },
							{ label: 'Misto (interno + terzi)', value: 'misto (interno e commissionato a terzi)' },
							{ label: 'Principalmente commissionato', value: 'principalmente commissionato a terzi' },
						]"
						class="w-full"
					/>
				</UFormField>
				<UFormField label="Anno di inizio attività di R&S">
					<UInput
						v-model="attivitaRilevanti.startYear"
						type="number"
						placeholder="es. 2021"
						class="w-full"
					/>
				</UFormField>
			</div>

			<UFormField
				label="Risultati tecnici principali raggiunti"
				hint="Cosa ha reso possibile questo sviluppo? Efficienza, funzionalità nuove, riduzione errori…"
			>
				<UTextarea
					v-model="attivitaRilevanti.keyResults"
					:rows="3"
					placeholder="es. Riduzione del 40% dei tempi di elaborazione documentale, integrazione con ERP aziendali dei clienti, tracciamento real-time…"
					class="w-full"
				/>
			</UFormField>
		</template>

		<!-- ── Step 5: Attività Commissionate a Terzi ── -->
		<template v-else-if="stepOrder === 5">
			<UFormField label="L'azienda ha commissionato attività di R&S a terzi?">
				<div class="flex gap-4 mt-1">
					<label class="flex items-center gap-2 text-sm cursor-pointer">
						<input type="radio" :value="false" v-model="attivitaCommissionate.hasThirdParty" />
						No — tutto interno
					</label>
					<label class="flex items-center gap-2 text-sm cursor-pointer">
						<input type="radio" :value="true" v-model="attivitaCommissionate.hasThirdParty" />
						Sì
					</label>
				</div>
			</UFormField>

			<template v-if="attivitaCommissionate.hasThirdParty">
				<UFormField label="Tipo di soggetto terzo">
					<USelect
						v-model="attivitaCommissionate.thirdPartyType"
						:options="[
							{ label: 'Università o ente di ricerca', value: 'università o ente di ricerca' },
							{ label: 'Fornitore terzo indipendente', value: 'fornitore terzo indipendente' },
							{ label: 'Società del gruppo', value: 'società del gruppo' },
							{ label: 'Misto', value: 'misto (più tipologie)' },
						]"
						class="w-full"
					/>
				</UFormField>

				<UFormField
					label="Descrizione del lavoro commissionato"
					hint="Che tipo di attività? Quali risultati erano attesi?"
				>
					<UTextarea
						v-model="attivitaCommissionate.workDescription"
						:rows="3"
						placeholder="es. Sviluppo del modulo di integrazione API con piattaforme di tracking marittimo di terze parti…"
						class="w-full"
					/>
				</UFormField>

				<UFormField label="Tipo di contratto">
					<USelect
						v-model="attivitaCommissionate.contractType"
						:options="[
							{ label: 'Contratto di ricerca', value: 'contratto di ricerca' },
							{ label: 'Contratto di collaborazione', value: 'contratto di collaborazione' },
							{ label: 'Contratto di appalto', value: 'contratto di appalto' },
							{ label: 'Accordo di service infragruppo', value: 'accordo di service infragruppo' },
						]"
						class="w-full"
					/>
				</UFormField>
			</template>
		</template>

		<!-- ── Step 6: Modello Organizzativo ── -->
		<template v-else-if="stepOrder === 6">
			<UFormField
				label="Chi svolge le attività di R&S?"
				hint="Team dedicato, funzione specifica, singoli individui — nomi o ruoli."
			>
				<UTextarea
					v-model="modelloOrganizzativo.rdTeamDescription"
					:rows="3"
					placeholder="es. Il team di sviluppo software è composto da 5 sviluppatori full-stack guidati dal Responsabile IT. Le attività di R&S sono coordinate dal Direttore Operativo…"
					class="w-full"
				/>
			</UFormField>

			<UFormField label="Come vengono tracciati i costi di R&S?">
				<USelect
					v-model="modelloOrganizzativo.costTrackingMethod"
					:options="[
						{ label: 'Contabilità analitica per centri di costo', value: 'contabilità analitica con centri di costo dedicati alle attività di R&S' },
						{ label: 'Timesheet e rendicontazione ore', value: 'timesheet individuali e rendicontazione ore per attività' },
						{ label: 'Budget dedicato con consuntivazione', value: 'budget dedicato con consuntivazione periodica' },
						{ label: 'Sistema misto', value: 'sistema misto di contabilità analitica e timesheet' },
					]"
					class="w-full"
				/>
			</UFormField>

			<UFormField
				label="Come viene protetta la proprietà intellettuale?"
				hint="Accordi di riservatezza, registrazione, policy interne…"
			>
				<UTextarea
					v-model="modelloOrganizzativo.ipProtectionMethod"
					:rows="2"
					placeholder="es. NDA con dipendenti e collaboratori, policy interna sulla gestione del codice sorgente, deposito periodico delle versioni…"
					class="w-full"
				/>
			</UFormField>
		</template>

		<!-- ── Step 7: Relazione Tecnica ── -->
		<template v-else-if="stepOrder === 7">
			<div class="grid grid-cols-2 gap-4">
				<UFormField label="Nome del bene immateriale">
					<UInput
						v-model="relazioneTecnica.assetName"
						placeholder="es. PlatformX — sistema di tracking LCL"
						class="w-full"
					/>
				</UFormField>
				<UFormField label="Tipologia">
					<USelect
						v-model="relazioneTecnica.assetType"
						:options="[
							{ label: 'Software protetto da copyright', value: 'software protetto da copyright' },
							{ label: 'Brevetto industriale', value: 'brevetto industriale' },
							{ label: 'Know-how', value: 'know-how' },
							{ label: 'Disegno o modello', value: 'disegno o modello registrato' },
							{ label: 'Marchio registrato', value: 'marchio registrato' },
						]"
						class="w-full"
					/>
				</UFormField>
			</div>

			<UFormField
				label="Descrizione tecnica"
				hint="Architettura, funzionalità, come funziona. Sii specifico."
			>
				<UTextarea
					v-model="relazioneTecnica.technicalDescription"
					:rows="4"
					placeholder="es. Il software è strutturato in tre moduli principali: (1) motore di booking con algoritmo di ottimizzazione del carico, (2) interfaccia EDI per l'integrazione con le compagnie di navigazione, (3) portale clienti con tracking real-time…"
					class="w-full"
				/>
			</UFormField>

			<UFormField
				label="Novità rispetto allo stato dell'arte"
				hint="Cosa non esisteva prima? Cosa lo distingue dalle soluzioni esistenti?"
			>
				<UTextarea
					v-model="relazioneTecnica.noveltyVsPriorArt"
					:rows="3"
					placeholder="es. A differenza dei sistemi commerciali disponibili (es. CargoWise, Magaya), la piattaforma integra nativamente il meccanismo di ottimizzazione LCL con la gestione documentale doganale…"
					class="w-full"
				/>
			</UFormField>

			<UFormField label="Sfide tecniche superate">
				<UTextarea
					v-model="relazioneTecnica.challengesSolved"
					:rows="2"
					placeholder="es. Standardizzazione dei formati EDI di 12 compagnie di navigazione diverse, gestione in tempo reale di variazioni di carico…"
					class="w-full"
				/>
			</UFormField>

			<UFormField label="Risultati raggiunti">
				<UTextarea
					v-model="relazioneTecnica.resultsAchieved"
					:rows="2"
					placeholder="es. Riduzione del 60% dei tempi di elaborazione documentale, eliminazione degli errori manuali di booking, integrazione con 3 ERP clienti…"
					class="w-full"
				/>
			</UFormField>

			<UFormField label="Timeline di sviluppo">
				<UInput
					v-model="relazioneTecnica.developmentTimeline"
					placeholder="es. Avvio 2021, MVP 2022, versione attuale 2023–2024"
					class="w-full"
				/>
			</UFormField>
		</template>

		<!-- ── Step 8: Funzioni, Rischi e Beni ── -->
		<template v-else-if="stepOrder === 8">
			<UFormField
				label="Funzioni economiche svolte"
				hint="Cosa fa concretamente l'azienda in relazione all'IP? Sviluppo, manutenzione, commercializzazione…"
			>
				<UTextarea
					v-model="funzioniRischiBeni.keyFunctions"
					:rows="3"
					placeholder="es. L'azienda svolge internamente le funzioni di sviluppo, manutenzione evolutiva e commercializzazione della piattaforma. Il team IT gestisce il ciclo di sviluppo completo…"
					class="w-full"
				/>
			</UFormField>

			<UFormField
				label="Rischio finanziario"
				hint="Quanto capitale è stato investito? Potrebbe non essere recuperato?"
			>
				<UTextarea
					v-model="funzioniRischiBeni.financialRisk"
					:rows="2"
					placeholder="es. L'azienda ha investito risorse proprie per circa €X nel triennio 2021–2023. Il capitale investito è a rischio in caso di obsolescenza tecnologica o insuccesso commerciale…"
					class="w-full"
				/>
			</UFormField>

			<UFormField
				label="Rischio tecnico"
				hint="Possibilità che lo sviluppo fallisca o non raggiunga i risultati attesi?"
			>
				<UTextarea
					v-model="funzioniRischiBeni.technicalRisk"
					:rows="2"
					placeholder="es. Il rischio tecnico è connesso alla complessità dell'integrazione con sistemi eterogenei di terze parti e all'evoluzione degli standard EDI…"
					class="w-full"
				/>
			</UFormField>

			<UFormField
				label="Rischio di mercato"
				hint="Incertezza sul ritorno commerciale?"
			>
				<UTextarea
					v-model="funzioniRischiBeni.marketRisk"
					:rows="2"
					placeholder="es. Il mercato del consolidamento LCL è soggetto a pressioni competitive crescenti da parte di piattaforme digitali globali…"
					class="w-full"
				/>
			</UFormField>

			<UFormField
				label="Status legale dei beni immateriali"
				hint="Registrati o non registrati? Chi è il titolare legale?"
			>
				<UInput
					v-model="funzioniRischiBeni.assetLegalStatus"
					placeholder="es. Software non registrato, titolarità in capo alla società ai sensi dell'art. 12-bis L. 633/1941…"
					class="w-full"
				/>
			</UFormField>
		</template>

		<!-- ── Actions ── -->
		<div
			class="shrink-0 flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800"
		>
			<UButton color="neutral" variant="ghost" @click="emit('cancel')">
				Annulla
			</UButton>
			<UButton @click="confirm">
				Usa questo contesto →
			</UButton>
		</div>
	</div>
</template>

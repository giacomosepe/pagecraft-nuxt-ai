import { renderTemplate } from "./renderTemplate";

const MONTHS_IT_LONG = [
	"gennaio",
	"febbraio",
	"marzo",
	"aprile",
	"maggio",
	"giugno",
	"luglio",
	"agosto",
	"settembre",
	"ottobre",
	"novembre",
	"dicembre",
];

export interface PremessaParams {
	programTitle: string;
	companyName: string;
	taxYear: number | string;
	legalRepresentative: string;
	templateOverride?: string | null;
	draftDate?: Date;
}

function formatDateLong(date: Date): string {
	return `${date.getDate()} ${MONTHS_IT_LONG[date.getMonth()]} ${date.getFullYear()}`;
}

export function buildPremessa({
	programTitle,
	companyName,
	taxYear,
	legalRepresentative,
	templateOverride,
	draftDate = new Date(),
}: PremessaParams): string {
	const date = formatDateLong(draftDate);

	if (templateOverride?.trim()) {
		return renderTemplate(templateOverride, {
			program_title: programTitle,
			titolo_del_programma: programTitle,
			company_name: companyName,
			ragione_sociale: companyName,
			tax_year: taxYear,
			anno_di_imposta: taxYear,
			legal_representative: legalRepresentative,
			legale_rappresentante: legalRepresentative,
			data_di_redazione: date,
			draft_date: date,
		});
	}

	return `Premessa

Titolo del programma: ${programTitle}
Ragione sociale: ${companyName}
Anno di imposta: ${taxYear}
Legale rappresentante: ${legalRepresentative}
Data di redazione: ${date}

Questo documento costituisce Documentazione Idonea atta a fornire la descrizione delle attività rilevanti dell'impresa ${companyName} e delle spese sostenute per il loro svolgimento in relazione all'Esercizio ${taxYear}, nell'ambito del programma "${programTitle}", sulla base di quanto previsto dall'Articolo 6 del decreto-legge 21 ottobre 2021, n. 146, convertito, con modificazioni, dalla legge 17 dicembre 2021, n. 215, così come successivamente modificato dalla legge 30 dicembre 2021, n. 234.

Come da disposizioni attuative contenute nel Provvedimento n. prot. 48243 dell'Agenzia delle Entrate del 15 febbraio 2022 e nella Circolare Agenzia delle Entrate n. 5/E del 24 febbraio 2023, al fine di favorirne la ricostruzione e provare la sussistenza dei costi agevolabili sui quali è stato quantificato il beneficio, la Documentazione contiene i seguenti elementi informativi:

◆ Sezione A

i. Struttura partecipativa dell'impresa anche in relazione alle imprese associate ed eventi straordinari;

ii. Attività rilevanti, natura di investitore ed eventuale attività svolta con imprese associate;

iii. Attività rilevanti commissionate a terzi indipendenti;

iv. Modello organizzativo dell'impresa;

v. Relazione tecnica (in un documento separato);

vi. Funzioni, rischi e beni dell'impresa.

◆ Sezione B

i. Spese agevolabili sostenute in riferimento a ciascun bene immateriale;

ii. Costo del personale impiegato in attività rilevanti;

iii. Costi promiscui;

iv. Individuazione delle variazioni fiscali direttamente e indirettamente riferibili ai beni immateriali oggetto di agevolazione.

Nel caso in cui il contribuente si sia avvalso anche del meccanismo premiale previsto dal comma 10-bis dell'Articolo 6, la Sezione B conterrà anche uno specifico prospetto atto ad illustrare il processo di determinazione della corrispondente quota di beneficio.

Fermo restando i principi generali di effettività, inerenza e congruità, tutti i costi oggetto di maggiorazione - assunti al netto di eventuali contributi ricevuti dall'impresa per il loro finanziamento - rilevano nel loro ammontare fiscalmente deducibile e sono imputati, ai fini del calcolo della maggiorazione del 110%, a ciascun periodo di imposta in applicazione del principio di competenza di cui ai commi 1 e 2 dell'articolo 109 del TUIR, indipendentemente dai regimi e dai principi contabili adottati dall'impresa, nonché dall'eventuale capitalizzazione degli stessi costi.

Il sottoscritto ${legalRepresentative}, in qualità di legale rappresentante della società ${companyName}, attesta che le informazioni contenute nella presente premessa sono predisposte alla data del ${date} sulla base dei dati aziendali disponibili.`;
}

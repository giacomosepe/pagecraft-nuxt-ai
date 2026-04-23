export const publicCopy = {
  nav: {
    links: [{ label: "Come funziona", href: "/#come-funziona" }],
    loginLabel: "Accedi",
    dashboardLabel: "Dashboard",
  },
  hero: {
    eyebrow: "Scrivi con AI, mantenendo la regia",
    title: "Assistente AI per scrivere senza perdere qualita'",
    subtitle:
      "Usa la AI in modo preciso e ottieni documenti scritti come vuoi tu, strutturati e affidabili",
    primaryCtaLoggedOut: "Accedi",
    primaryCtaLoggedIn: "Dashboard",
    secondaryCta: "Come funziona",
    notes: [
      "Guida il contenuto passo dopo passo",
      "Usa documenti e dati reali come contesto",
      "Esporta il risultato finale in Word",
    ],
  },
  howItWorks: {
    title: "Semplice, semplice, semplice",
    intro:
      "PageCraft ti aiuta a impostare, completare e rifinire documenti complessi senza lasciare la struttura in mano alla AI",
    steps: [
      {
        title: "Imposti il documento",
        description:
          "Parti da una struttura guidata e organizzi i passaggi di lavoro in un flusso chiaro, senza fogli sparsi o prompt improvvisati.",
      },
      {
        title: "Dai contesto e generi",
        description:
          "Carichi i dati e la documentazione che hai, compili i campi necessari e fai generare il testo alla AI in modo mirato.",
      },
      {
        title: "Rivedi ed esporti",
        description:
          "Raffini il contenuto, tieni traccia dell’output per ogni sezione e porti fuori il documento finale in formato Word.",
      },
    ],
  },
  benefits: {
    title: "Perché usarlo",
    items: [
      {
        title: "Riduci gli errori della AI",
        description:
          "La scrittura resta guidata da struttura, campi e contesto, invece di dipendere da un prompt generico.",
      },
      {
        title: "Usi la tua documentazione reale",
        description:
          "Carichi materiali e riferimenti utili per ottenere documenti tecnici più precisi e meglio allineati al caso specifico.",
      },
      {
        title: "Tagli tempi di scrittura e revisione",
        description:
          "Passi da giornate di lavoro frammentato a poche ore di lavoro più ordinato, verificabile e riusabile.",
      },
    ],
  },
  footer: {
    summary:
      "Scrivi documenti complessi con AI, senza perdere controllo, struttura e precisione.",
  },
} as const;

export type PublicCopy = typeof publicCopy;

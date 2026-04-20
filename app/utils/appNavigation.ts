export type AppNavItem = {
	label: string;
	to: string;
	icon: string;
	match?: {
		path: string;
		status?: string;
	};
};

export type AppNavSection = {
	label: string;
	items: AppNavItem[];
};

export const appSidebarSections: AppNavSection[] = [
	{
		label: "Principale",
		items: [
			{
				label: "Clienti",
				to: "/clienti",
				icon: "i-lucide-users",
				match: { path: "/clienti" },
			},
			{
				label: "Documenti",
				to: "/documenti",
				icon: "i-lucide-files",
				match: { path: "/documenti" },
			},
			{
				label: "Info prodotto",
				to: "/about",
				icon: "i-lucide-library",
				match: { path: "/about" },
			},
		],
	},
	{
		label: "Progetti",
		items: [
			{
				label: "In attesa",
				to: "/progetti?status=in_attesa",
				icon: "i-lucide-clock-3",
				match: { path: "/progetti", status: "in_attesa" },
			},
			{
				label: "In lavorazione",
				to: "/progetti?status=in_lavorazione",
				icon: "i-lucide-loader-circle",
				match: { path: "/progetti", status: "in_lavorazione" },
			},
			{
				label: "Completati",
				to: "/progetti?status=completato",
				icon: "i-lucide-circle-check-big",
				match: { path: "/progetti", status: "completato" },
			},
		],
	},
	{
		label: "Clienti",
		items: [
			{
				label: "Aperti",
				to: "/clienti?status=aperto",
				icon: "i-lucide-star",
				match: { path: "/clienti", status: "aperto" },
			},
			{
				label: "In corso",
				to: "/clienti",
				icon: "i-lucide-history",
				match: { path: "/clienti" },
			},
			{
				label: "Completati",
				to: "/clienti?status=completato",
				icon: "i-lucide-circle-check",
				match: { path: "/clienti", status: "completato" },
			},
		],
	},
];

export const appBottomTabs: AppNavItem[] = [
	{
		label: "Clienti",
		to: "/clienti",
		icon: "i-lucide-users",
		match: { path: "/clienti" },
	},
	{
		label: "Progetti",
		to: "/progetti",
		icon: "i-lucide-briefcase-business",
		match: { path: "/progetti" },
	},
	{
		label: "Nuovo",
		to: "/pages/new",
		icon: "i-lucide-square-pen",
		match: { path: "/pages/new" },
	},
	{
		label: "Info",
		to: "/about",
		icon: "i-lucide-info",
		match: { path: "/about" },
	},
];

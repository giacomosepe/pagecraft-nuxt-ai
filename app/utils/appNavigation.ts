import { CLIENT_STATUS, FOLDER_STATUS } from "~/utils/statuses";

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
				label: "Dashboard",
				to: "/dashboard",
				icon: "i-lucide-layout-dashboard",
				match: { path: "/dashboard" },
			},
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
				to: `/progetti?status=${FOLDER_STATUS.WAITING}`,
				icon: "i-lucide-clock-3",
				match: { path: "/progetti", status: FOLDER_STATUS.WAITING },
			},
			{
				label: "In lavorazione",
				to: `/progetti?status=${FOLDER_STATUS.IN_PROGRESS}`,
				icon: "i-lucide-loader-circle",
				match: { path: "/progetti", status: FOLDER_STATUS.IN_PROGRESS },
			},
			{
				label: "Completati",
				to: `/progetti?status=${FOLDER_STATUS.COMPLETED}`,
				icon: "i-lucide-circle-check-big",
				match: { path: "/progetti", status: FOLDER_STATUS.COMPLETED },
			},
		],
	},
	{
		label: "Clienti",
		items: [
			{
				label: "Aperti",
				to: `/clienti?status=${CLIENT_STATUS.OPEN}`,
				icon: "i-lucide-star",
				match: { path: "/clienti", status: CLIENT_STATUS.OPEN },
			},
			{
				label: "Completati",
				to: `/clienti?status=${CLIENT_STATUS.COMPLETED}`,
				icon: "i-lucide-circle-check",
				match: { path: "/clienti", status: CLIENT_STATUS.COMPLETED },
			},
		],
	},
];

export const appBottomTabs: AppNavItem[] = [
	{
		label: "Dashboard",
		to: "/dashboard",
		icon: "i-lucide-layout-dashboard",
		match: { path: "/dashboard" },
	},
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
		label: "Documenti",
		to: "/documenti",
		icon: "i-lucide-files",
		match: { path: "/documenti" },
	},
];

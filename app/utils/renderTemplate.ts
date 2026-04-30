export type TemplateValueMap = Record<string, string | number | null | undefined>;

function normalizeKey(key: string): string {
	return key.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function resolveTemplateValue(key: string, values: TemplateValueMap): string | null {
	const normalized = normalizeKey(key);
	const value = values[normalized] ?? values[key.trim()];
	if (value === null || value === undefined || String(value).trim() === "") {
		return null;
	}
	return String(value);
}

export function renderTemplate(template: string, values: TemplateValueMap): string {
	return template
		.replace(/\{\{([^}]+)\}\}/g, (match, key: string) => {
			return resolveTemplateValue(key, values) ?? match;
		})
		.replace(/\[([^\]]+)\]/g, (match, key: string) => {
			return resolveTemplateValue(key, values) ?? "[DA COMPLETARE]";
		});
}

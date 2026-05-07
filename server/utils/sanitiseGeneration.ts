export interface SanitisationResult {
	clean: boolean;
	matches: string[];
}

export function sanitiseGeneration(
	text: string,
	blocklist: string[],
): SanitisationResult {
	const normalizedText = text.toLowerCase();
	const matches = blocklist.filter((term) => {
		const normalizedTerm = term.trim().toLowerCase();
		return normalizedTerm.length > 0 && normalizedText.includes(normalizedTerm);
	});

	return { clean: matches.length === 0, matches };
}

const RICH_TEXT_TAG_RE = /<(p|ul|ol|li|strong|b|em|i|br)(\s|>|\/)/i;

function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#039;");
}

export function isRichTextHtml(value: string | null | undefined): boolean {
	return Boolean(value && RICH_TEXT_TAG_RE.test(value));
}

export function plainTextToRichHtml(value: string): string {
	const blocks = value.split(/\n\n+/).map((block) => block.trim()).filter(Boolean);
	if (!blocks.length) return "<p></p>";
	return blocks
		.map((block) => `<p>${block.split("\n").map(escapeHtml).join("<br>")}</p>`)
		.join("");
}

export function richHtmlToPlainText(value: string): string {
	return value
		.replace(/<br\s*\/?>/gi, "\n")
		.replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
		.replace(/<\/li>\s*<li[^>]*>/gi, "\n")
		.replace(/<li[^>]*>/gi, "- ")
		.replace(/<\/?(p|ul|ol|li|strong|b|em|i)[^>]*>/gi, "")
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#039;/g, "'")
		.trim();
}

export function normalizeToRichHtml(value: string): string {
	return isRichTextHtml(value) ? value : plainTextToRichHtml(value);
}

export function sanitizeRichTextHtml(value: string): string {
	return value
		.replace(/<script[\s\S]*?<\/script>/gi, "")
		.replace(/<style[\s\S]*?<\/style>/gi, "")
		.replace(/\son\w+=(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
		.replace(/<(\/?)(?!p\b|ul\b|ol\b|li\b|strong\b|b\b|em\b|i\b|br\b)[^>]*>/gi, "")
		.replace(/<(p|ul|ol|li|strong|b|em|i|br)\b[^>]*>/gi, "<$1>");
}

export interface GenerativeRuleSection {
	key: string;
	label: string;
	content: string;
}

export interface GenerativeRule {
	sections: GenerativeRuleSection[];
}

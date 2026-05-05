import type { ComputedRef } from "vue";
import type { ClientRecord } from "~/composables/useClientFields";
import type { GenerativeRuleSection } from "~/types/generative-rule";
import {
	assembleStruttura,
	DEFAULT_STRUTTURA_RULE,
	type StrutturaRule,
} from "~/utils/assembleStruttura";
import type { ExtractionResult } from "~/utils/visuraExtraction";

interface UseStrutturaRuleParams {
	activeStepId: ComputedRef<string>;
	clientData: ComputedRef<ClientRecord | null | undefined>;
	getVisuraData: (fieldKey: string) => ExtractionResult;
}

function sectionsToRule(sections: GenerativeRuleSection[]): StrutturaRule {
	return {
		intro: sections.find((section) => section.key === "intro")?.content ?? "",
		bloccoSociPersonaFisica:
			sections.find((section) => section.key === "bloccoSociPersonaFisica")?.content ??
			DEFAULT_STRUTTURA_RULE.bloccoSociPersonaFisica,
		bloccoSociPersonaGiuridica:
			sections.find((section) => section.key === "bloccoSociPersonaGiuridica")?.content ??
			DEFAULT_STRUTTURA_RULE.bloccoSociPersonaGiuridica,
		bloccoPartecipate:
			sections.find((section) => section.key === "bloccoPartecipate")?.content ??
			DEFAULT_STRUTTURA_RULE.bloccoPartecipate,
	};
}

function ruleToSections(rule: StrutturaRule): GenerativeRuleSection[] {
	return [
		{
			key: "intro",
			label: "Introduzione",
			content: rule.intro,
		},
		{
			key: "bloccoSociPersonaFisica",
			label: "Socio persona fisica",
			content: rule.bloccoSociPersonaFisica,
		},
		{
			key: "bloccoSociPersonaGiuridica",
			label: "Socio persona giuridica",
			content: rule.bloccoSociPersonaGiuridica,
		},
		{
			key: "bloccoPartecipate",
			label: "Partecipata",
			content: rule.bloccoPartecipate,
		},
	];
}

export function useStrutturaRule({
	activeStepId,
	clientData,
	getVisuraData,
}: UseStrutturaRuleParams) {
	const strutturaRuleModalOpen = ref(false);
	const activeStrutturaRuleFieldKey = ref<string | null>(null);
	const appliedStrutturaRules = ref<Record<string, StrutturaRule>>({});

	watch(
		activeStepId,
		() => {
			strutturaRuleModalOpen.value = false;
			activeStrutturaRuleFieldKey.value = null;
		},
	);

	function ruleForField(fieldKey: string): StrutturaRule {
		return appliedStrutturaRules.value[fieldKey] ?? DEFAULT_STRUTTURA_RULE;
	}

	function getStrutturaPreview(fieldKey: string): string {
		return buildStrutturaText(fieldKey, getVisuraData(fieldKey));
	}

	function buildStrutturaText(fieldKey: string, data: unknown): string {
		const clientName = clientData.value?.company_name ?? clientData.value?.name ?? null;
		return assembleStruttura(data, ruleForField(fieldKey), clientName);
	}

	function hasStrutturaPreview(fieldKey: string): boolean {
		return getStrutturaPreview(fieldKey).trim().length > 0;
	}

	function openStrutturaRuleModal(fieldKey: string): void {
		if (!hasStrutturaPreview(fieldKey)) return;
		activeStrutturaRuleFieldKey.value = fieldKey;
		strutturaRuleModalOpen.value = true;
	}

	const strutturaRuleSections = computed<GenerativeRuleSection[]>(() => {
		const fieldKey = activeStrutturaRuleFieldKey.value;
		return ruleToSections(fieldKey ? ruleForField(fieldKey) : DEFAULT_STRUTTURA_RULE);
	});

	function applyStrutturaRule(sections: GenerativeRuleSection[]): void {
		const fieldKey = activeStrutturaRuleFieldKey.value;
		if (!fieldKey) return;
		appliedStrutturaRules.value = {
			...appliedStrutturaRules.value,
			[fieldKey]: sectionsToRule(sections),
		};
	}

	return {
		strutturaRuleModalOpen,
		appliedStrutturaRules,
		strutturaRuleSections,
		getStrutturaPreview,
		hasStrutturaPreview,
		openStrutturaRuleModal,
		applyStrutturaRule,
		buildStrutturaText,
	};
}

import type { ComputedRef } from "vue";
import type { GenerativeRuleSection } from "~/types/generative-rule";

interface UseStepExtractionRulesParams {
  activeStepId: ComputedRef<string>;
}

export function useStepExtractionRules({
  activeStepId,
}: UseStepExtractionRulesParams) {
  const extractionRuleModalOpen = ref(false);
  const activeExtractionRuleFieldKey = ref<string | null>(null);
  const extractionRuleSections = ref<GenerativeRuleSection[]>([]);
  const appliedExtractionRules = ref<Record<string, GenerativeRuleSection[]>>({});

  watch(
    activeStepId,
    () => {
      extractionRuleModalOpen.value = false;
      activeExtractionRuleFieldKey.value = null;
    },
  );

  async function openExtractionRuleModal(fieldKey: string): Promise<void> {
    activeExtractionRuleFieldKey.value = fieldKey;
    const appliedRule = appliedExtractionRules.value[fieldKey];
    if (appliedRule) {
      extractionRuleSections.value = appliedRule;
      extractionRuleModalOpen.value = true;
      return;
    }

    extractionRuleSections.value = [
      {
        key: "prompt",
        label: "Prompt di estrazione",
        content: "Caricamento della regola di estrazione...",
      },
    ];
    extractionRuleModalOpen.value = true;

    try {
      const prompt = await $fetch<string>("/api/visura/extraction-rule");
      if (activeExtractionRuleFieldKey.value !== fieldKey) return;
      extractionRuleSections.value = [
        {
          key: "prompt",
          label: "Prompt di estrazione",
          content: prompt,
        },
      ];
    } catch {
      extractionRuleSections.value = [
        {
          key: "prompt",
          label: "Prompt di estrazione",
          content: "Non siamo riusciti a caricare la regola di estrazione. Riprova.",
        },
      ];
    }
  }

  function applyExtractionRule(sections: GenerativeRuleSection[]): void {
    const fieldKey = activeExtractionRuleFieldKey.value;
    if (!fieldKey) return;
    appliedExtractionRules.value = {
      ...appliedExtractionRules.value,
      [fieldKey]: sections,
    };
  }

  return {
    extractionRuleModalOpen,
    activeExtractionRuleFieldKey,
    extractionRuleSections,
    appliedExtractionRules,
    openExtractionRuleModal,
    applyExtractionRule,
  };
}

// app/composables/useGeneration.ts
//
// Manages AI generation state and actions for the step editor.
// Extracted from pages/pages/[id].vue — do not duplicate this logic there.
//
// Usage:
//   const { output, isGenerating, isCommitting, errorMsg, generate, refine, commit, discard } =
//     useGeneration({ pageId, activeStep, steps, activeStepIndex })

import type { Ref, ComputedRef } from "vue";
import type { StepRecord } from "~/types/app.types";

export interface UseGenerationParams {
  pageId: string;
  activeStep: ComputedRef<StepRecord | undefined>;
  steps: Ref<StepRecord[] | null | undefined>;
  activeStepIndex: Ref<number>;
}

export function useGeneration({
  pageId,
  activeStep,
  steps,
  activeStepIndex,
}: UseGenerationParams) {
  const output = ref("");
  const isGenerating = ref(false);
  const isCommitting = ref(false);
  const errorMsg = ref("");
  const commitSuccess = ref(false);

  // ─── Generate ───────────────────────────────────────────────────────────────
  async function generate(): Promise<void> {
    if (!activeStep.value || isGenerating.value) return;
    isGenerating.value = true;
    output.value = "";
    errorMsg.value = "";

    try {
      const res = await fetch("/api/generations/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stepId: activeStep.value.id,
          pageId,
          mode: "generate",
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error((err as { message?: string }).message ?? "Generazione non riuscita");
      }
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("Errore nella ricezione della risposta");
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        output.value += decoder.decode(value, { stream: true });
      }
    } catch (e: unknown) {
      errorMsg.value = e instanceof Error ? e.message : "Si è verificato un errore";
      output.value = "";
    } finally {
      isGenerating.value = false;
    }
  }

  // ─── Refine ─────────────────────────────────────────────────────────────────
  async function refine(): Promise<void> {
    if (!activeStep.value || isGenerating.value || !output.value) return;
    isGenerating.value = true;
    errorMsg.value = "";
    const previousOutput = output.value;
    output.value = "";

    try {
      const res = await fetch("/api/generations/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stepId: activeStep.value.id,
          pageId,
          mode: "refine",
          existingOutput: previousOutput,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error((err as { message?: string }).message ?? "Raffinamento non riuscito");
      }
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("Errore nella ricezione della risposta");
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        output.value += decoder.decode(value, { stream: true });
      }
    } catch (e: unknown) {
      errorMsg.value = e instanceof Error ? e.message : "Si è verificato un errore";
      output.value = previousOutput;
    } finally {
      isGenerating.value = false;
    }
  }

  // ─── Commit ─────────────────────────────────────────────────────────────────
  // Persists committed_output + user_context to the step, then advances the step index.
  async function commit(): Promise<void> {
    if (!activeStep.value || !output.value || isGenerating.value) return;
    isCommitting.value = true;
    errorMsg.value = "";

    try {
      await $fetch("/api/db/mutate", {
        method: "POST",
        body: {
          table: "steps",
          operation: "update",
          data: {
            committed_output: output.value,
            status: "COMMITTED",
          },
          where: { id: activeStep.value.id },
        },
      });
      // Optimistic local state update — keeps the UI in sync without a refetch
      const step = steps.value?.[activeStepIndex.value];
      if (step) {
        step.status = "COMMITTED";
        step.committed_output = output.value;
      }
      commitSuccess.value = true;
      await nextTick();
      commitSuccess.value = false;
      if (activeStepIndex.value < (steps.value?.length ?? 0) - 1) {
        activeStepIndex.value++;
      }
    } catch (e: unknown) {
      errorMsg.value = "Salvataggio non riuscito. Riprova.";
    } finally {
      isCommitting.value = false;
    }
  }

  // ─── Generate Premessa ───────────────────────────────────────────────────────
  async function generatePremessa(taxYearStart: number, taxYearEnd: number): Promise<void> {
    if (isGenerating.value) return;
    isGenerating.value = true;
    output.value = "";
    errorMsg.value = "";

    try {
      const res = await fetch("/api/generations/premessa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId, taxYearStart, taxYearEnd }),
      });
      if (!res.ok) throw new Error();
      output.value = await res.text();
    } catch {
      errorMsg.value = "Generazione della premessa non riuscita. Riprova.";
      output.value = "";
    } finally {
      isGenerating.value = false;
    }
  }

  // ─── Discard ────────────────────────────────────────────────────────────────
  function discard(): void {
    output.value = activeStep.value?.committed_output ?? "";
    errorMsg.value = "";
  }

  return {
    output,
    isGenerating,
    isCommitting,
    errorMsg,
    commitSuccess,
    generate,
    refine,
    commit,
    discard,
    generatePremessa,
  };
}

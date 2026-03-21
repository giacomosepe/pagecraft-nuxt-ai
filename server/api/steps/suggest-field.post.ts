// DELETED — suggest-field.post.ts is no longer needed.
//
// We previously planned to use Claude to suggest form field values from
// client data. This turned out to be wrong — client data is structured
// and deterministic, so AI adds no value here.
//
// Instead, useClientFields.ts (app/composables/useClientFields.ts) provides
// a variableMap computed from the client record that pre-populates form fields
// directly. No API call, no latency, no cost, no hallucination risk.
//
// This file is kept as a placeholder so git history explains the decision.
// It exports nothing and registers no handler.

export {};

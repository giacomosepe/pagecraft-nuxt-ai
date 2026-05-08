<template>
	<!-- ─── BaseFieldGrid ──────────────────────────────────────────────────────
	     A 2-column grid for read/edit hybrid field layouts on detail pages.
	     Uses --space-field-gap and --space-field-col-gap from tokens.css.

	     Rules (see DESIGN.md — On Overrides and Exceptions):
	     - This component does one thing: lay out uniform fields in 2 columns.
	     - Do NOT add props for full-width overrides or modifier slots.
	     - Content that doesn't fit a uniform 2-column grid (e.g. address blocks
	       with nested sub-layouts) belongs OUTSIDE this component, in its own
	       <div> in the parent template.                                         -->
	<div class="field-grid">
		<slot />
	</div>
</template>

<style scoped>
.field-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	row-gap: var(--space-field-gap);
	column-gap: var(--space-field-col-gap);
}

@media (max-width: 720px) {
	.field-grid {
		grid-template-columns: 1fr;
	}
}
</style>

<script setup lang="ts">
definePageMeta({
	middleware: "auth",
});
</script>

<template>
	<BasePageContainer size="lg">
		<BasePageHeader
			title="Info prodotto"
			description="Spazio dedicato a note, riferimenti e dettagli utili sul prodotto."
		/>

		<div
			class="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center"
		>
			<UIcon
				name="i-lucide-info"
				class="mx-auto mb-3 size-8 text-slate-400"
			/>
			<p class="text-sm font-medium text-slate-900">
				Sezione informativa in preparazione
			</p>
			<p class="mt-1 text-sm text-slate-500">
				Per ora questo spazio servirà come appoggio alla nuova navigazione.
			</p>
		</div>
	</BasePageContainer>
</template>

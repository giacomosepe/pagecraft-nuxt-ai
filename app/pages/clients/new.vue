<script setup lang="ts">
definePageMeta({ middleware: "auth" });

const name = ref("");
const loading = ref(false);
const errorMsg = ref("");

async function createClient() {
	if (!name.value.trim()) return;
	loading.value = true;
	errorMsg.value = "";

	try {
		const result = await $fetch("/api/db/mutate", {
			method: "POST",
			body: {
				table: "clients",
				operation: "insert",
				data: { name: name.value.trim() },
			},
		});
		await navigateTo({
			path: `/clients/${result.id}`,
			query: { created: "client" },
		});
	} catch (e: any) {
		errorMsg.value = "Errore durante la creazione del cliente.";
		loading.value = false;
	}
}
</script>

<template>
	<FormPageLayout
		title="Nuovo cliente"
		description="Crea rapidamente un nuovo cliente e completa i dettagli in un secondo momento, se serve."
		back-to="/clients"
		back-label="Clienti"
		eyebrow="Creazione"
		size="md"
	>
		<FormSectionCard
			title="Dati iniziali"
			description="Per iniziare basta il nome del cliente. Gli altri dettagli potranno essere aggiunti dopo."
		>
			<div class="space-y-5">
				<UFormField label="Nome cliente">
					<UInput
						v-model="name"
						placeholder="es. Acme S.r.l."
						size="lg"
						class="w-full"
						autofocus
						@keyup.enter="createClient"
					/>
				</UFormField>

				<UAlert
					v-if="errorMsg"
					color="error"
					variant="soft"
					:description="errorMsg"
					icon="i-lucide-circle-alert"
				/>
			</div>
		</FormSectionCard>

		<template #footer>
			<FormActionsFooter>
				<template #leading>
					<p class="text-sm text-slate-500">
						Dopo la creazione verrai portato direttamente alla scheda del cliente.
					</p>
				</template>

				<UButton color="neutral" variant="ghost" to="/clients">
					Annulla
				</UButton>
				<UButton
					:disabled="!name.trim()"
					:loading="loading"
					@click="createClient"
				>
					Crea cliente
				</UButton>
			</FormActionsFooter>
		</template>
	</FormPageLayout>
</template>

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
		await navigateTo(`/clients/${result.id}`);
	} catch (e: any) {
		errorMsg.value = "Errore durante la creazione del cliente.";
		loading.value = false;
	}
}
</script>

<template>
	<div class="mx-auto max-w-lg px-6 py-10">
		<div class="mb-8">
			<NuxtLink
				to="/clients"
				class="mb-4 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
			>
				<UIcon name="i-lucide-arrow-left" class="size-4" />
				Clienti
			</NuxtLink>
			<h1 class="text-xl font-semibold text-gray-900 dark:text-white">
				Nuovo cliente
			</h1>
		</div>

		<div class="flex flex-col gap-5">
			<UFormField label="Nome cliente">
				<UInput
					v-model="name"
					placeholder="es. Acme S.r.l."
					size="md"
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

			<div class="flex justify-end gap-3">
				<UButton color="neutral" variant="ghost" to="/clients"
					>Annulla</UButton
				>
				<UButton
					:disabled="!name.trim()"
					:loading="loading"
					@click="createClient"
				>
					Crea cliente
				</UButton>
			</div>
		</div>
	</div>
</template>

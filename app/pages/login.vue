<script setup lang="ts">
definePageMeta({ layout: "public-layout" });

const supabase = useSupabaseClient();

const mode = ref<"signin" | "signup">("signin");
const email = ref("");
const password = ref("");
const loading = ref(false);
const errorMsg = ref("");
const successMsg = ref("");

const authCopy = {
	signinTitle: "Bentornato",
	signupTitle: "Crea il tuo account",
	emailLabel: "Email",
	emailPlaceholder: "tu@esempio.it",
	passwordLabel: "Password",
	passwordPlaceholder: "••••••••",
	signinCta: "Accedi",
	signupCta: "Registrati",
	noAccount: "Non hai un account?",
	hasAccount: "Hai già un account?",
	checkEmail: "Controlla la tua email per confermare l'account.",
} as const;

async function handleSubmit() {
	loading.value = true;
	errorMsg.value = "";
	successMsg.value = "";

	if (mode.value === "signin") {
		const { error } = await supabase.auth.signInWithPassword({
			email: email.value,
			password: password.value,
		});
		if (error) {
			errorMsg.value = error.message;
		} else {
			await navigateTo("/dashboard");
		}
	} else {
		const { error } = await supabase.auth.signUp({
			email: email.value,
			password: password.value,
		});
		if (error) {
			errorMsg.value = error.message;
		} else {
			successMsg.value = authCopy.checkEmail;
		}
	}

	loading.value = false;
}

function toggleMode() {
	mode.value = mode.value === "signin" ? "signup" : "signin";
	errorMsg.value = "";
	successMsg.value = "";
}

const user = useSupabaseUser();
if (user.value) await navigateTo("/dashboard");
</script>

<template>
	<div class="mx-auto w-full px-4 py-12 sm:py-16" style="max-width: 22rem">
		<!-- Form header -->
		<div class="mb-6 text-center">
			<h2
				class="font-semibold"
				style="
					font-size: var(--text-lg);
					color: var(--color-text-primary);
				"
			>
				{{
					mode === "signin"
						? authCopy.signinTitle
						: authCopy.signupTitle
				}}
			</h2>
		</div>

		<!-- Form card -->
		<UCard>
			<div class="space-y-4">
				<UFormField :label="authCopy.emailLabel">
					<UInput
						v-model="email"
						type="email"
						autocomplete="email"
						:placeholder="authCopy.emailPlaceholder"
						size="md"
						class="w-full"
						@keyup.enter="handleSubmit"
					/>
				</UFormField>

				<UFormField :label="authCopy.passwordLabel">
					<UInput
						v-model="password"
						type="password"
						autocomplete="current-password"
						:placeholder="authCopy.passwordPlaceholder"
						size="md"
						class="w-full"
						@keyup.enter="handleSubmit"
					/>
				</UFormField>

				<!-- Error / success feedback -->
				<UAlert
					v-if="errorMsg"
					color="error"
					variant="soft"
					:description="errorMsg"
					icon="i-lucide-circle-alert"
				/>
				<UAlert
					v-if="successMsg"
					color="success"
					variant="soft"
					:description="successMsg"
					icon="i-lucide-mail-check"
				/>

				<UButton
					color="primary"
					class="w-full justify-center"
					size="md"
					:loading="loading"
					@click="handleSubmit"
				>
					{{
						mode === "signin"
							? authCopy.signinCta
							: authCopy.signupCta
					}}
				</UButton>
			</div>

			<template #footer>
				<p
					class="text-center text-sm"
					style="color: var(--color-text-secondary)"
				>
					{{
						mode === "signin"
							? authCopy.noAccount
							: authCopy.hasAccount
					}}
					<button
						class="ml-1 font-medium hover:underline"
						style="color: var(--color-brand)"
						@click="toggleMode"
					>
						{{
							mode === "signin"
								? authCopy.signupCta
								: authCopy.signinCta
						}}
					</button>
				</p>
			</template>
		</UCard>
	</div>
</template>

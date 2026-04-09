<script setup lang="ts">
definePageMeta({ layout: "public-layout" });

const supabase = useSupabaseClient();
const { t } = useI18n();

const mode = ref<"signin" | "signup">("signin");
const email = ref("");
const password = ref("");
const loading = ref(false);
const errorMsg = ref("");
const successMsg = ref("");

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
			successMsg.value = t("auth.checkEmail");
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
  <div class="w-full" style="max-width: 22rem">
    <!-- Form header -->
    <div class="mb-6 text-center">
      <h2
        class="font-semibold"
        style="font-size: var(--text-lg); color: var(--color-text-primary)"
      >
        {{
          mode === "signin"
            ? t("auth.welcomeBack")
            : t("auth.createAccount")
        }}
      </h2>
    </div>

    <!-- Form card -->
    <UCard>
      <div class="space-y-4">
        <UFormField :label="t('auth.email')">
          <UInput
            v-model="email"
            type="email"
            autocomplete="email"
            :placeholder="t('auth.emailPlaceholder')"
            size="md"
            class="w-full"
            @keyup.enter="handleSubmit"
          />
        </UFormField>

        <UFormField :label="t('auth.password')">
          <UInput
            v-model="password"
            type="password"
            autocomplete="current-password"
            :placeholder="t('auth.passwordPlaceholder')"
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
              ? t("auth.signIn")
              : t("auth.signUp")
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
              ? t("auth.noAccount")
              : t("auth.hasAccount")
          }}
          <button
            class="ml-1 font-medium hover:underline"
            style="color: var(--color-brand)"
            @click="toggleMode"
          >
            {{
              mode === "signin"
                ? t("auth.signUp")
                : t("auth.signIn")
            }}
          </button>
        </p>
      </template>
    </UCard>
  </div>
</template>

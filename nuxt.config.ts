// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2026-03-15",
  devtools: { enabled: true },
  future: {
    compatibilityVersion: 4,
  },
  modules: [
    "@nuxt/icon",
    "@nuxtjs/i18n",
    "@nuxtjs/sitemap",
    "@nuxtjs/supabase",
    "@nuxtjs/tailwindcss",
  ],
  supabase: {
    // Redirect unauthenticated users to /login
    // We'll define protected routes later
    redirect: false, // start with false, enable once auth pages are built
  },
  // Railway needs this for production
  nitro: {
    preset: "node-server",
  },
  runtimeConfig: {
    // Private — server only (never sent to browser)
    anthropicApiKey: "", // set via env var NUXT_ANTHROPIC_API_KEY
    databaseUrl: "", // set via env var NUXT_DATABASE_URL
    directDatabaseUrl: "", // set via env var NUXT_DIRECT_DATABASE_URL

    // Public — safe to expose to browser
    public: {
      supabaseUrl: "", // set via NUXT_PUBLIC_SUPABASE_URL
      supabaseKey: "", // set via NUXT_PUBLIC_SUPABASE_KEY
    },
  },

  typescript: {
    strict: true,
  },
  i18n: {
    defaultLocale: "en",
    locales: [
      { code: "en", name: "English", file: "en.json" },
      { code: "it", name: "Italiano", file: "it.json" },
    ],
    strategy: "prefix_except_default",
    langDir: "locales/",
    vueI18n: "./i18n/i18n.config.ts",
  },
});

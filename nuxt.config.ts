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
    "@nuxt/ui",
  ],
  css: ["./assets/css/main.css"],
  supabase: {
    redirectOptions: {
      login: "/login",
      callback: "/confirm",
      exclude: ["/", "/about", "/pricing", "/docs"], // public pages
      saveRedirectToCookie: true, // sends user back where they tried to go
    },
    url: process.env.NUXT_PUBLIC_SUPABASE_URL,
    key: process.env.NUXT_PUBLIC_SUPABASE_KEY,
  },
  ui: {
    safelistColors: ["brand"],
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
    supabaseServiceKey: "", // set via env var SUPABASE_SECRET_KEY
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
  },
});

// app/middleware/auth.ts
// Usage: add  definePageMeta({ middleware: 'auth' })  to any protected page.
// The @nuxtjs/supabase module also protects routes via redirectOptions in nuxt.config,
// but this middleware gives you explicit per-page control and TypeScript-friendly access
// to the user object inside pages that need it.

export default defineNuxtRouteMiddleware(() => {
  const user = useSupabaseUser();

  // useSupabaseUser() is reactive — on the server it may still be null while the
  // session is being hydrated. The module's own redirect handles the server-side
  // case. This guard catches client-side navigation to protected routes.
  if (!user.value) {
    return navigateTo("/login");
  }
});

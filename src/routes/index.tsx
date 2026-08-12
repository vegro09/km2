import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign In — Kanto Motion AI Motion Engine" },
      {
        name: "description",
        content:
          "Sign in to Kanto Motion, the deterministic layout-to-motion studio that turns static HTML into rendered video.",
      },
      { property: "og:title", content: "Sign In — Kanto Motion" },
      {
        property: "og:description",
        content: "Deterministic Layout-to-Motion Studio for AI-generated UI animation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthScreen,
});

function AuthScreen() {
  return (
    <main
      id="auth-screen"
      data-animate="true"
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6"
    >
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-70" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 40%, transparent 0%, var(--background) 100%)",
        }}
      />

      <section id="auth-card" data-animate="true" className="bento glass relative w-full max-w-[420px] p-8">
        <header id="auth-header" data-animate="true" className="text-center">
          <div className="mx-auto mb-6 flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface-2">
            <span className="text-[15px] font-semibold tracking-tight">K</span>
          </div>
          <h1 className="text-[15px] font-semibold uppercase tracking-[0.28em]">Kanto Motion</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in to your motion workspace</p>
        </header>

        <form id="auth-form" data-animate="true" className="mt-8 space-y-4">
          <div className="space-y-2">
            <label htmlFor="auth-email" className="block text-xs font-medium text-muted-foreground">
              Email
            </label>
            <input
              id="auth-email"
              data-animate="true"
              type="email"
              placeholder="you@studio.com"
              className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="auth-password" className="block text-xs font-medium text-muted-foreground">
              Password
            </label>
            <input
              id="auth-password"
              data-animate="true"
              type="password"
              placeholder="••••••••••"
              className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <Link
            id="auth-signin-button"
            data-animate="true"
            to="/dashboard"
            className="flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
          >
            Sign In
          </Link>

          <div id="auth-divider" data-animate="true" className="flex items-center gap-3 py-1">
            <span className="h-px flex-1 bg-border" />
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <Link
            id="auth-google-button"
            data-animate="true"
            to="/dashboard"
            className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-surface-2 text-sm font-medium text-foreground"
          >
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              G
            </span>
            Continue with Google
          </Link>
        </form>

        <footer id="auth-footer" data-animate="true" className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">Deterministic Layout-to-Motion Studio</p>
        </footer>
      </section>
    </main>
  );
}

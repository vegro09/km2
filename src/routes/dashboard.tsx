import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Project Hub — Kanto Motion" },
      {
        name: "description",
        content:
          "Browse, search and open your Kanto Motion projects, from streak widgets to pricing cards, and jump straight into the motion studio.",
      },
      { property: "og:title", content: "Project Hub — Kanto Motion" },
      {
        property: "og:description",
        content: "Your bento hub of motion projects and exported videos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const projects = [
  { id: "daily-streak-widget", title: "Daily Streak Widget", edited: "Edited 12 minutes ago", kind: "streak" },
  { id: "pricing-card", title: "Pricing Card", edited: "Edited 3 hours ago", kind: "pricing" },
  { id: "checkout-toast", title: "Checkout Toast", edited: "Edited yesterday", kind: "toast" },
  { id: "stat-tile", title: "Analytics Stat Tile", edited: "Edited 2 days ago", kind: "stat" },
  { id: "avatar-stack", title: "Team Avatar Stack", edited: "Edited 4 days ago", kind: "avatars" },
  { id: "progress-ring", title: "Progress Ring", edited: "Edited last week", kind: "ring" },
];

function Thumb({ kind }: { kind: string }) {
  const base = "flex h-full w-full items-center justify-center rounded-xl border border-border bg-background";
  if (kind === "streak")
    return (
      <div className={base}>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 px-4 py-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm text-primary-foreground">
            7
          </span>
          <div>
            <p className="text-xs font-semibold">7 day streak</p>
            <p className="text-[10px] text-muted-foreground">Keep it going</p>
          </div>
        </div>
      </div>
    );
  if (kind === "pricing")
    return (
      <div className={base}>
        <div className="w-32 rounded-xl border border-border bg-surface-2 p-3">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Pro</p>
          <p className="mt-1 text-lg font-semibold">$24</p>
          <div className="mt-2 h-6 rounded-md bg-primary" />
        </div>
      </div>
    );
  if (kind === "toast")
    return (
      <div className={base}>
        <div className="flex w-40 items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2.5">
          <span className="h-2 w-2 rounded-full bg-primary" />
          <span className="text-[11px]">Payment confirmed</span>
        </div>
      </div>
    );
  if (kind === "stat")
    return (
      <div className={base}>
        <div className="w-36 rounded-xl border border-border bg-surface-2 p-3">
          <p className="text-[10px] text-muted-foreground">Active users</p>
          <p className="text-xl font-semibold">12,480</p>
          <div className="mt-2 flex items-end gap-1">
            {[6, 10, 7, 14, 11, 18].map((h, i) => (
              <span key={i} className="w-2 rounded-sm bg-muted-foreground" style={{ height: h }} />
            ))}
          </div>
        </div>
      </div>
    );
  if (kind === "avatars")
    return (
      <div className={base}>
        <div className="flex -space-x-2">
          {["A", "M", "R", "K"].map((l) => (
            <span
              key={l}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface-2 text-[11px]"
            >
              {l}
            </span>
          ))}
        </div>
      </div>
    );
  return (
    <div className={base}>
      <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-border">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-transparent border-t-primary border-r-primary">
          <span className="text-[11px] font-semibold">68%</span>
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  return (
    <div id="dashboard-screen" data-animate="true" className="min-h-screen bg-background">
      <header
        id="dashboard-navbar"
        data-animate="true"
        className="glass sticky top-0 z-10 border-b border-border"
      >
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
          <Link id="nav-brand" data-animate="true" to="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface-2 text-[13px] font-semibold">
              K
            </span>
            <span className="text-[12px] font-semibold uppercase tracking-[0.24em]">Kanto Motion</span>
          </Link>
          <nav className="flex items-center gap-3">
            <span
              id="nav-theme-badge"
              data-animate="true"
              className="rounded-full border border-border bg-surface-2 px-3 py-1 text-[11px] text-muted-foreground"
            >
              Dark
            </span>
            <a
              id="nav-docs-link"
              data-animate="true"
              href="#documentation"
              className="rounded-full px-3 py-1 text-[13px] text-muted-foreground"
            >
              Documentation
            </a>
            <span
              id="nav-avatar"
              data-animate="true"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface-2 text-[12px] font-medium"
            >
              VG
            </span>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-6 py-10">
        <section id="hero-action-card" data-animate="true" className="bento p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Workspace</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
                Turn static layouts into rendered motion.
              </h1>
              <p className="mt-3 max-w-xl text-sm text-muted-foreground">
                Paste HTML and CSS, describe the motion in plain language, export a deterministic video.
              </p>
            </div>
            <Link
              id="create-project-button"
              data-animate="true"
              to="/studio"
              className="flex h-12 shrink-0 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground"
            >
              + Create New Motion Project
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ["Projects", "18"],
              ["Rendered videos", "42"],
              ["Avg render", "8.4s"],
              ["Storage", "1.2 GB"],
            ].map(([label, value]) => (
              <div
                key={label}
                id={`stat-${String(label).toLowerCase().replace(/\s+/g, "-")}`}
                data-animate="true"
                className="rounded-xl border border-border bg-surface-2 p-4"
              >
                <p className="text-[11px] text-muted-foreground">{label}</p>
                <p className="mt-1 text-lg font-semibold">{value}</p>
              </div>
            ))}
          </div>
        </section>

        <section
          id="project-filter-bar"
          data-animate="true"
          className="mt-6 flex flex-col gap-3 rounded-2xl border border-border bg-surface p-3 md:flex-row md:items-center md:justify-between"
        >
          <input
            id="project-search-input"
            data-animate="true"
            type="search"
            placeholder="Search projects…"
            className="h-10 w-full rounded-xl border border-border bg-background px-3.5 text-sm placeholder:text-muted-foreground md:max-w-xs"
          />
          <div className="flex gap-2">
            {["All Projects", "Recent", "Exported Videos"].map((f, i) => (
              <button
                key={f}
                id={`filter-${f.toLowerCase().replace(/\s+/g, "-")}`}
                data-animate="true"
                type="button"
                className={
                  i === 0
                    ? "h-10 rounded-xl bg-primary px-4 text-[13px] font-medium text-primary-foreground"
                    : "h-10 rounded-xl border border-border bg-surface-2 px-4 text-[13px] text-muted-foreground"
                }
              >
                {f}
              </button>
            ))}
          </div>
        </section>

        <section id="project-grid" data-animate="true" className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <article key={p.id} id={`project-card-${p.id}`} data-animate="true" className="bento p-3">
              <div className="h-40 rounded-xl bg-background p-3">
                <Thumb kind={p.kind} />
              </div>
              <div className="flex items-end justify-between px-1 pb-1 pt-4">
                <div>
                  <h2 className="text-sm font-semibold">{p.title}</h2>
                  <p className="mt-1 text-[11px] text-muted-foreground">{p.edited}</p>
                </div>
                <Link
                  id={`open-editor-${p.id}`}
                  data-animate="true"
                  to="/studio"
                  className="flex h-9 items-center rounded-lg border border-border bg-surface-2 px-3 text-[12px] font-medium"
                >
                  Open Editor
                </Link>
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}

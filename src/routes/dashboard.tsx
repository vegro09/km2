import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  getProjects,
  createDefaultProject,
  Project
} from "../utils/projectsStore";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Projects Dashboard — Kanto Motion" },
      {
        name: "description",
        content:
          "Browse, manage, and create your Kanto Motion projects, jumping straight into the motion studio editor.",
      },
      { property: "og:title", content: "Projects Dashboard — Kanto Motion" },
      {
        property: "og:description",
        content: "Your motion projects workspace and exported animation video renders.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Thumb({ kind }: { kind?: string }) {
  const base = "flex h-full w-full items-center justify-center rounded-xl border border-border bg-background";
  if (kind === "streak" || !kind)
    return (
      <div className={base}>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 px-4 py-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm text-primary-foreground font-semibold">
            🔥
          </span>
          <div>
            <p className="text-xs font-semibold">7 day streak</p>
            <p className="text-[10px] text-muted-foreground">Keep it going</p>
          </div>
        </div>
      </div>
    );

  return (
    <div className={base}>
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface-2 text-primary">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      </div>
    </div>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const [projectsList, setProjectsList] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Task 4: Fetch real user projects dynamically from localStorage
  useEffect(() => {
    setProjectsList(getProjects());
  }, []);

  // Task 4: "Create New Project" handler instantiates record and navigates to /project/:id
  const handleCreateNewProject = () => {
    const newProj = createDefaultProject("New Motion Project");
    navigate({ to: "/project/$id", params: { id: newProj.id } });
  };

  const filteredProjects = projectsList.filter((p) =>
    p.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div id="dashboard-screen" data-animate="true" className="min-h-screen bg-background text-foreground">
      {/* Top Header */}
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
          <div className="flex items-center gap-3">
            <button
              id="header-create-project-button"
              type="button"
              onClick={handleCreateNewProject}
              className="flex h-9 items-center justify-center rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
            >
              + New Project
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-6 py-10">
        {/* Hero Section */}
        <section id="hero-action-card" data-animate="true" className="bento p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Workspace</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
                Projects Dashboard
              </h1>
              <p className="mt-3 max-w-xl text-sm text-muted-foreground">
                Edit HTML/CSS layouts, craft 60fps GSAP animations, and render deterministic MP4 video exports.
              </p>
            </div>
            <button
              id="create-project-button"
              data-animate="true"
              type="button"
              onClick={handleCreateNewProject}
              className="flex h-12 shrink-0 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 hover:opacity-90 transition-opacity"
            >
              + Create New Motion Project
            </button>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ["Active Projects", projectsList.length.toString()],
              ["Engine Mode", "GSAP v3.12"],
              ["Resolution", "1920 × 1080"],
              ["Export Format", "MP4"],
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

        {/* Filter & Search Bar */}
        <section
          id="project-filter-bar"
          data-animate="true"
          className="mt-6 flex flex-col gap-3 rounded-2xl border border-border bg-surface p-3 md:flex-row md:items-center md:justify-between"
        >
          <input
            id="project-search-input"
            data-animate="true"
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search projects…"
            className="h-10 w-full rounded-xl border border-border bg-background px-3.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary md:max-w-xs"
          />
          <div className="flex gap-2">
            <span className="h-10 flex items-center rounded-xl bg-primary/10 border border-primary/30 px-4 text-[12px] font-medium text-primary">
              All Saved Projects ({filteredProjects.length})
            </span>
          </div>
        </section>

        {/* Real Projects Grid or Clean Empty State */}
        {filteredProjects.length === 0 ? (
          <section
            id="empty-state-section"
            data-animate="true"
            className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface p-16 text-center"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-surface-2 text-primary shadow-inner mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-foreground">No Saved Projects</h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-sm">
              You haven't created any motion projects yet. Create your first project workspace to start animating HTML/CSS components with GSAP.
            </p>
            <button
              id="empty-create-project-button"
              type="button"
              onClick={handleCreateNewProject}
              className="mt-6 flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity shadow-md shadow-primary/20"
            >
              + Create New Project
            </button>
          </section>
        ) : (
          <section id="project-grid" data-animate="true" className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((p) => (
              <article key={p.id} id={`project-card-${p.id}`} data-animate="true" className="bento p-3">
                <div className="h-40 rounded-xl bg-background p-3">
                  <Thumb kind={p.kind} />
                </div>
                <div className="flex items-end justify-between px-1 pb-1 pt-4">
                  <div>
                    <h2 className="text-sm font-semibold">{p.title || "Untitled Project"}</h2>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Edited {p.updatedAt ? new Date(p.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Recently"}
                    </p>
                  </div>
                  {/* Clicking any project card opens /project/:id */}
                  <Link
                    id={`open-editor-${p.id}`}
                    data-animate="true"
                    to="/project/$id"
                    params={{ id: p.id }}
                    className="flex h-9 items-center rounded-lg border border-border bg-surface-2 px-3 text-[12px] font-medium hover:border-primary/50 transition-colors"
                  >
                    Open Editor
                  </Link>
                </div>
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}

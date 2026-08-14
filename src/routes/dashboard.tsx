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

  useEffect(() => {
    setProjectsList(getProjects());
  }, []);

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
              + Create Project
            </button>
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface-2 text-xs font-medium">
              V
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Area */}
      <main id="dashboard-workspace" data-animate="true" className="mx-auto max-w-[1200px] px-6 py-8">
        <section id="dashboard-banner" data-animate="true" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Projects</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage your motion canvases and jump into the live editor.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                id="search-projects-input"
                data-animate="true"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search projects..."
                className="h-10 w-64 rounded-xl border border-border bg-surface px-3.5 pl-9 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none"
              />
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="absolute left-3 top-3 text-muted-foreground"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </div>

            <button
              id="create-project-button"
              data-animate="true"
              type="button"
              onClick={handleCreateNewProject}
              className="flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity shadow-md shadow-primary/20"
            >
              New Project
            </button>
          </div>
        </section>

        {/* Project Cards Grid */}
        <section id="projects-grid" data-animate="true" className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((proj) => (
            <div
              key={proj.id}
              id={`project-card-${proj.id}`}
              data-animate="true"
              onClick={() => navigate({ to: "/project/$id", params: { id: proj.id } })}
              className="bento group relative flex flex-col overflow-hidden p-0 transition-all hover:border-primary/40 cursor-pointer"
            >
              {/* Card Thumbnail Area */}
              <div className="relative h-44 w-full overflow-hidden border-b border-border bg-surface-2 p-3">
                <Thumb kind={proj.previewKind} />
                <span className="absolute bottom-3 right-3 rounded-md border border-border/80 bg-background/90 px-2 py-0.5 font-mono text-[10.5px] tabular-nums text-muted-foreground backdrop-blur">
                  {proj.duration}
                </span>
                <span className="absolute top-3 left-3 rounded-md border border-border/80 bg-background/90 px-2 py-0.5 font-mono text-[10px] text-muted-foreground backdrop-blur">
                  {proj.aspectRatio || "16:9"}
                </span>
              </div>

              {/* Card Meta Area */}
              <div className="flex flex-1 flex-col justify-between p-4">
                <div>
                  <h2 className="text-sm font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors">
                    {proj.title}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Updated {proj.updatedAt}
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                  <span className="text-[11px] text-muted-foreground font-mono">
                    GSAP Timeline
                  </span>
                  <span className="text-xs font-semibold text-primary group-hover:translate-x-0.5 transition-transform">
                    Open Studio &rarr;
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* Empty State Card if no projects match */}
          {filteredProjects.length === 0 && (
            <div
              id="empty-projects-state"
              data-animate="true"
              className="bento col-span-full flex flex-col items-center justify-center p-12 text-center"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-surface-2 text-muted-foreground">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
              </div>
              <h3 className="mt-4 text-sm font-semibold">No projects found</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {searchTerm ? "No projects match your search query." : "Get started by creating your first motion canvas."}
              </p>
              <button
                type="button"
                onClick={handleCreateNewProject}
                className="mt-4 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Create Project
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

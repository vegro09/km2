export interface Project {
  id: string;
  title: string;
  html: string;
  css: string;
  js: string;
  aspectRatio: "16:9" | "9:16" | "1:1";
  updatedAt: string;
  kind?: string;
}

const STORAGE_KEY = "kanto_motion_projects";

export const DEFAULT_HTML = `<div id="streak-card" data-animate="true" class="card">
  <div id="streak-icon" data-animate="true" class="icon">🔥</div>
  <div class="content">
    <h3 id="streak-title" data-animate="true" class="title">7 Day Streak</h3>
    <p id="streak-caption" data-animate="true" class="caption">Keep it going</p>
  </div>
</div>`;

export const DEFAULT_CSS = `/* Base Canvas Styles */
.card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px 32px;
  background: #111115;
  border: 1px solid #27272a;
  border-radius: 16px;
  color: #ffffff;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  font-family: system-ui, -apple-system, sans-serif;
}
.icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  background: #1e1e24;
  border: 1px solid #3f3f46;
  border-radius: 12px;
  font-size: 28px;
}
.content {
  display: flex;
  flex-direction: column;
}
.title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #f4f4f5;
}
.caption {
  margin: 4px 0 0 0;
  font-size: 13px;
  color: #a1a1aa;
}`;

export const DEFAULT_JS = `// Custom GSAP Animation Script
gsap.to("#streak-icon", {
  y: -15,
  scale: 1.2,
  duration: 0.8,
  ease: "back.out(1.7)"
});`;

export function getProjects(): Project[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getProjectById(id: string): Project | null {
  const projects = getProjects();
  return projects.find((p) => p.id === id) || null;
}

export function saveProject(project: Project): Project {
  if (typeof window === "undefined") return project;
  try {
    const projects = getProjects();
    const updated = { ...project, updatedAt: new Date().toISOString() };
    const idx = projects.findIndex((p) => p.id === project.id);
    if (idx >= 0) {
      projects[idx] = updated;
    } else {
      projects.unshift(updated);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    return updated;
  } catch (err) {
    console.error("Failed to save project to localStorage", err);
    return project;
  }
}

export function deleteProject(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const projects = getProjects();
    const filtered = projects.filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error("Failed to delete project from localStorage", err);
  }
}

export function createDefaultProject(title: string = "New Motion Project"): Project {
  const id = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newProj: Project = {
    id,
    title,
    html: DEFAULT_HTML,
    css: DEFAULT_CSS,
    js: DEFAULT_JS,
    aspectRatio: "16:9",
    updatedAt: new Date().toISOString(),
    kind: "streak"
  };
  saveProject(newProj);
  return newProj;
}

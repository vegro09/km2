import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { getProjects, createDefaultProject } from "../utils/projectsStore";

export const Route = createFileRoute("/studio")({
  component: StudioRedirect,
});

function StudioRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    const projects = getProjects();
    if (projects.length > 0) {
      navigate({ to: "/project/$id", params: { id: projects[0].id }, replace: true });
    } else {
      const newP = createDefaultProject("Daily Streak Widget");
      navigate({ to: "/project/$id", params: { id: newP.id }, replace: true });
    }
  }, [navigate]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background text-muted-foreground">
      <div className="flex items-center gap-3">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm font-medium">Opening Motion Project Workspace...</span>
      </div>
    </div>
  );
}

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { updateUserPreferences } from "@/api/userPreferences";

interface ProjectContextValue {
  selectedProjectId: string | null;
}

const ProjectContext = createContext<ProjectContextValue>({
  selectedProjectId: null,
});

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { projectId } = useParams<{ projectId: string }>();
  const prevProjectId = useRef<string | null>(null);

  const mutation = useMutation({ mutationFn: updateUserPreferences });

  // Save lastProjectId when user enters a project
  useEffect(() => {
    if (projectId && projectId !== prevProjectId.current) {
      prevProjectId.current = projectId;
      mutation.mutate({ lastProjectId: projectId });
    }
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo<ProjectContextValue>(
    () => ({ selectedProjectId: projectId ?? null }),
    [projectId],
  );

  return (
    <ProjectContext value={value}>
      {children}
    </ProjectContext>
  );
}

export function useSelectedProject(): ProjectContextValue {
  return useContext(ProjectContext);
}

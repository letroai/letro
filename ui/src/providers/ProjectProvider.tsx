import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useParams } from "react-router-dom";

interface ProjectContextValue {
  selectedProjectId: string | null;
}

const ProjectContext = createContext<ProjectContextValue>({
  selectedProjectId: null,
});

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { projectId } = useParams<{ projectId: string }>();

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

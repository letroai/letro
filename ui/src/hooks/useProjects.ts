import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/api/queryKeys";
import { listProjects, type Project } from "@/api/projects";

export function useProjects() {
  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: queryKeys.projects.all,
    queryFn: listProjects,
    staleTime: 30 * 1000, // 30 seconds
  });

  return {
    projects: projects ?? [],
    isLoading,
  };
}

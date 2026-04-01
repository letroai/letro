import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getTeam } from "@/api/projects";
import { queryKeys } from "@/api/queryKeys";
import { cn } from "@/lib/utils";

const statusColorMap: Record<string, string> = {
  active: "bg-[var(--color-status-working)]",
  working: "bg-[var(--color-status-working)]",
  idle: "bg-[var(--color-status-idle)]",
  paused: "bg-[var(--color-status-paused)]",
  error: "bg-[var(--color-status-error)]",
};

const statusLabelMap: Record<string, string> = {
  active: "활동 중",
  working: "활동 중",
  idle: "대기 중",
  paused: "일시정지",
  error: "문제 발생",
};

export function SidebarTeamList({ projectId }: { projectId: string }) {
  const { data: team } = useQuery({
    queryKey: queryKeys.projects.team(projectId),
    queryFn: () => getTeam(projectId),
  });
  const { memberId } = useParams();

  if (!team) return null;

  const allMembers = [
    ...(team.leader ? [team.leader] : []),
    ...team.members,
  ];

  return (
    <div className="flex flex-col">
      {allMembers.map((member) => (
        <Link
          key={member.id}
          to={`/p/${projectId}/team/${member.id}`}
          className={cn(
            "flex items-center gap-2 px-3 py-1 mx-1 rounded-md text-sm transition-colors",
            memberId === member.id
              ? "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
              : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]",
          )}
        >
          <span
            className={cn(
              "w-2 h-2 rounded-full flex-shrink-0",
              statusColorMap[member.status] ?? "bg-[var(--color-status-idle)]",
            )}
            aria-label={statusLabelMap[member.status] ?? "알 수 없음"}
          />
          <span className="truncate">
            {member.teamRole === "leader" ? "팀장" : member.name}
          </span>
        </Link>
      ))}
    </div>
  );
}

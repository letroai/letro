import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { queryKeys } from "@/api/queryKeys";
import { getTeam, type TeamStructure, type TeamMember } from "@/api/projects";
import { ProjectHeader } from "@/components/layout/ProjectHeader";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { SimpleErrorMessage } from "@/components/shared/SimpleErrorMessage";
import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import {
  Crown,
  Users,
  CircleDot,
  Pause,
  AlertTriangle,
  Clock,
} from "lucide-react";

export default function Team() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const {
    data: team,
    isLoading,
    error,
    refetch,
  } = useQuery<TeamStructure>({
    queryKey: queryKeys.projects.team(projectId!),
    queryFn: () => getTeam(projectId!),
    enabled: !!projectId,
    refetchInterval: 5000,
  });

  if (isLoading) {
    return (
      <div>
        <ProjectHeader title="팀" />
        <PageSkeleton variant="content" />
      </div>
    );
  }

  if (error || !team) {
    return (
      <div>
        <ProjectHeader title="팀" />
        <SimpleErrorMessage
          message="팀 정보를 불러올 수 없어요."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const hasMembers = team.members.length > 0 || team.leader;

  return (
    <div>
      <ProjectHeader title="팀" />

      <div className="p-6 space-y-6">
        {/* Team Leader */}
        {team.leader && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide">
              팀장
            </h2>
            <TeamLeaderCard
              member={team.leader}
              onClick={() =>
                navigate(`/p/${projectId}/team/${team.leader!.id}`)
              }
            />
          </section>
        )}

        {/* Team Members */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide">
              팀원 ({team.members.length}명)
            </h2>
          </div>

          {team.members.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {team.members.map((member) => (
                <TeamMemberCard
                  key={member.id}
                  member={member}
                  onClick={() =>
                    navigate(`/p/${projectId}/team/${member.id}`)
                  }
                />
              ))}
            </div>
          ) : (
            !team.leader && (
              <EmptyState
                icon={Users}
                message="아직 팀원이 없어요. 프로젝트가 시작되면 자동으로 팀이 구성돼요."
              />
            )
          )}
        </section>
      </div>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────────── */

function TeamLeaderCard({
  member,
  onClick,
}: {
  member: TeamMember;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border border-primary-200 dark:border-primary-500/20 bg-primary-50 dark:bg-primary-900/10 p-5 hover:shadow-sm transition-all"
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30">
          <Crown className="w-5 h-5 text-primary-500" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-base font-semibold text-[var(--text-primary)]">
              {member.name}
            </p>
            <StatusBadge status={member.status} />
          </div>
          {member.currentTask && (
            <p className="text-sm text-[var(--text-secondary)] mt-1 truncate">
              {member.currentTask}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

function TeamMemberCard({
  member,
  onClick,
}: {
  member: TeamMember;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 hover:shadow-sm hover:border-[var(--border-hover)] transition-all"
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-[var(--bg-tertiary)]">
          <Users className="w-4 h-4 text-[var(--text-muted)]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
              {member.name}
            </p>
            <StatusBadge status={member.status} />
          </div>
          {member.currentTask ? (
            <p className="text-xs text-[var(--text-secondary)] mt-1 truncate">
              {member.currentTask}
            </p>
          ) : (
            <p className="text-xs text-[var(--text-muted)] mt-1">
              대기 중
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<
    string,
    { label: string; variant: "success" | "warning" | "danger" | "outline"; icon: React.ElementType }
  > = {
    active: { label: "활동 중", variant: "success", icon: CircleDot },
    working: { label: "작업 중", variant: "success", icon: CircleDot },
    paused: { label: "일시 정지", variant: "warning", icon: Pause },
    idle: { label: "대기 중", variant: "outline", icon: Clock },
    error: { label: "문제 발생", variant: "danger", icon: AlertTriangle },
    terminated: { label: "종료", variant: "outline", icon: Clock },
  };

  const fallback = { label: status, variant: "outline" as const, icon: Clock };
  const { label, variant, icon: Icon } = config[status] ?? fallback;

  return (
    <Badge variant={variant} className="shrink-0 whitespace-nowrap">
      <Icon className="w-3 h-3 mr-1" />
      {label}
    </Badge>
  );
}

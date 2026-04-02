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
import { useLocale } from "@/providers/LocaleProvider";

export default function Team() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { t } = useLocale();

  const {
    data: team,
    isLoading,
    error,
    refetch,
  } = useQuery<TeamStructure>({
    queryKey: queryKeys.projects.team(projectId!),
    queryFn: () => getTeam(projectId!),
    enabled: !!projectId,
  });

  if (isLoading) {
    return (
      <div>
        <ProjectHeader title={t("team.title")} />
        <PageSkeleton variant="content" />
      </div>
    );
  }

  if (error || !team) {
    return (
      <div>
        <ProjectHeader title={t("team.title")} />
        <SimpleErrorMessage
          message={t("team.failedLoad")}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const hasMembers = team.members.length > 0 || team.leader;

  return (
    <div>
      <ProjectHeader title={t("team.title")} />

      <div className="p-6 space-y-6">
        {/* Team Leader */}
        {team.leader && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide">
              {t("team.leader")}
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
              {t("team.members")} ({t("onboarding.members", { n: team.members.length })})
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
                message={t("team.noMembers")}
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
  const { t } = useLocale();
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
              {t("status.idle")}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useLocale();
  const config: Record<
    string,
    { key: string; variant: "success" | "warning" | "danger" | "outline"; icon: React.ElementType }
  > = {
    active: { key: "status.active", variant: "success", icon: CircleDot },
    working: { key: "status.working", variant: "success", icon: CircleDot },
    paused: { key: "status.paused", variant: "warning", icon: Pause },
    idle: { key: "status.idle", variant: "outline", icon: Clock },
    error: { key: "status.error", variant: "danger", icon: AlertTriangle },
    terminated: { key: "status.terminated", variant: "outline", icon: Clock },
  };

  const entry = config[status];
  const label = entry ? t(entry.key) : status;
  const variant = entry?.variant ?? "outline" as const;
  const Icon = entry?.icon ?? Clock;

  return (
    <Badge variant={variant} className="shrink-0 whitespace-nowrap">
      <Icon className="w-3 h-3 mr-1" />
      {label}
    </Badge>
  );
}

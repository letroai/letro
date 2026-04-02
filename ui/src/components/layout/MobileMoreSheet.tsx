import { useParams, useNavigate } from "react-router-dom";
import { useProjects } from "@/hooks/useProjects";
import {
  Target, BarChart3, Activity, Shield, Settings, User,
  FolderOpen, Plus, Check,
} from "lucide-react";
import { useLocale } from "@/providers/LocaleProvider";

interface MobileMoreSheetProps {
  open: boolean;
  onClose: () => void;
}

export function MobileMoreSheet({ open, onClose }: MobileMoreSheetProps) {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { projects } = useProjects();
  const { locale } = useLocale();

  if (!open) return null;

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg-app)] rounded-t-2xl shadow-xl safe-area-pb max-h-[80vh] overflow-y-auto"
        role="dialog"
        aria-label={locale === "ko" ? "더보기 메뉴" : "More menu"}
      >
        <div className="flex justify-center py-2">
          <div className="w-10 h-1 rounded-full bg-[var(--border-default)]" />
        </div>

        <div className="flex flex-col pb-4">
          {/* Project switcher */}
          {projects.length > 0 && (
            <>
              <div className="px-5 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                {locale === "ko" ? "프로젝트" : "Project"}
              </div>
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => handleNavigate(`/p/${project.id}/home`)}
                  className="flex items-center gap-3 px-5 py-3 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary-100 dark:bg-primary-900/30 text-primary-600 text-xs font-bold">
                    {project.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="flex-1 truncate">{project.name}</span>
                  {project.id === projectId && (
                    <Check className="w-4 h-4 text-primary-500" />
                  )}
                </button>
              ))}
              <button
                onClick={() => handleNavigate("/onboarding")}
                className="flex items-center gap-3 px-5 py-3 text-sm text-primary-500 hover:bg-[var(--bg-hover)] transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>{locale === "ko" ? "새 프로젝트 만들기" : "New Project"}</span>
              </button>
              <div className="h-px bg-[var(--border-default)] my-2 mx-4" />
            </>
          )}

          {/* Navigation items */}
          <button onClick={() => handleNavigate(`/p/${projectId}/goals`)} className="flex items-center gap-3 px-5 py-3 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors">
            <Target className="w-5 h-5 text-[var(--text-muted)]" /><span>{locale === "ko" ? "목표" : "Goals"}</span>
          </button>
          <button onClick={() => handleNavigate(`/p/${projectId}/costs`)} className="flex items-center gap-3 px-5 py-3 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors">
            <BarChart3 className="w-5 h-5 text-[var(--text-muted)]" /><span>{locale === "ko" ? "비용" : "Costs"}</span>
          </button>
          <button onClick={() => handleNavigate(`/p/${projectId}/activity`)} className="flex items-center gap-3 px-5 py-3 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors">
            <Activity className="w-5 h-5 text-[var(--text-muted)]" /><span>{locale === "ko" ? "활동 기록" : "Activity"}</span>
          </button>
          <button onClick={() => handleNavigate(`/p/${projectId}/help`)} className="flex items-center gap-3 px-5 py-3 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors">
            <Shield className="w-5 h-5 text-[var(--text-muted)]" /><span>{locale === "ko" ? "도움이 필요한 것" : "Help Needed"}</span>
          </button>
          <button onClick={() => handleNavigate(`/p/${projectId}/results`)} className="flex items-center gap-3 px-5 py-3 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors">
            <FolderOpen className="w-5 h-5 text-[var(--text-muted)]" /><span>{locale === "ko" ? "결과물" : "Results"}</span>
          </button>

          <div className="h-px bg-[var(--border-default)] my-2 mx-4" />

          <button onClick={() => handleNavigate(`/p/${projectId}/settings`)} className="flex items-center gap-3 px-5 py-3 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors">
            <Settings className="w-5 h-5 text-[var(--text-muted)]" /><span>{locale === "ko" ? "설정" : "Settings"}</span>
          </button>
          <button onClick={() => handleNavigate(`/p/${projectId}/account`)} className="flex items-center gap-3 px-5 py-3 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors">
            <User className="w-5 h-5 text-[var(--text-muted)]" /><span>{locale === "ko" ? "내 계정" : "Account"}</span>
          </button>
        </div>
      </div>
    </>
  );
}

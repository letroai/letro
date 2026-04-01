import { useParams, useLocation, Link } from "react-router-dom";
import { Home, CheckSquare, Users, FolderOpen, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { MobileMoreSheet } from "./MobileMoreSheet";

const tabs = [
  { label: "홈", icon: Home, path: "home" },
  { label: "작업", icon: CheckSquare, path: "tasks" },
  { label: "팀", icon: Users, path: "team" },
  { label: "결과", icon: FolderOpen, path: "results" },
] as const;

export function MobileBottomNav() {
  const { projectId } = useParams();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      <nav
        className="flex items-center justify-around h-14 border-t border-[var(--border-default)] bg-[var(--bg-app)] safe-area-pb"
        role="tablist"
        aria-label="주요 메뉴"
      >
        {tabs.map(({ label, icon: Icon, path }) => {
          const fullPath = `/p/${projectId}/${path}`;
          const isActive = location.pathname.startsWith(fullPath);

          return (
            <Link
              key={path}
              to={fullPath}
              role="tab"
              aria-selected={isActive}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-3 py-1 text-[11px]",
                isActive
                  ? "text-primary-600 dark:text-primary-400"
                  : "text-[var(--text-muted)]",
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </Link>
          );
        })}

        <button
          onClick={() => setMoreOpen(true)}
          className="flex flex-col items-center justify-center gap-0.5 px-3 py-1 text-[11px] text-[var(--text-muted)]"
          role="tab"
          aria-label="더보기"
        >
          <MoreHorizontal className="w-5 h-5" />
          <span>더보기</span>
        </button>
      </nav>

      <MobileMoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}

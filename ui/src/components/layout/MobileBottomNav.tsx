import { useParams, useLocation, Link } from "react-router-dom";
import { Home, CheckSquare, Users, FolderOpen, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { MobileMoreSheet } from "./MobileMoreSheet";
import { useLocale } from "@/providers/LocaleProvider";

interface TabDef {
  ko: string;
  en: string;
  icon: typeof Home;
  path: string;
}

const tabs: TabDef[] = [
  { ko: "홈", en: "Home", icon: Home, path: "home" },
  { ko: "작업", en: "Tasks", icon: CheckSquare, path: "tasks" },
  { ko: "팀", en: "Team", icon: Users, path: "team" },
  { ko: "결과", en: "Results", icon: FolderOpen, path: "results" },
];

export function MobileBottomNav() {
  const { projectId } = useParams();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const { locale } = useLocale();

  return (
    <>
      <nav
        className="flex items-center justify-around h-14 border-t border-[var(--border-default)] bg-[var(--bg-app)] safe-area-pb"
        role="tablist"
        aria-label={locale === "ko" ? "주요 메뉴" : "Main menu"}
      >
        {tabs.map(({ ko, en, icon: Icon, path }) => {
          const fullPath = `/p/${projectId}/${path}`;
          const isActive = location.pathname.startsWith(fullPath);
          const label = locale === "ko" ? ko : en;

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
          aria-label={locale === "ko" ? "더보기" : "More"}
        >
          <MoreHorizontal className="w-5 h-5" />
          <span>{locale === "ko" ? "더보기" : "More"}</span>
        </button>
      </nav>

      <MobileMoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}

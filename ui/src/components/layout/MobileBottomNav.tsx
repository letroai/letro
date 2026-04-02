import { useParams, useLocation, Link } from "react-router-dom";
import { Home, CheckSquare, Users, FolderOpen, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { MobileMoreSheet } from "./MobileMoreSheet";
import { useLocale } from "@/providers/LocaleProvider";

interface TabDef {
  labelKey: string;
  icon: typeof Home;
  path: string;
}

const tabs: TabDef[] = [
  { labelKey: "nav.home", icon: Home, path: "home" },
  { labelKey: "nav.tasks_section", icon: CheckSquare, path: "tasks" },
  { labelKey: "nav.team_section", icon: Users, path: "team" },
  { labelKey: "nav.results", icon: FolderOpen, path: "results" },
];

export function MobileBottomNav() {
  const { projectId } = useParams();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const { t } = useLocale();

  return (
    <>
      <nav
        className="flex items-center justify-around h-14 border-t border-[var(--border-default)] bg-[var(--bg-app)] safe-area-pb"
        role="tablist"
        aria-label={t("nav.mainMenu")}
      >
        {tabs.map(({ labelKey, icon: Icon, path }) => {
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
              <span>{t(labelKey)}</span>
            </Link>
          );
        })}

        <button
          onClick={() => setMoreOpen(true)}
          className="flex flex-col items-center justify-center gap-0.5 px-3 py-1 text-[11px] text-[var(--text-muted)]"
          role="tab"
          aria-label={t("nav.more")}
        >
          <MoreHorizontal className="w-5 h-5" />
          <span>{t("nav.more")}</span>
        </button>
      </nav>

      <MobileMoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}

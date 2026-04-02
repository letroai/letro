import { useParams, useLocation, Link } from "react-router-dom";
import {
  Home, Bell, HelpCircle, CheckSquare, Target,
  FolderOpen, BarChart3, Activity as ActivityIcon, Settings,
} from "lucide-react";
import { SidebarTeamList } from "./SidebarTeamList";
import { cn } from "@/lib/utils";
import { useLocale } from "@/providers/LocaleProvider";

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  badge?: number;
}

export function Sidebar() {
  const { projectId } = useParams();
  const location = useLocation();
  const { locale } = useLocale();
  const basePath = `/p/${projectId}`;

  const mainNav: NavItem[] = [
    { label: locale === "ko" ? "홈" : "Home", icon: Home, path: `${basePath}/home` },
    { label: locale === "ko" ? "알림" : "Inbox", icon: Bell, path: `${basePath}/inbox` },
    { label: locale === "ko" ? "도움이 필요한 것" : "Help Needed", icon: HelpCircle, path: `${basePath}/help` },
  ];

  const workNav: NavItem[] = [
    { label: locale === "ko" ? "작업 목록" : "Tasks", icon: CheckSquare, path: `${basePath}/tasks` },
    { label: locale === "ko" ? "목표" : "Goals", icon: Target, path: `${basePath}/goals` },
  ];

  const otherNav: NavItem[] = [
    { label: locale === "ko" ? "결과물" : "Results", icon: FolderOpen, path: `${basePath}/results` },
    { label: locale === "ko" ? "비용" : "Costs", icon: BarChart3, path: `${basePath}/costs` },
    { label: locale === "ko" ? "활동 기록" : "Activity", icon: ActivityIcon, path: `${basePath}/activity` },
    { label: locale === "ko" ? "설정" : "Settings", icon: Settings, path: `${basePath}/settings` },
  ];

  return (
    <aside
      className="flex flex-col w-[200px] h-full bg-[var(--bg-sidebar)] border-r border-[var(--border-default)] overflow-y-auto"
      role="navigation"
      aria-label={locale === "ko" ? "프로젝트 메뉴" : "Project menu"}
    >
      <div className="px-3 py-3 border-b border-[var(--border-default)]">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] truncate">
          {locale === "ko" ? "프로젝트" : "Project"}
        </h2>
      </div>

      <nav className="flex flex-col py-2">
        {mainNav.map((item) => (
          <SidebarNavItem
            key={item.path}
            item={item}
            isActive={location.pathname.startsWith(item.path)}
          />
        ))}

        <SidebarSectionLabel>{locale === "ko" ? "작업" : "Tasks"}</SidebarSectionLabel>
        {workNav.map((item) => (
          <SidebarNavItem
            key={item.path}
            item={item}
            isActive={location.pathname.startsWith(item.path)}
          />
        ))}

        <SidebarSectionLabel>{locale === "ko" ? "팀" : "Team"}</SidebarSectionLabel>
        <SidebarTeamList projectId={projectId!} />

        <SidebarSectionLabel>{locale === "ko" ? "기타" : "Other"}</SidebarSectionLabel>
        {otherNav.map((item) => (
          <SidebarNavItem
            key={item.path}
            item={item}
            isActive={location.pathname.startsWith(item.path)}
          />
        ))}
      </nav>
    </aside>
  );
}

function SidebarNavItem({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.path}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 mx-1 rounded-md text-sm transition-colors",
        isActive
          ? "bg-primary-100 text-primary-700 font-medium dark:bg-primary-900/30 dark:text-primary-300"
          : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]",
      )}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="truncate">{item.label}</span>
      {item.badge !== undefined && item.badge > 0 && (
        <span className="ml-auto text-xs bg-danger-500 text-white rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

function SidebarSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
      {children}
    </div>
  );
}

import { useParams, useLocation, Link } from "react-router-dom";
import {
  Home, Bell, HelpCircle, CheckSquare, Target,
  FolderOpen, BarChart3, Activity as ActivityIcon, Settings,
} from "lucide-react";
import { SidebarTeamList } from "./SidebarTeamList";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  badge?: number;
}

export function Sidebar() {
  const { projectId } = useParams();
  const location = useLocation();
  const basePath = `/p/${projectId}`;

  const mainNav: NavItem[] = [
    { label: "홈", icon: Home, path: `${basePath}/home` },
    { label: "알림", icon: Bell, path: `${basePath}/inbox` },
    { label: "도움이 필요한 것", icon: HelpCircle, path: `${basePath}/help` },
  ];

  const workNav: NavItem[] = [
    { label: "작업 목록", icon: CheckSquare, path: `${basePath}/tasks` },
    { label: "목표", icon: Target, path: `${basePath}/goals` },
  ];

  const otherNav: NavItem[] = [
    { label: "결과물", icon: FolderOpen, path: `${basePath}/results` },
    { label: "비용", icon: BarChart3, path: `${basePath}/costs` },
    { label: "활동 기록", icon: ActivityIcon, path: `${basePath}/activity` },
    { label: "설정", icon: Settings, path: `${basePath}/settings/style` },
  ];

  return (
    <aside
      className="flex flex-col w-[200px] h-full bg-[var(--bg-sidebar)] border-r border-[var(--border-default)] overflow-y-auto"
      role="navigation"
      aria-label="프로젝트 메뉴"
    >
      <div className="px-3 py-3 border-b border-[var(--border-default)]">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] truncate">
          프로젝트
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

        <SidebarSectionLabel>작업</SidebarSectionLabel>
        {workNav.map((item) => (
          <SidebarNavItem
            key={item.path}
            item={item}
            isActive={location.pathname.startsWith(item.path)}
          />
        ))}

        <SidebarSectionLabel>팀</SidebarSectionLabel>
        <SidebarTeamList projectId={projectId!} />

        <SidebarSectionLabel>기타</SidebarSectionLabel>
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

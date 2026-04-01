import { Outlet } from "react-router-dom";
import { ProjectRail } from "./ProjectRail";
import { Sidebar } from "./Sidebar";
import { MobileBottomNav } from "./MobileBottomNav";
import { useMediaQuery } from "@/hooks/useMediaQuery";

export function AppShell() {
  const isMobile = useMediaQuery("(max-width: 767px)");

  if (isMobile) {
    return (
      <div className="flex flex-col h-dvh">
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden">
      <ProjectRail />
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-[var(--bg-app)]">
        <Outlet />
      </main>
    </div>
  );
}

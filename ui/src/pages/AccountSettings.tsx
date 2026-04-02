// ui/src/pages/AccountSettings.tsx
import { ProjectHeader } from "@/components/layout/ProjectHeader";
import { useAuth, useLogout } from "@/hooks/useAuth";

export default function AccountSettings() {
  const { user } = useAuth();
  const logoutMutation = useLogout();

  return (
    <div>
      <ProjectHeader title="내 계정" />

      <div className="p-6 max-w-lg flex flex-col gap-6">
        {/* Profile card */}
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-6 flex items-center gap-4">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-full bg-primary-500 flex items-center justify-center text-white text-xl font-bold shrink-0 select-none">
            {user?.displayName?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-[var(--text-primary)] truncate">
              {user?.displayName ?? "사용자"}
            </p>
            <p className="text-sm text-[var(--text-muted)] truncate">
              {user?.email ?? ""}
            </p>
          </div>
        </div>

        {/* Logout */}
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-6 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">계정 관리</h3>
          <p className="text-sm text-[var(--text-muted)]">
            로그아웃하면 현재 기기에서 Letro에 접근할 수 없어요.
          </p>
          <button
            type="button"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            className={[
              "self-start rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600",
              "hover:bg-red-50 hover:border-red-400 transition-colors",
              "dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950",
              "disabled:opacity-60 disabled:cursor-not-allowed",
            ].join(" ")}
          >
            {logoutMutation.isPending ? "로그아웃 중..." : "로그아웃"}
          </button>
        </div>
      </div>
    </div>
  );
}

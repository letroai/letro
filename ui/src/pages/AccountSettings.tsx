// ui/src/pages/AccountSettings.tsx
import { ProjectHeader } from "@/components/layout/ProjectHeader";
import { useAuth, useLogout } from "@/hooks/useAuth";
import { useLocale } from "@/providers/LocaleProvider";

export default function AccountSettings() {
  const { user } = useAuth();
  const { t } = useLocale();
  const logoutMutation = useLogout();

  return (
    <div>
      <ProjectHeader title={t("nav.account")} />

      <div className="p-6 max-w-lg flex flex-col gap-6">
        {/* Profile card */}
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-6 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary-500 flex items-center justify-center text-white text-xl font-bold shrink-0 select-none">
            {user?.displayName?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-[var(--text-primary)] truncate">
              {user?.displayName ?? (t("nav.account"))}
            </p>
            <p className="text-sm text-[var(--text-muted)] truncate">
              {user?.email ?? ""}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

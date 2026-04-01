import { useParams, useNavigate } from "react-router-dom";
import { Target, BarChart3, Activity, Shield, Sliders, Settings, User } from "lucide-react";

interface MobileMoreSheetProps {
  open: boolean;
  onClose: () => void;
}

export function MobileMoreSheet({ open, onClose }: MobileMoreSheetProps) {
  const { projectId } = useParams();
  const navigate = useNavigate();

  if (!open) return null;

  const items = [
    { label: "목표", icon: Target, path: `/p/${projectId}/goals` },
    { label: "비용", icon: BarChart3, path: `/p/${projectId}/costs` },
    { label: "활동 기록", icon: Activity, path: `/p/${projectId}/activity` },
    { label: "도움이 필요한 것", icon: Shield, path: `/p/${projectId}/help` },
    { divider: true as const },
    { label: "작업 방식", icon: Sliders, path: `/p/${projectId}/settings/style` },
    { divider: true as const },
    { label: "내 계정", icon: User, path: `/p/${projectId}/account` },
  ];

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
        className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg-app)] rounded-t-2xl shadow-xl safe-area-pb"
        role="dialog"
        aria-label="더보기 메뉴"
      >
        <div className="flex justify-center py-2">
          <div className="w-10 h-1 rounded-full bg-[var(--border-default)]" />
        </div>
        <div className="flex flex-col pb-4">
          {items.map((item, idx) => {
            if ("divider" in item) {
              return <div key={idx} className="h-px bg-[var(--border-default)] my-2 mx-4" />;
            }
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => handleNavigate(item.path)}
                className="flex items-center gap-3 px-5 py-3 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
              >
                <Icon className="w-5 h-5 text-[var(--text-muted)]" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export default function AuthPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // In local_trusted mode, session exists automatically so redirect immediately
    if (user) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-dvh">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary-500 animate-pulse" />
          <p className="text-sm text-[var(--text-muted)]">연결 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-dvh">
      <div className="flex flex-col items-center gap-6 max-w-sm text-center">
        <div className="w-12 h-12 rounded-xl bg-primary-500 flex items-center justify-center text-white text-xl font-bold">
          L
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Letro</h1>
        <p className="text-[var(--text-secondary)]">
          아이디어 하나면 됩니다. 나머지는 Letro가 알아서 합니다.
        </p>
        <p className="text-sm text-[var(--text-muted)]">
          서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.
        </p>
      </div>
    </div>
  );
}

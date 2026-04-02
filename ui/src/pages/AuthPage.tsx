// ui/src/pages/AuthPage.tsx
// Login / Sign-up page.
// Displays a single card that toggles between two modes:
//   - "login"  : email + password
//   - "signup" : email + password + displayName
//
// In local_trusted mode the server always returns a session, so useAuth()
// sets user = truthy and the effect below redirects to "/".
// In authenticated mode the forms are shown to unauthenticated visitors.

import { useState, useEffect, type ChangeEvent, type FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth, useLogin, useRegister } from "@/hooks/useAuth";
import { ApiError } from "@/api/client";

// ===== Field validation =====

interface FieldErrors {
  email?: string;
  password?: string;
  displayName?: string;
}

function validateLogin(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!email.trim()) {
    errors.email = "이메일을 입력해주세요";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "이메일 형식이 올바르지 않아요 (예: name@example.com)";
  }
  if (!password) {
    errors.password = "비밀번호를 입력해주세요";
  }
  return errors;
}

function validateSignup(
  email: string,
  password: string,
  displayName: string,
): FieldErrors {
  const errors = validateLogin(email, password);
  if (password && password.length < 8) {
    errors.password = "비밀번호는 8자 이상이어야 해요";
  }
  if (!displayName.trim()) {
    errors.displayName = "닉네임을 입력해주세요";
  } else if (displayName.trim().length < 2) {
    errors.displayName = "닉네임은 2자 이상이어야 해요";
  }
  return errors;
}

function hasErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

// ===== Sub-components =====

function FormField({
  id,
  label,
  type,
  value,
  placeholder,
  error,
  autoComplete,
  onChange,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  placeholder: string;
  error?: string;
  autoComplete?: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-[var(--text-secondary)]">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={onChange}
        className={[
          "w-full rounded-lg border px-4 py-2.5 text-sm",
          "bg-[var(--surface-primary)] text-[var(--text-primary)]",
          "placeholder:text-[var(--text-muted)]",
          "outline-none transition-colors",
          error
            ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200"
            : "border-[var(--border-default)] focus:border-primary-500 focus:ring-2 focus:ring-primary-100",
        ].join(" ")}
      />
      {error && (
        <p role="alert" className="text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}

function PasswordStrengthBar({ password }: { password: string }) {
  if (!password) return null;

  let strength = 0;
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;

  const labels = ["", "매우 약함", "약함", "보통", "강함", "매우 강함"];
  const colors = ["", "bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-green-400", "bg-emerald-500"];

  return (
    <div className="flex items-center gap-2 mt-1" aria-label={`비밀번호 강도: ${labels[strength]}`}>
      <div className="flex gap-1 flex-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={[
              "h-1 flex-1 rounded-full transition-colors duration-300",
              i < strength ? colors[strength] : "bg-[var(--border-default)]",
            ].join(" ")}
          />
        ))}
      </div>
      <span className="text-xs text-[var(--text-muted)] w-16 text-right">
        {labels[strength]}
      </span>
    </div>
  );
}

// ===== Main component =====

export default function AuthPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const loginMutation = useLogin();
  const registerMutation = useRegister();

  // Mode toggle
  const [mode, setMode] = useState<"login" | "signup">("login");

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Validation + server errors
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
      navigate(from ?? "/", { replace: true });
    }
  }, [user, navigate, location.state]);

  // Reset form when switching modes
  function switchMode(next: "login" | "signup") {
    setMode(next);
    setFieldErrors({});
    setServerError(null);
    setPassword("");
    setShowPassword(false);
  }

  // Extract a human-readable error from an API error body
  function extractServerError(err: unknown): string {
    if (err instanceof ApiError) {
      const body = err.body as { error?: string } | null;
      if (body?.error) return body.error;
      if (err.status === 409) return "이미 가입된 이메일이에요";
      if (err.status === 401) return "이메일 또는 비밀번호가 올바르지 않아요";
      if (err.status >= 500) return "서버에 문제가 생겼어요. 잠시 후 다시 시도해주세요";
    }
    return "문제가 생겼어요. 잠시 후 다시 시도해주세요";
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError(null);

    // Client-side validation
    const errors =
      mode === "login"
        ? validateLogin(email, password)
        : validateSignup(email, password, displayName);

    if (hasErrors(errors)) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    try {
      if (mode === "login") {
        await loginMutation.mutateAsync({ email: email.trim(), password });
      } else {
        await registerMutation.mutateAsync({
          email: email.trim(),
          password,
          displayName: displayName.trim(),
        });
      }
      // Success → useEffect will redirect once user state is set
    } catch (err) {
      setServerError(extractServerError(err));
    }
  }

  const isPending = loginMutation.isPending || registerMutation.isPending;

  // ===== Loading state =====
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-dvh">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary-500 animate-pulse" />
          <p className="text-sm text-[var(--text-muted)]">연결 중...</p>
        </div>
      </div>
    );
  }

  // ===== Auth form =====
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--surface-secondary)] px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo + tagline */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-500 text-white text-2xl font-bold shadow-lg mb-4">
            L
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Letro</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            아이디어 하나면 됩니다. 나머지는 Letro가 알아서 합니다.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] shadow-sm px-8 py-8">
          {/* Tab toggle */}
          <div className="flex rounded-lg bg-[var(--surface-secondary)] p-1 mb-6">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={[
                "flex-1 rounded-md py-2 text-sm font-medium transition-all duration-200",
                mode === "login"
                  ? "bg-[var(--surface-primary)] text-[var(--text-primary)] shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
              ].join(" ")}
            >
              로그인
            </button>
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className={[
                "flex-1 rounded-md py-2 text-sm font-medium transition-all duration-200",
                mode === "signup"
                  ? "bg-[var(--surface-primary)] text-[var(--text-primary)] shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
              ].join(" ")}
            >
              회원가입
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            {/* Nickname — signup only */}
            {mode === "signup" && (
              <FormField
                id="displayName"
                label="닉네임"
                type="text"
                value={displayName}
                placeholder="어떻게 불러드릴까요?"
                error={fieldErrors.displayName}
                autoComplete="nickname"
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  if (fieldErrors.displayName) setFieldErrors((p) => ({ ...p, displayName: undefined }));
                }}
              />
            )}

            {/* Email */}
            <FormField
              id="email"
              label="이메일"
              type="email"
              value={email}
              placeholder="name@example.com"
              error={fieldErrors.email}
              autoComplete="email"
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
              }}
            />

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password"
                className="text-sm font-medium text-[var(--text-secondary)]"
              >
                비밀번호
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  placeholder={mode === "signup" ? "8자 이상 입력해주세요" : "비밀번호 입력"}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
                  }}
                  className={[
                    "w-full rounded-lg border px-4 py-2.5 pr-10 text-sm",
                    "bg-[var(--surface-primary)] text-[var(--text-primary)]",
                    "placeholder:text-[var(--text-muted)] outline-none transition-colors",
                    fieldErrors.password
                      ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                      : "border-[var(--border-default)] focus:border-primary-500 focus:ring-2 focus:ring-primary-100",
                  ].join(" ")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                >
                  {showPassword ? (
                    // Eye-off icon
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    // Eye icon
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {fieldErrors.password && (
                <p role="alert" className="text-xs text-red-500">
                  {fieldErrors.password}
                </p>
              )}
              {mode === "signup" && <PasswordStrengthBar password={password} />}
            </div>

            {/* Server error banner */}
            {serverError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
              >
                <svg
                  className="mt-0.5 shrink-0"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {serverError}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isPending}
              className={[
                "mt-2 w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-all duration-200",
                "bg-primary-500 hover:bg-primary-600 active:scale-[0.98]",
                "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
                "disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100",
              ].join(" ")}
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    aria-hidden
                  >
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  {mode === "login" ? "로그인 중..." : "가입 중..."}
                </span>
              ) : mode === "login" ? (
                "로그인"
              ) : (
                "시작하기"
              )}
            </button>
          </form>

          {/* Mode switch link */}
          <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
            {mode === "login" ? (
              <>
                아직 계정이 없으신가요?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("signup")}
                  className="font-medium text-primary-500 hover:text-primary-600 hover:underline"
                >
                  회원가입
                </button>
              </>
            ) : (
              <>
                이미 계정이 있으신가요?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="font-medium text-primary-500 hover:text-primary-600 hover:underline"
                >
                  로그인
                </button>
              </>
            )}
          </p>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-[var(--text-muted)]">
          계속 진행하면 Letro의 서비스 이용 약관과 개인정보 처리 방침에 동의하는 것으로 간주됩니다.
        </p>
      </div>
    </div>
  );
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import {
  getWorkStyle,
  updateWorkStyle,
  type WorkStyleValue,
  type WorkStyleConfig,
} from "@/api/workStyle";
import { ProjectHeader } from "@/components/layout/ProjectHeader";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { SimpleErrorMessage } from "@/components/shared/SimpleErrorMessage";
import { useLocale } from "@/providers/LocaleProvider";
import { cn } from "@/lib/utils";
import {
  Zap,
  Scale,
  Shield,
  Check,
  Loader2,
} from "lucide-react";

const WORK_STYLE_QUERY_KEY = (projectId: string) => [
  "workStyle",
  projectId,
];

const WORK_STYLE_OPTIONS: {
  value: WorkStyleValue;
  label: { ko: string; en: string };
  description: { ko: string; en: string };
  icon: React.ElementType;
}[] = [
  {
    value: "autonomous",
    label: { ko: "자율적으로", en: "Autonomous" },
    description: {
      ko: "팀이 스스로 판단하고 진행해요. 중요한 것만 가끔 물어봐요. 빠르게 진행하고 싶을 때 좋아요.",
      en: "The team decides and proceeds on its own. Only asks about important things occasionally. Great when you want fast progress.",
    },
    icon: Zap,
  },
  {
    value: "balanced",
    label: { ko: "균형 있게", en: "Balanced" },
    description: {
      ko: "중요한 결정은 물어보고, 작은 일은 알아서 해요. 대부분의 경우 이 방식이 좋아요.",
      en: "Asks about important decisions, handles small tasks on its own. Recommended for most cases.",
    },
    icon: Scale,
  },
  {
    value: "cautious",
    label: { ko: "신중하게", en: "Cautious" },
    description: {
      ko: "대부분의 작업 전에 확인을 요청해요. 꼼꼼하게 확인하고 싶을 때 좋아요.",
      en: "Requests confirmation before most tasks. Great when you want to review things carefully.",
    },
    icon: Shield,
  },
];

export default function WorkStyle() {
  const { projectId } = useParams<{ projectId: string }>();
  const { locale } = useLocale();
  const queryClient = useQueryClient();

  const {
    data: config,
    isLoading,
    error,
    refetch,
  } = useQuery<WorkStyleConfig>({
    queryKey: WORK_STYLE_QUERY_KEY(projectId!),
    queryFn: () => getWorkStyle(projectId!),
    enabled: !!projectId,
  });

  const mutation = useMutation({
    mutationFn: (style: WorkStyleValue) =>
      updateWorkStyle(projectId!, style),
    onSuccess: (updated) => {
      queryClient.setQueryData(
        WORK_STYLE_QUERY_KEY(projectId!),
        updated,
      );
    },
  });

  if (isLoading) {
    return (
      <div>
        <ProjectHeader title={locale === "ko" ? "작업 방식" : "Work Style"} />
        <PageSkeleton variant="content" />
      </div>
    );
  }

  if (error || !config) {
    return (
      <div>
        <ProjectHeader title={locale === "ko" ? "작업 방식" : "Work Style"} />
        <SimpleErrorMessage
          message={locale === "ko" ? "작업 방식 설정을 불러올 수 없어요." : "Failed to load work style settings."}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const currentStyle = mutation.data?.workStyle ?? config.workStyle;

  return (
    <div>
      <ProjectHeader title={locale === "ko" ? "작업 방식" : "Work Style"} />

      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            {locale === "ko" ? "팀의 작업 방식을 선택하세요" : "Choose how your team works"}
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            {locale === "ko"
              ? "팀이 얼마나 자주 확인을 요청할지 결정해요. 언제든 변경할 수 있어요."
              : "Decide how often the team asks for confirmation. You can change this anytime."}
          </p>
        </div>

        <div className="space-y-3">
          {WORK_STYLE_OPTIONS.map((option) => {
            const isSelected = currentStyle === option.value;
            const Icon = option.icon;

            return (
              <button
                key={option.value}
                onClick={() => mutation.mutate(option.value)}
                disabled={mutation.isPending}
                className={cn(
                  "w-full text-left rounded-xl border p-5 transition-all",
                  isSelected
                    ? "border-primary-500 bg-primary-50 dark:bg-primary-900/10 ring-2 ring-primary-500/20"
                    : "border-[var(--border-default)] bg-[var(--bg-secondary)] hover:border-[var(--border-hover)] hover:shadow-sm",
                )}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-lg shrink-0",
                      isSelected
                        ? "bg-primary-100 dark:bg-primary-900/30"
                        : "bg-[var(--bg-tertiary)]",
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-5 h-5",
                        isSelected
                          ? "text-primary-500"
                          : "text-[var(--text-muted)]",
                      )}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3
                        className={cn(
                          "text-base font-semibold",
                          isSelected
                            ? "text-primary-600 dark:text-primary-400"
                            : "text-[var(--text-primary)]",
                        )}
                      >
                        {locale === "ko" ? option.label.ko : option.label.en}
                      </h3>
                      {isSelected && (
                        <Check className="w-4 h-4 text-primary-500" />
                      )}
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">
                      {locale === "ko" ? option.description.ko : option.description.en}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {mutation.isPending && (
          <div className="flex items-center justify-center gap-2 text-sm text-[var(--text-muted)]">
            <Loader2 className="w-4 h-4 animate-spin" />
            {locale === "ko" ? "저장 중..." : "Saving..."}
          </div>
        )}

        {mutation.error && (
          <SimpleErrorMessage
            message={locale === "ko" ? "저장에 실패했어요. 다시 시도해 주세요." : "Failed to save. Please try again."}
            onRetry={() => mutation.reset()}
          />
        )}

        {mutation.isSuccess && !mutation.isPending && (
          <p className="text-sm text-success-500 text-center">
            {locale === "ko" ? "저장되었어요!" : "Saved!"}
          </p>
        )}
      </div>
    </div>
  );
}

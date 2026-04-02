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
  labelKey: string;
  descriptionKey: string;
  icon: React.ElementType;
}[] = [
  {
    value: "autonomous",
    labelKey: "workStyle.autonomous",
    descriptionKey: "workStyle.autonomousDesc",
    icon: Zap,
  },
  {
    value: "balanced",
    labelKey: "workStyle.balanced",
    descriptionKey: "workStyle.balancedDesc",
    icon: Scale,
  },
  {
    value: "cautious",
    labelKey: "workStyle.cautious",
    descriptionKey: "workStyle.cautiousDesc",
    icon: Shield,
  },
];

export default function WorkStyle() {
  const { projectId } = useParams<{ projectId: string }>();
  const { t } = useLocale();
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
        <ProjectHeader title={t("workStyle.title")} />
        <PageSkeleton variant="content" />
      </div>
    );
  }

  if (error || !config) {
    return (
      <div>
        <ProjectHeader title={t("workStyle.title")} />
        <SimpleErrorMessage
          message={t("workStyle.failedLoad")}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const currentStyle = mutation.data?.workStyle ?? config.workStyle;

  return (
    <div>
      <ProjectHeader title={t("workStyle.title")} />

      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            {t("workStyle.chooseHeading")}
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            {t("workStyle.chooseDescription")}
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
                        {t(option.labelKey)}
                      </h3>
                      {isSelected && (
                        <Check className="w-4 h-4 text-primary-500" />
                      )}
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">
                      {t(option.descriptionKey)}
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
            {t("workStyle.saving")}
          </div>
        )}

        {mutation.error && (
          <SimpleErrorMessage
            message={t("workStyle.saveFailed")}
            onRetry={() => mutation.reset()}
          />
        )}

        {mutation.isSuccess && !mutation.isPending && (
          <p className="text-sm text-success-500 text-center">
            {t("workStyle.saved")}
          </p>
        )}
      </div>
    </div>
  );
}

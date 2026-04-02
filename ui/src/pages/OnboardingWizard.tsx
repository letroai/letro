import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  createIdea,
  getIdea,
  activateIdea,
  type Idea,
} from "@/api/ideas";
import { getAITools, type AIToolsStatus } from "@/api/aiTools";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { SimpleErrorMessage } from "@/components/shared/SimpleErrorMessage";
import {
  Lightbulb,
  Sparkles,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Bot,
  Terminal,
  Copy,
  Check,
} from "lucide-react";

const IDEA_EXAMPLES = [
  "우리 동네 맛집 추천 웹사이트 만들어줘",
  "매일 운동 기록할 수 있는 앱 만들어줘",
  "팀 회의록을 자동으로 정리해주는 도구",
  "고객 문의를 자동으로 분류하고 답변해주는 시스템",
  "인스타그램 같은 사진 공유 사이트",
];

type WizardStep = "input" | "analyzing" | "review";

export default function OnboardingWizard() {
  const navigate = useNavigate();
  const [rawInput, setRawInput] = useState("");
  const [step, setStep] = useState<WizardStep>("input");
  const [ideaId, setIdeaId] = useState<string | null>(null);
  const [locale, setLocale] = useState<"ko" | "en">("en");
  const [copiedGuide, setCopiedGuide] = useState<string | null>(null);
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null);

  // Check AI tools status
  const { data: aiTools, isLoading: aiToolsLoading } = useQuery<AIToolsStatus>({
    queryKey: ["ai-tools"],
    queryFn: getAITools,
    staleTime: 60_000,
  });

  const createMutation = useMutation({
    mutationFn: createIdea,
    onSuccess: (idea) => {
      setIdeaId(idea.id);
      setStep("analyzing");
    },
  });

  const { data: idea } = useQuery<Idea>({
    queryKey: ["ideas", ideaId],
    queryFn: () => getIdea(ideaId!),
    enabled: !!ideaId && step === "analyzing",
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data && data.status !== "pending") return false;
      return 2000;
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => activateIdea(id, { confirmed: true, locale }),
    onSuccess: (result) => {
      navigate(`/p/${result.projectId}/home`);
    },
  });

  // Transition to review when idea is analyzed
  useEffect(() => {
    if (step === "analyzing" && idea && (idea.status === "analyzed" || idea.status === "structured")) {
      // Detect locale from idea structured data
      const detectedLocale = (idea.structured as Record<string, unknown> | null)?.locale as string;
      if (detectedLocale === "ko" || detectedLocale === "en") {
        setLocale(detectedLocale);
      }
      setStep("review");
    }
  }, [step, idea]);

  const handleSubmit = useCallback(() => {
    if (!rawInput.trim()) return;
    createMutation.mutate({ raw_text: rawInput.trim(), locale });
  }, [rawInput, locale, createMutation]);

  const handleExampleClick = useCallback((example: string) => {
    setRawInput(example);
  }, []);

  const handleActivate = useCallback(() => {
    if (!ideaId) return;
    activateMutation.mutate(ideaId);
  }, [ideaId, activateMutation]);

  const handleCopyGuide = useCallback((guide: string) => {
    navigator.clipboard.writeText(guide);
    setCopiedGuide(guide);
    setTimeout(() => setCopiedGuide(null), 2000);
  }, []);

  if (aiToolsLoading) return <PageSkeleton variant="full" />;

  if (createMutation.error) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-4">
        <SimpleErrorMessage
          message="아이디어 분석에 실패했어요"
          onRetry={() => createMutation.reset()}
        />
      </div>
    );
  }

  if (activateMutation.error) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-4">
        <SimpleErrorMessage
          message="프로젝트 생성에 실패했어요"
          onRetry={() => activateMutation.reset()}
        />
      </div>
    );
  }

  const isReady = aiTools?.ready ?? false;
  const availableTools = aiTools?.tools.filter((t) => t.installed) ?? [];
  const unavailableTools = aiTools?.tools.filter((t) => !t.installed) ?? [];

  // Determine active tool: user selection > recommended > first available
  const activeTool = availableTools.find((t) => t.id === selectedToolId)
    ?? aiTools?.recommended
    ?? availableTools[0]
    ?? null;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--bg-app)] p-4">
      <div className="w-full max-w-lg space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-100 dark:bg-primary-900/30">
            <Lightbulb className="w-7 h-7 text-primary-500" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            {locale === "ko" ? "어떤 걸 만들고 싶으세요?" : "What do you want to build?"}
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {locale === "ko" ? "아이디어를 자유롭게 적어주세요. 나머지는 저희가 알아서 할게요." : "Just describe your idea. We'll handle the rest."}
          </p>
        </div>

        {/* AI tools status */}
        {step === "input" && (
          <>
            {/* Show available AI tools */}
            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-[var(--text-muted)]" />
                <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
                  AI 도구
                </span>
              </div>

              {availableTools.length > 0 && (
                <div className="space-y-2">
                  {availableTools.map((tool) => {
                    const isSelected = activeTool?.id === tool.id;
                    const isSelectable = availableTools.length > 1;
                    return (
                      <button
                        key={tool.id}
                        type="button"
                        onClick={() => isSelectable && setSelectedToolId(tool.id)}
                        disabled={!isSelectable}
                        className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                          isSelected
                            ? "bg-primary-50 dark:bg-primary-500/10 border-2 border-primary-500"
                            : "bg-success-50 dark:bg-success-500/10 border-2 border-transparent hover:border-[var(--border-default)]"
                        } ${isSelectable ? "cursor-pointer" : "cursor-default"}`}
                      >
                        <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${isSelected ? "text-primary-500" : "text-success-500"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--text-primary)]">
                            {tool.name}
                            {isSelected && (
                              <span className="ml-2 text-xs text-primary-600 bg-primary-100 dark:bg-primary-500/20 px-1.5 py-0.5 rounded">
                                {availableTools.length > 1 ? "선택됨" : "사용 중"}
                              </span>
                            )}
                            {!isSelected && aiTools?.recommended?.id === tool.id && (
                              <span className="ml-2 text-xs text-[var(--text-muted)] bg-[var(--bg-hover)] px-1.5 py-0.5 rounded">
                                추천
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-[var(--text-muted)]">
                            {tool.version} · {tool.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                  {availableTools.length > 1 && (
                    <p className="text-xs text-[var(--text-muted)] text-center">
                      사용할 AI 도구를 선택하세요
                    </p>
                  )}
                </div>
              )}

              {/* Show warning + setup guide when no AI tools are installed */}
              {!isReady && (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 rounded-lg bg-warning-50 dark:bg-warning-500/10 px-3 py-3">
                    <AlertTriangle className="w-5 h-5 text-warning-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        AI 도구가 설치되어 있지 않아요
                      </p>
                      <p className="text-xs text-[var(--text-secondary)] mt-1">
                        아이디어를 실현하려면 AI 도구가 필요합니다. 아래 중 하나를 설치해주세요.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {unavailableTools.map((tool) => (
                      <div
                        key={tool.id}
                        className="rounded-lg border border-[var(--border-default)] p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-[var(--text-primary)]">
                            {tool.name}
                          </p>
                          <span className="text-xs text-[var(--text-muted)]">{tool.description}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 flex items-center gap-2 rounded-md bg-[var(--bg-hover)] px-3 py-1.5 font-mono text-xs text-[var(--text-secondary)]">
                            <Terminal className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">{tool.setupGuide}</span>
                          </div>
                          <button
                            onClick={() => handleCopyGuide(tool.setupGuide)}
                            className="p-1.5 rounded-md hover:bg-[var(--bg-hover)] transition-colors"
                            title="복사"
                          >
                            {copiedGuide === tool.setupGuide ? (
                              <Check className="w-4 h-4 text-success-500" />
                            ) : (
                              <Copy className="w-4 h-4 text-[var(--text-muted)]" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="text-xs text-[var(--text-muted)] text-center">
                    설치 후 이 페이지를 새로고침하세요
                  </p>
                </div>
              )}
            </div>

            {/* Language selector */}
            {isReady && (
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-[var(--text-muted)]">Language</span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setLocale("ko")}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      locale === "ko" ? "bg-primary-500 text-white" : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                    }`}
                  >🇰🇷 한국어</button>
                  <button
                    onClick={() => setLocale("en")}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      locale === "en" ? "bg-primary-500 text-white" : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                    }`}
                  >🇺🇸 English</button>
                </div>
              </div>
            )}

            {/* Idea input — only enabled when AI tools are available */}
            {isReady && (
              <>
                <div className="space-y-3">
                  <textarea
                    value={rawInput}
                    onChange={(e) => setRawInput(e.target.value)}
                    placeholder={locale === "ko" ? "예: 우리 회사 직원들이 점심 메뉴를 투표할 수 있는 앱" : "e.g., Build a team lunch voting app for our company"}
                    rows={4}
                    className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-4 py-3 text-base text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-none transition-colors"
                    autoFocus
                  />
                  <button
                    onClick={handleSubmit}
                    disabled={!rawInput.trim() || createMutation.isPending}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary-500 px-6 py-3 text-base font-semibold text-white hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {locale === "ko" ? "분석 중..." : "Analyzing..."}
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        {locale === "ko" ? "분석하기" : "Analyze"}
                      </>
                    )}
                  </button>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
                    이런 아이디어는 어때요?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {IDEA_EXAMPLES.map((example) => (
                      <button
                        key={example}
                        onClick={() => handleExampleClick(example)}
                        className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {step === "analyzing" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
            <p className="text-base font-medium text-[var(--text-primary)]">
              {activeTool?.name ?? "AI"}가 아이디어를 분석하고 있어요...
            </p>
            <p className="text-sm text-[var(--text-secondary)]">
              잠시만 기다려 주세요. 보통 10~20초면 끝나요.
            </p>
          </div>
        )}

        {step === "review" && idea && (
          <div className="space-y-6">
            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5 space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-success-500" />
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  분석 완료
                </h2>
              </div>

              {(() => {
                const s = idea.structured as Record<string, unknown> | null | undefined;
                const goal = s?.["goal"] as { title?: string; description?: string } | undefined;
                const teamComp = s?.["team_composition"] as { members?: unknown[] } | undefined;
                const estDays = s?.["estimated_duration_days"] as number | undefined;
                const estCost = s?.["estimated_cost_usd"] as number | undefined;
                return (
                  <>
                    {goal?.title && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-[var(--text-muted)]">프로젝트 이름</p>
                        <p className="text-base font-semibold text-[var(--text-primary)]">{goal.title}</p>
                      </div>
                    )}
                    {goal?.description && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-[var(--text-muted)]">목표 요약</p>
                        <p className="text-sm text-[var(--text-secondary)] whitespace-pre-line">{goal.description}</p>
                      </div>
                    )}
                    {(estDays || estCost) && (
                      <div className="flex gap-4">
                        {estDays && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-[var(--text-muted)]">예상 기간</p>
                            <p className="text-sm font-semibold text-[var(--text-primary)]">약 {estDays}일</p>
                          </div>
                        )}
                        {estCost && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-[var(--text-muted)]">예상 비용</p>
                            <p className="text-sm font-semibold text-[var(--text-primary)]">약 ${estCost}</p>
                          </div>
                        )}
                        {teamComp?.members && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-[var(--text-muted)]">팀원</p>
                            <p className="text-sm font-semibold text-[var(--text-primary)]">{teamComp.members.length}명</p>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}

              <div className="space-y-1">
                <p className="text-xs font-medium text-[var(--text-muted)]">원래 아이디어</p>
                <p className="text-sm text-[var(--text-secondary)] italic">
                  &ldquo;{idea.rawText}&rdquo;
                </p>
              </div>

              {/* Language selector */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-[var(--text-muted)]">프로젝트 언어</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setLocale("ko")}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      locale === "ko"
                        ? "bg-primary-500 text-white"
                        : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                    }`}
                  >
                    🇰🇷 한국어
                  </button>
                  <button
                    onClick={() => setLocale("en")}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      locale === "en"
                        ? "bg-primary-500 text-white"
                        : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                    }`}
                  >
                    🇺🇸 English
                  </button>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  {locale === "ko" ? "팀원들이 한국어로 작업하고 보고해요" : "Team members will work and report in English"}
                </p>
              </div>

              {/* Show selected AI tool */}
              {activeTool && (
                <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-default)]">
                  <Bot className="w-4 h-4 text-[var(--text-muted)]" />
                  <span className="text-xs text-[var(--text-muted)]">
                    {activeTool.name} {activeTool.version}로 작업합니다
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={handleActivate}
              disabled={activateMutation.isPending}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary-500 px-6 py-3 text-base font-semibold text-white hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {activateMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  프로젝트 만드는 중...
                </>
              ) : (
                <>
                  시작하기
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

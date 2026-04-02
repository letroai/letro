// server/src/lib/i18n.ts
// Internationalization for project-level locale.
// All agent-generated text (prompts, commit messages, activity, PROGRESS.md) uses these.

export type Locale = "ko" | "en";

const KOREAN_RE = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/g;

/** Detects locale from text. Korean chars → "ko", else "en". */
export function detectLocale(text: string): Locale {
  const koreanChars = (text.match(KOREAN_RE) || []).length;
  return koreanChars >= 2 ? "ko" : "en";
}

/** All translatable strings used during project execution. */
const messages = {
  // Agent names
  leaderName: { ko: "팀장", en: "Team Leader" },

  // PROGRESS.md
  progressTitle: { ko: "진행 현황", en: "Progress" },
  progressGoal: { ko: "프로젝트 목표", en: "Project Goal" },
  progressCurrentState: { ko: "현재 상태", en: "Current State" },
  progressStarted: { ko: "프로젝트 시작됨", en: "Project started" },
  progressNoTasks: { ko: "아직 완료된 작업 없음", en: "No completed tasks yet" },
  progressCompleted: { ko: "완료된 작업", en: "Completed Tasks" },
  progressInProgress: { ko: "진행 중인 작업", en: "In Progress" },
  progressArchitecture: { ko: "아키텍처 결정사항", en: "Architecture Decisions" },
  progressFileStructure: { ko: "파일 구조", en: "File Structure" },
  progressNone: { ko: "(없음)", en: "(none)" },
  progressNoFiles: { ko: "(아직 생성된 파일 없음)", en: "(no files created yet)" },

  // CLAUDE.md
  workspaceRules: { ko: "워크스페이스 규칙", en: "Workspace Rules" },
  requiredRules: { ko: "필수 규칙", en: "Required Rules" },
  ruleFilesHere: {
    ko: "모든 파일은 이 디렉토리 안에 만드세요. 상대 경로만 사용하세요.",
    en: "ALL files must be created in this directory. Use RELATIVE paths only.",
  },
  ruleNoOutside: {
    ko: "이 디렉토리 밖에 파일을 만들거나 상위 디렉토리를 수정하지 마세요.",
    en: "Do NOT create files outside this directory or modify parent directories.",
  },
  progressDoc: { ko: "진행 현황 문서", en: "Progress Document" },
  ruleReadProgress: {
    ko: "작업 시작 전: PROGRESS.md를 반드시 읽고 현재 상태를 파악하세요.",
    en: "Before starting: ALWAYS read PROGRESS.md to understand current state.",
  },
  ruleUpdateProgress: {
    ko: "작업 완료 후: PROGRESS.md를 반드시 업데이트하세요.",
    en: "After finishing: ALWAYS update PROGRESS.md with your changes.",
  },

  // Activity feed
  activityTaskStarted: { ko: (title: string) => `"${title}" 작업을 시작했어요`, en: (title: string) => `Started working on "${title}"` },
  activityTaskCompleted: { ko: (title: string) => `"${title}" 작업을 완료했어요`, en: (title: string) => `Completed "${title}"` },
  activityTasksCreated: { ko: (n: number) => `${n}개의 작업을 생성했어요`, en: (n: number) => `Created ${n} tasks` },
  activityHired: { ko: (name: string, task: string) => `"${task}" 작업을 위해 ${name}을(를) 고용했어요`, en: (name: string, task: string) => `Hired ${name} for "${task}"` },
  activityAssigned: { ko: (task: string, member: string) => `"${task}" 작업을 ${member}에게 배정했어요`, en: (task: string, member: string) => `Assigned "${task}" to ${member}` },

  // Commit messages
  commitSystemPrompt: {
    ko: "당신은 git 커밋 메시지를 작성하는 개발자입니다. 한국어로 간결하고 서술적인 커밋 메시지를 작성하세요. 첫 줄: 요약(72자 이내). 빈 줄 후 변경 내용을 불릿으로. co-authored-by 없이. 마크다운 없이.",
    en: "You are a developer writing a git commit message. Write a concise, descriptive commit message in English. First line: summary (max 72 chars). Then blank line + bullet points of what changed. No co-authored-by. No markdown.",
  },

  // Agent prompts
  agentSystemBase: {
    ko: (name: string) => `당신은 ${name}, 소프트웨어 개발자입니다. 반드시 Write 도구를 사용해 실제 파일을 만드세요.`,
    en: (name: string) => `You are ${name}, a software developer. You MUST create actual files using the Write tool.`,
  },
  agentTaskPrompt: {
    ko: (title: string, desc: string) => `다음 작업을 구현하세요. Write 도구로 현재 디렉토리에 실제 파일을 만드세요.\n\n작업: ${title}\n설명: ${desc}\n\n모든 파일을 만든 후:\n1. PROGRESS.md를 업데이트하세요.\n2. 무엇을 만들었는지 한 문단으로 요약하세요.`,
    en: (title: string, desc: string) => `Implement the following task. Create real files using the Write tool.\n\nTask: ${title}\nDescription: ${desc}\n\nAfter creating all files:\n1. Update PROGRESS.md.\n2. Write a one-paragraph summary of what you built.`,
  },

  // No file changes
  noFileChanges: { ko: "파일 변경 없음", en: "No file changes" },
  taskComplete: { ko: "작업 완료", en: "Task complete" },
} as const;

type MessageKey = keyof typeof messages;

/** Gets a translated value. For function-type messages, returns the function. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function t(key: string, locale: Locale): any {
  return (messages as Record<string, Record<string, unknown>>)[key]?.[locale];
}

/** Gets a simple string message (non-function type). */
export function ts(key: string, locale: Locale): string {
  const val = (messages as Record<string, Record<string, unknown>>)[key]?.[locale];
  return typeof val === "string" ? val : "";
}

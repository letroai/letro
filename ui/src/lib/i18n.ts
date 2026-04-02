// ui/src/lib/i18n.ts
// Client-side i18n system. Locale is stored in user preferences (DB-backed).

export type Locale = "ko" | "en";

const translations: Record<string, Record<Locale, string>> = {
  // Common
  "common.loading": { ko: "불러오는 중...", en: "Loading..." },
  "common.error": { ko: "문제가 생겼어요. 다시 시도해 주세요.", en: "Something went wrong. Please try again." },
  "common.retry": { ko: "다시 시도", en: "Retry" },
  "common.save": { ko: "저장", en: "Save" },
  "common.cancel": { ko: "취소", en: "Cancel" },
  "common.delete": { ko: "삭제", en: "Delete" },
  "common.close": { ko: "닫기", en: "Close" },
  "common.confirm": { ko: "확인", en: "Confirm" },
  "common.back": { ko: "뒤로", en: "Back" },

  // Nav
  "nav.home": { ko: "홈", en: "Home" },
  "nav.inbox": { ko: "알림", en: "Inbox" },
  "nav.help": { ko: "도움이 필요한 것", en: "Help Needed" },
  "nav.tasks": { ko: "작업 목록", en: "Tasks" },
  "nav.goals": { ko: "목표", en: "Goals" },
  "nav.team": { ko: "팀", en: "Team" },
  "nav.results": { ko: "결과물", en: "Results" },
  "nav.costs": { ko: "비용", en: "Costs" },
  "nav.activity": { ko: "활동 기록", en: "Activity" },
  "nav.settings": { ko: "설정", en: "Settings" },
  "nav.project": { ko: "프로젝트", en: "Project" },
  "nav.more": { ko: "더보기", en: "More" },
  "nav.newProject": { ko: "새 프로젝트 만들기", en: "Create New Project" },
  "nav.account": { ko: "내 계정", en: "My Account" },

  // Onboarding
  "onboarding.title": { ko: "아이디어를 알려주세요", en: "Tell us your idea" },
  "onboarding.subtitle": { ko: "무엇을 만들고 싶으세요? 한 줄이면 충분해요.", en: "What do you want to build? One sentence is enough." },
  "onboarding.placeholder": { ko: "예: 우리 동네 맛집 추천 웹사이트 만들어줘", en: "e.g., Build me a local restaurant review website" },
  "onboarding.submit": { ko: "시작하기", en: "Get Started" },
  "onboarding.analyzing": { ko: "아이디어를 분석하고 있어요...", en: "Analyzing your idea..." },
  "onboarding.analyzingDesc": { ko: "잠시만 기다려 주세요. 보통 10~20초면 끝나요.", en: "Please wait. This usually takes 10-20 seconds." },
  "onboarding.reviewTitle": { ko: "분석 완료", en: "Analysis Complete" },
  "onboarding.projectName": { ko: "프로젝트 이름", en: "Project Name" },
  "onboarding.goalSummary": { ko: "목표 요약", en: "Goal Summary" },
  "onboarding.estDuration": { ko: "예상 기간", en: "Est. Duration" },
  "onboarding.estCost": { ko: "예상 비용", en: "Est. Cost" },
  "onboarding.teamMembers": { ko: "팀원", en: "Team Members" },
  "onboarding.originalIdea": { ko: "원래 아이디어", en: "Original Idea" },
  "onboarding.language": { ko: "프로젝트 언어", en: "Project Language" },
  "onboarding.langDesc.ko": { ko: "팀원들이 한국어로 작업하고 보고해요", en: "Team members will work and report in Korean" },
  "onboarding.langDesc.en": { ko: "팀원들이 영어로 작업하고 보고해요", en: "Team members will work and report in English" },
  "onboarding.startProject": { ko: "프로젝트 시작", en: "Start Project" },
  "onboarding.starting": { ko: "프로젝트를 만들고 있어요...", en: "Creating your project..." },
  "onboarding.days": { ko: "일", en: "days" },
  "onboarding.people": { ko: "명", en: "" },
  "onboarding.examples": { ko: "이런 아이디어는 어때요?", en: "Try one of these ideas:" },
  "onboarding.selectLanguage": { ko: "언어 선택", en: "Select Language" },

  // Dashboard
  "dashboard.title": { ko: "대시보드", en: "Dashboard" },
  "dashboard.teamActive": { ko: (n: string) => `팀원 ${n}명이 활동 중이에요.`, en: (n: string) => `${n} team members are active.` },
  "dashboard.teamInactive": { ko: "아직 팀원이 활동하지 않고 있어요.", en: "No team members are active yet." },

  // Team
  "team.title": { ko: "팀", en: "Team" },
  "team.leader": { ko: "팀장", en: "Team Leader" },
  "team.members": { ko: "팀원", en: "Members" },
  "team.statusWorking": { ko: "작업 중", en: "Working" },
  "team.statusIdle": { ko: "대기 중", en: "Idle" },
  "team.statusPaused": { ko: "일시 정지", en: "Paused" },
  "team.statusTerminated": { ko: "종료", en: "Terminated" },
  "team.statusError": { ko: "문제 발생", en: "Error" },
  "team.noMembers": { ko: "아직 팀원이 없어요. 프로젝트가 시작되면 자동으로 팀이 구성돼요.", en: "No team members yet. The team will be formed automatically when the project starts." },

  // Tasks
  "tasks.title": { ko: "작업 목록", en: "Tasks" },
  "tasks.all": { ko: "전체", en: "All" },
  "tasks.inProgress": { ko: "진행 중", en: "In Progress" },
  "tasks.waiting": { ko: "대기 중", en: "Waiting" },
  "tasks.done": { ko: "완료", en: "Done" },
  "tasks.review": { ko: "검토 중", en: "In Review" },
  "tasks.blocked": { ko: "차단됨", en: "Blocked" },
  "tasks.cancelled": { ko: "취소", en: "Cancelled" },
  "tasks.empty": { ko: "아직 작업이 없어요. 프로젝트가 시작되면 자동으로 만들어져요.", en: "No tasks yet. They will be created automatically when the project starts." },
  "tasks.emptyFilter": { ko: "해당 상태의 작업이 없어요.", en: "No tasks with this status." },
  "tasks.liveOutput": { ko: "실시간 작업 출력", en: "Live Task Output" },
  "tasks.workLog": { ko: "작업 내역", en: "Work Log" },
  "tasks.preparing": { ko: "팀원이 작업을 준비하고 있어요...", en: "Team member is preparing..." },
  "tasks.noLog": { ko: "작업 내역이 없어요.", en: "No work log available." },
  "tasks.conversation": { ko: "대화", en: "Conversation" },
  "tasks.noConversation": { ko: "아직 대화가 없어요.", en: "No conversation yet." },
  "tasks.messagePlaceholder": { ko: "메시지를 입력하세요...", en: "Type a message..." },
  "tasks.sendFailed": { ko: "메시지를 보내지 못했어요. 다시 시도해 주세요.", en: "Failed to send message. Please try again." },

  // Settings
  "settings.title": { ko: "설정", en: "Settings" },
  "settings.projectControl": { ko: "프로젝트 제어", en: "Project Control" },
  "settings.running": { ko: "진행 중", en: "Running" },
  "settings.paused": { ko: "정지됨", en: "Paused" },
  "settings.pauseDesc": { ko: "팀장이 작업을 관리하고 팀원들이 실행하고 있어요. 정지하면 모든 작업이 즉시 멈추고 진행 중인 작업은 대기 상태로 돌아가요.", en: "The team leader is managing tasks and members are executing. Pausing will stop all work immediately." },
  "settings.resumeDesc": { ko: "프로젝트가 정지 상태예요. 팀장과 모든 팀원이 대기 중이에요. 재개하면 팀장이 현재 상황을 파악하고 작업을 다시 시작해요.", en: "Project is paused. All team members are on standby. Resuming will restart the team leader to reassess and assign tasks." },
  "settings.pause": { ko: "프로젝트 정지", en: "Pause Project" },
  "settings.resume": { ko: "프로젝트 재개", en: "Resume Project" },

  // Activity
  "activity.title": { ko: "활동 내역", en: "Activity" },
  "activity.empty": { ko: "팀이 작업을 시작하면 여기에 나타나요...", en: "Activity will appear here when the team starts working..." },

  // Priority
  "priority.low": { ko: "낮음", en: "Low" },
  "priority.medium": { ko: "보통", en: "Medium" },
  "priority.high": { ko: "높음", en: "High" },
  "priority.urgent": { ko: "긴급", en: "Urgent" },
};

/** Get translated string by key. */
export function translate(key: string, locale: Locale): string {
  const entry = translations[key];
  if (!entry) return key;
  const val = entry[locale];
  return typeof val === "string" ? val : key;
}

/** Shorthand alias */
export const tr = translate;

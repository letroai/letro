// server/src/services/autonomy/progress-reporter.ts

export type EventSeverity = "info" | "success" | "warning" | "error";

export interface ProgressMessage {
  icon: string;
  message: string;
  severity: EventSeverity;
}

interface EventTemplate {
  icon: string;
  template: string;
  severity: EventSeverity;
}

/**
 * Translates internal system events into user-friendly Korean messages.
 *
 * Letro philosophy: Hide technical jargon, use expressions understandable by non-technical users.
 * Applies the "Can my mom read this and understand it?" test.
 */
export class ProgressReporter {
  private templates: Record<string, EventTemplate> = {
    agent_created_issue: {
      icon: "📋",
      template: "팀장이 새 작업을 만들었어요: {{title}}",
      severity: "info",
    },
    heartbeat_run_started: {
      icon: "💓",
      template: "팀장이 프로젝트 상태를 확인하고 있어요",
      severity: "info",
    },
    heartbeat_run_completed: {
      icon: "✅",
      template: "팀장이 프로젝트 상태 확인을 마쳤어요",
      severity: "success",
    },
    heartbeat_run_failed: {
      icon: "🔄",
      template: "작업 중 문제가 생겨서 다른 방법으로 다시 시도하고 있어요",
      severity: "warning",
    },
    issue_completed: {
      icon: "🎉",
      template: "작업이 완료되었어요: {{title}}",
      severity: "success",
    },
    issue_checkout: {
      icon: "🔧",
      template: "{{agentName}}이(가) 작업을 시작했어요: {{title}}",
      severity: "info",
    },
    agent_hired: {
      icon: "👋",
      template: "새 팀원이 합류했어요: {{agentName}} ({{role}})",
      severity: "info",
    },
    agent_fired: {
      icon: "👋",
      template: "{{agentName}} 팀원이 작업을 마치고 팀을 떠났어요",
      severity: "info",
    },
    peer_review_approved: {
      icon: "✅",
      template: "작업 검토가 통과되었어요: {{title}}",
      severity: "success",
    },
    peer_review_needs_revision: {
      icon: "📝",
      template: "작업을 조금 더 다듬고 있어요: {{title}}",
      severity: "info",
    },
    budget_soft_cap_reached: {
      icon: "💰",
      template: "이번 달 비용이 설정한 한도의 {{percent}}%에 도달했어요",
      severity: "warning",
    },
    budget_hard_cap_reached: {
      icon: "🚨",
      template: "비용 한도에 도달해서 작업을 잠시 멈췄어요. 한도를 조정해 주세요.",
      severity: "error",
    },
    goal_completed: {
      icon: "🏆",
      template: "목표를 달성했어요: {{title}}",
      severity: "success",
    },
    goal_progress_updated: {
      icon: "📊",
      template: "프로젝트 진행률이 {{percent}}%가 되었어요",
      severity: "info",
    },
    task_decomposition_completed: {
      icon: "📋",
      template: "팀장이 작업 계획을 세웠어요 ({{count}}개 작업)",
      severity: "info",
    },
    exploration_started: {
      icon: "🔍",
      template: "팀장이 더 좋은 방법을 찾아보고 있어요",
      severity: "info",
    },
    exploration_completed: {
      icon: "💡",
      template: "팀장이 새로운 아이디어를 찾았어요",
      severity: "success",
    },
  };

  /**
   * Translates an internal event type to a user-friendly message.
   *
   * @param eventType - Internal system event type (e.g. "agent_hired")
   * @param context - Context to fill template variables (e.g. { agentName: "coder1" })
   * @returns Progress message with icon, message, and severity
   */
  translate(
    eventType: string,
    context: Record<string, string | number> = {},
  ): ProgressMessage {
    const tmpl = this.templates[eventType];

    if (!tmpl) {
      return {
        icon: "ℹ️",
        message: "프로젝트가 진행되고 있어요",
        severity: "info",
      };
    }

    const message = this.interpolate(tmpl.template, context);
    return {
      icon: tmpl.icon,
      message,
      severity: tmpl.severity,
    };
  }

  /**
   * Replaces {{variable}} patterns with context values.
   */
  private interpolate(
    template: string,
    context: Record<string, string | number>,
  ): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
      const value = context[key];
      return value !== undefined ? String(value) : "";
    });
  }
}

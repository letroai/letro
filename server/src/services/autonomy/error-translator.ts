// server/src/services/autonomy/error-translator.ts

export interface TranslatedError {
  userMessage: string;
  action?: {
    label: string;
    url: string;
  };
  autoRecoverable: boolean;
}

interface ErrorPattern {
  pattern: RegExp;
  userMessage: string;
  action?: {
    label: string;
    url: string;
  };
  autoRecoverable: boolean;
}

/**
 * Translates technical error messages into Korean messages understandable by non-technical users.
 *
 * Letro philosophy: Auto-recover errors. If not possible, show "Something went wrong, retrying" level messages.
 * Never expose stack traces or error codes to users.
 */
export class ErrorTranslator {
  private patterns: ErrorPattern[] = [
    {
      pattern: /exit code \d+/i,
      userMessage: "작업 중 문제가 생겨서 다른 방법으로 다시 시도하고 있어요",
      autoRecoverable: true,
    },
    {
      pattern: /ECONNREFUSED/i,
      userMessage: "외부 서비스에 연결할 수 없어요. 잠시 후 다시 시도할게요.",
      autoRecoverable: true,
    },
    {
      pattern: /oauth.*(?:expired|invalid|revoked)/i,
      userMessage: "서비스 연결이 만료되었어요. 다시 연결해 주세요.",
      action: {
        label: "서비스 다시 연결하기",
        url: "/settings/connections",
      },
      autoRecoverable: false,
    },
    {
      pattern: /budget.*(?:exceeded|cap|limit)/i,
      userMessage: "설정한 비용 한도에 도달했어요. 한도를 조정하면 작업을 계속할 수 있어요.",
      action: {
        label: "비용 한도 설정",
        url: "/settings/budget",
      },
      autoRecoverable: false,
    },
    {
      pattern: /infinite.*loop|max.*(?:recursion|iterations)/i,
      userMessage:
        "작업이 예상보다 복잡해서 다른 방법을 시도하고 있어요",
      autoRecoverable: true,
    },
    {
      pattern: /rate.*limit|429|too many requests/i,
      userMessage: "요청이 너무 많아서 잠시 쉬고 있어요. 곧 다시 시작할게요.",
      autoRecoverable: true,
    },
    {
      pattern: /(?:ENOSPC|disk.*full|no space)/i,
      userMessage: "저장 공간이 부족해요. 공간을 확보해 주세요.",
      action: {
        label: "저장 공간 확인",
        url: "/settings/storage",
      },
      autoRecoverable: false,
    },
    {
      pattern: /(?:timeout|ETIMEDOUT|ESOCKETTIMEDOUT)/i,
      userMessage: "작업 시간이 오래 걸려서 다시 시도하고 있어요",
      autoRecoverable: true,
    },
    {
      pattern: /(?:unauthorized|forbidden|401|403|EACCES|permission denied)/i,
      userMessage: "접근 권한에 문제가 있어요. 서비스 연결 상태를 확인해 주세요.",
      action: {
        label: "연결 상태 확인",
        url: "/settings/connections",
      },
      autoRecoverable: false,
    },
  ];

  /**
   * Translates a technical error string into a user-friendly message.
   *
   * @param technicalError - Internal error message (e.g. "Process exited with exit code 1")
   * @returns User message, optional action button, auto-recoverability
   */
  translate(technicalError: string): TranslatedError {
    for (const entry of this.patterns) {
      if (entry.pattern.test(technicalError)) {
        const result: TranslatedError = {
          userMessage: entry.userMessage,
          autoRecoverable: entry.autoRecoverable,
        };
        if (entry.action) {
          result.action = entry.action;
        }
        return result;
      }
    }

    // No matching pattern found, return default message
    return {
      userMessage: "잠시 문제가 생겼어요. 대부분 자동으로 해결됩니다.",
      autoRecoverable: true,
    };
  }
}

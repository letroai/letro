// server/src/services/idea.service.ts
import { eq } from "drizzle-orm";
import {
  userIdeas,
  onboardingSessions,
  goals,
  projects,
  agents,
  projectGoals,
} from "@letro/db/schema";
import type { ServiceDependencies } from "./index.js";
import { callLLM } from "../lib/llm-client.js";
import { DEFAULT_ADAPTER_ID } from "../lib/defaults.js";

/**
 * Service for receiving, structuring, and activating user ideas into projects.
 *
 * Core Letro flow: idea input -> structuring -> project creation -> auto leader assignment
 * Non-technical users just type one line and Letro handles everything else.
 */
export class IdeaService {
  private db;
  private logger;

  constructor(deps: ServiceDependencies) {
    this.db = deps.db;
    this.logger = deps.logger;
  }

  /**
   * Receives a new idea and creates an onboarding session.
   *
   * @param companyId - Company ID
   * @param userId - User ID who submitted the idea
   * @param rawText - Raw text entered by the user
   * @returns Created idea record
   */
  async create(companyId: string, userId: string, rawText: string) {
    this.logger.info({ companyId, userId }, "New idea received");

    const [idea] = await this.db
      .insert(userIdeas)
      .values({
        companyId,
        userId,
        rawText,
        status: "pending",
      })
      .returning();

    // Create onboarding session (linked to idea)
    await this.db.insert(onboardingSessions).values({
      companyId,
      userId,
      status: "idea_input",
      ideaId: idea!.id,
    });

    // Structure the idea via Claude CLI
    let structured: Record<string, unknown>;
    try {
      const response = await callLLM({
        system: IDEA_STRUCTURING_PROMPT,
        prompt: `사용자 아이디어: "${rawText}"\n\nJSON으로만 응답하세요.`,
      });
      structured = JSON.parse(response.content) as Record<string, unknown>;
      this.logger.info({ ideaId: idea!.id }, "Idea structured via Claude");
    } catch (err) {
      this.logger.warn({ ideaId: idea!.id, err }, "Claude call failed, using mock");
      structured = generateMockStructured(rawText);
    }

    await this.db
      .update(userIdeas)
      .set({ structured, status: "structured" })
      .where(eq(userIdeas.id, idea!.id));

    await this.db
      .update(onboardingSessions)
      .set({ status: "plan_review", planData: structured })
      .where(eq(onboardingSessions.ideaId, idea!.id));

    this.logger.info({ ideaId: idea!.id }, "Idea structuring completed (mock)");

    return { ...idea!, structured, status: "structured" as const };
  }

  /**
   * Retrieves an idea by ID.
   */
  async getById(ideaId: string) {
    const result = await this.db.query.userIdeas.findFirst({
      where: eq(userIdeas.id, ideaId),
    });
    return result ?? null;
  }

  /**
   * Retrieves the structured plan for an idea and returns a user-friendly summary.
   *
   * @returns Plan summary in Korean or null if not yet ready
   */
  async getPlan(ideaId: string) {
    const idea = await this.db.query.userIdeas.findFirst({
      where: eq(userIdeas.id, ideaId),
    });

    if (!idea || !idea.structured) {
      return null;
    }

    const structured = idea.structured as {
      summary?: string;
      features?: string[];
      estimatedDays?: number;
    };

    // Generate Korean summary for non-technical users
    const features = structured.features ?? [];
    const featureList = features.map((f) => `  - ${f}`).join("\n");
    const days = structured.estimatedDays ?? "며칠";

    const userSummary = [
      `${structured.summary ?? idea.rawText}`,
      "",
      features.length > 0 ? `주요 기능:` : "",
      featureList,
      "",
      `예상 소요 시간: 약 ${days}일`,
    ]
      .filter(Boolean)
      .join("\n");

    return {
      structured: idea.structured,
      userSummary,
    };
  }

  /**
   * Activates an idea into a project.
   *
   * Creates project -> auto-creates leader agent -> links goal -> starts leader heartbeat
   *
   * @param ideaId - Idea ID to activate
   * @param userId - User ID who requested activation
   * @returns Created project
   */
  async activate(ideaId: string, userId: string) {
    const idea = await this.db.query.userIdeas.findFirst({
      where: eq(userIdeas.id, ideaId),
    });

    if (!idea) {
      throw new Error(`Idea not found: ${ideaId}`);
    }

    this.logger.info({ ideaId, userId }, "Idea activation started");

    // Create project + leader + goal atomically in a transaction
    const result = await this.db.transaction(async (tx) => {
      // 1. Create leader agent
      const [leader] = await tx
        .insert(agents)
        .values({
          companyId: idea.companyId,
          name: "팀장",
          teamRole: "leader",
          status: "idle",
          adapterId: DEFAULT_ADAPTER_ID,
          autonomyLevel: 4,
        })
        .returning();

      // 2. Create project
      const projectName =
        (idea.structured as { summary?: string } | null)?.summary ??
        idea.rawText.slice(0, 50);

      const [project] = await tx
        .insert(projects)
        .values({
          companyId: idea.companyId,
          name: projectName,
          description: idea.rawText,
          leaderAgentId: leader!.id,
        })
        .returning();

      // 3. Link leader's projectId
      await tx
        .update(agents)
        .set({ projectId: project!.id })
        .where(eq(agents.id, leader!.id));

      // 4. Create goal
      const [goal] = await tx
        .insert(goals)
        .values({
          companyId: idea.companyId,
          title: projectName,
          description: idea.rawText,
          status: "active",
          createdByUserId: userId,
        })
        .returning();

      // 5. Link project to goal
      await tx.insert(projectGoals).values({
        projectId: project!.id,
        goalId: goal!.id,
      });

      // 6. Update idea status
      await tx
        .update(userIdeas)
        .set({ status: "activated", goalId: goal!.id })
        .where(eq(userIdeas.id, ideaId));

      return { project: project!, leader: leader!, goal: goal! };
    });

    // Leader heartbeat is triggered by the route handler (fire-and-forget)
    // after this method returns, to avoid blocking the activation response.

    this.logger.info(
      {
        projectId: result.project.id,
        leaderId: result.leader.id,
        goalId: result.goal.id,
      },
      "Idea activation completed",
    );

    return result.project;
  }
}

const IDEA_STRUCTURING_PROMPT = `사용자의 아이디어를 분석하여 정확히 아래 JSON 스키마로 반환하세요.
다른 형식이나 설명 없이 순수 JSON만 반환하세요.

스키마:
{
  "summary": "프로젝트 한 줄 요약 (한국어)",
  "goal": {
    "title": "프로젝트 이름 (짧고 명확하게, 예: 팀 회식 관리 앱)",
    "description": "프로젝트 상세 설명 (3~5문장, 한국어)"
  },
  "initiatives": [
    { "title": "단계명", "tasks": ["세부 작업1", "세부 작업2"] }
  ],
  "team_composition": {
    "leader": { "display_name": "프로젝트 매니저" },
    "members": [
      { "preset": "backend_engineer|frontend_engineer|fullstack_engineer|devops_engineer|qa_engineer|designer", "member_type": "coder|researcher|reviewer|qa", "display_name": "역할명", "reason": "필요 이유" }
    ]
  },
  "tech_stack": { "frontend": "...", "backend": "...", "database": "..." },
  "estimated_duration_days": 숫자,
  "estimated_cost_usd": 숫자,
  "required_connections": []
}

규칙:
- goal.title은 아이디어의 핵심을 담은 짧은 이름 (예: "팀 회식 플래너", "독서 기록 앱")
- initiatives는 2~4개 단계로 구성
- team_composition.members는 2~4명
- MVP 범위로 최소한으로 설계
- estimated_cost_usd는 AI API 사용 비용 기준으로 보수적 추정`;

/**
 * Mock function to structure an idea without LLM.
 * Extracts keywords from input text and generates a plausible project plan.
 * To be replaced with actual LLM analysis in Phase 2.
 */
function generateMockStructured(rawText: string) {
  // Generate project name from keywords
  const words = rawText.replace(/[을를이가은는의에서로만들자만들어줘하자]/g, " ").trim().split(/\s+/).filter(Boolean);
  const projectName = words.slice(0, 4).join(" ") + " 프로젝트";

  // Extract core features (simple split)
  const features = [
    "사용자 인증 및 로그인",
    "메인 화면 UI 구현",
    "핵심 데이터 모델 설계",
    "API 서버 구축",
    "배포 및 테스트",
  ];

  return {
    summary: `"${rawText}"를 실현하는 프로젝트입니다. 사용자가 쉽게 사용할 수 있는 웹 앱으로 구현합니다.`,
    goal: {
      title: projectName,
      description: `${rawText}\n\n이 프로젝트는 직관적인 UI와 안정적인 백엔드를 갖춘 웹 애플리케이션으로 구현됩니다.`,
    },
    initiatives: [
      {
        title: "기획 및 설계",
        tasks: ["요구사항 분석", "화면 설계", "데이터 모델 설계"],
      },
      {
        title: "핵심 기능 개발",
        tasks: features.slice(0, 3),
      },
      {
        title: "마무리 및 배포",
        tasks: ["테스트", "버그 수정", "배포"],
      },
    ],
    team_composition: {
      leader: { display_name: "프로젝트 팀장" },
      members: [
        {
          preset: "fullstack_engineer",
          member_type: "coder" as const,
          display_name: "풀스택 개발자",
          reason: "프론트엔드와 백엔드를 모두 담당",
        },
        {
          preset: "qa_engineer",
          member_type: "qa" as const,
          display_name: "품질 관리 담당",
          reason: "테스트 및 품질 보증",
        },
      ],
    },
    tech_stack: {
      frontend: "React",
      backend: "Node.js",
      database: "PostgreSQL",
      deployment: "Docker",
    },
    estimated_duration_days: 14,
    estimated_cost_usd: 80,
    required_connections: [],
  };
}

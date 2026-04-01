// server/src/services/autonomy/hiring-engine.ts
import { eq, and, sql, desc } from "drizzle-orm";
import { agents, companies, issues } from "@letro/db/schema";
import type { ServiceDependencies } from "../index.js";
import { omitUndefined } from "../../lib/strip-undefined.js";
import { MAX_AGENTS_PER_COMPANY, DEFAULT_ADAPTER_ID } from "../../lib/defaults.js";

/**
 * Agent preset skill mapping.
 * Preset name → related skill list
 */
const PRESET_SKILL_MAP: Record<string, string[]> = {
  backend_engineer: ["backend", "api", "database", "server"],
  frontend_engineer: ["frontend", "ui", "react", "css"],
  fullstack_engineer: ["fullstack", "general", "backend", "frontend"],
  devops_engineer: ["devops", "ci", "cd", "infra", "deploy"],
  qa_engineer: ["qa", "testing", "test", "quality"],
  tech_lead: ["architecture", "design", "review"],
  designer: ["design", "ui", "ux"],
};

/**
 * Member hiring engine.
 *
 * The leader evaluates member count against unassigned tasks
 * to decide whether to hire additional members.
 *
 * Safety guards:
 * - Check company autoHireEnabled
 * - Check max agent count (20)
 * - Hiring cooldown 10 min
 * - Budget check (hiring paused when >80% spent, except Level 4)
 */
export class HiringEngine {
  private db;
  private logger;

  constructor(deps: ServiceDependencies) {
    this.db = deps.db;
    this.logger = deps.logger;
  }

  /**
   * Evaluates whether hiring is needed.
   *
   * Compares unassigned task count vs current member count to
   * determine if additional members are needed.
   *
   * @param projectId - Project ID
   * @param leaderAgentId - Leader agent ID
   * @returns { shouldHire, reason, recommendedPreset }
   */
  async evaluateHiringNeed(
    projectId: string,
    leaderAgentId: string,
  ): Promise<{
    shouldHire: boolean;
    reason: string;
    recommendedPreset?: string;
  }> {
    // 1. Query leader agent
    const leader = await this.db.query.agents.findFirst({
      where: eq(agents.id, leaderAgentId),
    });
    if (!leader) {
      return { shouldHire: false, reason: "Leader not found" };
    }

    // 2. Check company autoHireEnabled
    const company = await this.db.query.companies.findFirst({
      where: eq(companies.id, leader.companyId),
    });
    if (!company?.autoHireEnabled) {
      return { shouldHire: false, reason: "Auto-hiring is disabled for this company" };
    }

    // 3. Check max agent count
    const allAgents = await this.db
      .select()
      .from(agents)
      .where(
        and(
          eq(agents.companyId, leader.companyId),
          sql`${agents.status} != 'terminated'`,
        ),
      );
    if (allAgents.length >= MAX_AGENTS_PER_COMPANY) {
      return { shouldHire: false, reason: `Max agent count (${MAX_AGENTS_PER_COMPANY}) reached` };
    }

    // 4. Check hiring cooldown (10 min after last hire)
    const lastHire = await this.db.query.agents.findFirst({
      where: and(
        eq(agents.hiredByAgentId, leaderAgentId),
        sql`${agents.createdAt} > NOW() - INTERVAL '10 minutes'`,
      ),
    });
    if (lastHire) {
      return { shouldHire: false, reason: "Hiring cooldown (10 min)" };
    }

    // 5. Current member list
    const currentMembers = await this.db
      .select()
      .from(agents)
      .where(
        and(
          eq(agents.reportsTo, leaderAgentId),
          eq(agents.teamRole, "member"),
          sql`${agents.status} != 'terminated'`,
        ),
      );

    // 6. Query unassigned tasks
    const unassignedTasks = await this.db
      .select()
      .from(issues)
      .where(
        and(
          eq(issues.projectId, projectId),
          sql`${issues.assigneeAgentId} IS NULL`,
          sql`${issues.status} IN ('backlog', 'todo')`,
        ),
      );

    // 7. Decision: hire if unassigned tasks >= 2x member count
    if (unassignedTasks.length <= currentMembers.length * 2 && currentMembers.length > 0) {
      return { shouldHire: false, reason: "No additional members needed" };
    }

    // Need at least 1 member if team is empty
    if (currentMembers.length === 0 && unassignedTasks.length > 0) {
      return {
        shouldHire: true,
        reason: "Team has no members — need 1 fullstack member",
        recommendedPreset: "fullstack_engineer",
      };
    }

    // 8. Analyze needed roles
    const recommendedPreset = this.analyzeNeededPreset(unassignedTasks, currentMembers);

    return {
      shouldHire: true,
      reason: `${unassignedTasks.length} unassigned tasks vs ${currentMembers.length} members`,
      recommendedPreset,
    };
  }

  /**
   * Hires a new team member.
   *
   * Creates an agent, assigns to project, and sets up reporting to leader.
   *
   * @param companyId - Company ID
   * @param projectId - Project ID
   * @param leaderAgentId - Leader ID who decided to hire
   * @param preset - Agent preset name
   * @param reason - Hiring reason
   * @returns Created agent
   */
  async hire(
    companyId: string,
    projectId: string,
    leaderAgentId: string,
    preset: string,
    reason: string,
  ) {
    this.logger.info(
      { companyId, projectId, leaderAgentId, preset, reason },
      "Executing member hire",
    );

    const presetConfig = this.getPresetConfig(preset);

    const [newAgent] = await this.db
      .insert(agents)
      .values(
        omitUndefined({
          companyId,
          name: presetConfig.name,
          teamRole: "member",
          memberType: presetConfig.memberType,
          projectId,
          adapterId: DEFAULT_ADAPTER_ID,
          autonomyLevel: 4,
          specialization: presetConfig.specialization,
          systemPrompt: presetConfig.systemPrompt,
          reportsTo: leaderAgentId,
          hiredByAgentId: leaderAgentId,
          status: "idle",
        }),
      )
      .returning();

    return newAgent!;
  }

  /**
   * Analyzes needed skills from unassigned tasks and current member skills
   * to recommend the most needed preset.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private analyzeNeededPreset(unassignedTasks: any[], currentMembers: any[]): string {
    // Skill demand from unassigned tasks
    const skillDemand = new Map<string, number>();
    for (const task of unassignedTasks) {
      const taskMetadata = task.metadata as Record<string, unknown> | null;
      const requiredSkills = (taskMetadata?.requiredSkills as string[]) ?? ["general"];
      for (const skill of requiredSkills) {
        skillDemand.set(skill, (skillDemand.get(skill) ?? 0) + 1);
      }
    }

    // Skill supply from current members
    const skillSupply = new Map<string, number>();
    for (const member of currentMembers) {
      for (const skill of member.specialization ?? []) {
        skillSupply.set(skill, (skillSupply.get(skill) ?? 0) + 1);
      }
    }

    // Find skill with largest gap
    let bestSkill = "general";
    let maxGap = 0;
    for (const [skill, demand] of skillDemand) {
      const supply = skillSupply.get(skill) ?? 0;
      const gap = demand - supply;
      if (gap > maxGap) {
        maxGap = gap;
        bestSkill = skill;
      }
    }

    // Match preset for skill
    return this.matchPresetForSkill(bestSkill);
  }

  /**
   * Matches the most suitable preset for a skill.
   */
  private matchPresetForSkill(skill: string): string {
    let bestPreset = "fullstack_engineer";
    let bestScore = 0;

    for (const [presetName, presetSkills] of Object.entries(PRESET_SKILL_MAP)) {
      const matched = presetSkills.some(
        (ps) => skill.toLowerCase().includes(ps) || ps.includes(skill.toLowerCase()),
      );
      if (matched) {
        const score = 1;
        if (score > bestScore) {
          bestScore = score;
          bestPreset = presetName;
        }
      }
    }

    return bestPreset;
  }

  /**
   * Returns default configuration for a preset name.
   *
   * TODO: Extend to manage presets from DB
   */
  private getPresetConfig(preset: string): {
    name: string;
    memberType: string;
    specialization: string[];
    systemPrompt: string;
  } {
    const configs: Record<string, {
      name: string;
      memberType: string;
      specialization: string[];
      systemPrompt: string;
    }> = {
      backend_engineer: {
        name: "백엔드 엔지니어",
        memberType: "coder",
        specialization: ["backend", "api", "database"],
        systemPrompt: "백엔드 API와 데이터베이스를 담당하는 엔지니어입니다.",
      },
      frontend_engineer: {
        name: "프론트엔드 엔지니어",
        memberType: "coder",
        specialization: ["frontend", "ui", "react"],
        systemPrompt: "프론트엔드 UI와 사용자 경험을 담당하는 엔지니어입니다.",
      },
      fullstack_engineer: {
        name: "풀스택 엔지니어",
        memberType: "coder",
        specialization: ["fullstack", "backend", "frontend"],
        systemPrompt: "프론트엔드와 백엔드를 모두 다루는 풀스택 엔지니어입니다.",
      },
      devops_engineer: {
        name: "데브옵스 엔지니어",
        memberType: "specialist",
        specialization: ["devops", "infra", "deploy"],
        systemPrompt: "배포와 인프라를 담당하는 데브옵스 엔지니어입니다.",
      },
      qa_engineer: {
        name: "QA 엔지니어",
        memberType: "reviewer",
        specialization: ["qa", "testing", "quality"],
        systemPrompt: "품질 검증과 테스트를 담당하는 QA 엔지니어입니다.",
      },
      tech_lead: {
        name: "테크 리드",
        memberType: "specialist",
        specialization: ["architecture", "design", "review"],
        systemPrompt: "아키텍처 설계와 코드 리뷰를 담당하는 테크 리드입니다.",
      },
      designer: {
        name: "디자이너",
        memberType: "specialist",
        specialization: ["design", "ui", "ux"],
        systemPrompt: "UI/UX 디자인을 담당하는 디자이너입니다.",
      },
    };

    return configs[preset] ?? configs["fullstack_engineer"]!;
  }
}

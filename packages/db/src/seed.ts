// packages/db/src/seed.ts
import { createDb } from "./client.js";
import { companies, autonomyLevels, surfaceTermMappings } from "./schema/index.js";

const DATABASE_URL = process.env["DATABASE_URL"];
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const db = createDb(DATABASE_URL);

// ===== Default Company =====
async function seedDefaultCompany() {
  const existing = await db.select().from(companies).limit(1);
  if (existing.length > 0) return;

  await db.insert(companies).values({
    name: "My Workspace",
    slug: "default",
    defaultAutonomyLevel: 4,
    autoHireEnabled: true,
    autoFireEnabled: false,
    explorationEnabled: true,
    peerReviewRequired: false,
  });
  console.log("[seed] Default company created.");
}

// ===== Autonomy Levels (per company) =====
async function seedAutonomyLevels(companyId: string) {
  const levels = [
    {
      companyId,
      level: 1,
      name: "manual",
      description: "내가 하나하나 결정할게",
      requireTaskApproval: true,
      requireHireApproval: true,
      requireFireApproval: true,
      requireBudgetApproval: true,
      allowTaskCreation: false,
      allowTaskDecomposition: false,
      allowAgentHiring: false,
      allowAgentFiring: false,
      allowExploration: false,
    },
    {
      companyId,
      level: 2,
      name: "confirm",
      description: "중요한 건 나한테 물어봐",
      requireTaskApproval: false,
      requireHireApproval: true,
      requireFireApproval: true,
      requireBudgetApproval: true,
      allowTaskCreation: false,
      allowTaskDecomposition: false,
      allowAgentHiring: false,
      allowAgentFiring: false,
      allowExploration: false,
    },
    {
      companyId,
      level: 3,
      name: "notify",
      description: "알아서 하고, 중요한 건 알려줘",
      requireTaskApproval: false,
      requireHireApproval: false,
      requireFireApproval: false,
      requireBudgetApproval: false,
      allowTaskCreation: true,
      allowTaskDecomposition: true,
      allowAgentHiring: true,
      allowAgentFiring: true,
      allowExploration: true,
    },
    {
      companyId,
      level: 4,
      name: "auto",
      description: "알아서 다 해줘",
      requireTaskApproval: false,
      requireHireApproval: false,
      requireFireApproval: false,
      requireBudgetApproval: false,
      allowTaskCreation: true,
      allowTaskDecomposition: true,
      allowAgentHiring: true,
      allowAgentFiring: true,
      allowExploration: true,
    },
  ] as const;

  for (const level of levels) {
    await db.insert(autonomyLevels).values(level).onConflictDoNothing();
  }
  console.log("[seed] Autonomy levels created.");
}

// ===== Surface Term Mappings =====
async function seedSurfaceTerms() {
  const terms = [
    { internalTerm: "agent", surfaceTerm: "팀원", locale: "ko", context: "ui" },
    { internalTerm: "agent_leader", surfaceTerm: "팀장", locale: "ko", context: "ui" },
    { internalTerm: "agents", surfaceTerm: "팀", locale: "ko", context: "ui" },
    { internalTerm: "heartbeat", surfaceTerm: "작업", locale: "ko", context: "ui" },
    {
      internalTerm: "heartbeat_run",
      surfaceTerm: "작업 진행",
      locale: "ko",
      context: "ui",
    },
    { internalTerm: "adapter", surfaceTerm: "도구", locale: "ko", context: "ui" },
    { internalTerm: "workspace", surfaceTerm: "작업 공간", locale: "ko", context: "ui" },
    { internalTerm: "issue", surfaceTerm: "작업", locale: "ko", context: "ui" },
    {
      internalTerm: "exploration",
      surfaceTerm: "새 일감 찾기",
      locale: "ko",
      context: "ui",
    },
    { internalTerm: "peer_review", surfaceTerm: "동료 검토", locale: "ko", context: "ui" },
    {
      internalTerm: "budget_incident",
      surfaceTerm: "비용 알림",
      locale: "ko",
      context: "notification",
    },
    {
      internalTerm: "autonomy_level",
      surfaceTerm: "자율도",
      locale: "ko",
      context: "settings",
    },
    { internalTerm: "approval", surfaceTerm: "확인 요청", locale: "ko", context: "ui" },
    {
      internalTerm: "escalation",
      surfaceTerm: "도움이 필요해요",
      locale: "ko",
      context: "ui",
    },
    { internalTerm: "budget_ceiling", surfaceTerm: "비용 한도", locale: "ko", context: "ui" },
    { internalTerm: "api_key", surfaceTerm: "서비스 연결", locale: "ko", context: "ui" },
  ];

  for (const term of terms) {
    await db.insert(surfaceTermMappings).values(term).onConflictDoNothing();
  }
  console.log("[seed] Surface term mappings created.");
}

// ===== Run =====
async function main() {
  try {
    await seedDefaultCompany();

    const [defaultCompany] = await db.select().from(companies).limit(1);
    if (defaultCompany) {
      await seedAutonomyLevels(defaultCompany.id);
    }

    await seedSurfaceTerms();

    console.log("[seed] All seeds completed.");
  } catch (error) {
    console.error("[seed] Error:", error);
    process.exit(1);
  }
  process.exit(0);
}

main();

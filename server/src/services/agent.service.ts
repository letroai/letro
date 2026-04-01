// server/src/services/agent.service.ts
import { createHash, randomBytes } from "crypto";
import { eq, and, isNull } from "drizzle-orm";
import { agents, agentApiKeys } from "@letro/db/schema";
import type { ServiceDependencies } from "./index.js";
import { omitUndefined } from "../lib/strip-undefined.js";
import { DEFAULT_ADAPTER_ID } from "../lib/defaults.js";

/**
 * Agent (member/leader) CRUD and API key management service.
 *
 * Team structure rules:
 * - Leader: 1 per project, management only
 * - Member: 0~N, execution roles
 * - Only the leader can hire/fire
 */
export class AgentService {
  private db;
  private logger;

  constructor(deps: ServiceDependencies) {
    this.db = deps.db;
    this.logger = deps.logger;
  }

  /**
   * Lists agents with optional filters.
   *
   * @param companyId - Company ID
   * @param filters - Optional filters (team_role, status, project_id)
   */
  async list(
    companyId: string,
    filters?: {
      teamRole?: string;
      status?: string;
      projectId?: string;
    },
  ) {
    const conditions = [eq(agents.companyId, companyId)];

    if (filters?.teamRole) {
      conditions.push(eq(agents.teamRole, filters.teamRole));
    }
    if (filters?.status) {
      conditions.push(eq(agents.status, filters.status));
    }
    if (filters?.projectId) {
      conditions.push(eq(agents.projectId, filters.projectId));
    }

    return this.db
      .select()
      .from(agents)
      .where(and(...conditions));
  }

  /**
   * Retrieves an agent by ID.
   */
  async getById(id: string) {
    const result = await this.db.query.agents.findFirst({
      where: eq(agents.id, id),
    });
    return result ?? null;
  }

  /**
   * Creates a new agent.
   *
   * @param companyId - Company ID
   * @param input - Agent info
   */
  async create(
    companyId: string,
    input: {
      name: string;
      teamRole?: string;
      memberType?: string;
      projectId?: string;
      adapterId?: string;
      autonomyLevel?: number;
      specialization?: string[];
      systemPrompt?: string;
      reportsTo?: string;
      hiredByAgentId?: string;
    },
  ) {
    this.logger.info(
      { companyId, name: input.name, teamRole: input.teamRole },
      "Creating agent",
    );

    const [agent] = await this.db
      .insert(agents)
      .values(
        omitUndefined({
          companyId,
          name: input.name,
          teamRole: input.teamRole ?? "member",
          memberType: input.memberType,
          projectId: input.projectId,
          adapterId: input.adapterId ?? DEFAULT_ADAPTER_ID,
          autonomyLevel: input.autonomyLevel ?? 4,
          specialization: input.specialization,
          systemPrompt: input.systemPrompt,
          reportsTo: input.reportsTo,
          hiredByAgentId: input.hiredByAgentId,
          status: "idle",
        }),
      )
      .returning();

    return agent!;
  }

  /**
   * Partially updates agent info.
   */
  async update(
    id: string,
    input: Partial<{
      name: string;
      status: string;
      autonomyLevel: number;
      specialization: string[];
      systemPrompt: string;
      performanceScore: number;
      firedByAgentId: string;
      firedAt: Date;
      fireReason: string;
      config: Record<string, unknown>;
      metadata: Record<string, unknown>;
    }>,
  ) {
    const [updated] = await this.db
      .update(agents)
      .set(omitUndefined({ ...input, updatedAt: new Date() }))
      .where(eq(agents.id, id))
      .returning();

    return updated ?? null;
  }

  /**
   * Deletes an agent.
   */
  async delete(id: string) {
    this.logger.warn({ agentId: id }, "Deleting agent");

    const [deleted] = await this.db
      .delete(agents)
      .where(eq(agents.id, id))
      .returning();

    return deleted ?? null;
  }

  /**
   * Creates an API key for an agent.
   *
   * The raw key is only returned from this call and cannot be retrieved later.
   * Only the SHA256 hash is stored in the DB.
   *
   * @param agentId - Agent ID
   * @param name - Key label (e.g. "production", "dev")
   * @returns { rawKey, keyRecord } -- rawKey is returned only once
   */
  async createApiKey(agentId: string, name: string) {
    const agent = await this.getById(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    // Generate random key (letro_ prefix + 48 bytes hex)
    const rawBytes = randomBytes(48);
    const rawKey = `letro_${rawBytes.toString("hex")}`;
    const keyPrefix = rawKey.slice(0, 12);

    // Store SHA256 hash
    const keyHash = createHash("sha256").update(rawKey).digest("hex");

    const [keyRecord] = await this.db
      .insert(agentApiKeys)
      .values({
        companyId: agent.companyId,
        agentId,
        keyHash,
        keyPrefix,
        label: name,
      })
      .returning();

    this.logger.info(
      { agentId, keyPrefix, label: name },
      "API key created",
    );

    return { rawKey, keyRecord: keyRecord! };
  }

  /**
   * Lists API keys for an agent (excluding hashes).
   *
   * @param agentId - Agent ID
   * @returns Key list (no keyHash field, only keyPrefix + label + dates)
   */
  async listApiKeys(agentId: string) {
    const keys = await this.db
      .select({
        id: agentApiKeys.id,
        agentId: agentApiKeys.agentId,
        keyPrefix: agentApiKeys.keyPrefix,
        label: agentApiKeys.label,
        lastUsedAt: agentApiKeys.lastUsedAt,
        revokedAt: agentApiKeys.revokedAt,
        createdAt: agentApiKeys.createdAt,
      })
      .from(agentApiKeys)
      .where(
        and(
          eq(agentApiKeys.agentId, agentId),
          isNull(agentApiKeys.revokedAt),
        ),
      );

    return keys;
  }

  /**
   * Revokes an API key (soft delete: sets revokedAt).
   */
  async deleteApiKey(keyId: string) {
    const [revoked] = await this.db
      .update(agentApiKeys)
      .set({ revokedAt: new Date() })
      .where(eq(agentApiKeys.id, keyId))
      .returning();

    if (revoked) {
      this.logger.info({ keyId, keyPrefix: revoked.keyPrefix }, "API key revoked");
    }

    return revoked ?? null;
  }
}

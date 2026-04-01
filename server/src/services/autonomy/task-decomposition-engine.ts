// server/src/services/autonomy/task-decomposition-engine.ts
import { eq, and, sql } from "drizzle-orm";
import { issues } from "@letro/db/schema";
import type { ServiceDependencies } from "../index.js";
import { DUPLICATE_SIMILARITY_THRESHOLD } from "../../lib/defaults.js";

/**
 * Task decomposition engine.
 *
 * Automatically decomposes Goals into executable issues (tasks),
 * and evaluates reactive rules to create follow-up tasks on issue completion.
 *
 * Full implementation planned after LLM integration in Day 10~11.
 * Currently only duplicate check has real logic; the rest are stubs.
 */
export class TaskDecompositionEngine {
  private db;
  private logger;

  constructor(deps: ServiceDependencies) {
    this.db = deps.db;
    this.logger = deps.logger;
  }

  /**
   * Decomposes a goal into issues (tasks).
   *
   * LLM analyzes the goal and auto-generates child issues.
   * Currently a stub; to be implemented in Day 10~11.
   *
   * @param _goalId - Goal ID to decompose
   * @param _leaderAgentId - Leader agent ID performing decomposition
   * @returns Number of created initiatives/tasks
   * @throws LLM not implemented error
   */
  async decomposeGoal(
    _goalId: string,
    _leaderAgentId: string,
  ): Promise<{ initiativeCount: number; taskCount: number }> {
    throw new Error("LLM not implemented yet — Day 10~11");
  }

  /**
   * Evaluates reactive rules for creating follow-up tasks on issue completion.
   *
   * Checks task_generation_rules linked to the completed issue,
   * and auto-generates follow-up issues if conditions are met.
   * Currently a stub; to be implemented in Day 10~11.
   *
   * @param issueId - Completed issue ID
   */
  async onIssueCompleted(issueId: string): Promise<void> {
    // TODO: Implement in Day 10~11
    // 1. Query task_generation_rules linked via completed issue's goalId
    // 2. Evaluate each rule's triggerCondition
    // 3. Auto-generate follow-up issues when conditions are met
    this.logger.info(
      { issueId },
      "TODO: Reactive rule evaluation (to be implemented in Day 10~11)",
    );
  }

  /**
   * Duplicate issue check (Jaccard word similarity based).
   *
   * Compares existing issue titles in the same company with the new title
   * and flags as duplicate if similarity >= threshold (0.5).
   *
   * @param companyId - Company ID
   * @param title - Issue title to check
   * @returns { isDuplicate, existingIssueId?, similarity }
   */
  async checkDuplicate(
    companyId: string,
    title: string,
  ): Promise<{
    isDuplicate: boolean;
    existingIssueId?: string;
    similarity: number;
  }> {
    const SIMILARITY_THRESHOLD = DUPLICATE_SIMILARITY_THRESHOLD;

    // Query existing issue titles in same company (excluding done/cancelled)
    const existingIssues = await this.db
      .select({ id: issues.id, title: issues.title })
      .from(issues)
      .where(
        and(
          eq(issues.companyId, companyId),
          sql`${issues.status} NOT IN ('done', 'cancelled')`,
        ),
      );

    const inputWords = this.tokenize(title);

    let bestSimilarity = 0;
    let bestMatchId: string | undefined;

    for (const existing of existingIssues) {
      const existingWords = this.tokenize(existing.title);
      const similarity = this.jaccardSimilarity(inputWords, existingWords);

      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatchId = existing.id;
      }
    }

    const isDuplicate = bestSimilarity >= SIMILARITY_THRESHOLD;

    if (isDuplicate) {
      this.logger.info(
        { companyId, title, existingIssueId: bestMatchId, similarity: bestSimilarity },
        "Duplicate issue detected",
      );
    }

    if (isDuplicate && bestMatchId) {
      return { isDuplicate: true, existingIssueId: bestMatchId, similarity: bestSimilarity };
    }

    return { isDuplicate: false, similarity: bestSimilarity };
  }

  /**
   * Tokenizes text into a lowercase word set.
   */
  private tokenize(text: string): Set<string> {
    return new Set(
      text
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .split(/\s+/)
        .filter((w) => w.length > 0),
    );
  }

  /**
   * Calculates Jaccard similarity between two word sets.
   *
   * Jaccard = |A ∩ B| / |A ∪ B|
   */
  private jaccardSimilarity(a: Set<string>, b: Set<string>): number {
    if (a.size === 0 && b.size === 0) return 1;

    let intersection = 0;
    for (const word of a) {
      if (b.has(word)) intersection++;
    }

    const union = a.size + b.size - intersection;
    return union === 0 ? 0 : intersection / union;
  }
}

// server/src/services/autonomy/peer-review-engine.ts
import { eq, and, sql, desc } from "drizzle-orm";
import {
  agents,
  issues,
  companies,
  agentPeerReviews,
} from "@letro/db/schema";
import type { ServiceDependencies } from "../index.js";
import { omitUndefined } from "../../lib/strip-undefined.js";

/**
 * Peer review engine.
 *
 * Manages the peer review process for agent work outputs:
 * - Create review requests and auto-select reviewers
 * - Autonomy-based auto-approval decisions
 * - Update issue status based on review results
 *
 * Reviewer selection: active member in same company with fewest recent reviews
 */
export class PeerReviewEngine {
  private db;
  private logger;

  constructor(deps: ServiceDependencies) {
    this.db = deps.db;
    this.logger = deps.logger;
  }

  /**
   * Requests a peer review.
   *
   * 1. Check auto-approval conditions (autonomy >= 4 + peer review not required)
   * 2. If auto-approved, return approved immediately
   * 3. If no reviewer available (1 member team), auto-approve
   * 4. Create review record + change issue status to in_review
   *
   * @param issueId - Issue ID
   * @param requestedByAgentId - Agent ID that requested review
   * @param runId - Heartbeat run ID (optional)
   * @param reviewType - Review type (default: code_review)
   * @returns Created peer review record
   */
  async requestReview(
    issueId: string,
    requestedByAgentId: string,
    runId?: string,
    reviewType = "code_review",
  ) {
    const issue = await this.db.query.issues.findFirst({
      where: eq(issues.id, issueId),
    });
    if (!issue) {
      throw new Error("이슈를 찾을 수 없어요");
    }

    this.logger.info(
      { issueId, requestedByAgentId, reviewType },
      "Peer review requested",
    );

    // 1. Check auto-approval
    const autoApproved = await this.checkAutoApproval(issue.companyId, issueId);
    if (autoApproved) {
      await this.db
        .update(issues)
        .set(omitUndefined({ peerReviewStatus: "approved", updatedAt: new Date() }))
        .where(eq(issues.id, issueId));

      this.logger.info({ issueId }, "Peer review auto-approved");
      return {
        id: "auto",
        companyId: issue.companyId,
        issueId,
        reviewerAgentId: null,
        revieweeAgentId: requestedByAgentId,
        verdict: "approved" as const,
        autoApproved: true,
      };
    }

    // 2. Select reviewer
    const reviewer = await this.selectReviewer(issueId, requestedByAgentId);
    if (!reviewer) {
      // Auto-approve if no reviewer available (single-member team)
      await this.db
        .update(issues)
        .set(omitUndefined({ peerReviewStatus: "approved", updatedAt: new Date() }))
        .where(eq(issues.id, issueId));

      this.logger.info({ issueId }, "No reviewer available — auto-approved");
      return {
        id: "no_reviewer",
        companyId: issue.companyId,
        issueId,
        reviewerAgentId: null,
        revieweeAgentId: requestedByAgentId,
        verdict: "approved" as const,
        autoApproved: true,
      };
    }

    // 3. Create peer review record
    const [review] = await this.db
      .insert(agentPeerReviews)
      .values(
        omitUndefined({
          companyId: issue.companyId,
          reviewerAgentId: reviewer.id,
          revieweeAgentId: requestedByAgentId,
          issueId,
          heartbeatRunId: runId,
          reviewType,
          verdict: "pending",
        }),
      )
      .returning();

    // 4. Update issue status
    await this.db
      .update(issues)
      .set(
        omitUndefined({
          peerReviewStatus: "pending",
          reviewerAgentId: reviewer.id,
          status: "in_review",
          updatedAt: new Date(),
        }),
      )
      .where(eq(issues.id, issueId));

    this.logger.info(
      { issueId, reviewId: review!.id, reviewerAgentId: reviewer.id },
      "Peer review created",
    );

    return review!;
  }

  /**
   * Submits review results.
   *
   * - approved: Issue completed (done)
   * - needs_revision: Issue reverted to in_progress
   * - rejected: Issue reverted to todo + unassigned
   *
   * @param reviewId - Peer review ID
   * @param reviewerAgentId - Reviewer agent ID (for authorization)
   * @param verdict - Verdict (approved/needs_revision/rejected)
   * @param score - Score (0~100, optional)
   * @param feedback - Feedback text (optional)
   */
  async submitReview(
    reviewId: string,
    reviewerAgentId: string,
    verdict: string,
    score?: number,
    feedback?: string,
  ) {
    const [review] = await this.db
      .update(agentPeerReviews)
      .set(
        omitUndefined({
          verdict,
          score,
          feedback,
          updatedAt: new Date(),
        }),
      )
      .where(
        and(
          eq(agentPeerReviews.id, reviewId),
          eq(agentPeerReviews.reviewerAgentId, reviewerAgentId),
        ),
      )
      .returning();

    if (!review) {
      throw new Error("리뷰를 찾을 수 없어요");
    }

    this.logger.info(
      { reviewId, verdict, issueId: review.issueId },
      "Peer review result submitted",
    );

    // Branch issue status based on result
    switch (verdict) {
      case "approved": {
        await this.db
          .update(issues)
          .set(
            omitUndefined({
              peerReviewStatus: "approved",
              status: "done",
              updatedAt: new Date(),
            }),
          )
          .where(eq(issues.id, review.issueId!));
        break;
      }

      case "needs_revision": {
        await this.db
          .update(issues)
          .set(
            omitUndefined({
              peerReviewStatus: "needs_revision",
              status: "in_progress",
              updatedAt: new Date(),
            }),
          )
          .where(eq(issues.id, review.issueId!));
        break;
      }

      case "rejected": {
        await this.db
          .update(issues)
          .set(
            omitUndefined({
              peerReviewStatus: "not_required",
              status: "todo",
              assigneeAgentId: sql`NULL`,
              updatedAt: new Date(),
            }),
          )
          .where(eq(issues.id, review.issueId!));
        break;
      }
    }

    return review;
  }

  /**
   * Auto-selects a reviewer.
   *
   * Among active (non-terminated) members in the same company, excluding self,
   * selects the agent with the fewest reviews in the last 24 hours.
   *
   * @param issueId - Issue ID (for company identification)
   * @param excludingAgentId - Agent ID to exclude (self)
   * @returns Selected agent or null
   */
  async selectReviewer(issueId: string, excludingAgentId: string) {
    const issue = await this.db.query.issues.findFirst({
      where: eq(issues.id, issueId),
    });
    if (!issue) return null;

    // Candidates: non-terminated members in same company (excluding self)
    const candidates = await this.db
      .select()
      .from(agents)
      .where(
        and(
          eq(agents.companyId, issue.companyId),
          sql`${agents.id} != ${excludingAgentId}`,
          sql`${agents.status} != 'terminated'`,
          eq(agents.teamRole, "member"),
        ),
      );

    if (candidates.length === 0) return null;

    // Select agent with fewest reviews in last 24 hours
    const scored = await Promise.all(
      candidates.map(async (candidate) => {
        const recentReviews = await this.db
          .select({ count: sql<number>`count(*)::int` })
          .from(agentPeerReviews)
          .where(
            and(
              eq(agentPeerReviews.reviewerAgentId, candidate.id),
              sql`${agentPeerReviews.createdAt} > NOW() - INTERVAL '24 hours'`,
            ),
          );

        return {
          agent: candidate,
          recentReviewCount: Number(recentReviews[0]?.count ?? 0),
        };
      }),
    );

    // Sort by review count ascending
    scored.sort((a, b) => a.recentReviewCount - b.recentReviewCount);

    return scored[0]?.agent ?? null;
  }

  /**
   * Checks auto-approval conditions.
   *
   * - Autonomy >= 4 + peer review not required -> auto-approve
   * - Urgent task + autonomy >= 3 -> auto-approve
   */
  private async checkAutoApproval(
    companyId: string,
    issueId: string,
  ): Promise<boolean> {
    const company = await this.db.query.companies.findFirst({
      where: eq(companies.id, companyId),
    });
    if (!company) return false;

    const level = company.defaultAutonomyLevel ?? 4;

    // Level 4 + peer review not required -> auto-approve
    if (level >= 4 && !company.peerReviewRequired) return true;

    // Urgent task + Level 3+ -> auto-approve
    const issue = await this.db.query.issues.findFirst({
      where: eq(issues.id, issueId),
    });
    if (issue?.priority === "urgent" && level >= 3) return true;

    return false;
  }
}

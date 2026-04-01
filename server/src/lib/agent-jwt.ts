// server/src/lib/agent-jwt.ts
import { createHmac, timingSafeEqual } from "crypto";
import { JWT_EXPIRY_SECONDS } from "./defaults.js";

/**
 * Agent JWT (MVP: simple signed token based on HMAC-SHA256).
 *
 * Used for authentication when agents call back to the server API during heartbeat runs.
 * Implemented directly with Node.js crypto instead of the jsonwebtoken package to reduce dependencies.
 */

export interface AgentJwtPayload {
  agentId: string;
  companyId: string;
  /** Issued at (epoch seconds) */
  iat: number;
  /** Expiration time (epoch seconds) */
  exp: number;
}

function getSecret(secret?: string): string {
  return secret ?? process.env["AGENT_JWT_SECRET"] ?? "letro-agent-jwt-secret-change-me";
}

function base64UrlEncode(data: string): string {
  return Buffer.from(data, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(data: string): string {
  const padded = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded, "base64").toString("utf8");
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

/**
 * Issues an Agent JWT. Created at the start of a heartbeat run.
 * Used by agents for authentication during API callbacks.
 */
export function createAgentToken(
  agentId: string,
  companyId: string,
  secret?: string,
): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: AgentJwtPayload = {
    agentId,
    companyId,
    iat: now,
    exp: now + JWT_EXPIRY_SECONDS,
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encodedPayload, getSecret(secret));

  return `${encodedPayload}.${signature}`;
}

/**
 * Verifies an Agent JWT.
 *
 * @returns Decoded payload { agentId, companyId }
 * @throws If the token is invalid or expired
 */
export function verifyAgentToken(
  token: string,
  secret?: string,
): { agentId: string; companyId: string } {
  const parts = token.split(".");
  if (parts.length !== 2) {
    throw new Error("Invalid agent token format");
  }

  const [encodedPayload, signature] = parts as [string, string];
  const resolvedSecret = getSecret(secret);

  // Signature verification (timing-safe comparison)
  const expectedSignature = sign(encodedPayload, resolvedSecret);
  const sigBuffer = Buffer.from(signature, "base64url");
  const expectedBuffer = Buffer.from(expectedSignature, "base64url");

  if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
    throw new Error("Invalid agent token signature");
  }

  // Parse payload
  let payload: AgentJwtPayload;
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload)) as AgentJwtPayload;
  } catch {
    throw new Error("Invalid agent token payload");
  }

  // Check expiration
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    throw new Error("Agent token expired");
  }

  return { agentId: payload.agentId, companyId: payload.companyId };
}

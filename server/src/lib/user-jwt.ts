// server/src/lib/user-jwt.ts
// User-facing JWT for authenticated mode.
// Follows the same pattern as agent-jwt.ts (HMAC-SHA256, no external libs).
//
// Token strategy:
//   - accessToken  : 15-minute JWT returned in the JSON response body (held in browser memory)
//   - refreshToken : 7-day opaque token stored in the DB sessions table + httpOnly cookie

import { createHmac, randomBytes, timingSafeEqual } from "crypto";

export const ACCESS_TOKEN_EXPIRY_SECONDS = 15 * 60; // 15 minutes
export const REFRESH_TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days

// ===== JWT payload types =====

export interface UserAccessPayload {
  /** Subject — userId */
  sub: string;
  email: string;
  /** Issued-at (epoch seconds) */
  iat: number;
  /** Expiry (epoch seconds) */
  exp: number;
}

// ===== Helpers =====

function getSecret(): string {
  return (
    process.env["BETTER_AUTH_SECRET"] ??
    process.env["USER_JWT_SECRET"] ??
    "letro-user-jwt-secret-change-me-in-production"
  );
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

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

// ===== Access token =====

/**
 * Creates a short-lived access token (15 minutes).
 * Returned in the response body; stored in browser memory by the client.
 */
export function createAccessToken(
  userId: string,
  email: string,
): { token: string; expiresIn: number } {
  const now = Math.floor(Date.now() / 1000);
  const payload: UserAccessPayload = {
    sub: userId,
    email,
    iat: now,
    exp: now + ACCESS_TOKEN_EXPIRY_SECONDS,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encodedPayload);
  return {
    token: `${encodedPayload}.${signature}`,
    expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
  };
}

/**
 * Verifies an access token and returns its payload.
 * @throws If the token is invalid, tampered with, or expired.
 */
export function verifyAccessToken(token: string): UserAccessPayload {
  const parts = token.split(".");
  if (parts.length !== 2) throw new Error("Invalid token format");

  const [encodedPayload, signature] = parts as [string, string];
  const expectedSig = sign(encodedPayload);
  const sigBuf = Buffer.from(signature, "base64url");
  const expectedBuf = Buffer.from(expectedSig, "base64url");

  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    throw new Error("Invalid token signature");
  }

  let payload: UserAccessPayload;
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload)) as UserAccessPayload;
  } catch {
    throw new Error("Invalid token payload");
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) throw new Error("Token expired");

  return payload;
}

// ===== Refresh token =====

/**
 * Generates a cryptographically secure opaque refresh token.
 * Stored in the DB sessions table and sent as an httpOnly cookie.
 */
export function generateRefreshToken(): string {
  return randomBytes(40).toString("hex");
}

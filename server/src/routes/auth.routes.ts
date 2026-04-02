// server/src/routes/auth.routes.ts
import { Hono } from "hono";
import { setCookie, getCookie, deleteCookie } from "hono/cookie";
import { z } from "zod";
import type { AppBindings } from "../env.js";
import { users, sessions, accounts, companies, companyMemberships } from "@letro/db/schema";
import { eq, and } from "drizzle-orm";
import { hashPassword, verifyPassword } from "../lib/password.js";
import {
  createAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  REFRESH_TOKEN_EXPIRY_SECONDS,
} from "../lib/user-jwt.js";

export const authRoutes = new Hono<AppBindings>();

// ===== Cookie config =====
const REFRESH_COOKIE = "letro_refresh";
const COOKIE_PATH = "/api/auth";

function setRefreshCookie(c: Parameters<typeof setCookie>[0], token: string) {
  setCookie(c, REFRESH_COOKIE, token, {
    httpOnly: true,
    sameSite: "Lax",
    path: COOKIE_PATH,
    maxAge: REFRESH_TOKEN_EXPIRY_SECONDS,
    secure: c.get("config").nodeEnv === "production",
  });
}

function clearRefreshCookie(c: Parameters<typeof deleteCookie>[0]) {
  deleteCookie(c, REFRESH_COOKIE, { path: COOKIE_PATH });
}

// ===== Validation schemas =====

const RegisterSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long"),
  displayName: z
    .string()
    .min(2, "Display name must be at least 2 characters")
    .max(50, "Display name must be 50 characters or fewer")
    .trim(),
});

const LoginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

// ===== Helper: generate a short text ID =====
function newId(): string {
  const bytes = Buffer.alloc(12);
  for (let i = 0; i < 12; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes.toString("base64url");
}

// ===== GET /api/auth/session =====
// Returns the currently authenticated user.
authRoutes.get("/auth/session", async (c) => {
  const config = c.get("config");

  // local_trusted mode: return the default user without authentication
  if (config.authMode === "local_trusted") {
    return c.json({
      id: "local-user",
      email: "local@letro.ai",
      displayName: "Me",
      avatarUrl: null,
      createdAt: new Date().toISOString(),
    });
  }

  // authenticated mode: validate access token from Authorization header
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json(null, 401);
  }

  const token = authHeader.slice(7);
  let payload: ReturnType<typeof verifyAccessToken>;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return c.json(null, 401);
  }

  const db = c.get("db");
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      image: users.image,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, payload.sub))
    .limit(1);

  if (!user) return c.json(null, 401);

  return c.json({
    id: user.id,
    email: user.email,
    displayName: user.name,
    avatarUrl: user.image ?? null,
    createdAt: user.createdAt.toISOString(),
  });
});

// ===== POST /api/auth/register =====
authRoutes.post("/auth/register", async (c) => {
  const config = c.get("config");
  if (config.authMode === "local_trusted") {
    return c.json({ error: "This server is running in local mode and does not require authentication" }, 400);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid request format" }, 400);
  }

  const result = RegisterSchema.safeParse(body);
  if (!result.success) {
    const firstError = Object.values(result.error.flatten().fieldErrors)[0]?.[0];
    return c.json({ error: firstError ?? "Please check your input and try again" }, 400);
  }

  const { email, password, displayName } = result.data;
  const db = c.get("db");

  // Check for existing email
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  if (existing) {
    return c.json({ error: "This email is already in use" }, 409);
  }

  // Hash password
  const hashedPwd = await hashPassword(password);

  // Create user
  const userId = newId();
  const now = new Date();

  await db.insert(users).values({
    id: userId,
    name: displayName,
    email: email.toLowerCase(),
    emailVerified: false,
    createdAt: now,
    updatedAt: now,
  });

  // Store credential in accounts table (Better Auth credential provider format)
  await db.insert(accounts).values({
    id: newId(),
    userId,
    accountId: email.toLowerCase(),
    providerId: "credential",
    password: hashedPwd,
    createdAt: now,
    updatedAt: now,
  });

  // Create a default workspace (company) for this user.
  // companies.id is a UUID with defaultRandom(), so we use .returning() to get it.
  const [newCompany] = await db
    .insert(companies)
    .values({
      name: `${displayName}'s Workspace`,
      slug: `user-${userId.slice(0, 8)}`,
      defaultAutonomyLevel: 4,
      autoHireEnabled: true,
      autoFireEnabled: false,
      explorationEnabled: true,
      peerReviewRequired: false,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: companies.id });

  if (newCompany) {
    await db.insert(companyMemberships).values({
      userId,
      companyId: newCompany.id,
      role: "owner",
      createdAt: now,
      updatedAt: now,
    });
  }

  // Create session (refresh token stored in DB)
  const refreshToken = generateRefreshToken();
  const sessionId = newId();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_SECONDS * 1000);

  await db.insert(sessions).values({
    id: sessionId,
    userId,
    token: refreshToken,
    expiresAt,
    ipAddress: c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip") ?? null,
    userAgent: c.req.header("user-agent") ?? null,
    createdAt: now,
    updatedAt: now,
  });

  // Issue access token
  const { token: accessToken, expiresIn } = createAccessToken(userId, email.toLowerCase());

  // Set httpOnly refresh cookie
  setRefreshCookie(c, refreshToken);

  return c.json(
    {
      user: {
        id: userId,
        email: email.toLowerCase(),
        displayName,
        avatarUrl: null,
        createdAt: now.toISOString(),
      },
      accessToken,
      expiresIn,
    },
    201,
  );
});

// ===== POST /api/auth/login =====
authRoutes.post("/auth/login", async (c) => {
  const config = c.get("config");
  if (config.authMode === "local_trusted") {
    return c.json({ error: "This server is running in local mode and does not require authentication" }, 400);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid request format" }, 400);
  }

  const result = LoginSchema.safeParse(body);
  if (!result.success) {
    const firstError = Object.values(result.error.flatten().fieldErrors)[0]?.[0];
    return c.json({ error: firstError ?? "Email and password are required" }, 400);
  }

  const { email, password } = result.data;
  const db = c.get("db");

  // Look up user by email
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  if (!user) {
    // Use identical error message to prevent email enumeration
    return c.json({ error: "Invalid email or password" }, 401);
  }

  // Look up credential in accounts
  const [credential] = await db
    .select({ password: accounts.password })
    .from(accounts)
    .where(
      and(eq(accounts.userId, user.id), eq(accounts.providerId, "credential")),
    )
    .limit(1);

  if (!credential?.password) {
    return c.json({ error: "Invalid email or password" }, 401);
  }

  const isValid = await verifyPassword(password, credential.password);
  if (!isValid) {
    return c.json({ error: "Invalid email or password" }, 401);
  }

  // Create new session
  const refreshToken = generateRefreshToken();
  const sessionId = newId();
  const now = new Date();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_SECONDS * 1000);

  await db.insert(sessions).values({
    id: sessionId,
    userId: user.id,
    token: refreshToken,
    expiresAt,
    ipAddress: c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip") ?? null,
    userAgent: c.req.header("user-agent") ?? null,
    createdAt: now,
    updatedAt: now,
  });

  // Issue access token
  const { token: accessToken, expiresIn } = createAccessToken(user.id, user.email);

  // Set httpOnly refresh cookie
  setRefreshCookie(c, refreshToken);

  return c.json({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.name,
      avatarUrl: user.image ?? null,
      createdAt: user.createdAt.toISOString(),
    },
    accessToken,
    expiresIn,
  });
});

// ===== POST /api/auth/logout =====
authRoutes.post("/auth/logout", async (c) => {
  const config = c.get("config");
  if (config.authMode === "local_trusted") {
    return c.body(null, 204);
  }

  const refreshToken = getCookie(c, REFRESH_COOKIE);
  if (refreshToken) {
    const db = c.get("db");
    await db.delete(sessions).where(eq(sessions.token, refreshToken));
  }

  clearRefreshCookie(c);
  return c.body(null, 204);
});

// ===== POST /api/auth/refresh =====
// Exchanges a valid refresh token cookie for a new access token.
authRoutes.post("/auth/refresh", async (c) => {
  const config = c.get("config");
  if (config.authMode === "local_trusted") {
    return c.json({ error: "Token refresh is not needed in local mode" }, 400);
  }

  const refreshToken = getCookie(c, REFRESH_COOKIE);
  if (!refreshToken) {
    return c.json({ error: "Login required" }, 401);
  }

  const db = c.get("db");

  // Find the session
  const [session] = await db
    .select({
      id: sessions.id,
      userId: sessions.userId,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .where(eq(sessions.token, refreshToken))
    .limit(1);

  if (!session) {
    clearRefreshCookie(c);
    return c.json({ error: "Session expired. Please log in again" }, 401);
  }

  if (session.expiresAt < new Date()) {
    await db.delete(sessions).where(eq(sessions.id, session.id));
    clearRefreshCookie(c);
    return c.json({ error: "Session expired. Please log in again" }, 401);
  }

  // Look up user
  const [user] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!user) {
    clearRefreshCookie(c);
    return c.json({ error: "User not found" }, 401);
  }

  // Rotate: issue new access token (refresh token stays the same unless near expiry)
  const { token: accessToken, expiresIn } = createAccessToken(user.id, user.email);

  // Update session updatedAt
  await db
    .update(sessions)
    .set({ updatedAt: new Date() })
    .where(eq(sessions.id, session.id));

  return c.json({ accessToken, expiresIn });
});

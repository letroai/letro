// server/src/config.ts
import { z } from "zod";

const configSchema = z.object({
  // Server
  port: z.coerce.number().default(3000),
  host: z.string().default("0.0.0.0"),
  nodeEnv: z.enum(["development", "production", "test"]).default("development"),

  // Database
  databaseUrl: z.string().optional(),
  embeddedPgDir: z.string().default(".embedded-pg"),

  // Auth
  authMode: z.enum(["local_trusted", "authenticated"]).default("local_trusted"),
  betterAuthSecret: z.string().optional(),

  // Autonomy
  defaultAutonomyLevel: z.coerce.number().min(1).max(4).default(4),

  // Logging
  logLevel: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .default("info"),
  logPretty: z
    .string()
    .transform((v) => v === "true")
    .default("true"),

  // Workspaces
  workspacesDir: z.string().default("./workspaces"),

  // Extensions
  redisUrl: z.string().optional(),
  storageDir: z.string().default("./storage"),
  secretsEncryptionKey: z.string().optional(),

  // Letro mode
  letroMode: z.enum(["local", "cloud"]).default("local"),
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(): Config {
  return configSchema.parse({
    port: process.env["PORT"],
    host: process.env["HOST"],
    nodeEnv: process.env["NODE_ENV"],
    databaseUrl: process.env["DATABASE_URL"],
    embeddedPgDir: process.env["EMBEDDED_PG_DIR"],
    authMode: process.env["AUTH_MODE"],
    betterAuthSecret: process.env["BETTER_AUTH_SECRET"],
    defaultAutonomyLevel: process.env["DEFAULT_AUTONOMY_LEVEL"],
    logLevel: process.env["LOG_LEVEL"],
    logPretty: process.env["LOG_PRETTY"],
    workspacesDir: process.env["WORKSPACES_DIR"],
    redisUrl: process.env["REDIS_URL"],
    storageDir: process.env["STORAGE_DIR"],
    secretsEncryptionKey: process.env["SECRETS_ENCRYPTION_KEY"],
    letroMode: process.env["LETRO_MODE"],
  });
}

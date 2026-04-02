// server/src/services/secret.service.ts
import { eq, desc } from "drizzle-orm";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { companySecrets, companySecretVersions } from "@letro/db/schema";
import type { ServiceDependencies } from "./index.js";
import { omitUndefined } from "../lib/strip-undefined.js";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const SALT = "letro-secrets-v1"; // Static salt for key derivation

/**
 * Manages encrypted secrets (API keys, tokens) for agent execution.
 *
 * Secrets are encrypted with AES-256-GCM at rest.
 * During heartbeat execution, secrets are resolved to environment variables
 * and injected into the agent's process.
 */
export class SecretService {
  private db;
  private logger;
  private encryptionKey: Buffer | null;

  constructor(deps: ServiceDependencies) {
    this.db = deps.db;
    this.logger = deps.logger;

    // Derive 32-byte key from config or generate a default for local mode
    const rawKey = deps.config.secretsEncryptionKey;
    if (rawKey) {
      this.encryptionKey = scryptSync(rawKey, SALT, 32);
    } else {
      // Local mode: use a deterministic key derived from "letro-local"
      this.encryptionKey = scryptSync("letro-local-default-key", SALT, 32);
      this.logger.warn("No SECRETS_ENCRYPTION_KEY set — using default key (safe for local single-user only)");
    }
  }

  /** Lists all secrets for a company (without values). */
  async list(companyId: string) {
    return this.db
      .select({
        id: companySecrets.id,
        key: companySecrets.key,
        description: companySecrets.description,
        envVar: companySecrets.envVar,
        createdAt: companySecrets.createdAt,
        updatedAt: companySecrets.updatedAt,
      })
      .from(companySecrets)
      .where(eq(companySecrets.companyId, companyId));
  }

  /** Gets a single secret metadata (without value). */
  async getById(id: string) {
    return this.db.query.companySecrets.findFirst({
      where: eq(companySecrets.id, id),
    });
  }

  /** Creates a new secret with an encrypted value. */
  async create(
    companyId: string,
    input: { key: string; value: string; description?: string; envVar?: string },
  ) {
    const [secret] = await this.db
      .insert(companySecrets)
      .values(omitUndefined({
        companyId,
        key: input.key,
        description: input.description,
        envVar: input.envVar ?? input.key.toUpperCase().replace(/[^A-Z0-9]/g, "_"),
      }))
      .returning();

    // Store encrypted value as version 1
    const encrypted = this.encrypt(input.value);
    await this.db.insert(companySecretVersions).values({
      secretId: secret!.id,
      encryptedValue: encrypted,
      version: 1,
    });

    this.logger.info({ companyId, key: input.key }, "Secret created");
    return secret!;
  }

  /** Updates (rotates) a secret's value by creating a new version. */
  async rotate(id: string, newValue: string) {
    // Get current latest version number
    const latest = await this.db
      .select({ version: companySecretVersions.version })
      .from(companySecretVersions)
      .where(eq(companySecretVersions.secretId, id))
      .orderBy(desc(companySecretVersions.version))
      .limit(1);

    const nextVersion = (latest[0]?.version ?? 0) + 1;
    const encrypted = this.encrypt(newValue);

    await this.db.insert(companySecretVersions).values({
      secretId: id,
      encryptedValue: encrypted,
      version: nextVersion,
    });

    await this.db
      .update(companySecrets)
      .set({ updatedAt: new Date() })
      .where(eq(companySecrets.id, id));

    this.logger.info({ secretId: id, version: nextVersion }, "Secret rotated");
    return { version: nextVersion };
  }

  /** Deletes a secret and all its versions. */
  async delete(id: string) {
    const [deleted] = await this.db
      .delete(companySecrets)
      .where(eq(companySecrets.id, id))
      .returning();
    return deleted ?? null;
  }

  /**
   * Resolves all secrets for a company into environment variable bindings.
   * Used by heartbeat to inject secrets into agent processes.
   */
  async resolveEnvBindings(companyId: string): Promise<Record<string, string>> {
    const secrets = await this.db
      .select({
        id: companySecrets.id,
        envVar: companySecrets.envVar,
      })
      .from(companySecrets)
      .where(eq(companySecrets.companyId, companyId));

    const env: Record<string, string> = {};

    for (const secret of secrets) {
      if (!secret.envVar) continue;

      // Get latest version
      const [latest] = await this.db
        .select({ encryptedValue: companySecretVersions.encryptedValue })
        .from(companySecretVersions)
        .where(eq(companySecretVersions.secretId, secret.id))
        .orderBy(desc(companySecretVersions.version))
        .limit(1);

      if (latest) {
        try {
          env[secret.envVar] = this.decrypt(latest.encryptedValue);
        } catch (err) {
          this.logger.error({ secretId: secret.id, err }, "Failed to decrypt secret");
        }
      }
    }

    return env;
  }

  private encrypt(plaintext: string): string {
    if (!this.encryptionKey) throw new Error("Encryption key not configured");
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, "utf-8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    // Format: iv:tag:ciphertext (all base64)
    return `${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
  }

  private decrypt(ciphertext: string): string {
    if (!this.encryptionKey) throw new Error("Encryption key not configured");
    const [ivB64, tagB64, encB64] = ciphertext.split(":");
    if (!ivB64 || !tagB64 || !encB64) throw new Error("Invalid ciphertext format");
    const iv = Buffer.from(ivB64, "base64");
    const tag = Buffer.from(tagB64, "base64");
    const encrypted = Buffer.from(encB64, "base64");
    const decipher = createDecipheriv(ALGORITHM, this.encryptionKey, iv);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted) + decipher.final("utf-8");
  }
}

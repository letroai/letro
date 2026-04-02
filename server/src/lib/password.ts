// server/src/lib/password.ts
// Secure password hashing using Node.js built-in scrypt.
// No external dependencies required.

import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

const SALT_BYTES = 16;
const KEY_LENGTH = 64;
const SEPARATOR = ":";

/**
 * Hashes a plain-text password using scrypt.
 * Output format: "<salt_hex>:<hash_hex>"
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES).toString("hex");
  const derived = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  return `${salt}${SEPARATOR}${derived.toString("hex")}`;
}

/**
 * Verifies a plain-text password against a stored hash.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const separatorIdx = storedHash.indexOf(SEPARATOR);
  if (separatorIdx === -1) return false;

  const salt = storedHash.slice(0, separatorIdx);
  const hashHex = storedHash.slice(separatorIdx + 1);

  if (!salt || !hashHex) return false;

  try {
    const derived = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
    const storedBuffer = Buffer.from(hashHex, "hex");
    if (derived.length !== storedBuffer.length) return false;
    return timingSafeEqual(derived, storedBuffer);
  } catch {
    return false;
  }
}

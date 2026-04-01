// server/src/extensions/auth-provider.ts
import type { Actor } from "../env.js";

export interface AuthProvider {
  resolveSession(req: Request): Promise<Actor | null>;
}

import { z } from "zod";

export const OAuthProviderSchema = z.enum([
  "github",
  "google",
  "slack",
  "anthropic",
]);
export type OAuthProvider = z.infer<typeof OAuthProviderSchema>;

export const OAuthConnectionStatusSchema = z.enum([
  "active",
  "expired",
  "revoked",
]);

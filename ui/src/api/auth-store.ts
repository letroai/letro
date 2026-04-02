// ui/src/api/auth-store.ts
// Module-level singleton that holds the in-memory access token.
// Updated by AuthProvider; read by the API client to inject Authorization headers.
// The access token is intentionally short-lived (15 min) and never persisted to disk.

interface AuthTokenStore {
  accessToken: string | null;
  /** Epoch ms when the token expires */
  expiresAt: number;
  /** Called when a 401 occurs and the refresh fails (redirect to /auth) */
  onUnauthorized: (() => void) | null;
}

const store: AuthTokenStore = {
  accessToken: null,
  expiresAt: 0,
  onUnauthorized: null,
};

/** Store a new access token received from the server. */
export function setAccessToken(token: string, expiresIn: number): void {
  store.accessToken = token;
  // Subtract a 30-second buffer so we refresh before the token actually expires
  store.expiresAt = Date.now() + (expiresIn - 30) * 1000;
}

/** Clear the in-memory token (on logout). */
export function clearAccessToken(): void {
  store.accessToken = null;
  store.expiresAt = 0;
}

/**
 * Returns the access token if it is still valid, otherwise null.
 * The caller should then attempt a refresh.
 */
export function getAccessToken(): string | null {
  if (!store.accessToken) return null;
  if (Date.now() >= store.expiresAt) return null;
  return store.accessToken;
}

/** Returns true when the token is absent or within 30 seconds of expiry. */
export function isTokenExpiringSoon(): boolean {
  if (!store.accessToken) return true;
  return Date.now() >= store.expiresAt;
}

/** Register a callback that is invoked when the user's session is completely invalid. */
export function setUnauthorizedHandler(handler: () => void): void {
  store.onUnauthorized = handler;
}

/** Trigger the unauthorized handler (e.g. refresh failed → redirect to /auth). */
export function triggerUnauthorized(): void {
  store.onUnauthorized?.();
}

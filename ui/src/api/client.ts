// ui/src/api/client.ts
import { getAccessToken, setAccessToken, triggerUnauthorized } from "./auth-store";

const BASE_URL = "/api";

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body: unknown,
  ) {
    super(`API Error ${status}: ${statusText}`);
    this.name = "ApiError";
  }
}

type QueryParams = Record<string, string | number | boolean | undefined>;

function buildUrl(path: string, params?: QueryParams): string {
  const url = `${BASE_URL}${path}`;
  if (!params) return url;

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      searchParams.set(key, String(value));
    }
  }
  const qs = searchParams.toString();
  return qs ? `${url}?${qs}` : url;
}

// Prevent parallel refresh attempts
let refreshPromise: Promise<void> | null = null;

async function attemptTokenRefresh(): Promise<void> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const data = (await res.json()) as { accessToken: string; expiresIn: number };
        setAccessToken(data.accessToken, data.expiresIn);
      } else {
        triggerUnauthorized();
      }
    } catch {
      triggerUnauthorized();
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function request<T>(
  method: string,
  path: string,
  options?: {
    body?: unknown;
    params?: QueryParams;
    skipAuth?: boolean;
  },
): Promise<T> {
  const url = buildUrl(path, options?.params);

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  // Inject Bearer token if available (authenticated mode)
  if (!options?.skipAuth) {
    const token = getAccessToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  let bodyInit: BodyInit | undefined;
  if (options?.body !== undefined) {
    headers["Content-Type"] = "application/json";
    bodyInit = JSON.stringify(options.body);
  }

  const res = await fetch(url, {
    method,
    headers,
    body: bodyInit,
    credentials: "include",
  });

  // On 401: attempt one token refresh, then retry
  if (res.status === 401 && !options?.skipAuth) {
    await attemptTokenRefresh();

    // Retry with the new token
    const newToken = getAccessToken();
    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
    }

    const retryRes = await fetch(url, {
      method,
      headers,
      body: bodyInit,
      credentials: "include",
    });

    if (!retryRes.ok) {
      if (retryRes.status === 401) {
        triggerUnauthorized();
      }
      let body: unknown;
      try {
        body = await retryRes.json();
      } catch {
        body = await retryRes.text().catch(() => null);
      }
      throw new ApiError(retryRes.status, retryRes.statusText, body);
    }

    if (retryRes.status === 204) return undefined as T;
    return retryRes.json() as Promise<T>;
  }

  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = await res.text().catch(() => null);
    }
    throw new ApiError(res.status, res.statusText, body);
  }

  // 204 No Content
  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export const api = {
  get<T>(path: string, params?: QueryParams): Promise<T> {
    return request<T>("GET", path, { params });
  },

  post<T>(path: string, body?: unknown, opts?: { skipAuth?: boolean }): Promise<T> {
    return request<T>("POST", path, { body, ...opts });
  },

  patch<T>(path: string, body?: unknown): Promise<T> {
    return request<T>("PATCH", path, { body });
  },

  put<T>(path: string, body?: unknown): Promise<T> {
    return request<T>("PUT", path, { body });
  },

  delete<T>(path: string): Promise<T> {
    return request<T>("DELETE", path);
  },
};

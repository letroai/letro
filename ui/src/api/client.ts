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

async function request<T>(
  method: string,
  path: string,
  options?: {
    body?: unknown;
    params?: QueryParams;
  },
): Promise<T> {
  const url = buildUrl(path, options?.params);

  const headers: HeadersInit = {
    Accept: "application/json",
  };

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

  post<T>(path: string, body?: unknown): Promise<T> {
    return request<T>("POST", path, { body });
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

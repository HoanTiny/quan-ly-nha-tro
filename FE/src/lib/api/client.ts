import { getAuthSession } from "@/lib/auth/session";

type QueryParams = Record<string, string | number | boolean | undefined>;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api";

function buildUrl(path: string, params?: QueryParams) {
  const normalizedBase = API_BASE_URL.endsWith("/") ? API_BASE_URL : `${API_BASE_URL}/`;
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  const url = new URL(normalizedPath, normalizedBase);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
}

async function request<T>(path: string, init?: RequestInit, params?: QueryParams): Promise<T> {
  const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;
  const authSession = getAuthSession();
  const response = await fetch(buildUrl(path, params), {
    ...init,
    credentials: "include",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(authSession?.accessToken ? { Authorization: `Bearer ${authSession.accessToken}` } : {}),
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    let message = `Yeu cau that bai (${response.status})`;

    try {
      const errorBody = await response.json();
      message = errorBody?.message ?? message;
    } catch {
      try {
        const text = await response.text();
        if (text) {
          message = text;
        }
      } catch {
        // noop
      }
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const apiClient = {
  get<T>(path: string, params?: QueryParams) {
    return request<T>(path, { method: "GET" }, params);
  },
  post<T>(path: string, body?: unknown) {
    return request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined
    });
  },
  postForm<T>(path: string, body: FormData) {
    return request<T>(path, {
      method: "POST",
      body
    });
  },
  put<T>(path: string, body?: unknown) {
    return request<T>(path, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined
    });
  },
  patch<T>(path: string, body?: unknown) {
    return request<T>(path, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined
    });
  },
  delete<T>(path: string) {
    return request<T>(path, { method: "DELETE" });
  }
};

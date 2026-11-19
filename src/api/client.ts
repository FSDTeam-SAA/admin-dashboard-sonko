import { getLanguage } from "../i18n/language";
import { API_BASE } from "./config";
import { endSession, getTokens, setTokens } from "./session";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** Needed by every money and settings action (see lib/idempotency.ts). */
  idempotencyKey?: string;
  /** Leave the Authorization header off (login only). */
  noAuth?: boolean;
};

const TIMEOUT_MS = 20_000;
const GENERIC = "Something went wrong. Please try again.";

let refreshing: Promise<boolean> | null = null;

// One refresh at a time: if three calls fail together, they wait for the
// same refresh instead of racing (the server keeps only the newest token).
function refreshOnce(): Promise<boolean> {
  if (!refreshing) {
    refreshing = doRefresh().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

async function doRefresh(): Promise<boolean> {
  const current = getTokens();
  if (!current) return false;
  try {
    const data = await send<{ accessToken: string; refreshToken: string }>(
      "/auth/refresh-token",
      { method: "POST", body: { refreshToken: current.refresh }, noAuth: true },
      false,
    );
    if (!data?.accessToken || !data?.refreshToken) return false;
    setTokens({ access: data.accessToken, refresh: data.refreshToken });
    return true;
  } catch {
    return false;
  }
}

async function send<T>(path: string, options: RequestOptions, mayRefresh: boolean): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    // The staff member's panel language. The server answers in French where
    // it has French, and in English otherwise.
    "Accept-Language": getLanguage(),
  };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.idempotencyKey) headers["Idempotency-Key"] = options.idempotencyKey;
  const tokens = getTokens();
  if (!options.noAuth && tokens) headers.Authorization = `Bearer ${tokens.access}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: options.method || "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      // Tokens go in the header, never in cookies, so other sites can't make
      // the browser act for the staff member.
      credentials: "omit",
      cache: "no-store",
      redirect: "error",
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(0, "Could not reach the server. Check your connection and try again.");
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 401 && !options.noAuth && mayRefresh) {
    if (await refreshOnce()) return send<T>(path, options, false);
    endSession("expired");
    throw new ApiError(401, "Your session has ended. Please log in again.");
  }

  let payload: { success?: boolean; message?: unknown; data?: T } | null = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok || payload?.success === false) {
    const message = typeof payload?.message === "string" && payload.message ? payload.message : GENERIC;
    throw new ApiError(response.status, message);
  }
  return payload?.data as T;
}

export function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return send<T>(path, options, true);
}

import { api } from "./client";
import { clearTokens, endSession, getTokens, setTokens } from "./session";

export type Staff = {
  _id: string;
  name: string;
  phone: string;
  role: string;
  permissions: string[];
  fullAdmin: boolean;
};

export const NOT_STAFF = "This account is not a Sunu Pay staff account.";

type LoginData = { accessToken: string; refreshToken: string; role: string };

/**
 * Logs a staff member in with their phone number and PIN, then loads what
 * they may do. A customer or agent account is turned away and its tokens
 * are dropped without logging it out of its phone.
 */
export async function login(phone: string, pin: string): Promise<Staff> {
  clearTokens();
  const data = await api<LoginData>("/auth/login", {
    method: "POST",
    body: { phone: phone.replace(/\s+/g, ""), password: pin },
    noAuth: true,
  });
  if (data?.role !== "admin" || !data.accessToken || !data.refreshToken) {
    clearTokens();
    throw new Error(NOT_STAFF);
  }
  setTokens({ access: data.accessToken, refresh: data.refreshToken });
  try {
    const me = await loadMe();
    if (me.role !== "admin") throw new Error(NOT_STAFF);
    return me;
  } catch (error) {
    clearTokens();
    throw error;
  }
}

export function loadMe(): Promise<Staff> {
  return api<Staff>("/admin/me");
}

/** Ends the session on the server too, so the tokens stop working at once. */
export async function logout(reason: "logout" | "idle" = "logout"): Promise<void> {
  if (getTokens()) {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {
      // The tokens are forgotten below either way.
    }
  }
  endSession(reason);
}

export function can(staff: Staff | null, permission: string): boolean {
  return Boolean(staff?.permissions.includes(permission));
}

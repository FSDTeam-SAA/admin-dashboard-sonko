import { api } from "./client";
import { clearTokens, endSession, getTokens, setTokens } from "./session";

export type Staff = {
  _id: string;
  name: string;
  phone: string;
  role: string;
  permissions: string[];
  fullAdmin: boolean;
  /** The panel language this person picked. */
  language?: "en" | "fr";
  /** The server has a translation key, so the Translate button can work. */
  translationOn?: boolean;
  /** The server has file storage and its key, so files can be attached to tickets. */
  filesOn?: boolean;
};

export const NOT_STAFF = "This account is not a Sunu Pay staff account.";
const OLD_SERVER = "Staff sign-in is not available yet. Please contact the Sunu Pay owner.";

/** After the PIN: the code step, with a 5-minute ticket that links the two. */
export type CodeStep = { ticket: string; enrolled: boolean };

type PinData = { role?: string; needsCode?: boolean; enrolled?: boolean; loginTicket?: string; accessToken?: string };

/**
 * Step 1: phone number and PIN. Staff get a ticket for the code step, never
 * a login. A customer or agent account is turned away; if the server sent
 * it tokens they are dropped without logging it out of its phone.
 */
export async function startLogin(phone: string, pin: string): Promise<CodeStep> {
  clearTokens();
  const data = await api<PinData>("/auth/login", {
    method: "POST",
    body: { phone: phone.replace(/\s+/g, ""), password: pin },
    noAuth: true,
  });
  if (data?.role !== "admin") throw new Error(NOT_STAFF);
  // A staff login without the code step means the server is out of date.
  if (!data.needsCode || typeof data.loginTicket !== "string" || !data.loginTicket) throw new Error(OLD_SERVER);
  return { ticket: data.loginTicket, enrolled: Boolean(data.enrolled) };
}

/** First login only: a new secret for the authenticator app. */
export function startSetup(ticket: string): Promise<{ secret: string; otpauthUrl: string }> {
  return api("/auth/staff/2fa/setup", { method: "POST", body: { loginTicket: ticket }, noAuth: true });
}

export type LoggedIn = { staff: Staff; recoveryCodes?: string[]; recoveryCodesLeft?: number };

type CodeData = {
  accessToken: string;
  refreshToken: string;
  role: string;
  recoveryCodes?: string[];
  recoveryCodesLeft?: number;
};

/** Step 2: the 6-digit code from the app, or a one-off recovery code. */
export async function finishLogin(ticket: string, answer: { code: string } | { recoveryCode: string }): Promise<LoggedIn> {
  clearTokens();
  const data = await api<CodeData>("/auth/staff/2fa/verify", {
    method: "POST",
    body: { loginTicket: ticket, ...answer },
    noAuth: true,
  });
  if (data?.role !== "admin" || !data.accessToken || !data.refreshToken) throw new Error(NOT_STAFF);
  setTokens({ access: data.accessToken, refresh: data.refreshToken });
  try {
    const staff = await loadMe();
    if (staff.role !== "admin") throw new Error(NOT_STAFF);
    return {
      staff,
      recoveryCodes: Array.isArray(data.recoveryCodes) ? data.recoveryCodes : undefined,
      recoveryCodesLeft: typeof data.recoveryCodesLeft === "number" ? data.recoveryCodesLeft : undefined,
    };
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

/** Saves this staff member's own panel language on their account. */
export function saveMyLanguage(language: "en" | "fr") {
  return api("/admin/me/language", { method: "PUT", body: { language } });
}

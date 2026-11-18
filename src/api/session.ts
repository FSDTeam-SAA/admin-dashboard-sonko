// The staff member's tokens live in memory only: never in localStorage,
// sessionStorage or cookies, so a script that slips onto the page or a
// shared computer can't pick them up later. Reloading the page or closing
// the tab logs the staff member out. That is on purpose.

export type Tokens = { access: string; refresh: string };

export type EndReason = "logout" | "expired" | "idle";

let tokens: Tokens | null = null;
const listeners = new Set<(reason: EndReason) => void>();

export function setTokens(next: Tokens): void {
  tokens = { access: next.access, refresh: next.refresh };
}

export function getTokens(): Tokens | null {
  return tokens;
}

export function clearTokens(): void {
  tokens = null;
}

/** Forget the tokens and tell the app, which shows the login page. */
export function endSession(reason: EndReason): void {
  const hadSession = tokens !== null;
  tokens = null;
  if (hadSession) listeners.forEach((listener) => listener(reason));
}

export function onSessionEnd(listener: (reason: EndReason) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** A staff member who has not touched the panel for 15 minutes is logged out. */
export const IDLE_LIMIT_MS = 15 * 60 * 1000;

export function isIdle(lastActivity: number, now: number, limit = IDLE_LIMIT_MS): boolean {
  return now - lastActivity >= limit;
}

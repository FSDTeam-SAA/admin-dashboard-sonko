import { describe, expect, it, vi, beforeEach } from "vitest";
import { clearTokens, endSession, getTokens, isIdle, onSessionEnd, setTokens, IDLE_LIMIT_MS } from "../src/api/session";
import { isValidIdempotencyKey, newIdempotencyKey } from "../src/lib/idempotency";
import { visibleNav, NAV } from "../src/lib/nav";

beforeEach(() => clearTokens());

describe("session", () => {
  it("is idle after 15 minutes without activity, not before", () => {
    expect(isIdle(0, IDLE_LIMIT_MS - 1)).toBe(false);
    expect(isIdle(0, IDLE_LIMIT_MS)).toBe(true);
  });

  it("ending a session forgets the tokens and tells listeners once", () => {
    const listener = vi.fn();
    const stop = onSessionEnd(listener);
    setTokens({ access: "a", refresh: "r" });
    endSession("expired");
    endSession("expired");
    expect(getTokens()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith("expired");
    stop();
  });

  it("never writes tokens to browser storage", () => {
    setTokens({ access: "secret-access", refresh: "secret-refresh" });
    const stored = JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }) + document.cookie;
    expect(stored).not.toContain("secret");
  });
});

describe("idempotency keys", () => {
  it("are accepted by the server's rule and differ each time", () => {
    const a = newIdempotencyKey();
    const b = newIdempotencyKey();
    expect(isValidIdempotencyKey(a)).toBe(true);
    expect(a).not.toBe(b);
  });
});

describe("pages", () => {
  it("shows only Home to a staff member with no permissions", () => {
    expect(visibleNav([]).map((item) => item.path)).toEqual(["/"]);
  });

  it("shows a page when its permission is held", () => {
    expect(visibleNav(["view_holds"]).map((item) => item.path)).toEqual(["/", "/holds"]);
  });

  it("every page has a unique address", () => {
    const paths = NAV.map((item) => item.path);
    expect(new Set(paths).size).toBe(paths.length);
  });
});

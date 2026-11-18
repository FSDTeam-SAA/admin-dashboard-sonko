import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { api, ApiError } from "../src/api/client";
import { clearTokens, getTokens, onSessionEnd, setTokens } from "../src/api/session";
import { login, NOT_STAFF } from "../src/api/staff";

type Call = { url: string; init: RequestInit };

function reply(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

let calls: Call[];
let answers: Array<(call: Call) => Response>;

beforeEach(() => {
  clearTokens();
  calls = [];
  answers = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      const call = { url, init };
      calls.push(call);
      const next = answers.shift();
      if (!next) throw new Error(`unexpected call to ${url}`);
      return next(call);
    }),
  );
});

afterEach(() => vi.unstubAllGlobals());

const headers = (call: Call) => call.init.headers as Record<string, string>;

describe("api client", () => {
  it("sends the token, the language and the idempotency key, and never cookies", async () => {
    setTokens({ access: "A1", refresh: "R1" });
    answers.push(() => reply(200, { success: true, data: { ok: 1 } }));
    const data = await api<{ ok: number }>("/admin/x", { method: "POST", body: { a: 1 }, idempotencyKey: "k".repeat(20) });
    expect(data.ok).toBe(1);
    expect(headers(calls[0]!).Authorization).toBe("Bearer A1");
    expect(headers(calls[0]!)["Idempotency-Key"]).toBe("k".repeat(20));
    expect(headers(calls[0]!)["Accept-Language"]).toBe("en");
    expect(calls[0]!.init.credentials).toBe("omit");
  });

  it("refreshes once on 401 and retries with the new token", async () => {
    setTokens({ access: "old", refresh: "R1" });
    answers.push(() => reply(401, { success: false, message: "Invalid token" }));
    answers.push(() => reply(200, { success: true, data: { accessToken: "new", refreshToken: "R2" } }));
    answers.push(() => reply(200, { success: true, data: "done" }));
    expect(await api("/admin/x")).toBe("done");
    expect(calls[1]!.url).toContain("/auth/refresh-token");
    expect(headers(calls[1]!).Authorization).toBeUndefined();
    expect(headers(calls[2]!).Authorization).toBe("Bearer new");
    expect(getTokens()).toEqual({ access: "new", refresh: "R2" });
  });

  it("ends the session when the refresh is refused", async () => {
    const ended = vi.fn();
    const stop = onSessionEnd(ended);
    setTokens({ access: "old", refresh: "R1" });
    answers.push(() => reply(401, { success: false, message: "Invalid token" }));
    answers.push(() => reply(401, { success: false, message: "Invalid refresh token" }));
    await expect(api("/admin/x")).rejects.toBeInstanceOf(ApiError);
    expect(getTokens()).toBeNull();
    expect(ended).toHaveBeenCalledWith("expired");
    stop();
  });

  it("shows the server's message on an error", async () => {
    setTokens({ access: "A", refresh: "R" });
    answers.push(() => reply(403, { success: false, message: "You do not have permission to change this setting." }));
    await expect(api("/admin/x")).rejects.toThrow("You do not have permission to change this setting.");
  });
});

describe("login", () => {
  it("turns away an account that is not staff and keeps no tokens", async () => {
    answers.push(() => reply(200, { success: true, data: { accessToken: "A", refreshToken: "R", role: "user" } }));
    await expect(login("+2207000000", "123456")).rejects.toThrow(NOT_STAFF);
    expect(getTokens()).toBeNull();
    expect(calls).toHaveLength(1);
  });

  it("logs staff in and loads what they may do", async () => {
    answers.push(() => reply(200, { success: true, data: { accessToken: "A", refreshToken: "R", role: "admin" } }));
    answers.push(() =>
      reply(200, { success: true, data: { _id: "1", name: "S", phone: "+220", role: "admin", permissions: ["view_holds"], fullAdmin: false } }),
    );
    const staff = await login("+220 700 0000", "123456");
    expect(staff.permissions).toEqual(["view_holds"]);
    expect(JSON.parse(calls[0]!.init.body as string)).toEqual({ phone: "+2207000000", password: "123456" });
    expect(headers(calls[1]!).Authorization).toBe("Bearer A");
  });

  it("drops the tokens if loading the staff member fails", async () => {
    answers.push(() => reply(200, { success: true, data: { accessToken: "A", refreshToken: "R", role: "admin" } }));
    answers.push(() => reply(403, { success: false, message: "Access denied. You are not an admin." }));
    await expect(login("+2207000000", "123456")).rejects.toThrow("Access denied");
    expect(getTokens()).toBeNull();
  });
});

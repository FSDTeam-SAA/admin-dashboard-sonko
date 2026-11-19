import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { announcements, approveAnnouncement, withdrawAnnouncement, writeAnnouncement } from "../src/api/admin";
import { clearTokens, setTokens } from "../src/api/session";
import { textProblem } from "../src/pages/AnnouncementsPage";

type Call = { url: string; init: RequestInit };
let calls: Call[];
beforeEach(() => {
  clearTokens();
  setTokens({ access: "A", refresh: "R" });
  calls = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(JSON.stringify({ success: true, data: [] }), { status: 200 });
  }));
});
afterEach(() => vi.unstubAllGlobals());
const path = (c: Call) => c.url.split("/api/v1")[1];

describe("announcements", () => {
  it("calls the right routes, with the PIN and keys where needed", async () => {
    await announcements();
    await writeAnnouncement({ titleEn: "a", titleFr: "b", bodyEn: "c", bodyFr: "d", country: "ALL", audience: "all", startsAt: "s", endsAt: "e" }, "482915", "k1");
    await approveAnnouncement("x1", "482915", "k2");
    await withdrawAnnouncement("x1", "Wrong day");
    expect(calls.map(path)).toEqual(["/admin/announcements", "/admin/announcements", "/admin/announcements/x1/approve", "/admin/announcements/x1/withdraw"]);
    expect(JSON.parse(calls[1]!.init.body as string).pin).toBe("482915");
    expect((calls[2]!.init.headers as Record<string, string>)["Idempotency-Key"]).toBe("k2");
  });

  it("refuses links and phone numbers, like the server", () => {
    expect(textProblem("Call +220 700 1234 now", 400)).toMatch(/phone/);
    expect(textProblem("See www.example.top", 400)).toMatch(/links/);
    expect(textProblem("Fees go down on 1 December.", 400)).toBeNull();
  });
});

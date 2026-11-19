import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { decidePurchase, stuckPurchases } from "../src/api/admin";
import { clearTokens, setTokens } from "../src/api/session";
import { hoursWaiting } from "../src/pages/BillsPage";

type Call = { url: string; init: RequestInit };
let calls: Call[];

beforeEach(() => {
  clearTokens();
  setTokens({ access: "A", refresh: "R" });
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ success: true, data: {} }), { status: 200 });
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

const path = (c: Call) => c.url.split("/api/v1")[1];

describe("bills and top-ups", () => {
  it("lists purchases that need checking", async () => {
    await stuckPurchases(2);
    expect(path(calls[0]!)).toBe("/admin/needs-checking?page=2&limit=25");
  });

  it("a decision sends the outcome, the reason, the PIN and an idempotency key", async () => {
    await decidePurchase("abc", { outcome: "failed", reason: "Flutterwave says failed", pin: "482915" }, "key-1");
    const c = calls[0]!;
    expect(path(c)).toBe("/admin/needs-checking/abc");
    expect(c.init.method).toBe("PATCH");
    expect(JSON.parse(c.init.body as string)).toEqual({ outcome: "failed", reason: "Flutterwave says failed", pin: "482915" });
    expect((c.init.headers as Record<string, string>)["Idempotency-Key"]).toBe("key-1");
  });

  it("shows how many hours a purchase has waited", () => {
    const now = new Date("2026-11-19T12:00:00Z").getTime();
    expect(hoursWaiting("2026-11-18T09:30:00Z", now)).toBe(26);
    expect(hoursWaiting("2026-11-20T09:30:00Z", now)).toBe(0);
  });
});

import { cancelRefundAsk, refundLimits, setRefundLimit } from "../src/api/admin";
import { limitLabel } from "../src/components/RefundLimits";

describe("refund limits", () => {
  it("reads and sets limits with the PIN and an idempotency key", async () => {
    await refundLimits();
    await setRefundLimit("GM", { amount: 3000, currency: "GMD", reason: "Start here", pin: "482915" }, "k2");
    await cancelRefundAsk("t1");
    expect(path(calls[0]!)).toBe("/admin/refund-limits");
    expect(path(calls[1]!)).toBe("/admin/refund-limits/GM");
    expect(calls[1]!.init.method).toBe("PUT");
    expect((calls[1]!.init.headers as Record<string, string>)["Idempotency-Key"]).toBe("k2");
    expect(path(calls[2]!)).toBe("/admin/needs-checking/t1/refund-ask");
    expect(calls[2]!.init.method).toBe("DELETE");
  });

  it("a limit still waiting says every refund needs two people", () => {
    expect(limitLabel({ limitMinor: -1, currency: "GMD" })).toMatch(/every refund needs two/);
    expect(limitLabel({ limitMinor: 300000, currency: "GMD" })).toBe("Up to GMD 3,000.00 with one person");
  });
});

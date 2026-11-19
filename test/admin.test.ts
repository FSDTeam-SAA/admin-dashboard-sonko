import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { askReversal, approveLift, approveReversal, cancelReversal, placeHold } from "../src/api/admin";
import { clearTokens, setTokens } from "../src/api/session";
import { money, moneyMajor } from "../src/lib/format";

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
const body = (c: Call) => JSON.parse(c.init.body as string);
const key = (c: Call) => (c.init.headers as Record<string, string>)["Idempotency-Key"];

describe("admin actions call the right server routes", () => {
  it("refund of a payment request, and reversals of a cash out and cash in", async () => {
    await askReversal("payment_request", "a".repeat(24), { reason: "SCAM_REPORTED", note: "n".repeat(20), pin: "123456" }, "k".repeat(20));
    await askReversal("cash_out", "b".repeat(24), { reason: "CASH_NOT_GIVEN", note: "n".repeat(20), pin: "123456" }, "k".repeat(20));
    await askReversal("cash_in", "c".repeat(24), { reason: "DUPLICATE", note: "n".repeat(20), pin: "123456" }, "k".repeat(20));
    expect(calls.map(path)).toEqual([
      `/admin/payment-requests/${"a".repeat(24)}/refund`,
      `/admin/cashouts/${"b".repeat(24)}/reverse`,
      `/admin/cashins/${"c".repeat(24)}/reverse`,
    ]);
    expect(body(calls[0]!)).toEqual({ reason: "SCAM_REPORTED", note: "n".repeat(20), pin: "123456" });
    expect(calls.every((c) => key(c) === "k".repeat(20))).toBe(true);
  });

  it("approving needs the PIN and an idempotency key; cancelling needs a reason", async () => {
    await approveReversal("r1", "654321", "x".repeat(20));
    await cancelReversal("r1", "Customer found the cash");
    expect(path(calls[0]!)).toBe("/admin/reversals/r1/approve");
    expect(body(calls[0]!)).toEqual({ pin: "654321" });
    expect(key(calls[0]!)).toBe("x".repeat(20));
    expect(body(calls[1]!)).toEqual({ reason: "Customer found the cash" });
  });

  it("holds: place with scope and reason, approve a lift with the PIN", async () => {
    await placeHold("u1", { scope: "all", reason: "Reported as a scam", payment_request_id: "p1", pin: "123456" }, "y".repeat(20));
    await approveLift("u1", "123456", "z".repeat(20));
    expect(calls.map(path)).toEqual(["/admin/users/u1/hold", "/admin/users/u1/hold/lift/approve"]);
    expect(body(calls[0]!).scope).toBe("all");
  });

  it("ids are escaped, so a typed id can't reach another route", async () => {
    await approveReversal("../users/x", "123456", "x".repeat(20));
    expect(path(calls[0]!)).toBe("/admin/reversals/..%2Fusers%2Fx/approve");
  });
});

describe("money", () => {
  it("shows the smallest unit as whole money, with no decimals for CFA", () => {
    expect(money(12345, "GMD")).toBe("GMD 123.45");
    expect(money(500, "gbp")).toBe("GBP 5.00");
    expect(money(5000, "XOF")).toBe("XOF 5,000");
    expect(moneyMajor(1250.5, "GMD")).toBe("GMD 1,250.50");
  });
});

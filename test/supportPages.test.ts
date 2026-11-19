import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { addTicketNote, analytics, changeTicket, customer, customers, openTicket, ticket, ticketStats, tickets } from "../src/api/admin";
import { clearTokens, setTokens } from "../src/api/session";
import { duration } from "../src/pages/TicketsPage";
import { monthLabel } from "../src/pages/AnalyticsPage";

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

describe("customers, tickets and analytics call the right routes", () => {
  it("customer list sends only the filters that are set", async () => {
    await customers("all", "", 1);
    await customers("held", "  binta ", 2);
    expect(path(calls[0]!)).toBe("/admin/customers?page=1&limit=25");
    expect(path(calls[1]!)).toBe("/admin/customers?page=2&limit=25&filter=held&search=binta");
  });

  it("an id with odd characters can't change the route", async () => {
    await customer("../x?y");
    await ticket("a/b");
    expect(path(calls[0]!)).toBe("/admin/customers/..%2Fx%3Fy");
    expect(path(calls[1]!)).toBe("/admin/tickets/a%2Fb");
  });

  it("ticket list: mine, priority and customer filters", async () => {
    await tickets({ status: "active", priority: "high", mine: true, search: "", customer: "c1" }, 1);
    await tickets({ status: "all", priority: "all", mine: false, search: "pin" }, 3);
    expect(path(calls[0]!)).toBe("/admin/tickets?page=1&limit=25&status=active&priority=high&assignedTo=me&customer=c1");
    expect(path(calls[1]!)).toBe("/admin/tickets?page=3&limit=25&search=pin");
  });

  it("opening a ticket and writing a note carry an idempotency key; a change does not need one", async () => {
    await openTicket({ subject: "Money missing", detail: "", priority: "high", category: "money_missing" }, "k".repeat(20));
    await addTicketNote("t1", "Called back", "n".repeat(20));
    await changeTicket("t1", { status: "resolved", assignedTo: null });
    expect(calls.map((c) => c.init.method)).toEqual(["POST", "POST", "PATCH"]);
    expect(path(calls[1]!)).toBe("/admin/tickets/t1/notes");
    expect(key(calls[0]!)).toBe("k".repeat(20));
    expect(key(calls[1]!)).toBe("n".repeat(20));
    expect(body(calls[2]!)).toEqual({ status: "resolved", assignedTo: null });
  });

  it("figures and analytics routes", async () => {
    await ticketStats();
    await analytics();
    expect(calls.map(path)).toEqual(["/admin/tickets/stats", "/admin/analytics"]);
  });
});

describe("small labels", () => {
  it("months and durations read plainly", () => {
    expect(monthLabel("2026-11")).toBe("Nov 2026");
    expect(monthLabel("bad")).toBe("bad");
    expect(duration(5.5)).toBe("5.5 hours");
    expect(duration(72)).toBe("3 days");
  });
});

import { auditTrail } from "../src/api/admin";
import { describeEvent, resultOf } from "../src/pages/AuditPage";

describe("audit trail", () => {
  it("asks for the filters that are set", async () => {
    await auditTrail("all", null, 1);
    await auditTrail("login_failed", "a".repeat(24), 2);
    expect(path(calls[0]!)).toBe("/admin/audit?page=1&limit=50");
    expect(path(calls[1]!)).toBe(`/admin/audit?page=2&limit=50&kind=login_failed&staff=${"a".repeat(24)}`);
  });
  it("lines read in plain words", () => {
    expect(describeEvent({ kind: "login_failed", method: "POST", route: "/api/v1/auth/login" })).toBe("Wrong PIN");
    expect(describeEvent({ kind: "action", method: "PATCH", route: "/api/v1/admin/tickets/:id" })).toBe("PATCH /admin/tickets/:id");
    expect(resultOf({ kind: "action", status: 403 }).label).toBe("Not allowed");
    expect(resultOf({ kind: "action", status: 200 }).label).toBe("Done");
    expect(resultOf({ kind: "login_code_failed", status: null }).tone).toBe("danger");
    expect(resultOf({ kind: "action", status: 500 }).label).toBe("Error");
  });
});

import { cancelServiceOn, saveLicence, switchCountry, switchService } from "../src/api/admin";
import { effectiveState } from "../src/pages/ServicesPage";

describe("services and countries", () => {
  it("call the right routes with PIN and reason", async () => {
    await switchService("GM", "airtime", { state: "paused", reason: "Provider down", pin: "123456" });
    await cancelServiceOn("ALL", "bills");
    await switchCountry("ml", { enabled: true, reason: "Licence in place", pin: "123456" });
    await saveLicence("ML", { status: "partner", holder: "Bank", reference: "B-1", note: "", pin: "123456" });
    expect(calls.map((c) => `${c.init.method} ${path(c)}`)).toEqual([
      "PUT /admin/services/GM/airtime",
      "DELETE /admin/services/ALL/bills/switch-on",
      "PATCH /admin/countries/ml",
      "PUT /admin/countries/ML/licence",
    ]);
    expect(body(calls[0]!)).toEqual({ state: "paused", reason: "Provider down", pin: "123456" });
  });
  it("what customers get is the stricter of every-country and this country", () => {
    const rows = [
      { country: "ALL", service: "bills", state: "paused" },
      { country: "GM", service: "bills", state: "off" },
      { country: "SN", service: "airtime", state: "paused" },
    ] as never;
    expect(effectiveState(rows, "bills", "GM")).toBe("off");
    expect(effectiveState(rows, "bills", "SN")).toBe("paused");
    expect(effectiveState(rows, "airtime", "SN")).toBe("paused");
    expect(effectiveState(rows, "airtime", "GM")).toBe("on");
    expect(effectiveState(rows, "bills", "ALL")).toBe("paused");
  });
});

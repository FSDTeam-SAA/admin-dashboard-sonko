import { describe, expect, it } from "vitest";
import { PRIORITY_TONE, priorityChoices } from "../src/pages/TicketsPage";
import { limitsProblem } from "../src/pages/TicketLimits";
import { FR } from "../src/i18n/fr";
import { tickets } from "../src/api/admin";

describe("ticket priority colours and order", () => {
  it("is dark red for critical, red for high, orange for medium, green for low", () => {
    expect(PRIORITY_TONE).toEqual({ critical: "critical", high: "danger", medium: "warn", low: "ok" });
  });
  it("offers critical only to staff allowed to set it, or when the ticket already is critical", () => {
    expect(priorityChoices(false)).toEqual(["high", "medium", "low"]);
    expect(priorityChoices(true)[0]).toBe("critical");
    expect(priorityChoices(false, "critical")[0]).toBe("critical");
  });
  it("checks typed overdue limits", () => {
    const max = { critical: 24, high: 72, medium: 168, low: 336 };
    expect(limitsProblem({ critical: 1, high: 4, medium: 24, low: 72 }, max)).toBeNull();
    expect(limitsProblem({ critical: 5, high: 4, medium: 24, low: 72 }, max)).toMatch(/more urgent/);
    expect(limitsProblem({ critical: 1, high: 4, medium: 24, low: 999 }, max)).toMatch(/whole number/);
    expect(limitsProblem({ critical: 1, high: Number.NaN, medium: 24, low: 72 }, max)).toMatch(/whole number/);
  });
  it("has French for the order choices", () => {
    for (const text of ["Order", "Most urgent first", "Newest first", "Overdue", "No update since {time}"]) expect(FR[text], text).toBeTruthy();
  });
  it("asks the server for most urgent first", async () => {
    const seen: string[] = [];
    const real = globalThis.fetch;
    globalThis.fetch = (async (url: string) => {
      seen.push(String(url));
      return new Response(JSON.stringify({ success: true, data: { tickets: [], pagination: {} } }), { status: 200, headers: { "content-type": "application/json" } });
    }) as typeof fetch;
    try {
      await tickets({ status: "active", priority: "all", mine: false, search: "", sort: "urgent" }, 1);
      await tickets({ status: "active", priority: "all", mine: false, search: "", sort: "newest" }, 1);
    } finally {
      globalThis.fetch = real;
    }
    expect(seen[0]).toContain("sort=urgent");
    expect(seen[1]).not.toContain("sort=");
  });
});

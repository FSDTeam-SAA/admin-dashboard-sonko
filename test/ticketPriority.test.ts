import { describe, expect, it } from "vitest";
import { PRIORITY_TONE } from "../src/pages/TicketsPage";
import { FR } from "../src/i18n/fr";
import { tickets } from "../src/api/admin";

describe("ticket priority colours and order", () => {
  it("is red for high, orange for medium, green for low", () => {
    expect(PRIORITY_TONE).toEqual({ high: "danger", medium: "warn", low: "ok" });
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

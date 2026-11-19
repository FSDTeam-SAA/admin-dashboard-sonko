import { describe, expect, it, vi } from "vitest";
import { addBlock, lookUpBlock, type BlockEntry } from "../src/api/admin";
import { setTokens } from "../src/api/session";
import { hoursLeft, removeAction, STATE_LABEL } from "../src/pages/BlocklistPage";
import { NAV } from "../src/lib/nav";
import { PERMISSION_GROUPS } from "../src/lib/permissions";

const base: BlockEntry = {
  id: "e1",
  type: "phone",
  masked: "+220••••1234",
  reason: "CONFIRMED_FRAUD",
  note: "Took money from three customers",
  state: "unconfirmed",
  addedBy: "A",
  addedByName: "Ann",
  addedAt: "2026-11-19T10:00:00Z",
  unconfirmedUntil: "2026-11-22T10:00:00Z",
  confirmedByName: "",
  confirmedAt: null,
  removeAsk: null,
  removedByName: "",
  removedAt: null,
  removeReason: "",
  matches: 0,
  lastMatchAt: null,
  lastMatchPlace: "",
};

describe("blocklist page", () => {
  it("the person who added an unconfirmed entry takes it back alone", () => {
    expect(removeAction(base, "A")).toBe("take_back");
    expect(removeAction(base, "B")).toBe("ask");
  });

  it("a confirmed entry always needs two people, even for the person who added it", () => {
    const confirmed = { ...base, state: "blocked" as const, confirmedAt: "2026-11-19T11:00:00Z" };
    expect(removeAction(confirmed, "A")).toBe("ask");
    const asked = { ...confirmed, removeAsk: { requestedBy: "B", requestedByName: "Bob", requestedAt: "2026-11-19T12:00:00Z", reason: "Cleared" } };
    expect(removeAction(asked, "B")).toBe("mine");
    expect(removeAction(asked, "C")).toBe("approve");
  });

  it("hours left never goes below zero", () => {
    expect(hoursLeft("2026-11-22T10:00:00Z", Date.parse("2026-11-19T10:00:00Z"))).toBe(72);
    expect(hoursLeft("2026-11-22T10:00:00Z", Date.parse("2026-11-23T10:00:00Z"))).toBe(0);
    expect(hoursLeft(null)).toBe(0);
  });

  it("every state has a label", () => {
    for (const s of ["unconfirmed", "blocked", "expired", "removed"] as const) expect(STATE_LABEL[s].label).toBeTruthy();
  });

  it("the page is in the menu behind view_blocklist, and the Staff page lists all three permissions", () => {
    expect(NAV.find((n) => n.path === "/blocklist")?.permission).toBe("view_blocklist");
    const all = PERMISSION_GROUPS.flatMap((g) => g.items.map(([p]) => p));
    for (const p of ["view_blocklist", "add_to_blocklist", "manage_blocklist"]) expect(all).toContain(p);
  });
});

describe("blocklist calls", () => {
  it("the value goes in the body, never the web address, and adding sends a key", async () => {
    setTokens({ access: "A", refresh: "R" });
    const calls: { url: string; init: RequestInit }[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ success: true, data: { masked: "", entries: [] } }), { status: 200 });
    }));
    await lookUpBlock("phone", "+2207001234");
    await addBlock({ type: "phone", value: "+2207001234", reason: "CONFIRMED_FRAUD", note: "Took money from three customers" }, "482915", "key-1234567890abcdef");
    for (const c of calls) {
      expect(c.url).not.toContain("7001234");
      expect(c.init.method).toBe("POST");
    }
    expect(new Headers(calls[1]!.init.headers).get("Idempotency-Key")).toBe("key-1234567890abcdef");
    vi.unstubAllGlobals();
  });
});

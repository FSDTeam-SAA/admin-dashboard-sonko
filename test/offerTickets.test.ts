import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { approveOfferCard, approveTicketEvent, cancelTicketEvent, makeOfferCard, makeTicketEvent, offerCards, setGateStaff, ticketEvents, withdrawOfferCard } from "../src/api/admin";
import { clearTokens, setTokens } from "../src/api/session";
import { offerProblems } from "../src/pages/OfferCardsPage";
import { phoneList, toMinorUnits } from "../src/pages/TicketEventsPage";

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
const draft = { titleEn: "Banjul Live Night", titleFr: "Banjul Live Night", bodyEn: "Five artists.", bodyFr: "Cinq artistes.", sponsored: true, sponsorName: "Banjul Live", country: "GM", art: "sunset" as const, imageUrl: "", eventDate: null, action: "none" as const, eventId: null, startsAt: "s", endsAt: "e" };

describe("offer cards and event tickets", () => {
  it("call the right routes, with the PIN and keys where needed", async () => {
    await offerCards();
    await makeOfferCard(draft, "482915", "k1");
    await approveOfferCard("c1", "482915", "k2");
    await withdrawOfferCard("c1", "Wrong date");
    await ticketEvents();
    await makeTicketEvent({ titleEn: "a", titleFr: "a", aboutEn: "", aboutFr: "", venue: "v", country: "GM", currency: "GMD", priceMinor: 35000, feeMinor: 0, capacity: 10, maxPerPerson: 4, startsAt: "s", salesEndAt: "s", organiserPhone: "+220861234567", gatePhones: [] }, "482915", "k3");
    await approveTicketEvent("e1", "482915", "k4");
    await cancelTicketEvent("e1", "Stadium closed", "482915", "k5");
    await setGateStaff("e1", ["+220861234568"], "482915");
    expect(calls.map(path)).toEqual([
      "/admin/offer-cards", "/admin/offer-cards", "/admin/offer-cards/c1/approve", "/admin/offer-cards/c1/withdraw",
      "/admin/ticket-events", "/admin/ticket-events", "/admin/ticket-events/e1/approve", "/admin/ticket-events/e1/cancel", "/admin/ticket-events/e1/gate-staff",
    ]);
    expect(JSON.parse(calls[1]!.init.body as string).pin).toBe("482915");
    expect((calls[6]!.init.headers as Record<string, string>)["Idempotency-Key"]).toBe("k4");
  });

  it("check cards like the server: advertiser name, no links, an event for the button", () => {
    expect(Object.values(offerProblems(draft)).every((p) => p === null)).toBe(true);
    expect(offerProblems({ ...draft, sponsorName: "" }).sponsorName).toBeTruthy();
    expect(offerProblems({ ...draft, bodyEn: "Tickets at www.x.top" }).bodyEn).toMatch(/links/);
    expect(offerProblems({ ...draft, action: "tickets" }).eventId).toBeTruthy();
  });

  it("read prices and phone lists the way staff type them", () => {
    expect(toMinorUnits("350", "GMD")).toBe(35000);
    expect(toMinorUnits("1,250.5", "GMD")).toBe(125050);
    expect(toMinorUnits("3.505", "GMD")).toBeNull();
    expect(toMinorUnits("abc", "GMD")).toBeNull();
    expect(phoneList("+220861234567\n +220861234568, ,")).toEqual(["+220861234567", "+220861234568"]);
  });
});

import { describe, expect, it } from "vitest";
import type { CustomerDetail } from "../src/api/admin";
import { CASES_TEXT, CASE_TEXT, stripItems } from "../src/components/CustomerStatusStrip";
import { FR } from "../src/i18n/fr";

const base = (over: Partial<CustomerDetail> = {}, customer: Record<string, unknown> = {}) =>
  ({ customer: { hold: null, closed: null, ...customer }, pendingPhoneChange: null, ...over }) as unknown as CustomerDetail;

describe("customer status strip", () => {
  it("is empty when nothing needs care, and for an older server with no status", () => {
    expect(stripItems(base())).toEqual([]);
    expect(stripItems(base({ status: { moneyOutPausedUntil: null, openCases: {}, blockedPhones: 0 } }))).toEqual([]);
  });

  it("lists closed first, then hold, the money-out wait, phones, cases and a waiting phone change", () => {
    const items = stripItems(
      base(
        {
          status: { moneyOutPausedUntil: "2026-11-24T05:00:00Z", openCases: { agent_debt: 2, blocklist_match: 1 }, blockedPhones: 1 },
          pendingPhoneChange: { phone: "x", reason: "y", requestedBy: "a", requestedByName: "b", requestedAt: "2026-11-21T00:00:00Z" },
        },
        { closed: { at: "2026-11-20T00:00:00Z", via: "staff", reason: "r", by: "s" }, hold: { scope: "all", reason: "r", placedAt: null } },
      ),
    );
    expect(items.map((i) => i.key)).toEqual(["closed", "hold", "wait", "phones", "case-agent_debt", "case-blocklist_match", "pending"]);
    expect(items.find((i) => i.key === "case-agent_debt")?.text).toBe(CASES_TEXT.agent_debt);
    expect(items.find((i) => i.key === "case-blocklist_match")?.text).toBe(CASE_TEXT.blocklist_match);
  });

  it("ignores case types it does not know and zero counts", () => {
    const items = stripItems(base({ status: { moneyOutPausedUntil: null, openCases: { agent_debt: 0, weird: 3 } as never, blockedPhones: 0 } }));
    expect(items).toEqual([]);
  });

  it("has French for every line it can show", () => {
    const texts = [...Object.values(CASE_TEXT), ...Object.values(CASES_TEXT), "Account closed", "Money can't leave until {time}, because the phone number was changed.", "{n} phone is on the blocklist", "{n} phones are on the blocklist", "A phone number change is waiting for approval", "No warnings on this account.", "Check before you act"];
    for (const t of texts) expect(FR[t], t).toBeTruthy();
  });
});

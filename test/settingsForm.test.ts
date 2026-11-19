import { describe, expect, it } from "vitest";
import type { CashOutSettings } from "../src/api/admin";
import { changesFrom, fromForm, toBps, toForm, toMinor } from "../src/lib/settingsForm";

const GM: CashOutSettings = {
  country: "GM",
  currency: "GMD",
  version: 4,
  enabled: true,
  customerFeeBps: 0,
  customerFeeFixedMinor: 0,
  commissionTiers: [
    { minVolumeMinor: 2_500_000, minCustomers: 3, amountMinor: 10_000 },
    { minVolumeMinor: 5_000_000, minCustomers: 5, amountMinor: 22_500 },
  ],
  maxPerCashOutMinor: 2_000_000,
  maxPerDayPerCustomerMinor: 5_000_000,
  agentDailyCashOutMinor: 50_000_000,
  maxPendingPerAgent: 3,
  codeTtlSeconds: 120,
  pendingTtlSeconds: 180,
};

describe("rates form", () => {
  it("shows money in whole dalasi and the fee as a percent", () => {
    const form = toForm({ ...GM, customerFeeBps: 150 });
    expect(form.maxPerCashOut).toBe("20000");
    expect(form.tiers[1]).toEqual({ volume: "50000", customers: "5", pay: "225" });
    expect(form.feePercent).toBe("1.5");
  });

  it("an unchanged form changes nothing", () => {
    const built = fromForm(toForm(GM), "GMD");
    expect(built.errors).toEqual([]);
    expect(changesFrom(GM, built.values)).toEqual({});
  });

  it("sends only what changed, in the smallest unit", () => {
    const form = toForm(GM);
    form.maxPerCashOut = "25,000.50";
    form.tiers[0]!.pay = "120";
    const change = changesFrom(GM, fromForm(form, "GMD").values);
    expect(change).toEqual({
      maxPerCashOutMinor: 2_500_050,
      commissionTiers: [
        { minVolumeMinor: 2_500_000, minCustomers: 3, amountMinor: 12_000 },
        { minVolumeMinor: 5_000_000, minCustomers: 5, amountMinor: 22_500 },
      ],
    });
  });

  it("refuses amounts that are not plain money", () => {
    for (const bad of ["", "-5", "1e6", "12.345", "abc", "1.2.3"]) expect(toMinor(bad, "GMD")).toBeNull();
    expect(toMinor("5000", "XOF")).toBe(5000);
    expect(toMinor("50.5", "XOF")).toBeNull();
    expect(toBps("2.25")).toBe(225);
    expect(toBps("2.255")).toBeNull();
    const form = toForm(GM);
    form.agentDaily = "lots";
    expect(fromForm(form, "GMD").errors).toEqual(["Most per agent per day"]);
  });
});

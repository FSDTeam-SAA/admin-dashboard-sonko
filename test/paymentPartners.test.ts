import { describe, expect, it } from "vitest";
import { buildPartnerSettings, changeRows, feeToMinor, percentToBps } from "../src/pages/PaymentPartnersPage";
import type { PartnerSettings } from "../src/api/admin";

const t = (s: string, v?: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => String(v?.[k] ?? `{${k}}`));
const row = (over = {}) => ({ service: "bank_transfer" as const, country: "ALL", on: true, fixedFeeMinor: 0, percentBps: 0, fxMarginBps: 0, fee: "0", percent: "0", margin: "0", ...over });
const settings = (): PartnerSettings => ({
  version: 3,
  pickRule: { wallet_top_up: "cheapest", airtime: "cheapest", bills: "cheapest", bank_transfer: "cheapest" },
  partners: [
    { code: "flutterwave", on: true, order: 1, routes: [{ service: "bank_transfer", country: "ALL", on: true, fixedFeeMinor: 0, percentBps: 100, fxMarginBps: 50 }] },
    { code: "braintree", on: false, order: 2, routes: [] },
  ],
});

describe("payment partners", () => {
  it("reads percents as basis points, 0% to 20%", () => {
    expect(percentToBps("1.5")).toBe(150);
    expect(percentToBps("1.5%")).toBe(150);
    expect(percentToBps("0")).toBe(0);
    expect(percentToBps("20")).toBe(2000);
    expect(percentToBps("20.01")).toBeNull();
    expect(percentToBps("-1")).toBeNull();
    expect(percentToBps("1,5")).toBeNull();
  });

  it("reads fixed fees in the country's money; CFA has no decimals", () => {
    expect(feeToMinor("5", "GMD")).toBe(500);
    expect(feeToMinor("5.25", "GBP")).toBe(525);
    expect(feeToMinor("500", "XOF")).toBe(500);
    expect(feeToMinor("5.5", "XOF")).toBeNull();
    expect(feeToMinor("abc", "GMD")).toBeNull();
  });

  it("builds the settings in the shown order, and refuses a fixed fee on all countries", () => {
    const draft = {
      pickRule: settings().pickRule,
      partners: [
        { code: "braintree", on: false, routes: [] },
        { code: "flutterwave", on: true, routes: [row({ percent: "1", margin: "0.5" }), row({ country: "gm", fee: "10", percent: "0.8", margin: "0" })] },
      ],
    };
    const built = buildPartnerSettings(draft, { flutterwave: "Flutterwave" });
    expect(built.errors).toEqual([]);
    expect(built.settings.partners.map((p) => [p.code, p.order])).toEqual([["braintree", 1], ["flutterwave", 2]]);
    expect(built.settings.partners[1]!.routes[1]).toEqual({ service: "bank_transfer", country: "GM", on: true, fixedFeeMinor: 1000, percentBps: 80, fxMarginBps: 0 });
    const bad = buildPartnerSettings({ ...draft, partners: [{ code: "flutterwave", on: true, routes: [row({ fee: "5" }), row({ percent: "30" })] }, draft.partners[0]!] }, { flutterwave: "Flutterwave" });
    expect(bad.errors.map(([text, name]) => t(text, { name }))).toEqual([
      "Flutterwave: a fixed fee needs a country from the list",
      "Flutterwave: the same service and country appear twice",
      "Flutterwave: the fee must be between 0% and 20%",
    ]);
  });

  it("describes a change in plain rows", () => {
    const before = settings();
    const after = structuredClone(before);
    after.version = 4;
    after.pickRule.bank_transfer = "order";
    after.partners[1]!.on = true;
    after.partners[0]!.routes[0]!.percentBps = 120;
    const rows = changeRows(before, after, { flutterwave: "Flutterwave", braintree: "Braintree" }, t);
    expect(rows).toEqual([
      ["How Bank transfers picks a partner", "Cheapest", "In order"],
      ["Flutterwave: Bank transfers (all countries)", "On · fee 1%, margin 0.5%", "On · fee 1.2%, margin 0.5%"],
      ["Braintree", "Off", "On"],
    ]);
  });
});

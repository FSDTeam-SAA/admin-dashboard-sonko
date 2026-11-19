import { describe, expect, it } from "vitest";
import type { RateSettings } from "../src/api/admin";
import { buildRateChange, examples, gmdPerEur, sentence, toRatesForm } from "../src/lib/ratesForm";

const now: RateSettings = { version: 3, ratesFromGmd: { XOF: 8.7, GHS: 0.13, NGN: 23.5, GBP: 0.012 }, sekPerEur: 11, walletTransferFeeBps: 0 };

describe("exchange rates form", () => {
  it("shows strong currencies as GMD for 1, weak ones as units for 1 GMD", () => {
    expect(sentence("GBP", 0.012)).toBe("1 GBP = 83.3333 GMD");
    expect(sentence("NGN", 23.5)).toBe("1 GMD = 23.5 NGN");
    expect(gmdPerEur(8.7).toFixed(2)).toBe("75.40");
  });

  it("an untouched form sends nothing, even though GBP is rounded on screen", () => {
    const form = toRatesForm(now);
    expect(buildRateChange(form, form, now).change).toEqual({});
  });

  it("sends only what was typed, turned back into units per GMD", () => {
    const original = toRatesForm(now);
    const form = { ...original, rates: { ...original.rates, GBP: "80" }, feePercent: "1.5" };
    const built = buildRateChange(original, form, now);
    expect(built.errors).toEqual([]);
    expect(built.change).toEqual({ ratesFromGmd: { GBP: 1 / 80 }, walletTransferFeeBps: 150 });
    expect(examples(built.change, now)).toEqual(["100 GBP becomes 8,000 GMD (now 8,333.33)"]);
  });

  it("catches a slip of more than 25%, and warns over 5%", () => {
    const original = toRatesForm(now);
    expect(buildRateChange(original, { ...original, rates: { ...original.rates, NGN: "235" } }, now).errors[0]).toMatch(/more than 25%/);
    expect(buildRateChange(original, { ...original, rates: { ...original.rates, NGN: "25" } }, now).warnings[0]).toMatch(/more than 5%/);
    expect(buildRateChange(original, { ...original, rates: { ...original.rates, XOF: "abc" } }, now).errors[0]).toMatch(/number above zero/);
    expect(buildRateChange(original, { ...original, feePercent: "12" }, now).errors[0]).toMatch(/0% to 10%/);
  });
});

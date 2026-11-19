// Exchange rates the way staff think about them. The server keeps "units of
// a currency for 1 GMD"; here strong currencies are shown as "1 GBP = 83.33
// GMD" and weak ones as "1 GMD = 23.5 NGN". Only rates staff actually typed
// a new value for are sent, so rounding on screen never changes a rate.
import { RATE_CURRENCIES, type RateChangeBody, type RateCurrency, type RateSettings } from "../api/admin";
import { toBps } from "./settingsForm";

export const XOF_PER_EUR = 655.957;
export const MAX_MOVE = 0.25;

/** "gmdPer": typed as GMD for 1 unit. "perGmd": typed as units for 1 GMD. */
export const DIRECTION: Record<RateCurrency, "gmdPer" | "perGmd"> = { GBP: "gmdPer", GHS: "gmdPer", XOF: "perGmd", NGN: "perGmd" };

export const NAMES: Record<RateCurrency, string> = {
  GBP: "British pound",
  GHS: "Ghanaian cedi",
  XOF: "CFA franc (Senegal)",
  NGN: "Nigerian naira",
};

export function label(code: RateCurrency): string {
  return DIRECTION[code] === "gmdPer" ? `1 ${code} = … GMD` : `1 GMD = … ${code}`;
}

/** What staff see for a rate (units per GMD from the server). */
export function shown(code: RateCurrency, ratePerGmd: number): string {
  const value = DIRECTION[code] === "gmdPer" ? 1 / ratePerGmd : ratePerGmd;
  return String(Number(value.toFixed(4)));
}

export function sentence(code: RateCurrency, ratePerGmd: number): string {
  return DIRECTION[code] === "gmdPer" ? `1 ${code} = ${shown(code, ratePerGmd)} GMD` : `1 GMD = ${shown(code, ratePerGmd)} ${code}`;
}

/** 1 EUR in GMD: follows the CFA franc, which is fixed to the euro. */
export function gmdPerEur(xofPerGmd: number): number {
  return XOF_PER_EUR / xofPerGmd;
}

export type RatesForm = { rates: Record<RateCurrency, string>; sekPerEur: string; feePercent: string };

export function toRatesForm(s: RateSettings): RatesForm {
  return {
    rates: Object.fromEntries(RATE_CURRENCIES.map((c) => [c, shown(c, s.ratesFromGmd[c])])) as Record<RateCurrency, string>,
    sekPerEur: String(s.sekPerEur),
    feePercent: String(s.walletTransferFeeBps / 100),
  };
}

const NUMBER = /^\d+(\.\d{1,6})?$/;
const parse = (text: string) => {
  const clean = text.trim().replace(/,/g, "");
  if (!NUMBER.test(clean)) return null;
  const value = Number(clean);
  return value > 0 ? value : null;
};

export type BuiltRates = { change: RateChangeBody; errors: string[]; warnings: string[] };

/** The change to send: only what staff changed, with problems to fix first. */
export function buildRateChange(original: RatesForm, form: RatesForm, current: RateSettings): BuiltRates {
  const errors: string[] = [];
  const warnings: string[] = [];
  const change: RateChangeBody = {};
  const rates: Partial<Record<RateCurrency, number>> = {};
  const far = (before: number, after: number) => Math.abs(after - before) / before > MAX_MOVE;

  for (const code of RATE_CURRENCIES) {
    if (form.rates[code].trim() === original.rates[code].trim()) continue;
    const typed = parse(form.rates[code]);
    if (typed === null) {
      errors.push(`${code}: type a number above zero`);
      continue;
    }
    const perGmd = DIRECTION[code] === "gmdPer" ? 1 / typed : typed;
    if (far(current.ratesFromGmd[code], perGmd)) errors.push(`${code} moves more than 25% at once — check it, or change it in steps`);
    else if (Math.abs(perGmd - current.ratesFromGmd[code]) / current.ratesFromGmd[code] > 0.05) warnings.push(`${code} moves more than 5%`);
    rates[code] = perGmd;
  }
  if (Object.keys(rates).length) change.ratesFromGmd = rates;

  if (form.sekPerEur.trim() !== original.sekPerEur.trim()) {
    const typed = parse(form.sekPerEur);
    if (typed === null) errors.push("SEK: type a number above zero");
    else if (far(current.sekPerEur, typed)) errors.push("SEK moves more than 25% at once — check it, or change it in steps");
    else change.sekPerEur = typed;
  }
  if (form.feePercent.trim() !== original.feePercent.trim()) {
    const bps = toBps(form.feePercent);
    if (bps === null || bps > 1000) errors.push("Transfer fee: 0% to 10%, up to 2 decimals");
    else change.walletTransferFeeBps = bps;
  }
  return { change, errors, warnings };
}

/** A worked example for each changed rate, so a typo is easy to spot. */
export function examples(change: RateChangeBody, current: RateSettings): string[] {
  const lines: string[] = [];
  for (const code of RATE_CURRENCIES) {
    const next = change.ratesFromGmd?.[code];
    if (next === undefined) continue;
    const fmt = (n: number) => n.toLocaleString("en-GB", { maximumFractionDigits: 2 });
    if (DIRECTION[code] === "gmdPer") {
      lines.push(`100 ${code} becomes ${fmt(100 / next)} GMD (now ${fmt(100 / current.ratesFromGmd[code])})`);
    } else {
      lines.push(`1,000 GMD becomes ${fmt(1000 * next)} ${code} (now ${fmt(1000 * current.ratesFromGmd[code])})`);
    }
  }
  return lines;
}

// Turns Cash Out settings into form values (whole money, percent) and back
// (smallest units, basis points), and works out which fields changed. Kept
// apart from the page so it can be tested on its own.
import type { CashOutSettings, EditableField, SettingsSnapshot, Tier } from "../api/admin";
import { decimalsOf } from "./format";

export type TierForm = { volume: string; customers: string; pay: string };
export type SettingsForm = {
  enabled: boolean;
  feePercent: string;
  feeFixed: string;
  tiers: TierForm[];
  maxPerCashOut: string;
  maxPerDayPerCustomer: string;
  agentDaily: string;
  maxPending: string;
  codeSeconds: string;
  pendingSeconds: string;
};

const toMajor = (minor: number, currency: string) => String(minor / 10 ** decimalsOf(currency));

export function toForm(s: CashOutSettings): SettingsForm {
  const c = s.currency;
  return {
    enabled: s.enabled,
    feePercent: String(s.customerFeeBps / 100),
    feeFixed: toMajor(s.customerFeeFixedMinor, c),
    tiers: s.commissionTiers.map((t) => ({ volume: toMajor(t.minVolumeMinor, c), customers: String(t.minCustomers), pay: toMajor(t.amountMinor, c) })),
    maxPerCashOut: toMajor(s.maxPerCashOutMinor, c),
    maxPerDayPerCustomer: toMajor(s.maxPerDayPerCustomerMinor, c),
    agentDaily: toMajor(s.agentDailyCashOutMinor, c),
    maxPending: String(s.maxPendingPerAgent),
    codeSeconds: String(s.codeTtlSeconds),
    pendingSeconds: String(s.pendingTtlSeconds),
  };
}

/** A typed amount in whole money → smallest unit, or null if it is not a valid amount. */
export function toMinor(text: string, currency: string): number | null {
  const decimals = decimalsOf(currency);
  const clean = text.trim().replace(/,/g, "");
  const pattern = decimals ? new RegExp(`^\\d+(\\.\\d{1,${decimals}})?$`) : /^\d+$/;
  if (!pattern.test(clean)) return null;
  const value = Math.round(Number(clean) * 10 ** decimals);
  return Number.isSafeInteger(value) ? value : null;
}

function wholeNumber(text: string): number | null {
  return /^\d+$/.test(text.trim()) ? Number(text.trim()) : null;
}

/** A percent with up to 2 decimals → basis points (1% = 100). */
export function toBps(text: string): number | null {
  const clean = text.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  return Math.round(Number(clean) * 100);
}

export type Built = { values: SettingsSnapshot; errors: string[] };

/** The full set of values from the form, or the problems to fix first. */
export function fromForm(form: SettingsForm, currency: string): Built {
  const errors: string[] = [];
  const need = <T,>(value: T | null, label: string): T => {
    if (value === null) errors.push(label);
    return value as T;
  };
  const tiers: Tier[] = form.tiers.map((t, i) => ({
    minVolumeMinor: need(toMinor(t.volume, currency), `Tier ${i + 1}: volume`),
    minCustomers: need(wholeNumber(t.customers), `Tier ${i + 1}: customers`),
    amountMinor: need(toMinor(t.pay, currency), `Tier ${i + 1}: pay`),
  }));
  const values: SettingsSnapshot = {
    enabled: form.enabled,
    customerFeeBps: need(toBps(form.feePercent), "Customer fee percent"),
    customerFeeFixedMinor: need(toMinor(form.feeFixed, currency), "Customer fixed fee"),
    commissionTiers: tiers,
    maxPerCashOutMinor: need(toMinor(form.maxPerCashOut, currency), "Most per cash out"),
    maxPerDayPerCustomerMinor: need(toMinor(form.maxPerDayPerCustomer, currency), "Most per customer per day"),
    agentDailyCashOutMinor: need(toMinor(form.agentDaily, currency), "Most per agent per day"),
    maxPendingPerAgent: need(wholeNumber(form.maxPending), "Waiting cash outs per agent"),
    codeTtlSeconds: need(wholeNumber(form.codeSeconds), "Code life"),
    pendingTtlSeconds: need(wholeNumber(form.pendingSeconds), "Waiting time"),
  };
  return { values, errors };
}

/** Only the fields that differ from what is in force. */
export function changesFrom(current: CashOutSettings, values: SettingsSnapshot): SettingsSnapshot {
  const out: SettingsSnapshot = {};
  for (const key of Object.keys(values) as EditableField[]) {
    const now = key === "commissionTiers" ? current.commissionTiers.map(({ minVolumeMinor, minCustomers, amountMinor }) => ({ minVolumeMinor, minCustomers, amountMinor })) : current[key];
    if (JSON.stringify(now) !== JSON.stringify(values[key])) (out as Record<string, unknown>)[key] = values[key];
  }
  return out;
}

export const FIELD_LABEL: Record<EditableField, string> = {
  enabled: "Cash out switched on",
  customerFeeBps: "Customer fee (percent)",
  customerFeeFixedMinor: "Customer fee (fixed)",
  commissionTiers: "Agent daily pay tiers",
  maxPerCashOutMinor: "Most per cash out",
  maxPerDayPerCustomerMinor: "Most per customer per day",
  agentDailyCashOutMinor: "Most per agent per day",
  maxPendingPerAgent: "Waiting cash outs per agent",
  codeTtlSeconds: "Cash out code life",
  pendingTtlSeconds: "Time to confirm a cash out",
};

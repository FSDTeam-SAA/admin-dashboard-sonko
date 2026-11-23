// A pretend Sunu Pay server for the demo build only. It answers the panel's
// calls inside the page (no network) from the made-up data in data.ts, and
// keeps changes in memory until the page is closed. The real panel never
// imports this file: only demo/main.tsx does.
import type {
  AgentAnalytics,
  Analytics,
  BackupStatus,
  CashOutSettings,
  ComplaintReturn,
  CustomerGrowth,
  CustomerHigherLimit,
  FaceIdSettings,
  PartnerChange,
  PartnerFacts,
  PartnerPreview,
  PartnerService,
  PartnerSettings,
  Finance,
  FraudLimits,
  FraudSettings,
  FraudSummary,
  Headroom,
  HigherLimitRow,
  HigherLimitSettings,
  HigherLimitSettingsView,
  Places,
  RateSettings,
  ReferralInvite,
  ReferralSettings,
  RefundLimit,
  SafeguardingStatus,
  SalesReport,
  SalesSettings,
  SendingLimits,
  SettingsChange,
  TicketSettings,
  TicketStats,
  TopBuyer,
  AuditEvent,
  LimitLevels,
  CustomerMessage,
  TicketRow,
} from "../api/admin";
import * as D from "./data";

type Json = unknown;
class Refused extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

// ---- Who is signed in (the demo can switch between two full admins) ----

let me = "s1";
let nextSignIn = "s1";
export const demoIdentity = {
  current: () => me,
  /** The person the next sign-in becomes (the demo bar's "Sign in as"). */
  signInAs: (id: string) => {
    nextSignIn = id;
  },
};
const meName = () => D.staffName(me);
function secondPerson(askedBy: string | null | undefined) {
  if (askedBy && askedBy === me) throw new Refused(403, "A different staff member must approve this. In the demo, use 'Sign in as' at the top to switch to the second person.");
}

// ---- Settings that live in memory ----

const unit = (currency: string) => (currency === "XOF" ? 1 : 100);
const cashOut: Record<string, CashOutSettings> = Object.fromEntries(
  (["GM", "SN"] as const).map((c) => {
    const currency = c === "GM" ? "GMD" : "XOF";
    const u = unit(currency);
    const big = c === "GM" ? 1 : 10;
    return [
      c,
      {
        country: c, currency, version: 4, enabled: true, customerFeeBps: 100, customerFeeFixedMinor: 5 * u * big,
        commissionTiers: [
          { minVolumeMinor: 0, minCustomers: 0, amountMinor: 50 * u * big },
          { minVolumeMinor: 50_000 * u * big, minCustomers: 20, amountMinor: 150 * u * big },
          { minVolumeMinor: 150_000 * u * big, minCustomers: 50, amountMinor: 400 * u * big },
        ],
        commissionTiersFromDay: null, maxPerCashOutMinor: 25_000 * u * big, maxPerDayPerCustomerMinor: 50_000 * u * big, agentDailyCashOutMinor: 300_000 * u * big,
        maxPendingPerAgent: 5, codeTtlSeconds: 900, pendingTtlSeconds: 600,
      } satisfies CashOutSettings,
    ];
  }),
);
const settingsChanges: SettingsChange[] = [
  {
    id: "sc1", country: "GM", status: "pending", baseVersion: 4, changedFields: ["customerFeeBps"], before: { customerFeeBps: 100 }, after: { customerFeeBps: 80 },
    reason: "Match the cheaper fee the competition started this month.", requestedBy: "s4", approvedBy: null, approvedAt: null, cancelledBy: null, cancelReason: null, expiresAt: D.ahead(20), createdAt: D.ago(4),
  },
  {
    id: "sc0", country: "GM", status: "approved", baseVersion: 3, changedFields: ["maxPerCashOutMinor"], before: { maxPerCashOutMinor: 2_000_000 }, after: { maxPerCashOutMinor: 2_500_000 },
    reason: "Agents asked for a higher single cash out for school fees season.", requestedBy: "s4", approvedBy: "s1", approvedAt: D.ago(24 * 20), cancelledBy: null, cancelReason: null, expiresAt: D.ago(24 * 19), createdAt: D.ago(24 * 21),
  },
];

let rates: RateSettings = { version: 9, ratesFromGmd: { GBP: 0.0105, GHS: 0.165, XOF: 8.63, NGN: 21.4 }, sekPerEur: 11.42, walletTransferFeeBps: 0 };
let faceId: FaceIdSettings = { version: 2, maxUsdMinor: 10_000, dayUsdMinor: 30_000, gbpPerUsd: 0.79 };

// Payment partners. "Example Pay" is made up, so the demo can show the cheapest pick.
const PARTNER_FACTS: PartnerFacts[] = [
  { code: "flutterwave", name: "Flutterwave", services: ["wallet_top_up", "airtime", "bills", "bank_transfer"], ready: true, notReadyReason: "", keysSet: true, restingUntil: null },
  { code: "examplepay", name: "Example Pay (made up)", services: ["bank_transfer", "airtime"], ready: true, notReadyReason: "", keysSet: true, restingUntil: null },
  { code: "braintree", name: "Braintree", services: ["wallet_top_up"], ready: false, notReadyReason: "The app has no Braintree card screen yet.", keysSet: true, restingUntil: null },
];
const r = (service: PartnerService, country: string, on: boolean, percentBps: number, fxMarginBps: number, fixedFeeMinor = 0) => ({ service, country, on, fixedFeeMinor, percentBps, fxMarginBps });
let partnerSettings: PartnerSettings = {
  version: 3,
  pickRule: { wallet_top_up: "cheapest", airtime: "cheapest", bills: "cheapest", bank_transfer: "cheapest" },
  partners: [
    { code: "flutterwave", on: true, order: 1, routes: [r("wallet_top_up", "ALL", true, 140, 0), r("airtime", "ALL", true, 300, 0), r("bills", "ALL", true, 100, 0), r("bank_transfer", "ALL", true, 100, 150), r("bank_transfer", "GM", true, 80, 120, 2_500)] },
    { code: "examplepay", on: true, order: 2, routes: [r("bank_transfer", "ALL", true, 50, 100), r("airtime", "GM", false, 250, 0)] },
    { code: "braintree", on: false, order: 3, routes: [r("wallet_top_up", "ALL", false, 190, 0)] },
  ],
};
const partnerChanges: PartnerChange[] = [];
function pickDemo(service: PartnerService, country: string, amountMinor: number): PartnerPreview {
  const rule = partnerSettings.pickRule[service];
  const considered = partnerSettings.partners.map((p) => {
    const f = PARTNER_FACTS.find((x) => x.code === p.code)!;
    const route = p.routes.find((x) => x.service === service && x.country === country) ?? p.routes.find((x) => x.service === service && x.country === "ALL") ?? null;
    const base = { code: p.code, name: f.name, order: p.order, costMinor: null as number | null, route: route?.country ?? null };
    if (!f.services.includes(service)) return { ...base, eligible: false, why: "no_code" as const };
    if (!f.ready) return { ...base, eligible: false, why: "not_ready" as const };
    if (!p.on) return { ...base, eligible: false, why: "partner_off" as const };
    if (!route) return { ...base, eligible: false, why: "no_route" as const };
    if (!route.on) return { ...base, eligible: false, why: "route_off" as const };
    const costMinor = route.fixedFeeMinor + Math.floor((amountMinor * (route.percentBps + route.fxMarginBps) + 9_999) / 10_000);
    return { ...base, eligible: true, why: "ok" as const, costMinor };
  });
  const picked = considered.filter((c) => c.eligible).sort((a, b) => (rule === "cheapest" ? a.costMinor! - b.costMinor! : 0) || a.order - b.order).map((c) => c.code);
  return { picked, considered, rule };
}

const levels: LimitLevels = {
  unverified: { dayMinor: 0, monthMinor: 0 },
  new: { dayMinor: 25_000, monthMinor: 100_000 },
  verified: { dayMinor: 200_000, monthMinor: 800_000 },
  full: { dayMinor: 500_000, monthMinor: 2_000_000 },
};
const limits: SendingLimits = {
  worldwide: { levels, newPhoneCapMinor: 10_000, updatedAt: D.ago(24 * 30) },
  countries: [{ _id: "l1", scope: "country", status: "active", country: "GM", direction: "to", levels: { verified: { dayMinor: 150_000, monthMinor: 600_000 } }, reason: "Partner bank cap for Gambia payouts", proposedBy: "Aminata Sow", createdAt: D.ago(24 * 50) }],
  waiting: [{ _id: "l2", scope: "country", status: "awaiting_approval", country: "SN", direction: "to", levels: { full: { dayMinor: 400_000, monthMinor: 1_500_000 } }, reason: "Senegal partner asked us to lower the top level for now.", proposedBy: "Lamin Jatta", createdAt: D.ago(6) }],
  currency: "GBP",
};
const hlSettings: HigherLimitSettings = { maxDayMinor: 2_000_000, maxMonthMinor: 6_000_000, reviewMonths: 12, nudgePercent: 80 };

const fraudDefaults: FraudLimits = {
  paymentsPerHour: 10, dayGbpMinor: 300_000, newAccountDays: 14, newAccountGbpMinor: 100_000, recipientsPerDay: 8, failuresPerHour: 5, duplicatesPerHour: 3, singleGbpMinor: 200_000,
  wrongPinsPerDay: 5, invitesPerDay: 10, accountsPerDevice: 3, jumpTimes: 5, jumpMinGbpMinor: 50_000, passMinGbpMinor: 30_000, passPercent: 80, dormantDays: 90, dormantGbpMinor: 100_000,
};
const fraudBounds = Object.fromEntries(Object.entries(fraudDefaults).map(([k, v]) => [k, [1, v * 10]])) as FraudSettings["bounds"];

const overdue = { critical: 4, high: 24, medium: 72, low: 168 };
let ticketSettings: TicketSettings = {
  overdueHours: overdue, defaults: overdue, max: { critical: 24, high: 72, medium: 240, low: 720 }, pending: null,
  changes: [{ from: null, to: overdue, reason: "First limits", by: "Fatou Ceesay", approvedBy: "Aminata Sow", approveReason: "Agreed in the team meeting", at: D.ago(24 * 60) }],
};

const refundLimits: RefundLimit[] = [
  { country: "GM", currency: "GMD", limitMinor: 500_000, pendingRaise: null, history: [{ limitMinor: 500_000, currency: "GMD", reason: "First limit", by: "Aminata Sow", at: D.ago(24 * 40) }] },
  { country: "SN", currency: "XOF", limitMinor: 50_000, pendingRaise: { limitMinor: 100_000, currency: "XOF", reason: "Many Senelec refunds stuck waiting for a second person.", requestedBy: "s2", requestedByName: "Ousman Bah", requestedAt: D.ago(3) }, history: [] },
  { country: "GB", currency: "GBP", limitMinor: -1, pendingRaise: null, history: [] },
];

const messages: Record<string, CustomerMessage[]> = {
  c1: [{ id: "m1", text: "Hello Awa, your payment has arrived. The person you sent it to may need to refresh the app. Sunu Pay", lang: "en", by: "Ousman Bah", at: D.ago(0.6), ticket: "t1" }],
};

// ---- Figures for the reports ----

const months = (n: number) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date(D.NOW);
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() - (n - 1 - i));
    return d.toISOString().slice(0, 7);
  });

function analytics(): Analytics {
  const ms = months(12);
  return {
    totals: { customers: 4_812, agents: 63 },
    activeCustomersLast30Days: 2_204,
    months: ms.map((month, i) => ({
      month,
      signups: 120 + i * 38 + (i % 3) * 25,
      volume: [
        { currency: "GBP", count: 400 + i * 120, amountMinor: (40_000 + i * 14_000) * 100 },
        { currency: "GMD", count: 900 + i * 260, amountMinor: (1_200_000 + i * 420_000) * 100 },
        { currency: "XOF", count: i < 4 ? 0 : 150 + i * 60, amountMinor: i < 4 ? 0 : (2_000_000 + i * 900_000) },
      ],
    })),
    usageLast90Days: [
      { type: "send-money", count: 6_420 }, { type: "cash-out", count: 3_910 }, { type: "airtime", count: 2_780 }, { type: "bill", count: 1_260 },
      { type: "cash-in", count: 1_140 }, { type: "wallet-top-up", count: 980 }, { type: "convert", count: 210 }, { type: "bank", count: 95 },
    ],
    revenue: {
      months: ms.map((month, i) => ({
        month,
        currencies: [
          { currency: "GBP", feesMinor: (600 + i * 210) * 100, commissionMinor: 0, netMinor: (600 + i * 210) * 100 },
          { currency: "GMD", feesMinor: (30_000 + i * 9_000) * 100, commissionMinor: (12_000 + i * 3_500) * 100, netMinor: (18_000 + i * 5_500) * 100 },
        ],
      })),
      sourcesLast12Months: [
        { currency: "GBP", source: "Send money fee", amountMinor: 1_640_000, count: 9_800 },
        { currency: "GBP", source: "Exchange margin", amountMinor: 2_310_000, count: 9_800 },
        { currency: "GMD", source: "Cash out fee", amountMinor: 61_200_000, count: 21_300 },
        { currency: "GMD", source: "Agent commission", amountMinor: -24_800_000, count: 21_300 },
      ],
    },
  };
}

function growth(): CustomerGrowth {
  const ms = months(6);
  const cohort = (month: string, i: number) => {
    const signedUp = 300 + i * 70;
    const phoneVerified = Math.round(signedUp * 0.93);
    const idChecked = Math.round(signedUp * 0.71);
    const paid = Math.round(signedUp * 0.55);
    const paidWithin7Days = Math.round(signedUp * 0.41);
    const repeat = Math.round(signedUp * 0.33);
    const pct = (a: number) => Math.round((a / signedUp) * 1000) / 10;
    return {
      month, signedUp, phoneVerified, idChecked, paid, paidWithin7Days, repeat,
      rates: { phoneVerified: pct(phoneVerified), idChecked: pct(idChecked), paid: pct(paid), paidWithin7Days: pct(paidWithin7Days), repeat: pct(repeat) },
      retention: Array.from({ length: 6 - i }, (_, k) => Math.round((100 - k * 9 - i) * 10) / 10),
    };
  };
  const cohorts = ms.map(cohort);
  const total = cohorts.reduce(
    (a, c) => ({ signedUp: a.signedUp + c.signedUp, phoneVerified: a.phoneVerified + c.phoneVerified, idChecked: a.idChecked + c.idChecked, paid: a.paid + c.paid, paidWithin7Days: a.paidWithin7Days + c.paidWithin7Days, repeat: a.repeat + c.repeat }),
    { signedUp: 0, phoneVerified: 0, idChecked: 0, paid: 0, paidWithin7Days: 0, repeat: 0 },
  );
  const pct = (a: number) => Math.round((a / total.signedUp) * 1000) / 10;
  return {
    funnel: { ...total, rates: { phoneVerified: pct(total.phoneVerified), idChecked: pct(total.idChecked), paid: pct(total.paid), paidWithin7Days: pct(total.paidWithin7Days), repeat: pct(total.repeat) }, medianDaysToFirstPayment: 2 },
    retention: { thisMonth: ms[5]!, lastMonth: ms[4]!, activeThisMonth: 2_204, activeLastMonth: 1_980, kept: 1_512, keptRate: 76.4, everPaid: 3_110, repeatCustomers: 1_890, repeatRate: 60.8, dormant: 640, dormantDays: 60 },
    cohorts,
    retentionMonths: 6,
    workedOutAt: D.ago(0.2),
  };
}

function places(): Places {
  return {
    paymentDays: 90,
    failureDays: 30,
    customers: [{ country: "GB", count: 2_310 }, { country: "GM", count: 1_640 }, { country: "SN", count: 820 }, { country: "??", count: 42 }],
    sentFrom: [
      { country: "GB", count: 6_100, money: [{ currency: "GBP", amountMinor: 61_000_000 }] },
      { country: "GM", count: 2_900, money: [{ currency: "GMD", amountMinor: 1_740_000_000 }] },
      { country: "SN", count: 1_150, money: [{ currency: "XOF", amountMinor: 81_000_000 }] },
    ],
    receivedIn: [
      { country: "GM", count: 7_400, money: [{ currency: "GMD", amountMinor: 4_100_000_000 }] },
      { country: "SN", count: 2_250, money: [{ currency: "XOF", amountMinor: 160_000_000 }] },
      { country: "GB", count: 500, money: [{ currency: "GBP", amountMinor: 2_400_000 }] },
    ],
    corridors: {
      total: 6,
      more: 2,
      top: [
        { from: "GB", to: "GM", count: 5_200, share: 51.2, money: [{ currency: "GBP", amountMinor: 52_000_000 }] },
        { from: "GM", to: "GM", count: 2_100, share: 20.7, money: [{ currency: "GMD", amountMinor: 1_200_000_000 }] },
        { from: "GB", to: "SN", count: 900, share: 8.9, money: [{ currency: "GBP", amountMinor: 9_000_000 }] },
        { from: "SN", to: "SN", count: 880, share: 8.7, money: [{ currency: "XOF", amountMinor: 60_000_000 }] },
      ],
    },
    failures: {
      types: [
        { type: "send-money", successful: 3_120, failed: 41, pending: 6, other: 2, failureRate: 1.3 },
        { type: "airtime", successful: 1_410, failed: 38, pending: 3, other: 0, failureRate: 2.6 },
        { type: "bill", successful: 610, failed: 9, pending: 2, other: 0, failureRate: 1.5 },
        { type: "cash-out", successful: 1_980, failed: 12, pending: 4, other: 1, failureRate: 0.6 },
      ],
      all: { successful: 7_120, failed: 100, pending: 15, other: 3, failureRate: 1.4 },
    },
    workedOutAt: D.ago(0.2),
  };
}

function finance(days: number): Finance {
  const list = Array.from({ length: days }, (_, i) => days - 1 - i);
  const money = (currency: string, scale: number) => {
    const ds = list.map((d) => {
      const wave = 1 + 0.25 * Math.sin(d / 2);
      return {
        day: D.day(d), inMinor: Math.round(scale * 100 * wave), outMinor: Math.round(scale * 92 * wave), refundsMinor: Math.round(scale * 0.6), feesMinor: Math.round(scale * 1.6 * wave),
        commissionMinor: currency === "GBP" ? 0 : Math.round(scale * 0.7 * wave), bonusesMinor: currency === "GBP" ? Math.round(scale * 0.1) : 0,
      };
    });
    const totals = ds.reduce(
      (a, d) => ({ inMinor: a.inMinor + d.inMinor, outMinor: a.outMinor + d.outMinor, refundsMinor: a.refundsMinor + d.refundsMinor, feesMinor: a.feesMinor + d.feesMinor, commissionMinor: a.commissionMinor + d.commissionMinor, bonusesMinor: (a.bonusesMinor ?? 0) + (d.bonusesMinor ?? 0) }),
      { inMinor: 0, outMinor: 0, refundsMinor: 0, feesMinor: 0, commissionMinor: 0, bonusesMinor: 0 },
    );
    return { currency, totals, days: ds };
  };
  const pays = list.map((d) => ({ day: D.day(d), successful: 230 + (d % 7) * 14, failed: 2 + (d % 4), pending: d < 1 ? 5 : 0, other: 0 }));
  const t = pays.reduce((a, p) => ({ successful: a.successful + p.successful, failed: a.failed + p.failed, pending: a.pending + p.pending, other: 0 }), { successful: 0, failed: 0, pending: 0, other: 0 });
  return {
    asAt: D.ago(0.1),
    days,
    money: [money("GBP", 6_000_00), money("GMD", 350_000_00), money("XOF", 9_000_000)],
    payments: { days: pays, totals: t, failureRate: Math.round((t.failed / (t.successful + t.failed)) * 1000) / 10 },
    owed: [{ currency: "GBP", owedMinor: 18_420_000 }, { currency: "GMD", owedMinor: 912_300_000 }, { currency: "XOF", owedMinor: 41_600_000 }],
    books: { ok: true, checkedAt: D.ago(0.5), walletsChecked: 4_931, mismatches: 0, unbalancedPostings: 0, negativeWallets: 0 },
    safeguarding: [
      { currency: "GBP", asAt: D.day(1), bankMinor: 18_600_000, owedMinor: 18_380_000, differenceMinor: 220_000 },
      { currency: "GMD", asAt: D.day(1), bankMinor: 915_000_000, owedMinor: 909_000_000, differenceMinor: 6_000_000 },
    ],
    waiting: { purchasesToCheck: D.stuck.length, openCases: D.cases.filter((c) => c.status === "open").length, reversalsWaiting: 2, payoutsInReview: 4, lateComplaints: 1, stuckPayments: 0 },
  };
}

function safeguarding(): SafeguardingStatus {
  const entry = (id: string, currency: string, owed: number, bank: number | null, status: "open" | "confirmed", by: string, hours: number) => ({
    id, currency, asAt: D.day(Math.ceil(hours / 24)), owedMinor: owed, bankMinor: status === "confirmed" || by === me ? bank : null, differenceMinor: status === "confirmed" && bank !== null ? bank - owed : null,
    short: status === "confirmed" && bank !== null ? bank < owed : null, note: "", status, enteredBy: { id: by, name: D.staffName(by), phone: "" }, enteredAt: D.ago(hours),
    decidedBy: status === "confirmed" ? { id: "s1", name: "Fatou Ceesay", phone: "" } : null, decidedAt: status === "confirmed" ? D.ago(hours - 2) : null, decisionNote: "", confirmTries: 0, mine: by === me,
  });
  const gbpOk = entry("sg1", "GBP", 18_380_000, 18_600_000, "confirmed", "s5", 26);
  const gmdOpen = entry("sg2", "GMD", 912_300_000, 915_000_000, "open", "s5", 2);
  const gmdOk = entry("sg0", "GMD", 909_000_000, 915_000_000, "confirmed", "s5", 27);
  return {
    checkedAt: D.ago(0.1),
    ledger: { ok: true, checkedAt: D.ago(0.5), walletsChecked: 4_931, mismatches: 0, unbalancedPostings: 0, negativeWallets: 0 },
    currencies: [
      { currency: "GBP", level: "ok", paused: false, why: null, owedNowMinor: 18_420_000, latestConfirmed: gbpOk, open: null },
      { currency: "GMD", level: "warning", paused: false, why: null, owedNowMinor: 912_300_000, latestConfirmed: gmdOk, open: gmdOpen },
      { currency: "XOF", level: "warning", paused: false, why: null, owedNowMinor: 41_600_000, latestConfirmed: null, open: null },
    ],
    history: [gmdOpen, gbpOk, gmdOk],
  };
}

function headroom(): Headroom {
  const ms = months(12);
  return {
    asAt: D.ago(0.1),
    level: "ok",
    emoney: {
      limitEurMinor: 500_000_000, windowMonths: 6, daysCounted: 182, averageEurMinor: 41_300_000, ratio: 0.083, level: "ok", currentEurMinor: 43_900_000,
      highestDay: { day: D.day(12), eurMinor: 47_200_000 }, unpricedCurrencies: [],
      currencies: [{ currency: "GBP", minor: 18_420_000, eurMinor: 21_400_000 }, { currency: "GMD", minor: 912_300_000, eurMinor: 11_600_000 }, { currency: "XOF", minor: 41_600_000, eurMinor: 6_340_000 }],
    },
    payments: {
      limitEurMinor: 300_000_000, windowMonths: 12, activeMonths: 12, averageEurMinor: 112_000_000, averageIfNothingLeftOutEurMinor: 131_000_000, ratio: 0.373, level: "ok",
      highestMonth: { month: ms[11]!, eurMinor: 188_000_000 }, unpricedPayments: 0,
      months: ms.map((month, i) => ({ month, eurMinor: 40_000_000 + i * 13_000_000, allEurMinor: 46_000_000 + i * 15_000_000, count: 2_000 + i * 600 })),
      countries: [
        { country: "GM", eurMinor: 980_000_000, count: 52_000, excluded: false, noUkEndEurMinor: 210_000_000, noUkEndCount: 21_000 },
        { country: "SN", eurMinor: 230_000_000, count: 9_400, excluded: false, noUkEndEurMinor: 70_000_000, noUkEndCount: 8_800 },
        { country: "GB", eurMinor: 34_000_000, count: 1_900, excluded: false },
      ],
      leftOut: [],
      noUkEnd: { eurMinor: 280_000_000, count: 29_800 },
    },
    countedTypes: ["send-money", "bank", "top-up", "airtime", "bill", "cash-out"],
    settings: { excludedCountries: [], pending: null, changes: [] },
  };
}

function backups(): BackupStatus {
  return {
    configured: true,
    level: "ok",
    message: "Backups are running and a restore was tested this month.",
    checkedAt: D.ago(0.1),
    backups: {
      level: "ok", message: "Newest copy is 5 hours old.", newestAt: D.ago(5), oldestAt: D.ago(24 * 7), finishedCount: 14,
      recent: Array.from({ length: 6 }, (_, i) => ({ at: D.ago(5 + i * 12), status: "completed" as const, kind: "scheduled" as const, sizeBytes: 1_240_000_000 - i * 4_000_000, expiresAt: D.ahead(24 * 7 - i * 12) })),
    },
    restoreTests: {
      level: "ok", message: "Last restore test worked 12 days ago.", lastAt: D.ago(24 * 12), lastWorkedAt: D.ago(24 * 12),
      recent: [{ id: "rt1", at: D.ago(24 * 12), outcome: "worked", note: "Restored to a test cluster, counted customers and balances: all matched.", by: { name: "Isatou Drammeh", phone: "", role: "admin" } }],
    },
  };
}

function referrals(): ReferralSettings {
  const live = { on: true, startsAt: D.ago(24 * 30), endsAt: D.ahead(24 * 60), perPersonCap: 10, amounts: { GBP: { bonusMinor: 500, minSendMinor: 5_000 }, GMD: { bonusMinor: 30_000, minSendMinor: 300_000 }, XOF: { bonusMinor: 3_000, minSendMinor: 30_000 } } };
  return { live, pending: null, changes: [{ from: { ...live, on: false }, to: live, reason: "Start the programme", approveReason: "Budget agreed", at: D.ago(24 * 30) }], counts: { paid: 214, waiting: 61 }, daysToQualify: 30 };
}
const referralRows: ReferralInvite[] = Array.from({ length: 8 }, (_, i) => {
  const a = D.customerRows[i]!;
  const b = D.customerRows[(i + 9) % 20]!;
  const status = (["paid", "waiting", "paid", "expired", "waiting", "paying", "paid", "waiting"] as const)[i]!;
  return {
    id: `ri${i}`, inviter: { id: a.id, name: a.name }, invitee: { id: b.id, name: b.name }, status, signedUpAt: D.ago(24 * (3 + i * 6)), qualifyBy: D.ahead(24 * (27 - i * 6)),
    paidAt: status === "paid" ? D.ago(24 * i) : null, inviterPaid: status === "paid" ? { currency: "GBP", amountMinor: 500 } : null, inviteePaid: status === "paid" ? { currency: "GBP", amountMinor: 500 } : null, capped: false,
  };
});

let salesMinimum = 50_000;
function salesReport(): SalesReport {
  return {
    from: D.day(22), until: D.day(0), minimumGmdMinor: salesMinimum,
    salespeople: [
      { id: "sr1", name: "Mariama Touray", code: "MARIAMA", active: true, signedUp: 84, idChecked: 61, qualified: 47 },
      { id: "sr2", name: "Bubacarr Jobe", code: "BUBA", active: true, signedUp: 52, idChecked: 40, qualified: 29 },
      { id: "sr3", name: "Seynabou Ba", code: "SEYNA", active: true, signedUp: 37, idChecked: 30, qualified: 22 },
      { id: "sr4", name: "Pa Alieu Sarr", code: "PAALIEU", active: false, signedUp: 3, idChecked: 1, qualified: 0 },
    ],
  };
}
function salesSettings(): SalesSettings {
  return { minimumGmdMinor: salesMinimum, pending: null, changes: [{ fromGmdMinor: 30_000, toGmdMinor: 50_000, reason: "Count only customers who really use the app", by: "Fatou Ceesay", approvedBy: "Aminata Sow", at: D.ago(24 * 45) }] };
}

function ticketStats(): TicketStats {
  const ms = months(6);
  const open = D.ticketRows.filter((t) => t.status === "open" || t.status === "in_progress");
  const by = <K extends string>(keys: K[], get: (t: TicketRow) => K) => keys.map((key) => ({ key, count: open.filter((t) => get(t) === key).length }));
  const rows = ms.map((month, i) => ({ month, handled: 40 + i * 12, averageHours: 30 - i * 3 }));
  return {
    months: rows,
    thisMonth: rows[5]!,
    lastMonth: rows[4]!,
    openByPriority: by(["critical", "high", "medium", "low"], (t) => t.priority),
    byCategory: by(["payment_failed", "money_missing", "cash_out", "agent", "id_check", "login_or_pin", "fees_or_rates", "account", "limit_increase", "agent_address", "other"], (t) => t.category),
  };
}

function complaintReturn(period: string): ComplaintReturn {
  return {
    period, from: D.day(180), to: D.day(0), openAtStart: 2, received: 19, receivedByCategory: { payment: 8, fees: 4, service: 5, emoney: 2 }, receivedByCountry: { GB: 11, GM: 6, SN: 2 },
    receivedByChannel: { app: 9, phone: 7, email: 3 }, closed: 17, closedByOutcome: { upheld: 6, partly_upheld: 3, not_upheld: 7, withdrawn: 1 }, closedWithin: { "3": 5, "15": 9, "35": 3, later: 0 },
    upheldRate: 52.9, redress: { GBP: 14_500 }, ombudsmanInformed: 17, fraudReceived: 1, fraudClosed: 1, openAtEnd: 4,
    rows: D.complaints.map((c) => ({ number: c.number, received: c.receivedAt.slice(0, 10), closed: c.closedAt?.slice(0, 10) ?? "", category: c.category, country: c.country, channel: c.channel, outcome: c.outcome ?? "", businessDays: c.closedAt ? 5 : "", redress: "" })),
  };
}

function agentAnalytics(bucket: AgentAnalytics["bucket"], days: number, agentId: string | null): AgentAnalytics {
  const points = bucket === "day" ? Math.min(days, 30) : bucket === "week" ? Math.ceil(days / 7) : Math.max(1, Math.ceil(days / 30));
  const series = Array.from({ length: points }, (_, i) => {
    const label = bucket === "month" ? months(points)[i]! : bucket === "week" ? `W${i + 1}` : D.day(points - 1 - i);
    const scale = agentId ? 0.15 : 1;
    const cashIn = Math.round((120_000 + i * 9_000) * 100 * scale);
    const cashOut = Math.round((180_000 + i * 11_000) * 100 * scale);
    return { label, currency: "GMD", cashInMinor: cashIn, cashOutMinor: cashOut, volumeMinor: cashIn + cashOut, count: Math.round((140 + i * 9) * scale), activeAgents: agentId ? 1 : 38 + (i % 5) };
  });
  return {
    bucket, days, agent: agentId, agentCount: 63, series,
    ranking: D.agentRows.filter((a) => a.status === "approved").map((a, i) => ({
      agentId: a.id, name: a.name, businessName: a.businessName, currency: a.country === "SN" ? "XOF" : "GMD",
      cashInMinor: (90_000 - i * 9_000) * (a.country === "SN" ? 10 : 100), cashOutMinor: (140_000 - i * 12_000) * (a.country === "SN" ? 10 : 100),
      volumeMinor: (230_000 - i * 21_000) * (a.country === "SN" ? 10 : 100), count: 420 - i * 41,
    })),
  };
}

function audit(): AuditEvent[] {
  const routes = [
    ["GET", "/admin/customers/:id", "action"], ["PATCH", "/admin/tickets/:id", "action"], ["POST", "/admin/tickets/:id/notes", "action"], ["POST", "/auth/login", "login_pin"],
    ["POST", "/auth/staff/2fa/verify", "login_complete"], ["POST", "/admin/settings/cash-out/:country/changes", "action"], ["POST", "/auth/staff/2fa/verify", "login_code_failed"],
    ["POST", "/admin/users/:id/hold", "action"], ["GET", "/admin/transactions/:id", "action"],
  ] as const;
  return Array.from({ length: 48 }, (_, i) => {
    const [method, route, kind] = routes[i % routes.length]!;
    const s = D.STAFF[i % D.STAFF.length]!;
    return { id: `ev${i}`, staff: { id: s.id, name: s.name }, kind, method, route, targets: route.includes(":id") ? [`c${(i % 20) + 1}`] : [], status: kind === "login_code_failed" ? 401 : 200, ip: `41.223.${10 + (i % 40)}.•••`, at: D.ago(i * 1.7 + 0.1) };
  });
}

function higherLimitView(): HigherLimitSettingsView {
  return {
    settings: hlSettings, defaults: hlSettings,
    bounds: { maxDayMinor: [500_000, 10_000_000], maxMonthMinor: [1_000_000, 30_000_000], reviewMonths: [3, 24], nudgePercent: [50, 95] },
    pending: null, changes: [],
  };
}
const higherRows: HigherLimitRow[] = [
  {
    id: "hl1", customerId: "c2", customer: "Modou Sanneh", reviewSoon: false, status: "awaiting_approval", dayMinor: 1_000_000, monthMinor: 3_000_000, reviewMonths: 12, reviewBy: null,
    sourceOfWealth: "Salary as a nurse for 9 years, plus savings.", sourceOfFunds: "Sends part of his monthly salary to build a house in Brikama.",
    documents: [{ kind: "payslips", note: "Last 3 months", seenOn: D.day(1) }, { kind: "bank_statements", note: "Last 3 months", seenOn: D.day(1) }],
    screenedClear: true, riskNotes: "Pattern matches the salary. No adverse media.", ticketId: "t4", proposedBy: "Ousman Bah", proposedById: "s2", proposedAt: D.ago(5), proposeReason: "Building a house, regular monthly sends.",
    approvedBy: "", approvedAt: null, closedBy: "", closedAt: null,
  },
];
function customerHigher(id: string): CustomerHigherLimit {
  const waiting = higherRows.find((r) => r.customerId === id && r.status === "awaiting_approval") ?? null;
  return {
    active: null, waiting, history: [],
    request: id === "c1" ? { ticketId: "t4", number: 1044, subject: "Wants a higher sending limit", at: D.ago(20), files: 0 } : null,
    settings: hlSettings,
  };
}

const fraudSummary = (): FraudSummary => {
  const open = D.cases.filter((c) => c.type === "fraud_alert" && c.status === "open");
  const byRule: Record<string, number> = {};
  for (const c of open) byRule[c.rule ?? ""] = (byRule[c.rule ?? ""] ?? 0) + 1;
  return { open: open.length, openByRule: byRule, escalated: open.filter((c) => c.escalatedAt).length, pinLockouts24h: 3, onHold: D.holds.length, opened7d: 9, closed7d: { no_fraud: 4, fraud: 1, resolved: 2 }, lastRunAt: D.ago(0.1) };
};

// ---- The routes ----

type Ctx = { m: RegExpMatchArray; q: URLSearchParams; body: Record<string, unknown> };
type Route = [string, RegExp, (ctx: Ctx) => Json];

function paged<T>(list: T[], q: URLSearchParams, key: string, defaultLimit = 25) {
  const page = Math.max(1, Number(q.get("page") || 1));
  const limit = Number(q.get("limit") || defaultLimit);
  return { [key]: list.slice((page - 1) * limit, page * limit), pagination: { page, limit, total: list.length, pages: Math.max(1, Math.ceil(list.length / limit)) } };
}
const has = (value: string | undefined | null, search: string) => (value ?? "").toLowerCase().includes(search.toLowerCase());
const findTicket = (id: string) => {
  const row = D.ticketRows.find((t) => t.id === id);
  if (!row) throw new Refused(404, "Ticket not found.");
  return row;
};
const ok = () => ({});

const ticketNotes: Record<string, { by: string; text: string; at: string }[]> = {};

const R: Route[] = [
  // Sign in
  ["POST", /^\/auth\/login$/, () => ({ role: "admin", needsCode: true, enrolled: true, loginTicket: "demo-ticket" })],
  ["POST", /^\/auth\/staff\/2fa\/setup$/, () => ({ secret: "DEMODEMODEMODEMO", otpauthUrl: "otpauth://totp/SunuPay:demo?secret=DEMODEMODEMODEMO" })],
  ["POST", /^\/auth\/staff\/2fa\/verify$/, () => {
    me = nextSignIn;
    return { accessToken: "demo", refreshToken: "demo", role: "admin" };
  }],
  ["POST", /^\/auth\/logout$/, ok],
  ["POST", /^\/auth\/refresh-token$/, () => ({ accessToken: "demo", refreshToken: "demo" })],
  ["POST", /^\/auth\/staff-invite\/check$/, () => ({ firstName: "Babucarr" })],
  ["POST", /^\/auth\/staff-invite\/accept$/, ok],
  ["GET", /^\/admin\/me$/, () => D.staffMe(me)],
  ["PUT", /^\/admin\/me\/language$/, ok],

  // Reported requests, holds
  ["GET", /^\/admin\/reported-requests$/, ({ q }) => ({ ...paged(D.reported, q, "requests"), totalText: "GBP 65.00" })],
  ["GET", /^\/admin\/holds$/, ({ q }) => paged(q.get("lift") === "asked" ? D.holds.filter((h) => h.liftRequestedBy) : D.holds, q, "holds")],
  ["GET", /^\/admin\/users$/, ({ q }) => ({
    users: [...D.customerRows.map((c) => ({ _id: c.id, name: c.name, phone: c.phone, role: "user" })), ...D.agentRows.map((a) => ({ _id: a.id, name: a.name, phone: a.phone, role: a.role }))]
      .filter((u) => has(u.name, q.get("search") ?? "") || has(u.phone, q.get("search") ?? "")).slice(0, 10),
  })],
  ["POST", /^\/admin\/users\/([^/]+)\/hold$/, ({ m, body }) => {
    const c = D.customerById(m[1]!) ?? null;
    const a = D.agentById(m[1]!) ?? null;
    const who = c ?? a;
    if (!who) throw new Refused(404, "Not found.");
    D.holds.unshift({ user: { id: who.id, name: who.name, phone: who.phone, role: c ? "user" : "agent" }, active: true, scope: (body.scope as "all") ?? "all", reason: String(body.reason ?? ""), placedBy: me, placedAt: D.ago(0), liftRequestedBy: null, liftRequestedAt: null, liftReason: null, placedByName: meName(), liftRequestedByName: null });
    if (c) c.onHold = true;
    return ok();
  }],
  ["POST", /^\/admin\/users\/([^/]+)\/hold\/lift$/, ({ m, body }) => {
    const h = D.holds.find((x) => x.user.id === m[1]);
    if (h) Object.assign(h, { liftRequestedBy: me, liftRequestedAt: D.ago(0), liftReason: String(body.reason ?? ""), liftRequestedByName: meName() });
    return ok();
  }],
  ["POST", /^\/admin\/users\/([^/]+)\/hold\/lift\/approve$/, ({ m }) => {
    const i = D.holds.findIndex((x) => x.user.id === m[1]);
    if (i >= 0) {
      secondPerson(D.holds[i]!.liftRequestedBy);
      D.holds.splice(i, 1);
      const c = D.customerById(m[1]!);
      if (c) c.onHold = false;
    }
    return ok();
  }],
  ["POST", /^\/admin\/users\/([^/]+)\/hold\/lift\/cancel$/, ({ m }) => {
    const h = D.holds.find((x) => x.user.id === m[1]);
    if (h) Object.assign(h, { liftRequestedBy: null, liftRequestedAt: null, liftReason: null, liftRequestedByName: null });
    return ok();
  }],
  ["GET", /^\/admin\/users\/([^/]+)\/hold$/, ({ m }) => D.holds.find((x) => x.user.id === m[1]) ?? null],
  ["POST", /^\/admin\/users\/([^/]+)\/send-lock$/, () => ({ on: true })],

  // Reversals
  ["GET", /^\/admin\/reversals$/, ({ q }) => ({ ...paged(D.reversals.filter((r) => r.status === (q.get("status") ?? "pending")), q, "reversals"), people: D.everyone() })],
  ["POST", /^\/admin\/(cashouts|cashins|payment-requests)\/([^/]+)\/(reverse|refund)$/, ({ m, body }) => {
    const r = { ...D.reversals[0]!, id: `r${D.reversals.length + 1}`, target_id: m[2]!, reason: body.reason as "DUPLICATE", note: String(body.note ?? ""), status: "pending" as const, requested_by: me, approved_by: [], occurred_at: D.ago(0) };
    D.reversals.unshift(r);
    return r;
  }],
  ["POST", /^\/admin\/reversals\/([^/]+)\/approve$/, ({ m }) => {
    const r = D.reversals.find((x) => x.id === m[1]);
    if (!r) throw new Refused(404, "Not found.");
    secondPerson(r.requested_by);
    Object.assign(r, { status: "completed", approved_by: [{ id: me, at: D.ago(0) }], completed_at: D.ago(0) });
    return r;
  }],
  ["POST", /^\/admin\/reversals\/([^/]+)\/cancel$/, ({ m }) => {
    const r = D.reversals.find((x) => x.id === m[1]);
    if (r) r.status = "cancelled";
    return r ?? ok();
  }],

  // Payouts
  ["GET", /^\/admin\/commission\/payouts$/, ({ q }) => ({ ...paged(D.payouts.filter((p) => p.status === (q.get("status") ?? "in_review")), q, "payouts", 50), people: D.people })],
  ["POST", /^\/admin\/commission\/payouts\/approve-batch$/, ({ body }) => ({
    results: (body.ids as string[]).map((id) => {
      const p = D.payouts.find((x) => x.id === id);
      if (!p || p.approved_by.some((a) => a.id === me)) return { id, result: "refused" as const, message: "You already approved this one. A different person must approve it." };
      p.approved_by.push({ id: me, at: D.ago(0) });
      if (p.approved_by.length >= 2) Object.assign(p, { status: "paid", paid_at: D.ago(0) });
      return { id, result: p.approved_by.length >= 2 ? ("paid" as const) : ("approved_once" as const) };
    }),
  })],
  ["POST", /^\/admin\/commission\/payouts\/([^/]+)\/approve$/, ({ m }) => {
    const p = D.payouts.find((x) => x.id === m[1]);
    if (!p) throw new Refused(404, "Not found.");
    if (p.approved_by.some((a) => a.id === me)) throw new Refused(409, "You already approved this payout. A different staff member must give the second approval.");
    p.approved_by.push({ id: me, at: D.ago(0) });
    p.history.push({ action: "approved", by: me, at: D.ago(0) });
    if (p.approved_by.length >= 2) Object.assign(p, { status: "paid", paid_at: D.ago(0) });
    return p;
  }],
  ["POST", /^\/admin\/commission\/payouts\/([^/]+)\/(hold|release)$/, ({ m, body }) => {
    const p = D.payouts.find((x) => x.id === m[1]);
    if (p) {
      p.status = m[2] === "hold" ? "held" : "in_review";
      p.history.push({ action: m[2]!, by: me, reason: String(body.reason ?? ""), at: D.ago(0) });
    }
    return p ?? ok();
  }],

  // Cash out settings
  ["GET", /^\/admin\/settings\/cash-out\/([A-Z]{2})$/, ({ m }) => {
    const settings = cashOut[m[1]!];
    if (!settings) throw new Refused(404, "Cash out is not set up for this country.");
    return { settings, pendingChange: settingsChanges.find((c) => c.country === m[1] && c.status === "pending") ?? null, people: D.people };
  }],
  ["GET", /^\/admin\/settings\/changes$/, ({ q }) => {
    const list = settingsChanges.filter((c) => c.country === q.get("country"));
    return { changes: list, total: list.length, page: 1, limit: 25, people: D.people };
  }],
  ["POST", /^\/admin\/settings\/cash-out\/([A-Z]{2})\/changes$/, ({ m, body }) => {
    const settings = cashOut[m[1]!]!;
    const after = body.change as Partial<CashOutSettings>;
    const change: SettingsChange = {
      id: `sc${settingsChanges.length + 1}`, country: m[1]!, status: "pending", baseVersion: settings.version, changedFields: Object.keys(after) as SettingsChange["changedFields"],
      before: Object.fromEntries(Object.keys(after).map((k) => [k, settings[k as keyof CashOutSettings]])), after, reason: String(body.reason ?? ""), requestedBy: me,
      approvedBy: null, approvedAt: null, cancelledBy: null, cancelReason: null, expiresAt: D.ahead(24), createdAt: D.ago(0),
    };
    settingsChanges.unshift(change);
    return change;
  }],
  ["POST", /^\/admin\/settings\/changes\/([^/]+)\/approve$/, ({ m }) => {
    const c = settingsChanges.find((x) => x.id === m[1]);
    if (!c) throw new Refused(404, "Not found.");
    secondPerson(c.requestedBy);
    const s = cashOut[c.country]!;
    Object.assign(s, c.after, { version: s.version + 1 });
    Object.assign(c, { status: "approved", approvedBy: me, approvedAt: D.ago(0) });
    return ok();
  }],
  ["POST", /^\/admin\/settings\/changes\/([^/]+)\/cancel$/, ({ m, body }) => {
    const c = settingsChanges.find((x) => x.id === m[1]);
    if (c) Object.assign(c, { status: "cancelled", cancelledBy: me, cancelReason: String(body.reason ?? "") });
    return ok();
  }],

  // Rates
  ["GET", /^\/admin\/settings\/rates$/, () => ({ settings: rates, pendingChange: null, people: D.people })],
  ["GET", /^\/admin\/settings\/rates\/changes$/, () => ({ changes: [], total: 0, page: 1, limit: 25, people: D.people })],
  ["POST", /^\/admin\/settings\/rates\/changes$/, ({ body }) => {
    const change = body.change as Partial<RateSettings>;
    rates = { ...rates, ...change, ratesFromGmd: { ...rates.ratesFromGmd, ...(change.ratesFromGmd ?? {}) }, version: rates.version + 1 };
    return { id: "rc1", status: "approved" };
  }],
  ["POST", /^\/admin\/settings\/rates\/changes\/([^/]+)\/(approve|cancel)$/, ok],

  // Face ID
  ["GET", /^\/admin\/settings\/face-id$/, () => ({ settings: faceId, inPence: { maxGbpMinor: Math.round(faceId.maxUsdMinor * faceId.gbpPerUsd), dayGbpMinor: Math.round(faceId.dayUsdMinor * faceId.gbpPerUsd) }, pendingChange: null, people: D.people })],
  ["GET", /^\/admin\/settings\/face-id\/changes$/, () => ({ changes: [], total: 0, page: 1, limit: 25, people: D.people })],
  ["POST", /^\/admin\/settings\/face-id\/changes$/, ({ body }) => {
    faceId = { ...faceId, ...(body.change as Partial<FaceIdSettings>), version: faceId.version + 1 };
    return { id: "fc1", status: "approved" };
  }],
  ["POST", /^\/admin\/settings\/face-id\/changes\/([^/]+)\/(approve|cancel)$/, ok],

  // Payment partners
  ["GET", /^\/admin\/payment-partners$/, () => ({ settings: partnerSettings, partners: PARTNER_FACTS, services: ["wallet_top_up", "airtime", "bills", "bank_transfer"], pendingChange: partnerChanges.find((c) => c.status === "pending") ?? null, people: D.people })],
  ["GET", /^\/admin\/payment-partners\/changes$/, () => ({ changes: partnerChanges, total: partnerChanges.length, page: 1, limit: 25, people: D.people })],
  ["GET", /^\/admin\/payment-partners\/preview$/, ({ q }) => pickDemo(q.get("service") as PartnerService, String(q.get("country")), Number(q.get("amountMinor")))],
  ["POST", /^\/admin\/payment-partners\/changes$/, ({ body }) => {
    if (partnerChanges.some((c) => c.status === "pending")) throw new Refused(409, "Another payment partners change is waiting for approval. Approve or cancel it first.");
    const proposed = body.settings as Omit<PartnerSettings, "version">;
    const change: PartnerChange = {
      id: `pp${partnerChanges.length + 1}`, status: "pending", stop: null, baseVersion: partnerSettings.version, appliedVersion: null, changedFields: [],
      before: structuredClone(partnerSettings), after: { ...structuredClone(proposed), version: partnerSettings.version + 1 }, reason: String(body.reason ?? ""), requestedBy: me,
      approvedBy: null, approvedAt: null, cancelledBy: null, cancelReason: null, expiresAt: D.ahead(24), createdAt: D.ago(0),
    };
    partnerChanges.unshift(change);
    return change;
  }],
  ["POST", /^\/admin\/payment-partners\/changes\/([^/]+)\/approve$/, ({ m }) => {
    const c = partnerChanges.find((x) => x.id === m[1]);
    if (!c || c.status !== "pending") throw new Refused(409, "This change has already been decided.");
    secondPerson(c.requestedBy);
    if (c.baseVersion !== partnerSettings.version) {
      c.status = "stale";
      throw new Refused(409, "The payment partners changed since this was proposed, so it was not applied. Propose it again.");
    }
    partnerSettings = structuredClone(c.after);
    Object.assign(c, { status: "approved", approvedBy: me, approvedAt: D.ago(0), appliedVersion: partnerSettings.version });
    return c;
  }],
  ["POST", /^\/admin\/payment-partners\/changes\/([^/]+)\/cancel$/, ({ m, body }) => {
    const c = partnerChanges.find((x) => x.id === m[1]);
    if (c) Object.assign(c, { status: "cancelled", cancelledBy: me, cancelReason: String(body.reason ?? "") });
    return ok();
  }],
  ["POST", /^\/admin\/payment-partners\/stop$/, ({ body }) => {
    const before = structuredClone(partnerSettings);
    const next = structuredClone(partnerSettings);
    const p = next.partners.find((x) => x.code === body.code);
    if (!p) throw new Refused(400, "Unknown partner.");
    const service = body.service as PartnerService | undefined;
    if (service) {
      const row = p.routes.find((x) => x.service === service && x.country === String(body.country ?? "ALL"));
      if (!row || !row.on) throw new Refused(400, "That row is already off.");
      row.on = false;
    } else {
      if (!p.on) throw new Refused(400, "That partner is already off.");
      p.on = false;
    }
    next.version += 1;
    partnerSettings = next;
    for (const c of partnerChanges) if (c.status === "pending") c.status = "stale";
    const record: PartnerChange = {
      id: `pp${partnerChanges.length + 1}`, status: "approved", stop: { code: String(body.code), service: service ?? null, country: service ? String(body.country ?? "ALL") : null },
      baseVersion: before.version, appliedVersion: next.version, changedFields: [], before, after: structuredClone(next), reason: String(body.reason ?? ""), requestedBy: me,
      approvedBy: me, approvedAt: D.ago(0), cancelledBy: null, cancelReason: null, expiresAt: D.ago(0), createdAt: D.ago(0),
    };
    partnerChanges.unshift(record);
    return record;
  }],

  // Staff
  ["GET", /^\/admin\/staff$/, () => ({ staff: D.staffRows, people: D.people })],
  ["GET", /^\/admin\/staff\/invites$/, () => ({ invites: D.staffInvites })],
  ["POST", /^\/admin\/staff\/invites$/, ({ body }) => {
    D.staffInvites.unshift({
      id: `inv${D.staffInvites.length + 1}`, name: String(body.name), phone: String(body.phone), email: String(body.email), country: String(body.country), employeeId: String(body.employeeId), jobTitle: String(body.jobTitle),
      permissions: body.permissions as string[], status: "awaiting_approval", invitedBy: meName(), invitedById: me, invitedAt: D.ago(0), approvedBy: "", approvedAt: null, expiresAt: null, acceptedAt: null,
    });
    return { id: "new" };
  }],
  ["POST", /^\/admin\/staff\/invites\/([^/]+)\/approve$/, ({ m }) => {
    const inv = D.staffInvites.find((x) => x.id === m[1]);
    if (inv) {
      secondPerson(inv.invitedById);
      Object.assign(inv, { status: "sent", approvedBy: meName(), approvedAt: D.ago(0), expiresAt: D.ahead(48) });
    }
    return ok();
  }],
  ["POST", /^\/admin\/staff\/invites\/([^/]+)\/(resend|cancel)$/, ({ m }) => {
    const inv = D.staffInvites.find((x) => x.id === m[1]);
    if (inv && m[2] === "cancel") inv.status = "cancelled";
    return ok();
  }],
  ["PUT", /^\/admin\/users\/([^/]+)\/permissions$/, ({ m, body }) => {
    const row = D.staffRows.find((s) => s.id === m[1]);
    if (!row) return ok();
    if (row.pendingPermissionsChange && row.pendingPermissionsChange.requestedBy !== me) {
      Object.assign(row, { permissions: row.pendingPermissionsChange.permissions, fullAdmin: row.pendingPermissionsChange.full, pendingPermissionsChange: null });
    } else {
      row.pendingPermissionsChange = { full: Boolean(body.full), permissions: (body.permissions as string[]) ?? [], requestedBy: me, requestedAt: D.ago(0) };
    }
    return ok();
  }],
  ["DELETE", /^\/admin\/users\/([^/]+)\/permissions-change$/, ({ m }) => {
    const row = D.staffRows.find((s) => s.id === m[1]);
    if (row) row.pendingPermissionsChange = null;
    return ok();
  }],
  ["PATCH", /^\/admin\/users\/([^/]+)\/role$/, ok],
  ["DELETE", /^\/admin\/users\/([^/]+)\/role-change$/, ok],
  ["POST", /^\/admin\/users\/([^/]+)\/2fa\/reset$/, ok],

  // Agents
  ["GET", /^\/admin\/agents\/analytics$/, ({ q }) => agentAnalytics((q.get("bucket") as "day") ?? "day", Number(q.get("days") ?? 30), q.get("agent"))],
  ["GET", /^\/admin\/agents$/, ({ q }) => {
    const status = q.get("status");
    const search = q.get("search") ?? "";
    return paged(D.agentRows.filter((a) => (!status || a.status === status) && (!search || has(a.name, search) || has(a.businessName, search) || has(a.phone, search))), q, "agents");
  }],
  ["GET", /^\/admin\/agents\/([^/]+)$/, ({ m }) => {
    const a = D.agentById(m[1]!);
    if (!a) throw new Refused(404, "Agent not found.");
    return D.agentDetail(a);
  }],
  ["PUT", /^\/admin\/agents\/([^/]+)\/location$/, ({ body }) => ({ businessAddress: body.businessAddress, city: body.city, showOnMap: body.showOnMap, pin: body.pin ?? null })],
  ["POST", /^\/admin\/map-pin$/, () => ({ lat: 13.4549, lng: -16.6788 })],
  ["POST", /^\/admin\/agents\/([^/]+)\/address\/(ask-proof|approve|reject)$/, ok],
  ["PATCH", /^\/admin\/agent-applications\/([^/]+)$/, ({ m, body }) => {
    const a = D.agentById(m[1]!);
    if (a) Object.assign(a, { status: body.status, role: body.status === "approved" ? "agent" : a.role, reviewedAt: D.ago(0) });
    return ok();
  }],

  // Customers
  ["GET", /^\/admin\/customers$/, ({ q }) => {
    const filter = q.get("filter");
    const search = q.get("search") ?? "";
    return paged(
      D.customerRows.filter(
        (c) =>
          (!filter || (filter === "verified" ? c.verification === "full" : filter === "unverified" ? c.verification !== "full" : c.onHold)) &&
          (!search || has(c.name, search) || has(c.phone, search)),
      ),
      q,
      "customers",
    );
  }],
  ["GET", /^\/admin\/customers\/([^/]+)\/higher-limit$/, ({ m }) => customerHigher(m[1]!)],
  ["POST", /^\/admin\/customers\/([^/]+)\/higher-limit$/, () => ({ id: "hl-new", status: "awaiting_approval" })],
  ["GET", /^\/admin\/customers\/([^/]+)\/messages$/, ({ m }) => ({ messages: messages[m[1]!] ?? [] })],
  ["POST", /^\/admin\/customers\/([^/]+)\/messages$/, ({ m, body }) => {
    (messages[m[1]!] ??= []).unshift({ id: `m${Date.now()}`, text: String(body.text), lang: (body.lang as "en") ?? "en", by: meName(), at: D.ago(0), ticket: null });
    return { id: "sent" };
  }],
  ["GET", /^\/admin\/customers\/([^/]+)$/, ({ m }) => {
    const c = D.customerById(m[1]!);
    if (!c) throw new Refused(404, "Customer not found.");
    return D.customerDetail(c);
  }],
  ["PATCH", /^\/admin\/customers\/([^/]+)$/, ({ m, body }) => {
    const c = D.customerById(m[1]!);
    const changed: { field: string; from: string; to: string }[] = [];
    if (c && typeof body.name === "string" && body.name !== c.name) {
      changed.push({ field: "name", from: c.name, to: body.name });
      c.name = body.name;
    }
    return { changed };
  }],
  ["PUT", /^\/admin\/customers\/([^/]+)\/phone$/, () => ({ asked: true })],
  ["DELETE", /^\/admin\/customers\/([^/]+)\/phone-change$/, ok],
  ["POST", /^\/admin\/customers\/([^/]+)\/caller-check\/code$/, ({ m }) => ({ sentTo: (D.customerById(m[1]!)?.phone ?? "").replace(/\d(?=\d{3})/g, "•") })],
  ["POST", /^\/admin\/customers\/([^/]+)\/caller-check\/code\/verify$/, () => ({ passed: true })],
  ["POST", /^\/admin\/customers\/([^/]+)\/caller-check\/questions$/, () => ({
    checkId: "q1",
    questions: [
      { id: "school", en: "What was the name of your first school?", fr: "Quel était le nom de votre première école ?" },
      { id: "town", en: "In which town was your mother born?", fr: "Dans quelle ville votre mère est-elle née ?" },
    ],
  })],
  ["POST", /^\/admin\/customers\/([^/]+)\/caller-check\/questions\/([^/]+)$/, () => ({ passed: true })],
  ["POST", /^\/admin\/customers\/([^/]+)\/close$/, () => ({ closed: true })],
  ["POST", /^\/admin\/customers\/([^/]+)\/reopen$/, () => ({ reopened: true })],

  // Tickets
  ["GET", /^\/admin\/tickets\/stats$/, ticketStats],
  ["GET", /^\/admin\/tickets\/settings$/, () => ticketSettings],
  ["PUT", /^\/admin\/tickets\/settings\/limits$/, ({ body }) => {
    ticketSettings = { ...ticketSettings, pending: { hours: body.hours as TicketSettings["overdueHours"], reason: String(body.reason ?? ""), by: meName(), byId: me, at: D.ago(0) } };
    return { asked: true, settings: ticketSettings };
  }],
  ["DELETE", /^\/admin\/tickets\/settings\/limits\/change$/, () => {
    ticketSettings = { ...ticketSettings, pending: null };
    return null;
  }],
  ["GET", /^\/admin\/tickets\/payments$/, ({ q }) => {
    const id = q.get("customer") ?? "";
    return {
      days: 90,
      payments: D.txRows.filter((x) => x.from?.id === id || x.to?.id === id).slice(0, 12).map((x) => ({
        id: x.id, txRef: x.txRef, type: x.type, status: x.status, currency: x.currency, amountMinor: x.amountMinor, description: x.description,
        direction: x.from?.id === id ? ("out" as const) : ("in" as const), otherParty: x.from?.id === id ? (x.to ? { id: x.to.id, name: x.to.name } : null) : x.from ? { id: x.from.id, name: x.from.name } : null, at: x.createdAt,
      })),
    };
  }],
  ["GET", /^\/admin\/tickets$/, ({ q }) => {
    const status = q.get("status");
    const priority = q.get("priority");
    const assigned = q.get("assignedTo");
    const search = q.get("search") ?? "";
    const customer = q.get("customer");
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    let list = D.ticketRows.filter(
      (t) =>
        (!status || (status === "active" ? t.status === "open" || t.status === "in_progress" : t.status === status)) &&
        (!priority || t.priority === priority) &&
        (assigned !== "me" || t.assignedTo?.id === me) &&
        (assigned !== "none" || !t.assignedTo) &&
        (!customer || t.customer?.id === customer) &&
        (!search || has(t.subject, search) || has(t.customer?.name, search) || String(t.number).includes(search)),
    );
    list = q.get("sort") === "urgent" ? [...list].sort((a, b) => order[a.priority] - order[b.priority] || a.createdAt.localeCompare(b.createdAt)) : [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return paged(list, q, "tickets");
  }],
  ["POST", /^\/admin\/tickets$/, ({ body }) => {
    const c = typeof body.customer === "string" ? D.customerById(body.customer) : undefined;
    const row: TicketRow = {
      id: `t${D.ticketRows.length + 1}`, number: 1041 + D.ticketRows.length, subject: String(body.subject), priority: body.priority as TicketRow["priority"], status: "open", category: body.category as TicketRow["category"],
      customer: c ? { id: c.id, name: c.name } : null, assignedTo: null, createdAt: D.ago(0), resolvedAt: null, updatedAt: D.ago(0), overdue: false, unassigned: true,
    };
    D.ticketRows.unshift(row);
    return { id: row.id, number: row.number };
  }],
  ["GET", /^\/admin\/tickets\/([^/]+)\/files\/([^/]+)$/, () => new Blob(["Demo file"], { type: "text/plain" })],
  ["GET", /^\/admin\/tickets\/([^/]+)$/, ({ m }) => {
    const row = findTicket(m[1]!);
    const detail = D.ticketDetail(row);
    detail.notes.push(...(ticketNotes[row.id] ?? []).map((n) => ({ by: { id: n.by, name: D.staffName(n.by), phone: "" }, text: n.text, at: n.at })));
    return detail;
  }],
  ["PATCH", /^\/admin\/tickets\/([^/]+)$/, ({ m, body }) => {
    const row = findTicket(m[1]!);
    if (body.status) row.status = body.status as TicketRow["status"];
    if (body.priority) row.priority = body.priority as TicketRow["priority"];
    if (body.category) row.category = body.category as TicketRow["category"];
    if ("assignedTo" in body) {
      const id = body.assignedTo === "me" ? me : (body.assignedTo as string | null);
      row.assignedTo = id ? { id, name: D.staffName(id) } : null;
      row.unassigned = !id;
    }
    row.updatedAt = D.ago(0);
    return ok();
  }],
  ["POST", /^\/admin\/tickets\/([^/]+)\/notes$/, ({ m, body }) => {
    (ticketNotes[m[1]!] ??= []).push({ by: me, text: String(body.text ?? ""), at: D.ago(0) });
    return ok();
  }],
  ["POST", /^\/admin\/tickets\/([^/]+)\/notes\/(\d+)\/translate$/, ({ body }) => ({
    sameLanguage: false, target: body.target, from: "fr",
    text: body.target === "en" ? "The customer made a new code and the agent accepted it. Waiting for the customer to confirm." : "Le client a refait un code, l'agent l'a accepté.",
  })],
  ["POST", /^\/admin\/tickets\/([^/]+)\/(files|keep)$/, ok],
  ["POST", /^\/admin\/tickets\/([^/]+)\/keep\/change$/, () => ({ asked: true })],
  ["DELETE", /^\/admin\/tickets\/([^/]+)\/(files\/[^/]+|keep\/change)$/, ok],

  // Cases and fraud
  ["GET", /^\/admin\/compliance-cases$/, ({ q }) => {
    const type = q.get("type");
    const status = q.get("status") ?? "open";
    const rule = q.get("rule");
    let list = D.cases.filter((c) => c.status === status && (!type || c.type === type) && (!rule || c.rule === rule) && (q.get("escalated") !== "true" || c.escalatedAt));
    list = [...list].sort((a, b) => Number(Boolean(b.escalatedAt)) - Number(Boolean(a.escalatedAt)) || b.createdAt.localeCompare(a.createdAt));
    return paged(list, q, "cases");
  }],
  ["POST", /^\/admin\/compliance-cases\/([^/]+)\/close$/, ({ m, body }) => {
    const c = D.cases.find((x) => x.id === m[1]);
    if (c) Object.assign(c, { status: "closed", closedBy: { id: me, name: meName(), phone: "" }, closedAt: D.ago(0), closeNote: String(body.note ?? ""), outcome: body.outcome ?? null });
    return ok();
  }],
  ["POST", /^\/admin\/compliance-cases\/([^/]+)\/escalate$/, ({ m, body }) => {
    const c = D.cases.find((x) => x.id === m[1]);
    if (c) Object.assign(c, { escalatedAt: D.ago(0), escalatedBy: { id: me, name: meName(), phone: "" }, escalateNote: String(body.note ?? "") });
    return ok();
  }],
  ["GET", /^\/admin\/fraud\/summary$/, fraudSummary],
  ["GET", /^\/admin\/fraud\/settings$/, (): FraudSettings => ({ limits: fraudDefaults, defaults: fraudDefaults, bounds: fraudBounds, lastRunAt: D.ago(0.1), pending: null, changes: [] })],
  ["PUT", /^\/admin\/fraud\/settings\/limits$/, () => ({ asked: true })],
  ["DELETE", /^\/admin\/fraud\/settings\/limits\/change$/, () => null],

  // Analytics and audit
  ["GET", /^\/admin\/analytics$/, analytics],
  ["GET", /^\/admin\/analytics\/places$/, places],
  ["GET", /^\/admin\/analytics\/customers$/, growth],
  ["GET", /^\/admin\/audit$/, ({ q }) => {
    const kind = q.get("kind");
    const staff = q.get("staff");
    return paged(audit().filter((e) => (!kind || e.kind === kind) && (!staff || e.staff.id === staff)), q, "events", 50);
  }],

  // Services and countries
  ["GET", /^\/admin\/countries$/, () => D.countries],
  ["PATCH", /^\/admin\/countries\/([^/]+)$/, ({ m, body }) => {
    const c = D.countries.find((x) => x.code === m[1]);
    if (!c) throw new Refused(404, "Not found.");
    if (body.enabled === false) c.enabled = false;
    else if (c.licence.status === "none") throw new Refused(409, "Record a licence for this country before switching it on.");
    else if (c.pendingOn && c.pendingOn.requestedBy?._id !== me) Object.assign(c, { enabled: true, pendingOn: null });
    else c.pendingOn = { requestedBy: { _id: me, name: meName() }, requestedAt: D.ago(0), reason: String(body.reason ?? "") };
    return c;
  }],
  ["DELETE", /^\/admin\/countries\/([^/]+)\/switch-on$/, ({ m }) => {
    const c = D.countries.find((x) => x.code === m[1]);
    if (c) c.pendingOn = null;
    return ok();
  }],
  ["PUT", /^\/admin\/countries\/([^/]+)\/licence$/, ({ m, body }) => {
    const c = D.countries.find((x) => x.code === m[1]);
    if (c) c.licence = { status: body.status as "own", holder: String(body.holder ?? ""), reference: String(body.reference ?? ""), note: String(body.note ?? ""), recordedAt: D.ago(0), recordedBy: { _id: me, name: meName() } };
    return c ?? ok();
  }],
  ["GET", /^\/admin\/services$/, () => D.services],
  ["POST", /^\/admin\/services\/launch-plan$/, () => ({ switchedOff: 0, stillOff: [] })],
  ["PUT", /^\/admin\/services\/([^/]+)\/([^/]+)$/, ({ m, body }) => {
    const s = D.services.find((x) => x.country === m[1] && x.service === m[2]);
    if (!s) throw new Refused(404, "Not found.");
    if (body.state !== "on") Object.assign(s, { state: body.state, reason: String(body.reason ?? ""), pendingOn: null });
    else if (s.pendingOn && s.pendingOn.requestedBy !== me) Object.assign(s, { state: "on", reason: "", pendingOn: null });
    else s.pendingOn = { requestedBy: me, requestedByName: meName(), requestedAt: D.ago(0), reason: String(body.reason ?? "") };
    return ok();
  }],
  ["DELETE", /^\/admin\/services\/([^/]+)\/([^/]+)\/switch-on$/, ({ m }) => {
    const s = D.services.find((x) => x.country === m[1] && x.service === m[2]);
    if (s) s.pendingOn = null;
    return ok();
  }],

  // Bills and top-ups
  ["GET", /^\/admin\/needs-checking$/, ({ q }) => ({ ...paged(D.stuck, q, "transactions"), totalText: "GMD 2,550.00 and XOF 15,000" })],
  ["PATCH", /^\/admin\/needs-checking\/([^/]+)$/, ({ m, body }) => {
    const i = D.stuck.findIndex((x) => x.id === m[1]);
    if (i < 0) throw new Refused(404, "Not found.");
    const p = D.stuck[i]!;
    if (body.outcome === "failed" && p.refundAsk && p.refundAsk.requestedBy === me) throw new Refused(403, "A different staff member must approve this refund.");
    D.stuck.splice(i, 1);
    return { id: p.id, status: body.outcome === "failed" ? "refunded" : "successful" };
  }],
  ["DELETE", /^\/admin\/needs-checking\/([^/]+)\/refund-ask$/, ({ m }) => {
    const p = D.stuck.find((x) => x.id === m[1]);
    if (p) p.refundAsk = null;
    return ok();
  }],
  ["GET", /^\/admin\/refund-limits$/, () => refundLimits],
  ["PUT", /^\/admin\/refund-limits\/([^/]+)$/, () => ({ asked: true })],
  ["DELETE", /^\/admin\/refund-limits\/([^/]+)\/raise$/, ({ m }) => {
    const r = refundLimits.find((x) => x.country === m[1]);
    if (r) r.pendingRaise = null;
    return ok();
  }],

  // Announcements and offer cards
  ["GET", /^\/admin\/announcements$/, () => D.announcements],
  ["POST", /^\/admin\/announcements$/, ({ body }) => {
    D.announcements.unshift({
      ...(body as unknown as typeof D.announcements[number]), id: `an${D.announcements.length + 1}`, state: "waiting", createdBy: me, createdByName: meName(), createdAt: D.ago(0),
      approvedByName: "", approvedAt: null, withdrawnByName: "", withdrawnAt: null, withdrawReason: "",
    });
    return { id: "new" };
  }],
  ["POST", /^\/admin\/announcements\/([^/]+)\/approve$/, ({ m }) => {
    const a = D.announcements.find((x) => x.id === m[1]);
    if (a) {
      secondPerson(a.createdBy);
      Object.assign(a, { state: new Date(a.startsAt).getTime() > D.NOW ? "scheduled" : "live", approvedByName: meName(), approvedAt: D.ago(0) });
    }
    return ok();
  }],
  ["POST", /^\/admin\/announcements\/([^/]+)\/withdraw$/, ({ m, body }) => {
    const a = D.announcements.find((x) => x.id === m[1]);
    if (a) Object.assign(a, { state: "withdrawn", withdrawnByName: meName(), withdrawnAt: D.ago(0), withdrawReason: String(body.reason ?? "") });
    return ok();
  }],
  ["GET", /^\/admin\/offer-cards$/, () => D.offerCards],
  ["POST", /^\/admin\/offer-cards\/picture$/, () => ({ url: "" })],
  ["POST", /^\/admin\/offer-cards$/, ({ body }) => {
    D.offerCards.unshift({
      ...(body as unknown as typeof D.offerCards[number]), id: `oc${D.offerCards.length + 1}`, state: "waiting", createdBy: me, createdByName: meName(), createdAt: D.ago(0),
      approvedByName: "", withdrawnByName: "", withdrawnAt: null, withdrawReason: "",
    });
    return { id: "new" };
  }],
  ["POST", /^\/admin\/offer-cards\/([^/]+)\/approve$/, ({ m }) => {
    const c = D.offerCards.find((x) => x.id === m[1]);
    if (c) {
      secondPerson(c.createdBy);
      Object.assign(c, { state: new Date(c.startsAt).getTime() > D.NOW ? "scheduled" : "live", approvedByName: meName() });
    }
    return ok();
  }],
  ["POST", /^\/admin\/offer-cards\/([^/]+)\/withdraw$/, ({ m, body }) => {
    const c = D.offerCards.find((x) => x.id === m[1]);
    if (c) Object.assign(c, { state: "withdrawn", withdrawnByName: meName(), withdrawnAt: D.ago(0), withdrawReason: String(body.reason ?? "") });
    return ok();
  }],

  // Event tickets
  ["GET", /^\/admin\/ticket-events$/, () => D.ticketEvents],
  ["POST", /^\/admin\/ticket-events$/, () => ({ id: "new" })],
  ["GET", /^\/admin\/ticket-events\/([^/]+)\/buyers$/, (): TopBuyer[] =>
    [0, 5, 9].map((i, k) => {
      const c = D.customerRows[i]!;
      return { userId: c.id, name: c.name, phone: c.phone, tickets: [6, 5, 4][k]!, priceMinor: [360_000, 300_000, 240_000][k]!, passedOn: [4, 0, 1][k]!, firstAt: D.ago(24 * 9), lastAt: D.ago(24 * (k + 1)) };
    })],
  ["GET", /^\/admin\/ticket-events\/([^/]+)\/tickets$/, ({ q }) => {
    const search = q.get("search") ?? "";
    return D.eventTicketRows.filter((t) => !search || has(t.number, search) || has(t.ownerName, search) || has(t.ownerPhone, search));
  }],
  ["POST", /^\/admin\/ticket-events\/([^/]+)\/approve$/, ({ m }) => {
    const e = D.ticketEvents.find((x) => x.id === m[1]);
    if (e) {
      secondPerson(e.createdBy);
      Object.assign(e, { state: "on_sale", approvedByName: meName() });
    }
    return ok();
  }],
  ["POST", /^\/admin\/ticket-events\/([^/]+)\/edit\/approve$/, ({ m }) => {
    const e = D.ticketEvents.find((x) => x.id === m[1]);
    if (e?.pendingEdit) {
      if (e.pendingEdit.by === me) throw new Refused(403, "A different staff member must approve this change.");
      e.tiers = e.pendingEdit.changes.tiers;
      e.capacity = e.tiers.reduce((sum, t) => sum + t.capacity, 0);
      e.pendingEdit = null;
    }
    return ok();
  }],
  ["DELETE", /^\/admin\/ticket-events\/([^/]+)\/edit$/, ({ m }) => {
    const e = D.ticketEvents.find((x) => x.id === m[1]);
    if (e) e.pendingEdit = null;
    return ok();
  }],
  ["PUT", /^\/admin\/ticket-events\/([^/]+)$/, () => ({ asked: true })],
  ["POST", /^\/admin\/ticket-events\/([^/]+)\/main$/, ({ m, body }) => {
    for (const e of D.ticketEvents) e.featured = body.main ? e.id === m[1] : e.featured && e.id !== m[1];
    return ok();
  }],
  ["POST", /^\/admin\/ticket-events\/([^/]+)\/cancel$/, ({ m, body }) => {
    const e = D.ticketEvents.find((x) => x.id === m[1]);
    if (e) Object.assign(e, { state: "cancelled", cancelledByName: meName(), cancelledAt: D.ago(0), cancelReason: String(body.reason ?? "") });
    return ok();
  }],
  ["POST", /^\/admin\/ticket-events\/([^/]+)\/gate-staff$/, ok],
  ["POST", /^\/admin\/event-tickets\/([^/]+)\/refund$/, ({ m }) => {
    const t = D.eventTicketRows.find((x) => x.id === m[1]);
    if (t) Object.assign(t, { status: "refunded", refundedAt: D.ago(0), refundedByName: meName() });
    return { amountMinor: t?.priceMinor ?? 0, currency: "GMD" };
  }],
  ["POST", /^\/admin\/ticket-events\/([^/]+)\/refund-all$/, () => ({ refunded: 0, failed: [] })],
  ["POST", /^\/admin\/ticket-events\/([^/]+)\/pay-organiser$/, ({ m }) => {
    const e = D.ticketEvents.find((x) => x.id === m[1]);
    if (e) Object.assign(e, { payoutState: "paid", paidOutAt: D.ago(0), paidOutByName: meName(), payoutPriceMinor: e.heldPriceMinor, payoutFeeMinor: e.heldFeeMinor });
    return { priceMinor: e?.heldPriceMinor ?? 0, feeMinor: e?.heldFeeMinor ?? 0, currency: e?.currency ?? "GMD" };
  }],

  // Blocklist
  ["GET", /^\/admin\/blocklist$/, ({ q }) => paged(q.get("all") === "true" ? D.blockEntries : D.blockEntries.filter((b) => b.state === "blocked" || b.state === "unconfirmed"), q, "entries")],
  ["GET", /^\/admin\/blocklist\/matches$/, () => D.blockMatches],
  ["POST", /^\/admin\/blocklist\/look-up$/, ({ body }) => ({ masked: String(body.value ?? "").replace(/.(?=.{4})/g, "•"), entries: D.blockEntries.filter((b) => b.type === body.type).slice(0, 1) })],
  ["POST", /^\/admin\/blocklist$/, ({ body }) => {
    D.blockEntries.unshift({
      id: `b${D.blockEntries.length + 1}`, type: (body.type as "phone") ?? "phone", masked: String(body.value ?? body.device ?? "").replace(/.(?=.{4})/g, "•") || "•••• (device)", reason: body.reason as "OTHER", note: String(body.note ?? ""),
      state: "unconfirmed", addedBy: me, addedByName: meName(), addedAt: D.ago(0), unconfirmedUntil: D.ahead(72), confirmedByName: "", confirmedAt: null, removeAsk: null, removedByName: "", removedAt: null, removeReason: "", matches: 0, lastMatchAt: null, lastMatchPlace: "",
    });
    return { id: "new" };
  }],
  ["POST", /^\/admin\/blocklist\/([^/]+)\/confirm$/, ({ m }) => {
    const b = D.blockEntries.find((x) => x.id === m[1]);
    if (b) {
      secondPerson(b.addedBy);
      Object.assign(b, { state: "blocked", confirmedByName: meName(), confirmedAt: D.ago(0), unconfirmedUntil: null });
    }
    return ok();
  }],
  ["POST", /^\/admin\/blocklist\/([^/]+)\/remove$/, ({ m, body }) => {
    const b = D.blockEntries.find((x) => x.id === m[1]);
    if (!b) return ok();
    if (b.removeAsk && b.removeAsk.requestedBy !== me) {
      Object.assign(b, { state: "removed", removedByName: meName(), removedAt: D.ago(0), removeReason: b.removeAsk.reason, removeAsk: null });
      return { removed: true };
    }
    b.removeAsk = { requestedBy: me, requestedByName: meName(), requestedAt: D.ago(0), reason: String(body.reason ?? "") };
    return { asked: true };
  }],
  ["DELETE", /^\/admin\/blocklist\/([^/]+)\/remove$/, ({ m }) => {
    const b = D.blockEntries.find((x) => x.id === m[1]);
    if (b) b.removeAsk = null;
    return ok();
  }],
  ["POST", /^\/admin\/blocklist\/matches\/([^/]+)\/close$/, ({ m }) => {
    const i = D.blockMatches.findIndex((x) => x.id === m[1]);
    if (i >= 0) D.blockMatches.splice(i, 1);
    return ok();
  }],

  // Backups, headroom, safeguarding, finance
  ["GET", /^\/admin\/backups$/, backups],
  ["POST", /^\/admin\/backups\/restore-tests$/, ok],
  ["GET", /^\/admin\/headroom$/, headroom],
  ["PUT", /^\/admin\/headroom\/countries$/, () => ({ asked: true, settings: headroom().settings })],
  ["DELETE", /^\/admin\/headroom\/countries\/change$/, () => null],
  ["GET", /^\/admin\/safeguarding$/, safeguarding],
  ["POST", /^\/admin\/safeguarding\/checks$/, () => ({ id: "sg-new", short: false, differenceMinor: 0, owedMinor: 0 })],
  ["POST", /^\/admin\/safeguarding\/checks\/([^/]+)\/confirm$/, () => ({ confirmed: true, short: false })],
  ["POST", /^\/admin\/safeguarding\/checks\/([^/]+)\/withdraw$/, ok],
  ["GET", /^\/admin\/finance$/, ({ q }) => finance(Number(q.get("days") ?? 30))],

  // Invites, sales
  ["GET", /^\/admin\/referrals\/settings$/, referrals],
  ["PUT", /^\/admin\/referrals\/settings$/, () => ({ asked: true, settings: referrals() })],
  ["DELETE", /^\/admin\/referrals\/settings\/change$/, () => null],
  ["GET", /^\/admin\/referrals$/, () => referralRows],
  ["GET", /^\/admin\/sales$/, salesReport],
  ["GET", /^\/admin\/sales\/mine$/, salesReport],
  ["GET", /^\/admin\/sales\/settings$/, salesSettings],
  ["PUT", /^\/admin\/sales\/settings$/, () => ({ asked: true, settings: salesSettings() })],
  ["DELETE", /^\/admin\/sales\/settings\/change$/, () => null],
  ["POST", /^\/admin\/sales\/reps$/, ({ body }) => ({ id: "sr-new", code: String(body.code ?? "NEW") })],
  ["POST", /^\/admin\/sales\/reps\/([^/]+)\/stop$/, () => null],

  // Complaints
  ["GET", /^\/admin\/complaints\/return$/, ({ q }) => (q.get("format") === "csv" ? new Blob(["number,received,closed\n301,2026-11-01,2026-11-05\n"], { type: "text/csv" }) : complaintReturn(q.get("period") ?? "H2-2026"))],
  ["GET", /^\/admin\/complaints$/, ({ q }) => {
    const filter = q.get("filter") ?? "open";
    const customer = q.get("customer");
    const list = D.complaints.filter((c) => (!customer || c.customer?.id === customer) && (filter === "closed" ? c.status === "closed" : filter === "late" ? c.status === "open" && (c.clock.ackLate || c.clock.finalLate) : c.status === "open"));
    const open = D.complaints.filter((c) => c.status === "open");
    return { ...paged(list, q, "complaints"), counts: { open: open.length, late: open.filter((c) => c.clock.ackLate || c.clock.finalLate).length, dueSoon: open.filter((c) => c.clock.dueSoon).length } };
  }],
  ["POST", /^\/admin\/complaints$/, ({ body }) => {
    const base = D.complaints[0]!;
    const c = { ...base, id: `cp${D.complaints.length}`, number: 301 + D.complaints.length, summary: String(body.summary), channel: body.channel as "app", category: body.category as "service", country: body.country as "GB", complainantName: String(body.complainantName), contact: String(body.contact), receivedAt: D.ago(0), loggedBy: meName(), acknowledgedAt: null, history: [{ kind: "logged" as const, by: meName(), at: D.ago(0), note: "" }] };
    D.complaints.unshift(c);
    return c;
  }],
  ["POST", /^\/admin\/complaints\/([^/]+)\/(acknowledge|holding|close)$/, ({ m, body }) => {
    const c = D.complaints.find((x) => x.id === m[1]);
    if (!c) throw new Refused(404, "Not found.");
    const kind = m[2] === "acknowledge" ? "acknowledged" : m[2] === "holding" ? "holding" : "closed";
    if (kind === "acknowledged") Object.assign(c, { acknowledgedAt: D.ago(0), clock: { ...c.clock, ackLate: false, next: "final" } });
    if (kind === "holding") Object.assign(c, { holdingAt: D.ago(0), finalPromisedFor: String(body.finalPromisedFor ?? "") });
    if (kind === "closed") Object.assign(c, { status: "closed", closedAt: D.ago(0), outcome: body.outcome, clock: { ...c.clock, next: null } });
    c.history.push({ kind, by: meName(), at: D.ago(0), note: String(body.note ?? body.reason ?? "") });
    return c;
  }],

  // Sending limits and higher limits
  ["GET", /^\/admin\/limits$/, () => limits],
  ["POST", /^\/admin\/limits\/changes$/, ({ body }) => {
    const row = { _id: `l${Date.now()}`, scope: body.scope as "country", status: "awaiting_approval", country: body.country as string | undefined, direction: body.direction as "to" | undefined, levels: body.levels as Partial<LimitLevels>, reason: String(body.reason ?? ""), proposedBy: meName(), createdAt: D.ago(0) };
    limits.waiting.unshift(row);
    return { status: "awaiting_approval", id: row._id };
  }],
  ["POST", /^\/admin\/limits\/changes\/([^/]+)\/approve$/, ({ m }) => {
    const i = limits.waiting.findIndex((x) => x._id === m[1]);
    if (i >= 0) {
      const row = limits.waiting[i]!;
      if (row.proposedBy === meName()) throw new Refused(403, "A different staff member must approve this limit.");
      limits.waiting.splice(i, 1);
      if (row.scope === "worldwide") Object.assign(limits.worldwide.levels, row.levels);
      else limits.countries.unshift({ ...row, status: "active" });
    }
    return { status: "active" };
  }],
  ["POST", /^\/admin\/limits\/changes\/([^/]+)\/reject$/, ({ m }) => {
    const i = limits.waiting.findIndex((x) => x._id === m[1]);
    if (i >= 0) limits.waiting.splice(i, 1);
    return { status: "rejected" };
  }],
  ["GET", /^\/admin\/higher-limits\/settings$/, higherLimitView],
  ["PUT", /^\/admin\/higher-limits\/settings$/, () => ({ asked: true })],
  ["DELETE", /^\/admin\/higher-limits\/settings\/change$/, () => null],
  ["GET", /^\/admin\/higher-limits$/, ({ q }) => ({ rows: higherRows.filter((r) => (q.get("status") === "waiting" ? r.status === "awaiting_approval" : q.get("status") === "active" ? r.status === "active" : r.reviewSoon)) })],
  ["POST", /^\/admin\/higher-limits\/([^/]+)\/approve$/, ({ m }) => {
    const r = higherRows.find((x) => x.id === m[1]);
    if (r) {
      secondPerson(r.proposedById);
      Object.assign(r, { status: "active", approvedBy: meName(), approvedAt: D.ago(0), reviewBy: D.ahead(24 * 365) });
    }
    return { status: "active", reviewBy: D.ahead(24 * 365) };
  }],
  ["POST", /^\/admin\/higher-limits\/([^/]+)\/(reject|end)$/, ({ m }) => {
    const r = higherRows.find((x) => x.id === m[1]);
    if (r) r.status = m[2] === "reject" ? "rejected" : "ended";
    return { status: r?.status ?? "ended" };
  }],

  // Transactions
  ["GET", /^\/admin\/transactions$/, ({ q }) => {
    const f = (k: string) => q.get(k) ?? "";
    const list = D.txRows.filter(
      (x) =>
        (!f("type") || x.type === f("type")) && (!f("status") || x.status === f("status")) && (!f("currency") || x.currency === f("currency")) &&
        (!f("customer") || x.from?.id === f("customer") || x.to?.id === f("customer")) &&
        (!f("from") || x.createdAt.slice(0, 10) >= f("from")) && (!f("to") || x.createdAt.slice(0, 10) <= f("to")) &&
        (!f("search") || has(x.txRef, f("search")) || has(x.from?.name, f("search")) || has(x.to?.name, f("search")) || has(x.description, f("search"))),
    );
    return paged(list, q, "transactions");
  }],
  ["GET", /^\/admin\/transactions\/([^/]+)$/, ({ m }) => {
    const row = D.txRows.find((x) => x.id === m[1]);
    if (!row) throw new Refused(404, "Payment not found.");
    return D.txDetail(row);
  }],
];

// ---- The pretend fetch ----

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function installDemoServer(apiBase: string) {
  const realFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, window.location.href);
    const base = new URL(apiBase || "/api/v1", window.location.href);
    if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) return realFetch(input, init);
    const path = url.pathname.slice(base.pathname.length) || "/";
    const method = (init?.method || "GET").toUpperCase();
    let body: Record<string, unknown> = {};
    if (typeof init?.body === "string") {
      try {
        body = JSON.parse(init.body) as Record<string, unknown>;
      } catch {
        body = {};
      }
    }
    // A short pause, so loading states show as they do for real.
    await wait(method === "GET" ? 120 + Math.random() * 160 : 260 + Math.random() * 240);
    const json = (status: number, payload: unknown) => new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });
    for (const [verb, pattern, handle] of R) {
      if (verb !== method) continue;
      const m = path.match(pattern);
      if (!m) continue;
      try {
        const data = handle({ m: m.map((part) => (part === undefined ? part : decodeURIComponent(part))) as unknown as RegExpMatchArray, q: url.searchParams, body });
        if (data instanceof Blob) return new Response(data, { status: 200 });
        return json(200, { success: true, data });
      } catch (error) {
        if (error instanceof Refused) return json(error.status, { success: false, message: error.message });
        console.error("[demo]", method, path, error);
        return json(500, { success: false, message: "The demo could not do this." });
      }
    }
    console.warn("[demo] no answer for", method, path);
    return method === "GET" ? json(404, { success: false, message: "This part is not in the demo." }) : json(200, { success: true, data: {} });
  };
}

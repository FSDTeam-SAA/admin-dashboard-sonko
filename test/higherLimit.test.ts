import { describe, expect, it } from "vitest";
import { readProposal, type TypedProposal } from "../src/pages/HigherLimitSection";
import { readLevels, readTier } from "../src/pages/SendingLimitsPage";
import { NAV } from "../src/lib/nav";
import { HANDBOOK } from "../src/lib/handbook";
import { CATEGORY_LABEL } from "../src/pages/TicketsPage";

const tier = { maxDayMinor: 1_000_000, maxMonthMinor: 2_500_000, reviewMonths: 12, nudgePercent: 80 };
const today = new Date("2026-11-22T12:00:00Z");
const typed = (extra: Partial<TypedProposal> = {}): TypedProposal => ({
  day: "10,000",
  month: "£25,000",
  sourceOfWealth: "Owns two pharmacies in London for 12 years.",
  sourceOfFunds: "Dividends from the company into her bank account.",
  documents: [{ kind: "company_accounts", note: "2025 accounts", seenOn: "2026-11-20" }],
  screenedClear: true,
  riskNotes: "",
  reason: "School fees and building costs",
  ...extra,
});

describe("higher limit checks", () => {
  it("pounds become pence; all checks pass", () => {
    const r = readProposal(typed(), tier, today);
    expect(r.value?.dayMinor).toBe(1_000_000);
    expect(r.value?.monthMinor).toBe(2_500_000);
    expect(r.value?.screenedClear).toBe(true);
  });
  it("refuses amounts above the tier, missing checks, old or future documents, and no screening", () => {
    expect(readProposal(typed({ day: "10,001" }), tier, today).error).toMatch(/24-hour/);
    expect(readProposal(typed({ month: "5,000" }), tier, today).error).toMatch(/30-day/);
    expect(readProposal(typed({ sourceOfWealth: "Rich" }), tier, today).error).toMatch(/wealth/);
    expect(readProposal(typed({ documents: [] }), tier, today).error).toMatch(/at least one/);
    expect(readProposal(typed({ documents: [{ kind: "", note: "abc", seenOn: "2026-11-20" }] }), tier, today).error).toMatch(/what each document/);
    expect(readProposal(typed({ documents: [{ kind: "payslips", note: "Oct", seenOn: "2026-07-01" }] }), tier, today).error).toMatch(/90 days/);
    expect(readProposal(typed({ documents: [{ kind: "payslips", note: "Oct", seenOn: "2026-12-01" }] }), tier, today).error).toMatch(/future/);
    expect(readProposal(typed({ screenedClear: false }), tier, today).error).toMatch(/sanctions and PEP/);
    expect(readProposal(typed({ reason: "short" }), tier, today).error).toMatch(/reason/);
  });
});

describe("standard limits and tier settings typed in pounds", () => {
  const levels = { unverified: { day: "0", month: "0" }, new: { day: "250", month: "1,000" }, verified: { day: "500", month: "2000" }, full: { day: "£1,000", month: "5000" } };
  it("reads levels and checks the month is not below the day", () => {
    expect(readLevels(levels).value?.full).toEqual({ dayMinor: 100_000, monthMinor: 500_000 });
    expect(readLevels({ ...levels, new: { day: "500", month: "100" } }).error).toMatch(/30-day/);
    expect(readLevels({ ...levels, new: { day: "abc", month: "100" } }).error).toMatch(/pounds/);
  });
  it("reads tier settings inside their ranges", () => {
    const bounds = { maxDayMinor: [100_000, 10_000_000], maxMonthMinor: [100_000, 50_000_000], reviewMonths: [1, 24], nudgePercent: [50, 95] } as const;
    expect(readTier({ maxDayMinor: "10,000", maxMonthMinor: "25000", reviewMonths: "12", nudgePercent: "80" }, bounds as never).value).toEqual(tier);
    expect(readTier({ maxDayMinor: "10,000", maxMonthMinor: "5000", reviewMonths: "12", nudgePercent: "80" }, bounds as never).error).toMatch(/30-day/);
    expect(readTier({ maxDayMinor: "10,000", maxMonthMinor: "25000", reviewMonths: "36", nudgePercent: "80" }, bounds as never).error).toMatch(/range/);
  });
});

describe("where it shows", () => {
  it("the Sending limits page needs manage_limits and is in the handbook; customers' requests have a ticket topic", () => {
    expect(NAV.find((n) => n.path === "/limits")?.permission).toBe("manage_limits");
    expect(HANDBOOK.find((h) => h.path === "/limits")).toBeTruthy();
    expect(CATEGORY_LABEL.limit_increase).toBe("Higher limit request");
  });
});

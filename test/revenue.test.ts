import { describe, expect, it } from "vitest";
import { FEE_SOURCE_LABEL, revenueByCurrency } from "../src/pages/AnalyticsPage";
import { FR } from "../src/i18n/fr";

describe("revenue tables", () => {
  const revenue = {
    months: [
      { month: "2026-09", currencies: [] },
      { month: "2026-10", currencies: [{ currency: "GMD", feesMinor: 1000, commissionMinor: 0, netMinor: 1000 }] },
      {
        month: "2026-11",
        currencies: [
          { currency: "GBP", feesMinor: 150, commissionMinor: 0, netMinor: 150 },
          { currency: "GMD", feesMinor: -1000, commissionMinor: 300, netMinor: -1300 },
        ],
      },
    ],
    sourcesLast12Months: [
      { currency: "GMD", source: "cash-out", amountMinor: 1000, count: 1 },
      { currency: "GMD", source: "reversals", amountMinor: -1000, count: 1 },
      { currency: "GBP", source: "transfers", amountMinor: 150, count: 1 },
    ],
  };

  it("makes one table per currency, newest month first, empty months left out", () => {
    const tables = revenueByCurrency(revenue);
    expect(tables.map((t) => t.currency)).toEqual(["GBP", "GMD"]);
    const gmd = tables[1]!;
    expect(gmd.rows.map((r) => r.month)).toEqual(["2026-11", "2026-10"]);
    expect(gmd.total).toEqual({ feesMinor: 0, commissionMinor: 300, netMinor: -300 });
    expect(gmd.sources.map((s) => s.source)).toEqual(["cash-out", "reversals"]);
  });

  it("shows nothing when no fees were taken", () => {
    expect(revenueByCurrency({ months: [{ month: "2026-11", currencies: [] }], sourcesLast12Months: [] })).toEqual([]);
  });

  it("every fee source has French", () => {
    for (const label of Object.values(FEE_SOURCE_LABEL)) expect(FR[label], label).toBeTruthy();
  });
});

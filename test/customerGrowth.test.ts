import { describe, expect, it } from "vitest";
import { funnelRows, rate, shade, share } from "../src/pages/CustomerGrowth";
import type { CustomerGrowth } from "../src/api/admin";

describe("customer growth figures", () => {
  it("shows a dash when there is nobody to count from", () => {
    expect(rate(null)).toBe("—");
    expect(rate(42.5)).toBe("42.5%");
    expect(share(1, 0)).toBeNull();
    expect(share(1, 3)).toBe(33.3);
  });
  it("shades empty cells clear and full cells strongest", () => {
    expect(shade(null)).toBe(0);
    expect(shade(0)).toBe(0);
    expect(shade(100)).toBe(1);
    expect(shade(2)).toBe(0.08);
  });
  it("funnel steps are out of everyone who signed up", () => {
    const g = {
      funnel: { signedUp: 10, phoneVerified: 8, idChecked: 6, paid: 4, paidWithin7Days: 3, repeat: 2, medianDaysToFirstPayment: 2, rates: { phoneVerified: 80, idChecked: 60, paid: 40, paidWithin7Days: 30, repeat: 50 } },
    } as unknown as CustomerGrowth;
    const rows = funnelRows(g);
    expect(rows.map((r) => r.value)).toEqual([10, 8, 6, 4, 2]);
    // Repeat is shown as 20% of sign-ups here (the table shows 50% of payers).
    expect(rows[4]!.note).toBe("2 · 20%");
  });
});

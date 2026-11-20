import { describe, expect, it } from "vitest";
import { CODE_PATTERN, periodFor, share, shareLink } from "../src/pages/SalesPage";
import { visibleNav } from "../src/lib/nav";
import { PERMISSION_GROUPS } from "../src/lib/permissions";
import { FR } from "../src/i18n/fr";

describe("sales team page", () => {
  it("asks for the right dates", () => {
    const now = new Date("2026-11-19T21:00:00Z");
    expect(periodFor("this-month", now)).toBeUndefined();
    expect(periodFor("last-month", now)).toEqual({ from: "2026-10-01", to: "2026-10-31" });
    expect(periodFor("last-month", new Date("2026-01-10T00:00:00Z"))).toEqual({ from: "2025-12-01", to: "2025-12-31" });
    expect(periodFor("last-90", now)).toEqual({ from: "2026-08-22", to: "2026-11-19" });
  });

  it("shows each step as a share of the one before", () => {
    expect(share(2, 5)).toBe("40%");
    expect(share(0, 0)).toBe("—");
  });

  it("builds the share link from the code", () => {
    expect(shareLink("AWA24")).toBe("https://www.sunupay.app/join?code=AWA24");
  });

  it("checks codes the same way as the server", () => {
    expect(CODE_PATTERN.test("AWA24")).toBe(true);
    expect(CODE_PATTERN.test("AW1")).toBe(false);
    expect(CODE_PATTERN.test("awa24")).toBe(false);
  });

  it("is in the menu for managers and for a salesperson's own login, not for others", () => {
    const paths = (p: string[]) => visibleNav(p).map((i) => i.path);
    expect(paths(["view_sales"])).toContain("/sales");
    expect(paths(["view_own_sales"])).toContain("/sales");
    expect(paths(["view_analytics"])).not.toContain("/sales");
  });

  it("the three permissions are on the Staff page, with French", () => {
    const all = PERMISSION_GROUPS.flatMap((g) => g.items);
    for (const p of ["view_sales", "view_own_sales", "manage_sales"]) {
      const item = all.find(([name]) => name === p);
      expect(item, p).toBeTruthy();
      expect(FR[item![1]], p).toBeTruthy();
    }
  });
});

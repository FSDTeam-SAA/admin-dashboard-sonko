import { describe, expect, it } from "vitest";
import { HANDBOOK } from "../src/lib/handbook";
import { NAV } from "../src/lib/nav";
import { FR } from "../src/i18n/fr";

describe("staff handbook", () => {
  it("every screen in the menu says what it is for", () => {
    for (const item of NAV) expect(HANDBOOK.find((h) => h.path === item.path), item.path).toBeTruthy();
  });
  it("has French for every sentence", () => {
    for (const h of HANDBOOK) {
      expect(FR[h.what.en]).toBe(h.what.fr);
      expect(h.what.fr).not.toBe(h.what.en);
      if (h.careful) expect(FR[h.careful.en]).toBe(h.careful.fr);
    }
  });
  it("is open to every staff member", () => {
    expect(NAV.find((n) => n.path === "/handbook")?.permission).toBeNull();
  });
});

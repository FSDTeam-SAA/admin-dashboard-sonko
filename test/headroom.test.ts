import { describe, expect, it } from "vitest";
import { NAV } from "../src/lib/nav";
import { countryName, parseCountries, percent } from "../src/pages/HeadroomPage";
import { getLanguage, setLanguage, translate } from "../src/i18n/language";

const t = (s: string) => translate(s, getLanguage());

describe("headroom page helpers", () => {
  it("reads country codes, upper-cases, de-duplicates and sorts", () => {
    expect(parseCountries("sn, gm ; sn")).toEqual(["GM", "SN"]);
    expect(parseCountries("")).toEqual([]);
  });

  it("refuses anything that is not a two-letter code", () => {
    expect(parseCountries("SEN")).toBeNull();
    expect(parseCountries("S1")).toBeNull();
    expect(parseCountries("??")).toBeNull();
    expect(parseCountries("SN, X")).toBeNull();
  });

  it("never shows a tiny share as zero", () => {
    setLanguage("en");
    expect(percent(0, t)).toBe("0%");
    expect(percent(0.0004, t)).toBe("less than 0.1%");
    expect(percent(0.1234, t)).toBe("12.3%");
  });

  it("names countries and the unknown marker", () => {
    setLanguage("en");
    expect(countryName("??", t)).toBe("Not known");
    expect(countryName("SN", t)).toMatch(/Senegal/i);
    setLanguage("fr");
    expect(countryName("??", t)).toBe("Inconnu");
    setLanguage("en");
  });

  it("has a menu entry for senior staff only", () => {
    const item = NAV.find((n) => n.path === "/headroom");
    expect(item?.permission).toBe("view_headroom");
  });
});

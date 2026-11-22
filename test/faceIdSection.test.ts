import { describe, expect, it } from "vitest";
import { buildFaceIdChange, dollarsToMinor, toFaceIdForm, usd } from "../src/pages/FaceIdSection";

const current = { version: 0, maxUsdMinor: 10_000, dayUsdMinor: 60_000, gbpPerUsd: 0.75 };

describe("Face ID limits form", () => {
  it("reads dollars as cents", () => {
    expect(dollarsToMinor("100")).toBe(10_000);
    expect(dollarsToMinor("$99.50")).toBe(9_950);
    expect(dollarsToMinor("1.234")).toBeNull();
    expect(dollarsToMinor("abc")).toBeNull();
    expect(usd(10_000)).toBe("$100");
  });
  it("sends only what changed", () => {
    expect(buildFaceIdChange(toFaceIdForm(current), current)).toEqual({ change: {}, errors: [] });
    expect(buildFaceIdChange({ max: "150", day: "600", rate: "0.75" }, current).change).toEqual({ maxUsdMinor: 15_000 });
  });
  it("refuses out-of-range values", () => {
    expect(buildFaceIdChange({ max: "5", day: "600", rate: "0.75" }, current).errors.length).toBe(1);
    expect(buildFaceIdChange({ max: "200", day: "100", rate: "0.75" }, current).errors.length).toBe(1);
    expect(buildFaceIdChange({ max: "100", day: "600", rate: "7.5" }, current).errors.length).toBe(1);
    expect(buildFaceIdChange({ max: "100", day: "600", rate: "1.0" }, current).errors.length).toBe(1);
  });
});

import { describe, expect, it } from "vitest";
import { dotRadius } from "../src/pages/WorldMap";
import { failureTone, moneyList } from "../src/pages/PlacesSection";
import { CENTROIDS, LAND, VIEWS } from "../src/lib/worldMap";
import { CENTROIDS_KNOWN } from "../src/lib/mapCountries";
import { countryName } from "../src/lib/countryName";

describe("where the business is", () => {
  it("the main corridor countries have a dot on the map", () => {
    for (const c of ["GB", "GM", "SN", "NG", "GH", "FR", "US"]) expect(CENTROIDS[c], c).toBeTruthy();
    expect(LAND.length).toBeGreaterThan(10000);
    expect(VIEWS.westAfrica[2]).toBeLessThan(VIEWS.world[2]);
  });
  it("the small list of map countries matches the map", () => {
    expect([...CENTROIDS_KNOWN].sort()).toEqual(Object.keys(CENTROIDS).sort());
  });
  it("Gambia and Senegal are inside the West Africa view", () => {
    const [x, y, w, h] = VIEWS.westAfrica;
    for (const c of ["GM", "SN"]) {
      const [cx, cy] = CENTROIDS[c]!;
      expect(cx > x && cx < x + w && cy > y && cy < y + h, c).toBe(true);
    }
  });
  it("dots grow with the number but never vanish", () => {
    expect(dotRadius(0, 10)).toBe(0);
    expect(dotRadius(1, 1000)).toBeGreaterThanOrEqual(4);
    expect(dotRadius(1000, 1000)).toBe(18);
  });
  it("failure colours and money lists", () => {
    expect(failureTone(null)).toBe("plain");
    expect(failureTone(2.9)).toBe("ok");
    expect(failureTone(3)).toBe("warn");
    expect(failureTone(10)).toBe("danger");
    expect(moneyList([])).toBe("");
  });
  it("country names, and nothing for unknown", () => {
    expect(countryName("GM")).toMatch(/Gambia/);
    expect(countryName("??")).toBeNull();
  });
});

import { labelled } from "../src/pages/WorldMap";
describe("map numbers", () => {
  it("a number that would sit on another dot is left off; the bigger keeps its number", () => {
    const got = labelled([
      { id: "GM", x: 457, y: 221, r: 18, text: "900" },
      { id: "SN", x: 460, y: 219, r: 9, text: "180" },
      { id: "GB", x: 493, y: 110, r: 12, text: "420" },
    ]);
    expect(got.has("GM")).toBe(true);
    expect(got.has("GB")).toBe(true);
    expect(got.has("SN")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { buttonLabel, CARD_ACTIONS, fileFromData, wordsFromPaste } from "../src/lib/pasteCard";
import { formProblem } from "../src/pages/EventEditor";

describe("pasting a card", () => {
  it("keeps the heading and the words, nothing that can act", () => {
    const got = wordsFromPaste(`<div style="background:red" onclick="steal()"><h2>Banjul Live Night</h2>
      <p>Five artists, one night. <a href="https://evil.example">Buy here</a></p>
      <script>alert(1)</script><button onclick="x()">Pay</button></div>`);
    expect(got.title).toBe("Banjul Live Night");
    expect(got.body).toContain("Five artists, one night.");
    expect(got.body).toContain("Buy here");
    expect(JSON.stringify(got)).not.toMatch(/alert|onclick|evil|script|<|>/);
    expect(got.removed).toBeGreaterThanOrEqual(3);
  });
  it("drops web addresses, emails and phone numbers from the words", () => {
    const got = wordsFromPaste("Big sale\nVisit www.shop.com or call +220 7012345 or mail a@b.com today");
    expect(got.title).toBe("Big sale");
    expect(got.body).not.toMatch(/www|@|7012345/);
    expect(got.body).toContain("today");
  });
  it("a picture inside the code can be uploaded; one on another site can't", () => {
    const tiny = "data:image/png;base64,iVBORw0KGgo=";
    const a = wordsFromPaste(`<h1>Hi there</h1><img src="${tiny}">`);
    expect(a.pictureData).toBe(tiny);
    expect(fileFromData(tiny)?.type).toBe("image/png");
    const b = wordsFromPaste(`<h1>Hi there</h1><img src="https://other.site/x.jpg">`);
    expect(b.pictureElsewhere).toBe("https://other.site/x.jpg");
    expect(fileFromData("data:text/html;base64,PHNjcmlwdD4=")).toBeNull();
  });
  it("keeps titles and messages within the card's limits", () => {
    const got = wordsFromPaste(`<h1>${"A".repeat(90)}</h1><p>${"word ".repeat(80)}</p>`);
    expect(got.title.length).toBeLessThanOrEqual(60);
    expect(got.body.length).toBeLessThanOrEqual(160);
  });
  it("every tap place matches the server's list", () => {
    expect(CARD_ACTIONS.map((a) => a[0])).toEqual(["none", "tickets", "send", "request", "airtime", "bills", "add_money", "invite", "repeat"]);
    expect(buttonLabel("send", "fr")).toBe("Envoyer de l’argent");
  });
});

describe("event form", () => {
  const form = {
    titleEn: "Banjul Live Night", titleFr: "Banjul Live Night", aboutEn: "", aboutFr: "", venue: "Independence Stadium", country: "GM", currency: "GMD",
    fee: "0", maxPerPerson: "4", startsAt: "2099-12-12T20:00", salesEndAt: "", organiserPhone: "+2207000000", gatePhones: "",
    tiers: [
      { nameEn: "Standard", nameFr: "Standard", price: "350", capacity: "500", sold: 0 },
      { nameEn: "VIP front area", nameFr: "VIP devant", price: "1000", capacity: "50", sold: 0 },
    ],
  };
  it("accepts a good event", () => expect(formProblem(form, false)).toBeNull());
  it("explains what's wrong", () => {
    expect(formProblem({ ...form, tiers: [] }, false)).toMatch(/at least one/);
    expect(formProblem({ ...form, fee: "500" }, false)).toMatch(/cheapest/);
    expect(formProblem({ ...form, tiers: [{ ...form.tiers[0]!, capacity: "3", sold: 10 }] }, true)).toMatch(/10 are already sold/);
    expect(formProblem({ ...form, organiserPhone: "" }, false)).toMatch(/organiser/);
    expect(formProblem({ ...form, organiserPhone: "" }, true)).toBeNull();
  });
});

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Complaint } from "../src/api/admin";
import { CATEGORY_LABEL, CHANNEL_LABEL, COUNTRY_LABEL, HISTORY_LABEL, OUTCOME_LABEL, clockBadge } from "../src/pages/ComplaintsPage";
import { FR } from "../src/i18n/fr";
import { NAV } from "../src/lib/nav";

const c = (over: Partial<Complaint["clock"]> = {}, status: Complaint["status"] = "open") =>
  ({ status, clock: { ackLate: false, finalLate: false, dueSoon: false, holdingLate: false, ackDue: "", finalDue: "", next: "ack", ...over } }) as unknown as Complaint;

describe("complaints page", () => {
  it("badges the clock, most serious first, and nothing when closed", () => {
    expect(clockBadge(c({ finalLate: true, ackLate: true }))?.text).toBe("Final response is late");
    expect(clockBadge(c({ ackLate: true }))?.tone).toBe("danger");
    expect(clockBadge(c({ dueSoon: true }))?.tone).toBe("warn");
    expect(clockBadge(c())?.tone).toBe("ok");
    expect(clockBadge(c({ finalLate: true }, "closed"))).toBeNull();
  });

  it("has French for every label, outcome and clock text", () => {
    const labels = [CHANNEL_LABEL, CATEGORY_LABEL, COUNTRY_LABEL, OUTCOME_LABEL, HISTORY_LABEL].flatMap((m) => Object.values(m));
    for (const text of [...labels, "Final response is late", "Acknowledgement is late", "Final response due soon", "Within time"]) expect(FR[text], text).toBeTruthy();
  });

  it("is in the menu for ticket readers", () => {
    expect(NAV.find((n) => n.path === "/complaints")?.permission).toBe("view_tickets");
  });

  it("keeps markup helper available (render sanity)", () => {
    expect(renderToStaticMarkup(<p>ok</p>)).toBe("<p>ok</p>");
  });
});

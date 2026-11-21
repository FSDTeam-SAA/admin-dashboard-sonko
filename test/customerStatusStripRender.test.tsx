import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { CustomerDetail } from "../src/api/admin";
import { CustomerStatusStrip } from "../src/components/CustomerStatusStrip";
import { setLanguage } from "../src/i18n/language";

const detail = (status: CustomerDetail["status"], customer: Record<string, unknown> = {}) =>
  ({ customer: { hold: null, closed: null, ...customer }, pendingPhoneChange: null, status }) as unknown as CustomerDetail;

describe("customer status strip, as it is drawn", () => {
  it("shows a quiet line when nothing needs care", () => {
    setLanguage("en");
    const html = renderToStaticMarkup(<CustomerStatusStrip detail={detail({ moneyOutPausedUntil: null, openCases: {}, blockedPhones: 0 })} />);
    expect(html).toContain("No warnings on this account.");
    expect(html).not.toContain("status-strip");
  });

  it("shows a red box listing a closed, held account with open cases", () => {
    setLanguage("en");
    const html = renderToStaticMarkup(
      <CustomerStatusStrip
        detail={detail(
          { moneyOutPausedUntil: null, openCases: { agent_debt: 1 }, blockedPhones: 2 },
          { closed: { at: "2026-11-20T00:00:00Z", via: "staff", reason: "x", by: "s" }, hold: { scope: "all", reason: "x", placedAt: null } },
        )}
      />,
    );
    expect(html).toContain('class="status-strip"');
    expect(html).toContain('role="alert"');
    expect(html).toContain("Check before you act");
    expect(html).toContain("Account closed");
    expect(html).toContain("Full hold: no money can leave");
    expect(html).toContain("2 phones are on the blocklist");
    expect(html).toContain("1 open case: agent couldn&#x27;t pay back");
  });

  it("reads in French", () => {
    setLanguage("fr");
    const html = renderToStaticMarkup(<CustomerStatusStrip detail={detail({ moneyOutPausedUntil: null, openCases: { agent_debt: 2 }, blockedPhones: 1 })} />);
    expect(html).toContain("À vérifier avant d’agir");
    expect(html).toContain("1 téléphone figure sur la liste de blocage");
    expect(html).toContain("2 dossiers ouverts");
    setLanguage("en");
  });
});

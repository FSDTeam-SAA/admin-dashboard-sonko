import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { FR } from "../src/i18n/fr";
import { getLanguage, setLanguage, translate } from "../src/i18n/language";
import { api } from "../src/api/client";
import { setTokens } from "../src/api/session";
import { NAV } from "../src/lib/nav";

// The screens translated so far. Add a file here once it is translated.
const TRANSLATED = [
  "src/auth/LoginPage.tsx",
  "src/layout/Shell.tsx",
  "src/components/common.tsx",
  "src/components/ConfirmWithPin.tsx",
  "src/components/customerCare.tsx",
  "src/components/dialogs.tsx",
  "src/pages/HomePage.tsx",
  "src/pages/NotFoundPage.tsx",
  "src/pages/ComingSoonPage.tsx",
  "src/pages/CustomersPage.tsx",
  "src/pages/TicketsPage.tsx",
  "src/pages/TicketLimits.tsx",
  "src/pages/TicketPayment.tsx",
  "src/pages/ComplaintReturn.tsx",
  "src/pages/CustomerMessages.tsx",
  "src/pages/FraudLimits.tsx",
  "src/pages/TransactionsPage.tsx",
  "src/pages/FinancePage.tsx",
  "src/pages/ExchangeRatesSection.tsx",
  "src/pages/StaffPage.tsx",
  "src/pages/PayoutsPage.tsx",
  "src/pages/BlocklistPage.tsx",
  "src/pages/AgentsPage.tsx",
  "src/pages/ServicesPage.tsx",
  "src/pages/AuditPage.tsx",
  "src/pages/AnalyticsPage.tsx",
  "src/pages/BillsPage.tsx",
  "src/pages/AnnouncementsPage.tsx",
  "src/pages/OfferCardsPage.tsx",
  "src/pages/TicketEventsPage.tsx",
  "src/pages/ReportsPage.tsx",
  "src/pages/ReversalsPage.tsx",
  "src/pages/HoldsPage.tsx",
  "src/pages/SettingsPage.tsx",
  "src/pages/RatesAndFeesPage.tsx",
  "src/i18n/patterns.ts",
  "src/components/RefundLimits.tsx",
  "src/pages/CasesPage.tsx",
  "src/pages/BackupsPage.tsx",
  "src/pages/HeadroomPage.tsx",
  "src/components/CustomerStatusStrip.tsx",
  "src/pages/ComplaintsPage.tsx",
  "src/pages/SalesPage.tsx",
  "src/pages/HandbookPage.tsx",
  "src/pages/CustomerGrowth.tsx",
  "src/pages/PlacesSection.tsx",
  "src/pages/WorldMap.tsx",
  "src/pages/HigherLimitSection.tsx",
  "src/pages/SendingLimitsPage.tsx",
  "src/pages/StaffAccess.tsx",
  "src/pages/LaunchPlan.tsx",
  "src/auth/SetupPage.tsx",
];

describe("panel language", () => {
  it("English is the source; French where there is French; English otherwise", () => {
    expect(translate("Log out", "en")).toBe("Log out");
    expect(translate("Log out", "fr")).toBe("Se déconnecter");
    expect(translate("Not in the list yet", "fr")).toBe("Not in the list yet");
  });

  it("fills in names and numbers in both languages", () => {
    expect(translate("Page {page} of {pages}", "fr", { page: 2, pages: 5 })).toBe("Page 2 sur 5");
    expect(translate("Welcome, {name}", "en", { name: "Awa" })).toBe("Welcome, Awa");
    expect(translate("{n} hours", "fr", { missing: 1 })).toBe("{n} heures");
  });

  it("every French entry keeps the same {placeholders} as the English", () => {
    for (const [en, fr] of Object.entries(FR)) {
      const names = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
      expect(names(fr), en).toBe(names(en));
    }
  });

  it("every text written in t(\"…\") on a translated screen has French", () => {
    const missing: string[] = [];
    for (const file of TRANSLATED) {
      const source = readFileSync(file, "utf8");
      for (const m of source.matchAll(/\bt\(\s*"((?:[^"\\]|\\.)*)"/g)) {
        const text = m[1]!.replace(/\\"/g, '"');
        if (!(text in FR)) missing.push(`${file}: ${text}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("every menu item has French", () => {
    for (const item of NAV) expect(FR[item.label], item.label).toBeTruthy();
  });

  it("the server is asked for the staff member's language", async () => {
    setTokens({ access: "A", refresh: "R" });
    const sent: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init: RequestInit) => {
      sent.push(new Headers(init.headers).get("Accept-Language") ?? "");
      return new Response(JSON.stringify({ success: true, data: null }), { status: 200 });
    }));
    setLanguage("fr");
    await api("/admin/me");
    setLanguage("en");
    await api("/admin/me");
    expect(sent).toEqual(["fr", "en"]);
    expect(getLanguage()).toBe("en");
    vi.unstubAllGlobals();
  });

  it("only English or French can be set", () => {
    setLanguage("de" as never);
    expect(getLanguage()).toBe("en");
  });
});

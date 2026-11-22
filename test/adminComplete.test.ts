import { describe, expect, it } from "vitest";
import { parseRedress } from "../src/pages/ComplaintsPage";
import { halfYears } from "../src/pages/ComplaintReturn";
import { messageProblem } from "../src/pages/CustomerMessages";
import { readFraudLimits } from "../src/pages/FraudLimits";
import { NAV } from "../src/lib/nav";

describe("redress typed at close", () => {
  it("reads pounds and pence", () => {
    expect(parseRedress("")).toBe(0);
    expect(parseRedress("25")).toBe(2500);
    expect(parseRedress("25.5")).toBe(2550);
    expect(parseRedress("25.05")).toBe(2505);
    expect(parseRedress("25.555")).toBeNull();
    expect(parseRedress("-1")).toBeNull();
    expect(parseRedress("abc")).toBeNull();
  });
});

describe("complaints return periods", () => {
  it("always offers the first real period, newest first", () => {
    expect(halfYears(new Date("2026-11-21T00:00:00Z"))).toEqual(["2027-H1", "2026-H2"]);
    expect(halfYears(new Date("2027-08-01T00:00:00Z"))).toEqual(["2027-H2", "2027-H1", "2026-H2"]);
  });
});

describe("customer messages", () => {
  it("blocks links, emails and long numbers before sending, like the server", () => {
    expect(messageProblem("Your transfer has arrived safely.")).toBeNull();
    expect(messageProblem("Log in at www.sunupay-help.com now")).toMatch(/links/);
    expect(messageProblem("Email help@sunupay.app please")).toMatch(/email/);
    expect(messageProblem("Call 07700 900123 straight away")).toMatch(/numbers/);
  });
});

describe("fraud limits typed in pounds", () => {
  const bounds = {
    paymentsPerHour: [2, 50], dayGbpMinor: [10_000, 5_000_000], newAccountDays: [1, 90], newAccountGbpMinor: [5_000, 1_000_000], recipientsPerDay: [2, 50], failuresPerHour: [2, 50],
    duplicatesPerHour: [2, 20], singleGbpMinor: [10_000, 5_000_000], wrongPinsPerDay: [3, 30], invitesPerDay: [2, 50], accountsPerDevice: [2, 20],
  } as const;
  const typed = {
    paymentsPerHour: "5", dayGbpMinor: "1,500", newAccountDays: "7", newAccountGbpMinor: "£300", recipientsPerDay: "5", failuresPerHour: "5",
    duplicatesPerHour: "3", singleGbpMinor: "£1,000", wrongPinsPerDay: "6", invitesPerDay: "5", accountsPerDevice: "3",
  };
  it("turns pounds into pence and checks the ranges", () => {
    expect(readFraudLimits(typed, bounds as never).value).toEqual({
      paymentsPerHour: 5, dayGbpMinor: 150_000, newAccountDays: 7, newAccountGbpMinor: 30_000, recipientsPerDay: 5, failuresPerHour: 5,
      duplicatesPerHour: 3, singleGbpMinor: 100_000, wrongPinsPerDay: 6, invitesPerDay: 5, accountsPerDevice: 3,
    });
    expect(readFraudLimits({ ...typed, paymentsPerHour: "500" }, bounds as never).error).toBeTruthy();
    expect(readFraudLimits({ ...typed, newAccountGbpMinor: "2000" }, bounds as never).error).toMatch(/new-account/);
    expect(readFraudLimits({ ...typed, failuresPerHour: "2.5" }, bounds as never).error).toBeTruthy();
  });
});

describe("new pages are in the menu with their permission", () => {
  it("finance and transactions", () => {
    expect(NAV.find((n) => n.path === "/finance")?.permission).toBe("view_finance");
    expect(NAV.find((n) => n.path === "/transactions")?.permission).toBe("view_transactions");
  });
});

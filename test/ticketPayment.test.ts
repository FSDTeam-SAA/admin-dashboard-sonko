import { describe, expect, it } from "vitest";
import { PAYMENT_TOPICS } from "../src/api/admin";
import { paymentLine } from "../src/pages/TicketPayment";

describe("ticket payment link", () => {
  it("money topics need a payment", () => {
    expect([...PAYMENT_TOPICS]).toEqual(["payment_failed", "money_missing", "cash_out"]);
  });
  it("shows money out with a minus and money in with a plus", () => {
    const base = { id: "1", txRef: "r", type: "send-money", status: "successful", currency: "GBP", amountMinor: 1250, description: "", otherParty: null, at: "2026-11-20T10:00:00Z" };
    expect(paymentLine({ ...base, direction: "out" })).toContain("−GBP 12.50");
    expect(paymentLine({ ...base, direction: "in" })).toContain("+GBP 12.50");
  });
});

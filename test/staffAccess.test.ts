import { describe, expect, it } from "vitest";
import { FINE_TUNE_ONLY, MODULES, PRESETS, applyPreset, levelOf, setLevel } from "../src/lib/permissionGrid";
import { ALL_PERMISSIONS } from "../src/lib/permissions";
import { inviteProblem } from "../src/pages/StaffAccess";
import { pinShapeOk, readSetupLink } from "../src/auth/SetupPage";
import { openCorridors, PLAN_SERVICES } from "../src/pages/LaunchPlan";
import type { CountryRow, ServiceSwitchRow } from "../src/api/admin";

// The server's list (utils/staffPermissions.js, 22 Nov 2026). Update both together.
const SERVER = "view_dashboard view_customers view_transactions view_kyc edit_customers message_customers verify_callers view_tickets manage_tickets set_critical manage_ticket_limits translate_notes ticket_files keep_ticket_files view_analytics view_sales view_own_sales manage_sales view_referrals manage_referrals view_audit send_announcements manage_offer_cards manage_ticket_events ticket_money view_blocklist add_to_blocklist manage_blocklist manage_staff view_agents review_agents review_purchases view_reports view_backups view_safeguarding record_safeguarding record_restore_tests view_finance view_headroom manage_headroom close_complaints view_complaint_return view_cases manage_fraud_rules close_cases view_holds place_hold lift_hold view_reversals request_reversal approve_reversal approve_old_reversal view_commission approve_commission hold_commission release_commission manage_rates manage_limits manage_countries view_gateways manage_gateways view_checks run_checks".split(" ");

describe("access grid", () => {
  it("every server permission has a label and is in exactly one square of the grid (or Fine-tune only)", () => {
    expect([...ALL_PERMISSIONS].sort()).toEqual([...SERVER].sort());
    const placed = [...MODULES.flatMap((m) => [...m.read, ...m.write]), ...FINE_TUNE_ONLY];
    expect([...placed].sort()).toEqual([...SERVER].sort());
    expect(new Set(placed).size).toBe(placed.length);
  });
  it("See and change always includes See; switching an area off removes both", () => {
    const customers = MODULES.find((m) => m.key === "customers")!;
    let held = setLevel(customers, new Set(), "write");
    expect(held.has("view_customers") && held.has("edit_customers")).toBe(true);
    expect(levelOf(customers, held)).toBe("write");
    held = setLevel(customers, held, "read");
    expect(held.has("edit_customers")).toBe(false);
    expect(levelOf(customers, held)).toBe("read");
    expect(levelOf(customers, setLevel(customers, held, "none"))).toBe("none");
    expect(levelOf(customers, new Set(["edit_customers"]))).toBe("some");
  });
  it("presets never give senior powers or staff management", () => {
    const senior = ["manage_staff", "manage_fraud_rules", "approve_old_reversal", "set_critical", "manage_ticket_limits", "keep_ticket_files", "manage_rates", "manage_countries", "manage_gateways"];
    for (const p of PRESETS) {
      const held = applyPreset(p);
      for (const s of senior) expect(held.has(s), `${p.key} ${s}`).toBe(false);
      expect(held.size).toBeGreaterThan(0);
    }
    expect([...applyPreset(PRESETS.find((p) => p.key === "sales")!)]).toContain("view_own_sales");
  });
});

describe("add employee and setup link", () => {
  const form = { name: "Awa Jallow", phone: "+220 770 1234", email: "", country: "GM", employeeId: "SP-1", jobTitle: "Support", permissions: ["view_customers"] };
  it("checks the form like the server", () => {
    expect(inviteProblem(form)).toBeNull();
    expect(inviteProblem({ ...form, phone: "7701234" })).toMatch(/country code/);
    expect(inviteProblem({ ...form, permissions: [] })).toMatch(/at least one/);
    expect(inviteProblem({ ...form, email: "x@" })).toMatch(/email/);
  });
  it("reads the invite from the address and the code from after #", () => {
    expect(readSetupLink("?invite=abc", "#s3cr%2Bt")).toEqual({ invite: "abc", code: "s3cr+t" });
    expect(readSetupLink("", "")).toEqual({ invite: "", code: "" });
    expect(pinShapeOk("482915")).toBe(true);
    expect(pinShapeOk("4829")).toBe(false);
  });
});

describe("who can send where", () => {
  const country = (code: string, enabled = true) => ({ code, name: code, enabled }) as CountryRow;
  const row = (country: string, service: string, state: "on" | "paused" | "off") => ({ country, service, state, reason: "", pendingOn: null, history: [] }) as unknown as ServiceSwitchRow;
  it("a country is open to send from only if sending from it is on; to send to only if sending to it is on", () => {
    const rows = [row("SN", "send_money_from", "off"), row("GB", "send_money", "off")];
    expect(openCorridors(rows, [country("GB"), country("GM"), country("SN"), country("FR", false)])).toEqual({ from: ["GB", "GM"], to: ["GM", "SN"] });
    expect(openCorridors([row("ALL", "send_money", "off")], [country("GB")])).toEqual({ from: [], to: [] });
  });
  it("the launch plan offers every service except 'sending from' (it comes with sending)", () => {
    expect(PLAN_SERVICES.map(([s]) => s)).not.toContain("send_money_from");
    expect(PLAN_SERVICES.map(([s]) => s)).toContain("send_money");
  });
});

import type { CustomerDetail } from "../api/admin";
import { SCOPE_LABEL } from "./dialogs";
import { useT } from "../i18n/language";
import { when } from "../lib/format";

export type StripItem = { key: string; text: string; vars?: Record<string, string | number> };

export const CASE_TEXT: Record<string, string> = {
  agent_debt: "{n} open case: agent couldn't pay back",
  customer_debt: "{n} open case: customer couldn't pay back",
  reversal_alert: "{n} open case: many reversals on this agent",
  blocklist_match: "{n} open case: blocklist match",
};
export const CASES_TEXT: Record<string, string> = {
  agent_debt: "{n} open cases: agent couldn't pay back",
  customer_debt: "{n} open cases: customer couldn't pay back",
  reversal_alert: "{n} open cases: many reversals on this agent",
  blocklist_match: "{n} open cases: blocklist match",
};

/** Everything staff must not miss when they open a file, most serious first. Plain data, so it can be tested. */
export function stripItems(d: CustomerDetail): StripItem[] {
  const c = d.customer;
  const items: StripItem[] = [];
  if (c.closed) items.push({ key: "closed", text: "Account closed" });
  if (c.hold) items.push({ key: "hold", text: SCOPE_LABEL[c.hold.scope] });
  if (d.status?.moneyOutPausedUntil) {
    items.push({ key: "wait", text: "Money can't leave until {time}, because the phone number was changed.", vars: { time: when(d.status.moneyOutPausedUntil) } });
  }
  if (d.status?.blockedPhones) {
    items.push({ key: "phones", text: d.status.blockedPhones === 1 ? "{n} phone is on the blocklist" : "{n} phones are on the blocklist", vars: { n: d.status.blockedPhones } });
  }
  for (const [type, n] of Object.entries(d.status?.openCases ?? {})) {
    if (!n) continue;
    const text = (n === 1 ? CASE_TEXT : CASES_TEXT)[type];
    if (text) items.push({ key: `case-${type}`, text, vars: { n } });
  }
  const complaints = d.status?.openComplaints;
  if (complaints?.late) items.push({ key: "complaints-late", text: complaints.late === 1 ? "{n} complaint is late" : "{n} complaints are late", vars: { n: complaints.late } });
  if (complaints?.open) items.push({ key: "complaints", text: complaints.open === 1 ? "{n} open complaint" : "{n} open complaints", vars: { n: complaints.open } });
  if (d.pendingPhoneChange) items.push({ key: "pending", text: "A phone number change is waiting for approval" });
  return items;
}

/** The strip at the top of a customer file: red when something needs care, quiet when nothing does. */
export function CustomerStatusStrip({ detail }: { detail: CustomerDetail }) {
  const t = useT();
  const items = stripItems(detail);
  if (items.length === 0) return <p className="muted small">{t("No warnings on this account.")}</p>;
  return (
    <div className="status-strip" role="alert">
      <strong>{t("Check before you act")}</strong>
      <ul>
        {items.map((i) => (
          <li key={i.key}>{t(i.text, i.vars)}</li>
        ))}
      </ul>
    </div>
  );
}

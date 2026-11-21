import { useState, type FormEvent } from "react";
import { customers, ticketPayments, type CustomerRow, type TicketPayment } from "../api/admin";
import { LoadState } from "../components/common";
import { money, when } from "../lib/format";
import { useLoad } from "../lib/useLoad";
import { useT } from "../i18n/language";
import { TYPE_LABEL } from "./CustomersPage";

/** One line about a payment, for the picker and the ticket. */
export function paymentLine(p: TicketPayment): string {
  const sign = p.direction === "out" ? "−" : "+";
  return `${when(p.at)} · ${sign}${money(p.amountMinor, p.currency)}`;
}

const STATUS: Record<string, string> = { successful: "Successful", failed: "Failed", pending: "Pending", processing: "Processing", reversed: "Reversed" };

/** The customer's payments from the last 90 days; pick the one the ticket is about. */
export function PaymentPicker({ customerId, value, onPick }: { customerId: string; value: string | null; onPick: (p: TicketPayment) => void }) {
  const t = useT();
  const { data, error, loading } = useLoad(() => ticketPayments(customerId), [customerId]);
  const rows = data?.payments ?? [];
  return (
    <fieldset className="stack">
      <legend>{t("Which payment is it about?")}</legend>
      <LoadState loading={loading && !data} error={error} empty={false} />
      {data && !rows.length && <p className="muted">{t("No payments in the last {days} days. Choose another topic, or check the customer.", { days: data.days })}</p>}
      {rows.map((p) => (
        <label key={p.id} className="check">
          <input type="radio" name="ticket-payment" checked={value === p.id} onChange={() => onPick(p)} />
          <span>
            <strong>{paymentLine(p)}</strong> · {t(TYPE_LABEL[p.type] ?? p.type)} · {t(STATUS[p.status] ?? p.status)}
            {p.otherParty?.name ? ` · ${p.otherParty.name}` : ""}
            <span className="muted small"> {p.txRef}</span>
          </span>
        </label>
      ))}
      {data && <p className="hint">{t("Showing the last {days} days.", { days: data.days })}</p>}
    </fieldset>
  );
}

/** Find a customer by name or phone, when the ticket wasn't opened from their file. */
export function CustomerSearch({ onPick }: { onPick: (c: { id: string; name: string }) => void }) {
  const t = useT();
  const [typed, setTyped] = useState("");
  const [rows, setRows] = useState<CustomerRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const find = async (event: FormEvent) => {
    event.preventDefault();
    if (typed.trim().length < 2) return;
    setError(null);
    try {
      setRows((await customers("all", typed, 1)).customers.slice(0, 10));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
    }
  };
  return (
    <fieldset className="stack">
      <legend>{t("Which customer?")}</legend>
      <div className="row-start search">
        <input placeholder={t("Name, phone or email")} value={typed} onChange={(e) => setTyped(e.target.value)} onKeyDown={(e) => e.key === "Enter" && find(e)} />
        <button type="button" onClick={find}>
          {t("Search")}
        </button>
      </div>
      {error && <p className="error">{t(error)}</p>}
      {rows && !rows.length && <p className="muted">{t("No customer found.")}</p>}
      {rows?.map((c) => (
        <button type="button" key={c.id} className="link" onClick={() => onPick({ id: c.id, name: c.name })}>
          {c.name} · {c.phone}
        </button>
      ))}
    </fieldset>
  );
}

/** The payment card on a ticket. */
export function PaymentCard({ payment, linked }: { payment: TicketPayment | null | undefined; linked: boolean | undefined }) {
  const t = useT();
  if (!linked) return null;
  if (!payment) return <p className="muted">{t("This ticket is about a payment. You don't have permission to see payment details.")}</p>;
  return (
    <div className="notice">
      <strong>{t("The payment")}</strong>
      <dl>
        <dt>{t("When")}</dt>
        <dd>{when(payment.at)}</dd>
        <dt>{t("Amount")}</dt>
        <dd>{(payment.direction === "out" ? "−" : "+") + money(payment.amountMinor, payment.currency)}</dd>
        <dt>{t("What")}</dt>
        <dd>{t(TYPE_LABEL[payment.type] ?? payment.type)}</dd>
        <dt>{t("Status")}</dt>
        <dd>{t(STATUS[payment.status] ?? payment.status)}</dd>
        <dt>{t("With")}</dt>
        <dd>{payment.otherParty?.name || "—"}</dd>
        <dt>{t("Reference")}</dt>
        <dd>{payment.txRef || "—"}</dd>
      </dl>
    </div>
  );
}

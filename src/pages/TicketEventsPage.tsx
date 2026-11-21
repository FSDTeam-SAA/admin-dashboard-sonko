import { useMemo, useState } from "react";
import {
  approveTicketEvent,
  cancelTicketEvent,
  eventTickets,
  makeTicketEvent,
  payOrganiser,
  refundEventTicket,
  refundEveryone,
  setGateStaff,
  ticketEvents,
  type EventTicketRow,
  type TicketEvent,
  type TicketEventDraft,
  type TicketEventState,
} from "../api/admin";
import { useAuth } from "../auth/AuthContext";
import { can } from "../api/staff";
import { Badge, LoadState, PageHeader } from "../components/common";
import { ConfirmWithPin } from "../components/ConfirmWithPin";
import { decimalsOf, money, when } from "../lib/format";
import { newIdempotencyKey } from "../lib/idempotency";
import { useLoad } from "../lib/useLoad";
import { useT } from "../i18n/language";

export const EVENT_STATE: Record<TicketEventState, { label: string; tone: "ok" | "warn" | "danger" | "plain" }> = {
  waiting: { label: "Waiting for approval", tone: "warn" },
  on_sale: { label: "On sale", tone: "ok" },
  sold_out: { label: "Sold out", tone: "plain" },
  sales_closed: { label: "Sales closed", tone: "plain" },
  over: { label: "Over", tone: "plain" },
  cancelled: { label: "Cancelled", tone: "danger" },
};

export const PAYOUT_LABEL: Record<TicketEvent["payoutState"], { label: string; tone: "ok" | "warn" | "plain" }> = {
  holding: { label: "Held by Sunu Pay", tone: "plain" },
  due: { label: "Ready to pay the organiser", tone: "warn" },
  paid: { label: "Organiser paid", tone: "ok" },
};

export const TICKET_STATUS: Record<EventTicketRow["status"], string> = {
  valid: "Valid",
  used: "Used",
  void: "Cancelled, refund waiting",
  refunded: "Refunded",
};

/** Whether the "Pay the organiser" button should show. The server checks again. */
export function canPayOut(e: TicketEvent): boolean {
  if (e.paidOutAt) return false;
  if (e.state === "cancelled") return e.refundsWaiting === 0 && e.heldPriceMinor + e.heldFeeMinor > 0;
  return e.payoutState === "due" && e.heldPriceMinor + e.heldFeeMinor > 0;
}

/** "350" or "350.50" typed by staff, in minor units; null if it isn't a price. */
export function toMinorUnits(text: string, currency: string): number | null {
  const clean = text.trim().replace(/,/g, "");
  if (!/^\d+(\.\d+)?$/.test(clean)) return null;
  const decimals = decimalsOf(currency);
  const [whole, part = ""] = clean.split(".");
  if (part.length > decimals) return null;
  const n = Number(whole) * 10 ** decimals + Number((part + "0".repeat(decimals)).slice(0, decimals) || 0);
  return Number.isSafeInteger(n) ? n : null;
}

/** Phone numbers typed one per line or separated by commas. */
export function phoneList(text: string): string[] {
  return text
    .split(/[\n,;]+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

const inDays = (days: number) => {
  const d = new Date(Date.now() + days * 86_400_000);
  d.setMinutes(0, 0, 0);
  return d.toISOString().slice(0, 16);
};

/**
 * Event tickets sold only in the Sunu Pay app. Staff set up the event and the
 * organiser's Sunu Pay account the money goes to; a different staff member
 * approves before tickets go on sale. The organiser and named gate staff
 * check tickets at the door with the app.
 */
export function TicketEventsPage() {
  const t = useT();
  const { staff } = useAuth();
  const [reload, setReload] = useState(0);
  const [making, setMaking] = useState(false);
  const [approving, setApproving] = useState<TicketEvent | null>(null);
  const [cancelling, setCancelling] = useState<TicketEvent | null>(null);
  const [gate, setGate] = useState<TicketEvent | null>(null);
  const [list, setList] = useState<TicketEvent | null>(null);
  const [refundAll, setRefundAll] = useState<TicketEvent | null>(null);
  const [paying, setPaying] = useState<TicketEvent | null>(null);
  const money_ = can(staff, "ticket_money");
  const [done, setDone] = useState<string | null>(null);
  const { data, error, loading } = useLoad(() => ticketEvents(), [reload]);
  const rows = data ?? [];
  const finish = (message: string) => {
    setMaking(false);
    setApproving(null);
    setCancelling(null);
    setGate(null);
    setRefundAll(null);
    setPaying(null);
    setDone(message);
    setReload((n) => n + 1);
  };
  return (
    <section>
      <PageHeader
        title="Event tickets"
        intro="Tickets sold only in the app. Each ticket shows a code that changes every 30 seconds, so screenshots and copies don't work, and the gate lets each ticket in once. Sunu Pay holds the ticket money until 3 days after the event, so refunds are always possible until then; then the organiser is paid their share and Sunu Pay keeps its fee."
        actions={
          <button className="primary" onClick={() => setMaking(true)}>
            {t("Set up an event")}
          </button>
        }
      />
      <p className="notice">{t("Customers can send tickets to each other; refunds always go to the person who paid. Check with your lawyer how held ticket money must be kept before the first real sale.")}</p>
      {done && <p className="notice">{t(done)}</p>}
      <LoadState loading={loading && !data} error={error} empty={!rows.length} />
      {rows.length > 0 && (
        <div className="card panel">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("Event")}</th>
                  <th>{t("Status")}</th>
                  <th>{t("Price")}</th>
                  <th>{t("Sold")}</th>
                  <th>{t("Checked in")}</th>
                  <th>{t("Money")}</th>
                  <th>{t("Organiser")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <strong>{e.titleEn}</strong>
                      <br />
                      <span className="muted small">
                        {e.venue} · {when(e.startsAt)}
                      </span>
                    </td>
                    <td>
                      <Badge tone={EVENT_STATE[e.state].tone}>{t(EVENT_STATE[e.state].label)}</Badge>
                    </td>
                    <td className="num">
                      {money(e.priceMinor, e.currency)}
                      {e.feeMinor > 0 && <span className="muted small"> + {money(e.feeMinor, e.currency)}</span>}
                    </td>
                    <td className="num">
                      {e.sold} / {e.capacity}
                      {e.refunded > 0 && (
                        <>
                          <br />
                          <span className="muted small">{t("{n} refunded", { n: e.refunded })}</span>
                        </>
                      )}
                    </td>
                    <td className="num">{e.checkedIn}</td>
                    <td>
                      <Badge tone={PAYOUT_LABEL[e.payoutState].tone}>{t(PAYOUT_LABEL[e.payoutState].label)}</Badge>
                      <br />
                      <span className="muted small">
                        {e.paidOutAt
                          ? t("{price} to the organiser, {fee} fees, {when}", { price: money(e.payoutPriceMinor ?? 0, e.currency), fee: money(e.payoutFeeMinor ?? 0, e.currency), when: when(e.paidOutAt) })
                          : t("{price} for the organiser + {fee} fees, payable from {when}", { price: money(e.heldPriceMinor, e.currency), fee: money(e.heldFeeMinor, e.currency), when: when(e.payoutDueAt) })}
                      </span>
                    </td>
                    <td>
                      {e.organiserName || "—"}
                      <br />
                      <span className="muted small">{e.organiserPhone}</span>
                    </td>
                    <td className="actions">
                      <button onClick={() => setList(e)}>{t("Tickets")}</button>
                      {money_ && e.state === "cancelled" && e.refundsWaiting > 0 && !e.paidOutAt && (
                        <button className="primary" onClick={() => setRefundAll(e)}>
                          {t("Refund everyone")}
                        </button>
                      )}
                      {money_ && canPayOut(e) && (
                        <button className="primary" onClick={() => setPaying(e)}>
                          {t("Pay the organiser")}
                        </button>
                      )}
                      {e.state === "waiting" && e.createdBy !== staff?._id && <button onClick={() => setApproving(e)}>{t("Review and approve")}</button>}
                      {e.state !== "cancelled" && e.state !== "over" && <button onClick={() => setGate(e)}>{t("Gate staff")}</button>}
                      {e.state !== "cancelled" && e.state !== "over" && !e.paidOutAt && (
                        <button className="danger" onClick={() => setCancelling(e)}>
                          {t("Cancel event")}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {making && <MakeDialog onClose={() => setMaking(false)} onDone={finish} />}
      {approving && <ApproveDialog e={approving} onClose={() => setApproving(null)} onDone={finish} />}
      {cancelling && <CancelDialog e={cancelling} onClose={() => setCancelling(null)} onDone={finish} />}
      {gate && <GateDialog e={gate} onClose={() => setGate(null)} onDone={finish} />}
      {list && <TicketsDialog e={list} canRefund={money_} onClose={() => setList(null)} onChanged={() => setReload((n) => n + 1)} />}
      {refundAll && <RefundAllDialog e={refundAll} onClose={() => setRefundAll(null)} onDone={finish} />}
      {paying && <PayDialog e={paying} onClose={() => setPaying(null)} onDone={finish} />}
    </section>
  );
}

function MakeDialog({ onClose, onDone }: { onClose: () => void; onDone: (m: string) => void }) {
  const t = useT();
  const key = useMemo(newIdempotencyKey, []);
  const [f, setF] = useState({
    titleEn: "",
    titleFr: "",
    aboutEn: "",
    aboutFr: "",
    venue: "",
    country: "GM",
    currency: "GMD",
    price: "",
    fee: "0",
    capacity: "",
    maxPerPerson: "4",
    startsAt: inDays(14),
    salesEndAt: "",
    organiserPhone: "",
    gatePhones: "",
  });
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v });
  const priceMinor = toMinorUnits(f.price, f.currency);
  const feeMinor = toMinorUnits(f.fee || "0", f.currency);
  const capacity = Number(f.capacity);
  const ok =
    f.titleEn.trim().length >= 3 &&
    f.titleFr.trim().length >= 3 &&
    f.venue.trim().length >= 3 &&
    /^[A-Z]{2}$/.test(f.country) &&
    /^[A-Z]{3}$/.test(f.currency) &&
    !!priceMinor &&
    feeMinor !== null &&
    feeMinor <= priceMinor &&
    Number.isInteger(capacity) &&
    capacity > 0 &&
    f.organiserPhone.trim().startsWith("+");
  const input = (k: keyof typeof f, label: string, extra: Record<string, unknown> = {}) => (
    <label>
      {t(label)}
      <input value={f[k]} onChange={(e) => set(k)(e.target.value)} {...extra} />
    </label>
  );
  return (
    <ConfirmWithPin
      title="Set up an event"
      confirmLabel="Send for approval"
      canConfirm={ok}
      onClose={onClose}
      onConfirm={async (pin) => {
        const draft: TicketEventDraft = {
          titleEn: f.titleEn,
          titleFr: f.titleFr,
          aboutEn: f.aboutEn,
          aboutFr: f.aboutFr,
          venue: f.venue,
          country: f.country,
          currency: f.currency,
          priceMinor: priceMinor!,
          feeMinor: feeMinor!,
          capacity,
          maxPerPerson: Number(f.maxPerPerson),
          startsAt: new Date(f.startsAt).toISOString(),
          salesEndAt: f.salesEndAt ? new Date(f.salesEndAt).toISOString() : new Date(f.startsAt).toISOString(),
          organiserPhone: f.organiserPhone.trim(),
          gatePhones: phoneList(f.gatePhones),
        };
        await makeTicketEvent(draft, pin, key);
        onDone("Event made. A different staff member must approve it before tickets go on sale.");
      }}
    >
      {input("titleEn", "Title (English)", { maxLength: 60 })}
      {input("titleFr", "Title (French)", { maxLength: 60 })}
      {input("aboutEn", "About (English, optional)", { maxLength: 300 })}
      {input("aboutFr", "About (French, optional)", { maxLength: 300 })}
      {input("venue", "Venue", { maxLength: 80 })}
      {input("country", "Country (two letters)", { maxLength: 2 })}
      {input("currency", "Currency", { maxLength: 3 })}
      {input("price", "Ticket price (goes to the organiser)", { inputMode: "decimal" })}
      {input("fee", "Sunu Pay fee per ticket (added for the buyer)", { inputMode: "decimal" })}
      {input("capacity", "How many tickets", { inputMode: "numeric" })}
      {input("maxPerPerson", "Tickets per person (1 to 10)", { inputMode: "numeric" })}
      <label>
        {t("Event starts")}
        <input type="datetime-local" value={f.startsAt} onChange={(e) => set("startsAt")(e.target.value)} />
      </label>
      <label>
        {t("Sales end (optional; otherwise when the event starts)")}
        <input type="datetime-local" value={f.salesEndAt} onChange={(e) => set("salesEndAt")(e.target.value)} />
      </label>
      {input("organiserPhone", "Organiser's Sunu Pay number (the money goes to this account)", { placeholder: "+220…" })}
      <label>
        {t("Gate staff numbers (one per line; they check tickets with the app)")}
        <textarea rows={3} value={f.gatePhones} onChange={(e) => set("gatePhones")(e.target.value)} />
      </label>
    </ConfirmWithPin>
  );
}

function ApproveDialog({ e, onClose, onDone }: { e: TicketEvent; onClose: () => void; onDone: (m: string) => void }) {
  const t = useT();
  const key = useMemo(newIdempotencyKey, []);
  return (
    <ConfirmWithPin
      title="Approve this event"
      confirmLabel="Approve and put on sale"
      onClose={onClose}
      onConfirm={async (pin) => {
        await approveTicketEvent(e.id, pin, key);
        onDone("Approved. Tickets are on sale.");
      }}
    >
      <p>{t("Check the organiser before you approve: every ticket's price goes to this Sunu Pay account.")}</p>
      <p>
        <strong>{e.organiserName || "—"}</strong> · {e.organiserPhone}
      </p>
      <p>
        <strong>{e.titleEn}</strong> / {e.titleFr}
        <br />
        {e.venue} · {when(e.startsAt)}
        <br />
        {t("{n} tickets at {price}, plus {fee} Sunu Pay fee", { n: e.capacity, price: money(e.priceMinor, e.currency), fee: money(e.feeMinor, e.currency) })}
      </p>
    </ConfirmWithPin>
  );
}

function CancelDialog({ e, onClose, onDone }: { e: TicketEvent; onClose: () => void; onDone: (m: string) => void }) {
  const t = useT();
  const key = useMemo(newIdempotencyKey, []);
  const [reason, setReason] = useState("");
  return (
    <ConfirmWithPin
      title="Cancel this event"
      confirmLabel="Cancel event"
      danger
      canConfirm={reason.trim().length >= 5}
      onClose={onClose}
      onConfirm={async (pin) => {
        await cancelTicketEvent(e.id, reason.trim(), pin, key);
        onDone("Cancelled. Sales stopped and unused tickets no longer work. A different staff member can now refund everyone.");
      }}
    >
      <p>{t("Sales stop at once and the {n} unused tickets stop working at the gate. Then a different staff member presses Refund everyone: buyers get the price and the fee back from the money Sunu Pay holds.", { n: e.sold - e.checkedIn })}</p>
      <label>
        {t("Why")}
        <input value={reason} maxLength={300} onChange={(ev) => setReason(ev.target.value)} />
      </label>
    </ConfirmWithPin>
  );
}

function GateDialog({ e, onClose, onDone }: { e: TicketEvent; onClose: () => void; onDone: (m: string) => void }) {
  const t = useT();
  const [text, setText] = useState(e.gateStaff.map((g) => g.phone).join("\n"));
  return (
    <ConfirmWithPin
      title="Gate staff"
      confirmLabel="Save"
      onClose={onClose}
      onConfirm={async (pin) => {
        await setGateStaff(e.id, phoneList(text), pin);
        onDone("Gate staff saved.");
      }}
    >
      <p>{t("These Sunu Pay accounts can check tickets for this event in the app. The organiser always can.")}</p>
      <label>
        {t("Numbers (one per line)")}
        <textarea rows={5} value={text} onChange={(ev) => setText(ev.target.value)} />
      </label>
    </ConfirmWithPin>
  );
}

function TicketsDialog({ e, canRefund, onClose, onChanged }: { e: TicketEvent; canRefund: boolean; onClose: () => void; onChanged: () => void }) {
  const t = useT();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [reload, setReload] = useState(0);
  const [refunding, setRefunding] = useState<EventTicketRow | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const { data, error, loading } = useLoad(() => eventTickets(e.id, query), [e.id, query, reload]);
  const rows = data ?? [];
  return (
    <div className="overlay" role="presentation">
      <div className="card dialog" role="dialog" aria-modal="true" aria-labelledby="tickets-title" style={{ maxWidth: 860 }}>
        <h2 id="tickets-title">{t("Tickets for {title}", { title: e.titleEn })}</h2>
        <form
          className="stack"
          onSubmit={(ev) => {
            ev.preventDefault();
            setQuery(search.trim());
          }}
        >
          <label>
            {t("Ticket number (for example T-7KQ2-M9XD)")}
            <input value={search} onChange={(ev) => setSearch(ev.target.value.toUpperCase())} />
          </label>
        </form>
        {done && <p className="notice">{t(done)}</p>}
        <LoadState loading={loading && !data} error={error} empty={!rows.length} />
        {rows.length > 0 && (
          <div className="table-wrap" style={{ maxHeight: 420, overflow: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>{t("Ticket")}</th>
                  <th>{t("Buyer")}</th>
                  <th>{t("Status")}</th>
                  <th>{t("Paid")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <code>{r.number}</code>
                      <br />
                      <span className="muted small">{when(r.boughtAt)}</span>
                    </td>
                    <td>
                      {r.ownerName || "—"}
                      <br />
                      <span className="muted small">{r.ownerPhone}</span>
                      {r.buyerPhone && r.buyerPhone !== r.ownerPhone && (
                        <>
                          <br />
                          <span className="muted small">{t("Paid by {name}", { name: r.buyerName || r.buyerPhone })}</span>
                        </>
                      )}
                      {r.beingSent && (
                        <>
                          <br />
                          <Badge tone="plain">{t("Being sent")}</Badge>
                        </>
                      )}
                    </td>
                    <td>
                      {t(TICKET_STATUS[r.status])}
                      {r.refundedAt && (
                        <>
                          <br />
                          <span className="muted small">
                            {t("By {name}, {when}", { name: r.refundedByName || "—", when: when(r.refundedAt) })}
                            {r.feeRefunded ? "" : ` · ${t("fee kept")}`}
                          </span>
                        </>
                      )}
                    </td>
                    <td className="num">{money(r.priceMinor + r.feeMinor, r.currency)}</td>
                    <td className="actions">
                      {canRefund && !e.paidOutAt && (r.status === "valid" || r.status === "void") && <button onClick={() => setRefunding(r)}>{t("Refund")}</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="row-end">
          <button type="button" onClick={onClose}>
            {t("Close")}
          </button>
        </div>
      </div>
      {refunding && (
        <RefundDialog
          ticket={refunding}
          onClose={() => setRefunding(null)}
          onDone={(m) => {
            setRefunding(null);
            setDone(m);
            setReload((n) => n + 1);
            onChanged();
          }}
        />
      )}
    </div>
  );
}

function RefundDialog({ ticket, onClose, onDone }: { ticket: EventTicketRow; onClose: () => void; onDone: (m: string) => void }) {
  const t = useT();
  const key = useMemo(newIdempotencyKey, []);
  const [reason, setReason] = useState("");
  const [includeFee, setIncludeFee] = useState(true);
  const amount = ticket.priceMinor + (includeFee ? ticket.feeMinor : 0);
  return (
    <ConfirmWithPin
      title="Refund this ticket"
      confirmLabel="Refund"
      canConfirm={reason.trim().length >= 5}
      onClose={onClose}
      onConfirm={async (pin) => {
        await refundEventTicket(ticket.id, reason.trim(), includeFee, pin, key);
        onDone("Refunded to the buyer's wallet.");
      }}
    >
      <p>{t("{amount} goes back to {name}'s wallet from the money Sunu Pay holds, and the ticket stops working.", { amount: money(amount, ticket.currency), name: ticket.buyerName || ticket.buyerPhone || ticket.ownerName })}</p>
      {ticket.feeMinor > 0 && (
        <label className="check">
          <input type="checkbox" checked={includeFee} onChange={(ev) => setIncludeFee(ev.target.checked)} /> {t("Refund the Sunu Pay fee too ({fee})", { fee: money(ticket.feeMinor, ticket.currency) })}
        </label>
      )}
      <label>
        {t("Why")}
        <input value={reason} maxLength={300} onChange={(ev) => setReason(ev.target.value)} />
      </label>
    </ConfirmWithPin>
  );
}

function RefundAllDialog({ e, onClose, onDone }: { e: TicketEvent; onClose: () => void; onDone: (m: string) => void }) {
  const t = useT();
  const key = useMemo(newIdempotencyKey, []);
  const [reason, setReason] = useState("Event cancelled");
  return (
    <ConfirmWithPin
      title="Refund everyone"
      confirmLabel="Refund everyone"
      canConfirm={reason.trim().length >= 5}
      onClose={onClose}
      onConfirm={async (pin) => {
        const out = await refundEveryone(e.id, reason.trim(), pin, key);
        onDone(out.failed.length ? "Some tickets could not be refunded. Run it again to try the rest." : "Everyone was refunded.");
      }}
    >
      <p>{t("{n} tickets get the price and the fee back, from the money Sunu Pay holds for this event. You must not be the person who cancelled it.", { n: e.refundsWaiting })}</p>
      <label>
        {t("Why")}
        <input value={reason} maxLength={300} onChange={(ev) => setReason(ev.target.value)} />
      </label>
    </ConfirmWithPin>
  );
}

function PayDialog({ e, onClose, onDone }: { e: TicketEvent; onClose: () => void; onDone: (m: string) => void }) {
  const t = useT();
  const key = useMemo(newIdempotencyKey, []);
  return (
    <ConfirmWithPin
      title="Pay the organiser"
      confirmLabel="Pay now"
      onClose={onClose}
      onConfirm={async (pin) => {
        await payOrganiser(e.id, pin, key);
        onDone("The organiser was paid.");
      }}
    >
      <p>{t("{price} goes to {name}'s Sunu Pay wallet and {fee} of fees to Sunu Pay. After this, refunds for this event must come from the organiser.", { price: money(e.heldPriceMinor, e.currency), fee: money(e.heldFeeMinor, e.currency), name: e.organiserName || e.organiserPhone })}</p>
    </ConfirmWithPin>
  );
}

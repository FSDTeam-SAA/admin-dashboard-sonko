import { useMemo, useState } from "react";
import {
  approveTicketEvent,
  cancelTicketEvent,
  makeTicketEvent,
  setGateStaff,
  ticketEvents,
  type TicketEvent,
  type TicketEventDraft,
  type TicketEventState,
} from "../api/admin";
import { useAuth } from "../auth/AuthContext";
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
  const [done, setDone] = useState<string | null>(null);
  const { data, error, loading } = useLoad(() => ticketEvents(), [reload]);
  const rows = data ?? [];
  const finish = (message: string) => {
    setMaking(false);
    setApproving(null);
    setCancelling(null);
    setGate(null);
    setDone(message);
    setReload((n) => n + 1);
  };
  return (
    <section>
      <PageHeader
        title="Event tickets"
        intro="Tickets sold only in the app. Each ticket shows a code that changes every 30 seconds, so screenshots and copies don't work, and the gate lets each ticket in once. The price goes straight to the organiser's Sunu Pay wallet; the Sunu Pay fee is added on top for the buyer."
        actions={
          <button className="primary" onClick={() => setMaking(true)}>
            {t("Set up an event")}
          </button>
        }
      />
      <p className="notice">{t("Not built yet: refunds when an event is cancelled, and passing a ticket to someone else. Check the money side with your lawyer before the first real sale.")}</p>
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
                      <br />
                      <span className="muted small">{money(e.paidToOrganiserMinor, e.currency)}</span>
                    </td>
                    <td className="num">{e.checkedIn}</td>
                    <td>
                      {e.organiserName || "—"}
                      <br />
                      <span className="muted small">{e.organiserPhone}</span>
                    </td>
                    <td className="actions">
                      {e.state === "waiting" && e.createdBy !== staff?._id && <button onClick={() => setApproving(e)}>{t("Review and approve")}</button>}
                      {e.state !== "cancelled" && e.state !== "over" && <button onClick={() => setGate(e)}>{t("Gate staff")}</button>}
                      {e.state !== "cancelled" && e.state !== "over" && (
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
        onDone("Cancelled. Sales stopped and unused tickets no longer work. Refunds are not automatic.");
      }}
    >
      <p>{t("Sales stop at once and the {n} unused tickets stop working at the gate. Paying people back is not automatic: agree it with the organiser.", { n: e.sold - e.checkedIn })}</p>
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

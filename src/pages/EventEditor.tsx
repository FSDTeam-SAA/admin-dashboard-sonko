import { useMemo, useState } from "react";
import { editTicketEvent, makeTicketEvent, type TicketEvent, type TicketEventDraft, type TicketTier } from "../api/admin";
import { ConfirmWithPin } from "../components/ConfirmWithPin";
import { TextArea } from "../components/common";
import { decimalsOf, money } from "../lib/format";
import { newIdempotencyKey } from "../lib/idempotency";
import { useT } from "../i18n/language";

// The event form: make an event, or change one. Staff type the details and
// the ticket types (name, price, how many), and see the app's event screen
// change as they type. Server rules: utils/eventTicket.rules.js.
// A draft changes at once. An event on sale waits for a second person, can't
// change country, currency or organiser, and sold tickets keep their price.

export const MAX_TIERS = 6;

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

const major = (minor: number, currency: string) => String(minor / 10 ** decimalsOf(currency));
const localInput = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const inDays = (days: number) => {
  const d = new Date(Date.now() + days * 86_400_000);
  d.setMinutes(0, 0, 0);
  return localInput(d.toISOString());
};

/** Phone numbers typed one per line or separated by commas. */
export function phoneList(text: string): string[] {
  return text
    .split(/[\n,;]+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

type TierRow = { id?: string; nameEn: string; nameFr: string; price: string; capacity: string; sold: number };
type Form = {
  titleEn: string; titleFr: string; aboutEn: string; aboutFr: string; venue: string; country: string; currency: string;
  fee: string; maxPerPerson: string; startsAt: string; salesEndAt: string; organiserPhone: string; gatePhones: string; tiers: TierRow[];
};

function formFrom(e: TicketEvent | null): Form {
  if (!e) {
    return {
      titleEn: "", titleFr: "", aboutEn: "", aboutFr: "", venue: "", country: "GM", currency: "GMD", fee: "0", maxPerPerson: "4",
      startsAt: inDays(14), salesEndAt: "", organiserPhone: "", gatePhones: "",
      tiers: [{ nameEn: "Standard", nameFr: "Standard", price: "", capacity: "", sold: 0 }],
    };
  }
  const tiers: TicketTier[] = e.tiers?.length ? e.tiers : [{ nameEn: "Standard", nameFr: "Standard", priceMinor: e.priceMinor, capacity: e.capacity, sold: e.sold }];
  return {
    titleEn: e.titleEn, titleFr: e.titleFr, aboutEn: e.aboutEn, aboutFr: e.aboutFr, venue: e.venue, country: e.country, currency: e.currency,
    fee: major(e.feeMinor, e.currency), maxPerPerson: String(e.maxPerPerson), startsAt: localInput(e.startsAt),
    salesEndAt: e.salesEndAt && e.salesEndAt !== e.startsAt ? localInput(e.salesEndAt) : "",
    organiserPhone: e.organiserPhone, gatePhones: e.gateStaff.map((g) => g.phone).join("\n"),
    tiers: tiers.map((t) => ({ id: t.id && t.id !== "main" ? t.id : undefined, nameEn: t.nameEn, nameFr: t.nameFr, price: major(t.priceMinor, e.currency), capacity: String(t.capacity), sold: t.sold || 0 })),
  };
}

/** What is wrong with the form, in staff words, or null. The server checks again. */
export function formProblem(f: Form, live: boolean): string | null {
  if (f.titleEn.trim().length < 3 || f.titleFr.trim().length < 3) return "Write the title in English and French.";
  if (f.venue.trim().length < 3) return "Write the venue.";
  if (!f.tiers.length) return "Add at least one ticket type.";
  const names = new Set<string>();
  for (const t of f.tiers) {
    if (t.nameEn.trim().length < 2 || t.nameFr.trim().length < 2) return "Name every ticket type in English and French.";
    if (names.has(t.nameEn.trim().toLowerCase())) return `Two ticket types are called "${t.nameEn.trim()}".`;
    names.add(t.nameEn.trim().toLowerCase());
    if (!toMinorUnits(t.price, f.currency)) return `${t.nameEn || "A ticket type"}: set the price.`;
    const cap = Number(t.capacity);
    if (!Number.isInteger(cap) || cap < 1) return `${t.nameEn || "A ticket type"}: set how many tickets.`;
    if (cap < t.sold) return `${t.nameEn}: ${t.sold} are already sold, so there can't be fewer than that.`;
  }
  const fee = toMinorUnits(f.fee || "0", f.currency);
  const cheapest = Math.min(...f.tiers.map((t) => toMinorUnits(t.price, f.currency) ?? Infinity));
  if (fee === null) return "The Sunu Pay fee must be zero or more.";
  if (fee > cheapest) return "The Sunu Pay fee can't be more than the cheapest ticket.";
  if (!f.startsAt || new Date(f.startsAt) <= new Date()) return "Choose when the event starts (in the future).";
  if (!live && !f.organiserPhone.trim().startsWith("+")) return "Type the organiser's Sunu Pay number, starting with +.";
  return null;
}

function draftFrom(f: Form): TicketEventDraft {
  const tiers: TicketTier[] = f.tiers.map((t) => ({
    ...(t.id ? { id: t.id } : {}),
    nameEn: t.nameEn.trim(),
    nameFr: t.nameFr.trim(),
    priceMinor: toMinorUnits(t.price, f.currency) ?? 0,
    capacity: Number(t.capacity),
  }));
  const startsAt = new Date(f.startsAt).toISOString();
  return {
    titleEn: f.titleEn, titleFr: f.titleFr, aboutEn: f.aboutEn, aboutFr: f.aboutFr, venue: f.venue, country: f.country, currency: f.currency,
    tiers,
    priceMinor: Math.min(...tiers.map((t) => t.priceMinor)),
    capacity: tiers.reduce((sum, t) => sum + t.capacity, 0),
    feeMinor: toMinorUnits(f.fee || "0", f.currency) ?? 0,
    maxPerPerson: Number(f.maxPerPerson),
    startsAt,
    salesEndAt: f.salesEndAt ? new Date(f.salesEndAt).toISOString() : startsAt,
    organiserPhone: f.organiserPhone.trim(),
    gatePhones: phoneList(f.gatePhones),
  };
}

/** Make an event (event null) or change one. */
export function EventFormDialog({ event, onClose, onDone }: { event: TicketEvent | null; onClose: () => void; onDone: (m: string) => void }) {
  const t = useT();
  const key = useMemo(newIdempotencyKey, []);
  const [f, setF] = useState<Form>(() => formFrom(event));
  const [reason, setReason] = useState("");
  const [lang, setLang] = useState<"en" | "fr">("en");
  const live = !!event && event.state !== "waiting";
  const problem = formProblem(f, live);
  const set = (k: keyof Form) => (v: string) => setF({ ...f, [k]: v });
  const setTier = (i: number, change: Partial<TierRow>) => setF({ ...f, tiers: f.tiers.map((row, n) => (n === i ? { ...row, ...change } : row)) });
  const input = (k: Exclude<keyof Form, "tiers">, label: string, extra: Record<string, unknown> = {}) => (
    <label>
      {t(label)}
      <input value={f[k]} onChange={(e) => set(k)(e.target.value)} {...extra} />
    </label>
  );
  return (
    <ConfirmWithPin
      title={!event ? "Set up an event" : live ? "Change this event" : "Change this draft"}
      confirmLabel={!event ? "Send for approval" : live ? "Ask for the change" : "Save the draft"}
      canConfirm={!problem && (!live || reason.trim().length >= 5)}
      onClose={onClose}
      onConfirm={async (pin) => {
        const draft = draftFrom(f);
        if (!event) {
          await makeTicketEvent(draft, pin, key);
          onDone("Event made. A different staff member must approve it before tickets go on sale.");
          return;
        }
        const result = await editTicketEvent(event.id, { ...draft, reason: reason.trim() }, pin, key);
        onDone(result.asked ? "Asked. A different staff member must approve the change before it shows in the app." : "Draft changed. A different staff member must approve it.");
      }}
    >
      <div className="editor-split">
        <div className="editor-form">
          {live && <p className="notice small">{t("This event is on sale. A different staff member must approve your change. Tickets already sold keep their price, and ticket holders are told if the time or place changes.")}</p>}
          {input("titleEn", "Title (English)", { maxLength: 60 })}
          {input("titleFr", "Title (French)", { maxLength: 60 })}
          <label>
            {t("About (English, optional)")}
            <textarea rows={2} maxLength={300} value={f.aboutEn} onChange={(e) => set("aboutEn")(e.target.value)} />
          </label>
          <label>
            {t("About (French, optional)")}
            <textarea rows={2} maxLength={300} value={f.aboutFr} onChange={(e) => set("aboutFr")(e.target.value)} />
          </label>
          {input("venue", "Venue", { maxLength: 80 })}
          <div className="row">
            {input("country", "Country (two letters)", { maxLength: 2, readOnly: live })}
            {input("currency", "Currency", { maxLength: 3, readOnly: live })}
          </div>
          <div className="row">
            <label>
              {t("Event starts")}
              <input type="datetime-local" value={f.startsAt} onChange={(e) => set("startsAt")(e.target.value)} />
            </label>
            <label>
              {t("Sales end (optional)")}
              <input type="datetime-local" value={f.salesEndAt} onChange={(e) => set("salesEndAt")(e.target.value)} />
            </label>
          </div>

          <h3>{t("Ticket types")}</h3>
          <p className="hint">{t("Each type has its own price and number of tickets, like Standard and VIP. The price goes to the organiser.")}</p>
          {f.tiers.map((row, i) => (
            <fieldset key={row.id ?? `new-${i}`} className="tier-row">
              <div className="row">
                <label>
                  {t("Name (English)")}
                  <input value={row.nameEn} maxLength={40} onChange={(e) => setTier(i, { nameEn: e.target.value })} />
                </label>
                <label>
                  {t("Name (French)")}
                  <input value={row.nameFr} maxLength={40} onChange={(e) => setTier(i, { nameFr: e.target.value })} />
                </label>
              </div>
              <div className="row">
                <label>
                  {t("Price ({currency})", { currency: f.currency })}
                  <input value={row.price} inputMode="decimal" onChange={(e) => setTier(i, { price: e.target.value })} />
                </label>
                <label>
                  {t("How many")}
                  <input value={row.capacity} inputMode="numeric" onChange={(e) => setTier(i, { capacity: e.target.value })} />
                </label>
              </div>
              <p className="muted small">
                {row.sold > 0 ? t("{n} sold. This type can't be removed.", { n: row.sold }) : ""}
                {row.sold === 0 && f.tiers.length > 1 && (
                  <button type="button" className="link" onClick={() => setF({ ...f, tiers: f.tiers.filter((_, n) => n !== i) })}>
                    {t("Remove this type")}
                  </button>
                )}
              </p>
            </fieldset>
          ))}
          {f.tiers.length < MAX_TIERS && (
            <button type="button" onClick={() => setF({ ...f, tiers: [...f.tiers, { nameEn: "", nameFr: "", price: "", capacity: "", sold: 0 }] })}>
              {t("Add a ticket type")}
            </button>
          )}
          <div className="row">
            {input("fee", "Sunu Pay fee per ticket", { inputMode: "decimal" })}
            {input("maxPerPerson", "Tickets per person (1 to 10)", { inputMode: "numeric" })}
          </div>
          {input("organiserPhone", "Organiser's Sunu Pay number (the money goes to this account)", { placeholder: "+220…", readOnly: live })}
          {!live && (
            <label>
              {t("Gate staff numbers (one per line; they check tickets with the app)")}
              <textarea rows={2} value={f.gatePhones} onChange={(e) => set("gatePhones")(e.target.value)} />
            </label>
          )}
          {live && <TextArea label="Why is it changing?" value={reason} onChange={setReason} min={5} max={300} />}
          {problem && <p className="error small">{t(problem)}</p>}
        </div>
        <div className="editor-preview">
          <div className="row-start small">
            <span className="muted">{t("How it looks in the app")}</span>
            <button type="button" className={lang === "en" ? "chip on" : "chip"} onClick={() => setLang("en")}>EN</button>
            <button type="button" className={lang === "fr" ? "chip on" : "chip"} onClick={() => setLang("fr")}>FR</button>
          </div>
          <EventPhonePreview form={f} lang={lang} />
        </div>
      </div>
    </ConfirmWithPin>
  );
}

/** The app's event screen, drawn from the form (dark, like the app). */
export function EventPhonePreview({ form: f, lang }: { form: Form; lang: "en" | "fr" }) {
  const fr = lang === "fr";
  const when = f.startsAt
    ? new Date(f.startsAt).toLocaleString(fr ? "fr-FR" : "en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : "—";
  const tiers = f.tiers
    .map((t) => ({ name: (fr ? t.nameFr : t.nameEn) || "—", price: toMinorUnits(t.price, f.currency) }))
    .sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
  return (
    <div className="phone-preview" aria-label="Preview">
      <div className="pp-title">{(fr ? f.titleFr : f.titleEn) || (fr ? "Titre de l’événement" : "Event title")}</div>
      <div className="pp-line">📅 {when}</div>
      <div className="pp-line">📍 {f.venue || "—"}</div>
      <div className="pp-line">🎟 {fr ? "Billets uniquement dans l’app Sunu Pay" : "Tickets only in the Sunu Pay app"}</div>
      {(fr ? f.aboutFr : f.aboutEn) && <p className="pp-about">{fr ? f.aboutFr : f.aboutEn}</p>}
      <div className="pp-head">{fr ? "Billets" : "Tickets"}</div>
      <div className="pp-card">
        {tiers.map((t, i) => (
          <div key={i} className="pp-tier">
            <div>
              <b>{t.name}</b>
              <span>{t.price ? money(t.price, f.currency) : "—"}</span>
            </div>
            <div className="pp-step">
              <i>−</i>
              <em>{i === 0 ? 1 : 0}</em>
              <i>+</i>
            </div>
          </div>
        ))}
      </div>
      <div className="pp-buy">{fr ? "Acheter des billets" : "Buy tickets"}</div>
    </div>
  );
}

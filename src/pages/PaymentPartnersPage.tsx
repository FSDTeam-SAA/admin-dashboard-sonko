import { useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { can } from "../api/staff";
import {
  approvePaymentPartners,
  cancelPaymentPartners,
  paymentPartnerHistory,
  paymentPartnerPreview,
  paymentPartners,
  proposePaymentPartners,
  stopPaymentPartner,
  type PartnerChange,
  type PartnerFacts,
  type PartnerPreview,
  type PartnerRoute,
  type PartnerService,
  type PartnerSettings,
  type PartnerWhy,
  type Person,
  type PickRule,
} from "../api/admin";
import { ConfirmWithPin } from "../components/ConfirmWithPin";
import { Badge, LoadState, PageHeader, TextArea, okLength } from "../components/common";
import { newIdempotencyKey } from "../lib/idempotency";
import { decimalsOf, money, personLabel, when } from "../lib/format";
import { useLoad } from "../lib/useLoad";
import { useT } from "../i18n/language";

const REASON_MIN = 10;
const REASON_MAX = 500;
const STOP_REASON_MIN = 5;

export const SERVICE_LABEL: Record<PartnerService, string> = {
  wallet_top_up: "Card top-ups",
  airtime: "Airtime and data",
  bills: "Bills",
  bank_transfer: "Bank transfers",
};

const WHY_LABEL: Record<PartnerWhy, string> = {
  ok: "Can take it",
  resting: "Can take it, tried last (recent connection failures)",
  no_code: "No code for this service",
  not_ready: "Not ready",
  no_keys: "Keys not set on the server",
  partner_off: "Partner switched off",
  no_route: "No row for this country",
  route_off: "Switched off for this service",
};

// The money each country pays in, for fixed fees. A country not listed here
// can still have a row, but only with percent fees.
export const COUNTRY_MONEY: Record<string, string> = {
  GM: "GMD",
  GB: "GBP",
  GH: "GHS",
  NG: "NGN",
  SN: "XOF",
  CI: "XOF",
  ML: "XOF",
  GN: "GNF",
  SL: "SLE",
  FR: "EUR",
  ES: "EUR",
  IT: "EUR",
  DE: "EUR",
  US: "USD",
};

export const percent = (bps: number) => `${(bps / 100).toLocaleString("en-GB", { maximumFractionDigits: 2 })}%`;

/** "1.5" or "1.5%" as basis points (150), or null. Between 0% and 20%. */
export function percentToBps(text: string): number | null {
  const clean = text.trim().replace(/%$/, "").trim();
  if (!/^\d{1,2}(\.\d{1,2})?$/.test(clean)) return null;
  const bps = Math.round(Number(clean) * 100);
  return bps <= 2000 ? bps : null;
}

/** A fixed fee typed in the country's money ("5" or "5.25") as minor units, or null. */
export function feeToMinor(text: string, currency: string): number | null {
  const d = decimalsOf(currency);
  const clean = text.trim();
  const re = d === 0 ? /^\d{1,9}$/ : /^\d{1,9}(\.\d{1,2})?$/;
  if (!re.test(clean)) return null;
  return Math.round(Number(clean) * 10 ** d);
}

export function fixedFeeText(route: Pick<PartnerRoute, "country" | "fixedFeeMinor">) {
  if (route.country === "ALL" || !route.fixedFeeMinor) return "—";
  const currency = COUNTRY_MONEY[route.country];
  return currency ? money(route.fixedFeeMinor, currency) : String(route.fixedFeeMinor);
}

const sortRoutes = (routes: PartnerRoute[]) =>
  [...routes].sort((a, b) => a.service.localeCompare(b.service) || (a.country === "ALL" ? -1 : b.country === "ALL" ? 1 : a.country.localeCompare(b.country)));

type Row = [string, string, string];

/** The changes between two settings, as "what / now / proposed" rows. */
export function changeRows(before: PartnerSettings, after: PartnerSettings, names: Record<string, string>, t: (s: string, v?: Record<string, string | number>) => string): Row[] {
  const rows: Row[] = [];
  const name = (code: string) => names[code] ?? code;
  const ruleText = (r: PickRule | undefined) => (r ? t(r === "cheapest" ? "Cheapest" : "In order") : "—");
  for (const s of Object.keys(SERVICE_LABEL) as PartnerService[]) {
    if (before.pickRule[s] !== after.pickRule[s]) rows.push([t("How {service} picks a partner", { service: t(SERVICE_LABEL[s]) }), ruleText(before.pickRule[s]), ruleText(after.pickRule[s])]);
  }
  const routeText = (r: PartnerRoute | undefined) =>
    r ? `${t(r.on ? "On" : "Off")} · ${t("fee {fee}, margin {margin}", { fee: percent(r.percentBps), margin: percent(r.fxMarginBps) })}${r.fixedFeeMinor ? ` + ${fixedFeeText(r)}` : ""}` : t("No row");
  for (const p1 of after.partners) {
    const p0 = before.partners.find((p) => p.code === p1.code);
    if (!p0) continue;
    if (p0.on !== p1.on) rows.push([name(p1.code), t(p0.on ? "On" : "Off"), t(p1.on ? "On" : "Off")]);
    if (p0.order !== p1.order) rows.push([t("{name}: place in the order", { name: name(p1.code) }), String(p0.order), String(p1.order)]);
    const keys = new Set([...p0.routes, ...p1.routes].map((r) => `${r.service}.${r.country}`));
    for (const key of keys) {
      const [service, country] = key.split(".") as [PartnerService, string];
      const r0 = p0.routes.find((r) => r.service === service && r.country === country);
      const r1 = p1.routes.find((r) => r.service === service && r.country === country);
      if (JSON.stringify(r0) !== JSON.stringify(r1)) {
        rows.push([`${name(p1.code)}: ${t(SERVICE_LABEL[service])} (${country === "ALL" ? t("all countries") : country})`, routeText(r0), routeText(r1)]);
      }
    }
  }
  return rows;
}

function Diff({ change, names }: { change: PartnerChange; names: Record<string, string> }) {
  const t = useT();
  const rows = changeRows(change.before, change.after, names, t);
  return (
    <div className="table-wrap">
      <table className="diff">
        <thead>
          <tr>
            <th>{t("What")}</th>
            <th>{t("Now")}</th>
            <th>{t("Proposed")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([what, before, after]) => (
            <tr key={what}>
              <td>{what}</td>
              <td>{before}</td>
              <td className="changed">{after}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type Stop = { code: string; name: string; service?: PartnerService; country?: string };

/** Payment partners: which partner handles each payment, and what each one costs SunuPay. */
export function PaymentPartnersPage() {
  const t = useT();
  const { staff } = useAuth();
  const [open, setOpen] = useState<"propose" | "approve" | "cancel" | null>(null);
  const [stop, setStop] = useState<Stop | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const { data, error, loading, reload } = useLoad(() => paymentPartners(), []);
  const settings = data?.settings;
  const pending = data?.pendingChange ?? null;
  const people = data?.people ?? {};
  const facts = data?.partners ?? [];
  const names = Object.fromEntries(facts.map((f) => [f.code, f.name]));
  const mine = pending?.requestedBy === staff?._id;
  const manage = can(staff, "manage_gateways");
  const finish = (message: string) => {
    setOpen(null);
    setStop(null);
    setDone(message);
    reload();
  };

  return (
    <>
      <PageHeader
        title={t("Payment partners")}
        intro={t("Each payment goes to the switched-on partner that costs Sunu Pay the least. If it can't be reached, the next one is used. The customer pays the same either way.")}
        actions={
          manage && settings && !pending ? (
            <button className="primary" onClick={() => setOpen("propose")}>
              {t("Propose a change")}
            </button>
          ) : undefined
        }
      />
      {done && <p className="notice">{t(done)}</p>}
      <LoadState loading={loading && !data} error={error} empty={false} />
      {settings && pending && (
        <div className="card panel">
          <div className="panel-head">
            <h2>{t("A change is waiting for approval")}</h2>
            <Badge tone="warn">{t("Expires {when}", { when: when(pending.expiresAt) })}</Badge>
          </div>
          <Diff change={pending} names={names} />
          <p className="small">
            <strong>{t("Why:")}</strong> {pending.reason}
          </p>
          <p className="muted small">
            {t("Proposed by {name} on {when}", { name: mine ? t("you") : personLabel(people[pending.requestedBy ?? ""]), when: when(pending.createdAt) })}
          </p>
          <div className="row-end">
            {manage && <button onClick={() => setOpen("cancel")}>{t("Cancel change")}</button>}
            {manage && !mine && (
              <button className="primary" onClick={() => setOpen("approve")}>
                {t("Approve change")}
              </button>
            )}
            {mine && <Badge tone="plain">{t("A different person must approve")}</Badge>}
          </div>
        </div>
      )}
      {settings && (
        <>
          <div className="card panel">
            <div className="panel-head">
              <h2>{t("In force (version {n})", { n: settings.version })}</h2>
            </div>
            <dl className="facts wide">
              {(Object.keys(SERVICE_LABEL) as PartnerService[]).map((s) => (
                <FragmentRow key={s} label={t(SERVICE_LABEL[s])} value={t(settings.pickRule[s] === "cheapest" ? "Cheapest switched-on partner" : "First switched-on partner in the order")} />
              ))}
            </dl>
            <p className="hint">{t("Cost for each payment = fixed fee + amount × (fee % + exchange-rate margin %). Equal costs go by the order.")}</p>
          </div>
          {settings.partners.map((p) => {
            const f = facts.find((x) => x.code === p.code);
            return <PartnerCard key={p.code} partner={p} facts={f} manage={manage} onStop={setStop} />;
          })}
          <PreviewSection />
        </>
      )}
      <button onClick={() => setShowHistory((v) => !v)}>{t(showHistory ? "Hide history" : "Show history")}</button>
      {showHistory && <History names={names} />}
      {open === "propose" && settings && (
        <Propose settings={settings} facts={facts} onClose={() => setOpen(null)} onDone={() => finish("Change proposed. A different person must approve it within 24 hours.")} />
      )}
      {open === "approve" && pending && (
        <Approve change={pending} names={names} people={people} onClose={() => setOpen(null)} onDone={() => finish("Approved. New payments use these settings now.")} />
      )}
      {open === "cancel" && pending && <Cancel change={pending} onClose={() => setOpen(null)} onDone={() => finish("Change cancelled. Nothing changed.")} />}
      {stop && <StopNow stop={stop} onClose={() => setStop(null)} onDone={() => finish("Switched off. New payments no longer go there. Payments it already has are still checked.")} />}
    </>
  );
}

function FragmentRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );
}

function PartnerCard({ partner, facts, manage, onStop }: { partner: PartnerSettings["partners"][number]; facts?: PartnerFacts; manage: boolean; onStop: (s: Stop) => void }) {
  const t = useT();
  const name = facts?.name ?? partner.code;
  return (
    <div className="card panel">
      <div className="panel-head">
        <h2>
          {partner.order}. {name}
        </h2>
        <div className="row-end">
          <Badge tone={partner.on ? "ok" : "plain"}>{t(partner.on ? "On" : "Off")}</Badge>
          {facts && !facts.ready && <Badge tone="warn">{t("Not ready")}</Badge>}
          {facts && !facts.keysSet && <Badge tone="warn">{t("Keys not set on the server")}</Badge>}
          {facts?.restingUntil && <Badge tone="danger">{t("Tried last until {when}", { when: when(facts.restingUntil) })}</Badge>}
          {manage && partner.on && (
            <button className="danger" onClick={() => onStop({ code: partner.code, name })}>
              {t("Switch off now")}
            </button>
          )}
        </div>
      </div>
      {facts && !facts.ready && facts.notReadyReason && <p className="hint">{t(facts.notReadyReason)} {t("It is never picked until a developer finishes it.")}</p>}
      {facts && !facts.keysSet && <p className="hint">{t("Its keys must be added to the server settings by a developer. It is never picked until then.")}</p>}
      {partner.routes.length === 0 ? (
        <p className="muted">{t("No services set up.")}</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("Service")}</th>
                <th>{t("Country")}</th>
                <th>{t("State")}</th>
                <th>{t("Fixed fee")}</th>
                <th>{t("Fee")}</th>
                <th>{t("Exchange-rate margin")}</th>
                {manage && <th />}
              </tr>
            </thead>
            <tbody>
              {sortRoutes(partner.routes).map((r) => (
                <tr key={`${r.service}.${r.country}`}>
                  <td>{t(SERVICE_LABEL[r.service])}</td>
                  <td>{r.country === "ALL" ? t("All countries") : r.country}</td>
                  <td>
                    <Badge tone={r.on && partner.on ? "ok" : "plain"}>{t(r.on ? "On" : "Off")}</Badge>
                  </td>
                  <td>{fixedFeeText(r)}</td>
                  <td>{percent(r.percentBps)}</td>
                  <td>{percent(r.fxMarginBps)}</td>
                  {manage && (
                    <td>
                      {r.on && (
                        <button onClick={() => onStop({ code: partner.code, name, service: r.service, country: r.country })}>
                          {t("Switch off")}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PreviewSection() {
  const t = useT();
  const [service, setService] = useState<PartnerService>("bank_transfer");
  const [country, setCountry] = useState("GM");
  const [amount, setAmount] = useState("1000");
  const [result, setResult] = useState<PartnerPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const code = country.trim().toUpperCase();
  const currency = COUNTRY_MONEY[code];
  const amountMinor = currency ? feeToMinor(amount, currency) : null;
  const check = async () => {
    setError(null);
    try {
      if (!currency || !amountMinor) throw new Error(t("Choose a country from the list and an amount."));
      setResult(await paymentPartnerPreview(service, code, amountMinor));
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : t("Could not check."));
    }
  };
  return (
    <div className="card panel">
      <div className="panel-head">
        <h2>{t("Check a payment")}</h2>
      </div>
      <p className="muted">{t("See what each partner would cost for one payment and which one would get it now.")}</p>
      <div className="form-grid">
        <label>
          {t("Service")}
          <select value={service} onChange={(e) => setService(e.target.value as PartnerService)}>
            {(Object.keys(SERVICE_LABEL) as PartnerService[]).map((s) => (
              <option key={s} value={s}>
                {t(SERVICE_LABEL[s])}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("Country")}
          <select value={code} onChange={(e) => setCountry(e.target.value)}>
            {Object.keys(COUNTRY_MONEY).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("Amount ({currency})", { currency: currency ?? "" })}
          <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
      </div>
      <div className="row-end">
        <button onClick={() => void check()}>{t("Check")}</button>
      </div>
      {error && <p className="error">{error}</p>}
      {result && currency && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("Partner")}</th>
                <th>{t("Cost to Sunu Pay")}</th>
                <th>{t("Result")}</th>
              </tr>
            </thead>
            <tbody>
              {[...result.considered]
                .sort((a, b) => {
                  const ia = result.picked.indexOf(a.code);
                  const ib = result.picked.indexOf(b.code);
                  return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.order - b.order;
                })
                .map((c) => {
                  const place = result.picked.indexOf(c.code);
                  return (
                    <tr key={c.code}>
                      <td>{c.name}</td>
                      <td>{c.costMinor === null ? "—" : money(c.costMinor, currency)}</td>
                      <td>
                        {place === 0 ? (
                          <Badge tone="ok">{t("Gets this payment")}</Badge>
                        ) : place > 0 ? (
                          <Badge tone="plain">{t("Backup {n}", { n: place })}</Badge>
                        ) : (
                          <span className="muted">{t(WHY_LABEL[c.why])}</span>
                        )}
                        {place >= 0 && c.why === "resting" && <span className="muted small"> {t(WHY_LABEL.resting)}</span>}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
          {result.picked.length === 0 && <p className="error">{t("No partner can take this payment now. Customers see that the service isn't available.")}</p>}
          <p className="hint">{t(result.rule === "cheapest" ? "Picked by cost." : "Picked by the order.")}</p>
        </div>
      )}
    </div>
  );
}

type Draft = { pickRule: PartnerSettings["pickRule"]; partners: { code: string; on: boolean; routes: (PartnerRoute & { fee: string; percent: string; margin: string })[] }[] };

function toDraft(s: PartnerSettings): Draft {
  return {
    pickRule: { ...s.pickRule },
    partners: [...s.partners]
      .sort((a, b) => a.order - b.order)
      .map((p) => ({
        code: p.code,
        on: p.on,
        routes: sortRoutes(p.routes).map((r) => {
          const currency = COUNTRY_MONEY[r.country];
          const fee = r.fixedFeeMinor && currency ? String(r.fixedFeeMinor / 10 ** decimalsOf(currency)) : "0";
          return { ...r, fee, percent: String(r.percentBps / 100), margin: String(r.fxMarginBps / 100) };
        }),
      })),
  };
}

/** The settings to send, plus the problems to fix first. The server checks again. */
/** Each problem is an English sentence with {name} for the partner, ready for t(). */
export type DraftError = [string, string];

export function buildPartnerSettings(draft: Draft, names: Record<string, string> = {}): { settings: Omit<PartnerSettings, "version">; errors: DraftError[] } {
  const errors: DraftError[] = [];
  const partners = draft.partners.map((p, i) => {
    const n = names[p.code] ?? p.code;
    const seen = new Set<string>();
    const routes = p.routes.map((r) => {
      const country = r.country.trim().toUpperCase();
      if (country !== "ALL" && !/^[A-Z]{2}$/.test(country)) errors.push(["{name}: the country must be ALL or two letters", n]);
      const key = `${r.service}.${country}`;
      if (seen.has(key)) errors.push(["{name}: the same service and country appear twice", n]);
      seen.add(key);
      const percentBps = percentToBps(r.percent);
      const fxMarginBps = percentToBps(r.margin);
      if (percentBps === null) errors.push(["{name}: the fee must be between 0% and 20%", n]);
      if (fxMarginBps === null) errors.push(["{name}: the margin must be between 0% and 20%", n]);
      let fixedFeeMinor = 0;
      const feeText = r.fee.trim();
      if (feeText !== "" && feeText !== "0") {
        const currency = COUNTRY_MONEY[country];
        const minor = currency ? feeToMinor(feeText, currency) : null;
        if (country === "ALL" || !currency) errors.push(["{name}: a fixed fee needs a country from the list", n]);
        else if (minor === null) errors.push(["{name}: the fixed fee is not a clean amount", n]);
        else fixedFeeMinor = minor;
      }
      return { service: r.service, country, on: r.on, fixedFeeMinor, percentBps: percentBps ?? 0, fxMarginBps: fxMarginBps ?? 0 };
    });
    return { code: p.code, on: p.on, order: i + 1, routes };
  });
  const unique = [...new Map(errors.map((e) => [e.join("|"), e])).values()];
  return { settings: { pickRule: draft.pickRule, partners }, errors: unique };
}

function Propose({ settings, facts, onDone, onClose }: { settings: PartnerSettings; facts: PartnerFacts[]; onDone: () => void; onClose: () => void }) {
  const t = useT();
  const [draft, setDraft] = useState<Draft>(() => toDraft(settings));
  const [reason, setReason] = useState("");
  const key = useMemo(newIdempotencyKey, []);
  const names = Object.fromEntries(facts.map((f) => [f.code, f.name]));
  const built = buildPartnerSettings(draft, names);
  const preview = { ...built.settings, version: settings.version + 1 } as PartnerSettings;
  const rows = built.errors.length ? [] : changeRows(settings, preview, names, t);
  const edit = (i: number, fn: (p: Draft["partners"][number]) => void) =>
    setDraft((d) => {
      const next = structuredClone(d);
      fn(next.partners[i]!);
      return next;
    });
  const move = (i: number, by: -1 | 1) =>
    setDraft((d) => {
      const next = structuredClone(d);
      const j = i + by;
      if (j < 0 || j >= next.partners.length) return d;
      [next.partners[i], next.partners[j]] = [next.partners[j]!, next.partners[i]!];
      return next;
    });
  return (
    <ConfirmWithPin
      title="Propose a change to the payment partners"
      confirmLabel="Propose"
      canConfirm={rows.length > 0 && !built.errors.length && okLength(reason, REASON_MIN, REASON_MAX)}
      onClose={onClose}
      onConfirm={async (pin) => {
        await proposePaymentPartners({ version: settings.version, settings: built.settings, reason: reason.trim(), pin }, key);
        onDone();
      }}
    >
      <h3>{t("How each service picks a partner")}</h3>
      <div className="form-grid">
        {(Object.keys(SERVICE_LABEL) as PartnerService[]).map((s) => (
          <label key={s}>
            {t(SERVICE_LABEL[s])}
            <select value={draft.pickRule[s]} onChange={(e) => setDraft((d) => ({ ...d, pickRule: { ...d.pickRule, [s]: e.target.value as PickRule } }))}>
              <option value="cheapest">{t("Cheapest")}</option>
              <option value="order">{t("In order")}</option>
            </select>
          </label>
        ))}
      </div>
      {draft.partners.map((p, i) => {
        const f = facts.find((x) => x.code === p.code);
        const unused = (f?.services ?? []).filter((s) => !p.routes.some((r) => r.service === s && r.country === "ALL"));
        return (
          <div key={p.code} className="card panel">
            <div className="panel-head">
              <h3>
                {i + 1}. {f?.name ?? p.code}
              </h3>
              <div className="row-end">
                <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label={t("Move up")}>
                  ↑
                </button>
                <button type="button" disabled={i === draft.partners.length - 1} onClick={() => move(i, 1)} aria-label={t("Move down")}>
                  ↓
                </button>
                <label className="inline">
                  <input type="checkbox" checked={p.on} onChange={(e) => edit(i, (x) => void (x.on = e.target.checked))} /> {t("On")}
                </label>
              </div>
            </div>
            {f && (!f.ready || !f.keysSet) && <p className="hint">{t("Switching this on does nothing until a developer finishes it and adds its keys.")}</p>}
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{t("Service")}</th>
                    <th>{t("Country")}</th>
                    <th>{t("On")}</th>
                    <th>{t("Fixed fee")}</th>
                    <th>{t("Fee %")}</th>
                    <th>{t("Margin %")}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {p.routes.map((r, j) => (
                    <tr key={j}>
                      <td>{t(SERVICE_LABEL[r.service])}</td>
                      <td>
                        <input
                          className="narrow"
                          value={r.country}
                          maxLength={3}
                          aria-label={t("Country")}
                          onChange={(e) => edit(i, (x) => void (x.routes[j]!.country = e.target.value.toUpperCase()))}
                        />
                      </td>
                      <td>
                        <input type="checkbox" checked={r.on} aria-label={t("On")} onChange={(e) => edit(i, (x) => void (x.routes[j]!.on = e.target.checked))} />
                      </td>
                      <td>
                        <input
                          className="narrow"
                          inputMode="decimal"
                          value={r.fee}
                          disabled={r.country === "ALL"}
                          aria-label={t("Fixed fee")}
                          onChange={(e) => edit(i, (x) => void (x.routes[j]!.fee = e.target.value))}
                        />{" "}
                        {COUNTRY_MONEY[r.country] ?? ""}
                      </td>
                      <td>
                        <input className="narrow" inputMode="decimal" value={r.percent} aria-label={t("Fee %")} onChange={(e) => edit(i, (x) => void (x.routes[j]!.percent = e.target.value))} />
                      </td>
                      <td>
                        <input className="narrow" inputMode="decimal" value={r.margin} aria-label={t("Margin %")} onChange={(e) => edit(i, (x) => void (x.routes[j]!.margin = e.target.value))} />
                      </td>
                      <td>
                        <button type="button" onClick={() => edit(i, (x) => void x.routes.splice(j, 1))}>
                          {t("Remove")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="row-end">
              {(f?.services ?? []).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() =>
                    edit(i, (x) =>
                      void x.routes.push({ service: s, country: unused.includes(s) ? "ALL" : "", on: false, fixedFeeMinor: 0, percentBps: 0, fxMarginBps: 0, fee: "0", percent: "0", margin: "0" }),
                    )
                  }
                >
                  {t("Add a row: {service}", { service: t(SERVICE_LABEL[s]) })}
                </button>
              ))}
            </div>
          </div>
        );
      })}
      <p className="hint">{t("A fixed fee needs a country, because each country pays in its own money. All countries can only have percentages. A country's own row replaces the all-countries row there.")}</p>
      {built.errors.length > 0 && <p className="error">{built.errors.map(([text, name]) => t(text, { name })).join(". ")}.</p>}
      {rows.length > 0 && (
        <div className="table-wrap">
          <table className="diff">
            <thead>
              <tr>
                <th>{t("What")}</th>
                <th>{t("Now")}</th>
                <th>{t("Proposed")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([what, before, after]) => (
                <tr key={what}>
                  <td>{what}</td>
                  <td>{before}</td>
                  <td className="changed">{after}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <TextArea label="Why" value={reason} onChange={setReason} min={REASON_MIN} max={REASON_MAX} />
    </ConfirmWithPin>
  );
}

function Approve({ change, names, people, onDone, onClose }: { change: PartnerChange; names: Record<string, string>; people: Record<string, Person>; onDone: () => void; onClose: () => void }) {
  const t = useT();
  const key = useMemo(newIdempotencyKey, []);
  return (
    <ConfirmWithPin
      title="Approve this change to the payment partners"
      confirmLabel="Approve"
      onClose={onClose}
      onConfirm={async (pin) => {
        await approvePaymentPartners(change.id, pin, key);
        onDone();
      }}
    >
      <Diff change={change} names={names} />
      <p className="small">
        <strong>{t("Why:")}</strong> {change.reason} — {personLabel(people[change.requestedBy ?? ""])}
      </p>
      <p className="hint">{t("New payments use these settings the moment you approve. Payments already with a partner stay with it.")}</p>
    </ConfirmWithPin>
  );
}

function Cancel({ change, onDone, onClose }: { change: PartnerChange; onDone: () => void; onClose: () => void }) {
  const t = useT();
  const [reason, setReason] = useState("");
  return (
    <ConfirmWithPin
      title="Cancel this change"
      confirmLabel="Cancel change"
      needsPin={false}
      canConfirm={okLength(reason, 5, 500)}
      onClose={onClose}
      onConfirm={async () => {
        await cancelPaymentPartners(change.id, reason.trim());
        onDone();
      }}
    >
      <p>{t("Nothing will change.")}</p>
      <TextArea label="Why" value={reason} onChange={setReason} min={5} max={500} />
    </ConfirmWithPin>
  );
}

function StopNow({ stop, onDone, onClose }: { stop: Stop; onDone: () => void; onClose: () => void }) {
  const t = useT();
  const [reason, setReason] = useState("");
  const key = useMemo(newIdempotencyKey, []);
  const what = stop.service
    ? `${stop.name}: ${t(SERVICE_LABEL[stop.service])} (${stop.country === "ALL" ? t("all countries") : stop.country})`
    : stop.name;
  return (
    <ConfirmWithPin
      title="Switch off now"
      confirmLabel="Switch off"
      danger
      canConfirm={okLength(reason, STOP_REASON_MIN, REASON_MAX)}
      onClose={onClose}
      onConfirm={async (pin) => {
        await stopPaymentPartner({ code: stop.code, service: stop.service, country: stop.country, reason: reason.trim(), pin }, key);
        onDone();
      }}
    >
      <p>
        <strong>{what}</strong>
      </p>
      <p>{t("New payments stop going there at once, and go to the next partner if there is one. Payments it already has are still checked with it. Switching it back on needs two people.")}</p>
      <TextArea label="Why" value={reason} onChange={setReason} min={STOP_REASON_MIN} max={REASON_MAX} />
    </ConfirmWithPin>
  );
}

const STATUS_LABEL: Record<PartnerChange["status"], string> = {
  approved: "Approved",
  pending: "Waiting",
  cancelled: "Cancelled",
  expired: "Expired",
  stale: "Out of date",
};

function History({ names }: { names: Record<string, string> }) {
  const t = useT();
  const { data, error, loading } = useLoad(() => paymentPartnerHistory(1), []);
  const rows = data?.changes ?? [];
  const people = data?.people ?? {};
  return (
    <>
      <LoadState loading={loading && !data} error={error} empty={!rows.length} />
      {rows.map((change) => (
        <div key={change.id} className="card panel">
          <div className="panel-head">
            <h2 className="small-title">{when(change.createdAt)}</h2>
            {change.stop ? (
              <Badge tone="danger">{t("Switched off by one person")}</Badge>
            ) : (
              <Badge tone={change.status === "approved" ? "ok" : change.status === "pending" ? "warn" : "plain"}>{t(STATUS_LABEL[change.status])}</Badge>
            )}
          </div>
          <Diff change={change} names={names} />
          <p className="small">
            <strong>{t("Why:")}</strong> {change.reason}
          </p>
          <p className="muted small">
            {change.stop
              ? t("By {name}", { name: personLabel(people[change.requestedBy ?? ""]) })
              : t("Proposed by {name}", { name: personLabel(people[change.requestedBy ?? ""]) })}
            {!change.stop && change.approvedBy && ` · ${t("approved by {name} on {when}", { name: personLabel(people[change.approvedBy]), when: when(change.approvedAt) })}`}
          </p>
        </div>
      ))}
    </>
  );
}

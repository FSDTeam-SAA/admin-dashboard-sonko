import { useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { can } from "../api/staff";
import {
  approveRates,
  cancelRates,
  proposeRates,
  RATE_CURRENCIES,
  rateHistory,
  rateSettings,
  type Person,
  type RateChange,
  type RateCurrency,
  type RateSettings,
} from "../api/admin";
import { ConfirmWithPin } from "../components/ConfirmWithPin";
import { Badge, LoadState, PageHeader, Tabs, TextArea, okLength } from "../components/common";
import { newIdempotencyKey } from "../lib/idempotency";
import { personLabel, when } from "../lib/format";
import { buildRateChange, examples, gmdPerEur, label, NAMES, sentence, toRatesForm, type RatesForm } from "../lib/ratesForm";
import { useLoad } from "../lib/useLoad";
import { useT } from "../i18n/language";
import { tp } from "../i18n/patterns";

const REASON_MIN = 10;
const REASON_MAX = 500;

function feeText(bps: number) {
  return `${bps / 100}%`;
}

/** Before and after, in plain words, for a waiting or past change. */
function RateDiff({ change }: { change: RateChange }) {
  const t = useT();
  const rows: { what: string; before: string; after: string }[] = [];
  for (const code of RATE_CURRENCIES) {
    if (change.before.ratesFromGmd?.[code] !== change.after.ratesFromGmd?.[code]) {
      rows.push({ what: NAMES[code], before: sentence(code, change.before.ratesFromGmd[code]), after: sentence(code, change.after.ratesFromGmd[code]) });
    }
  }
  if (change.before.ratesFromGmd?.XOF !== change.after.ratesFromGmd?.XOF) {
    rows.push({
      what: "Euro (follows the CFA franc)",
      before: `1 EUR = ${gmdPerEur(change.before.ratesFromGmd.XOF).toFixed(2)} GMD`,
      after: `1 EUR = ${gmdPerEur(change.after.ratesFromGmd.XOF).toFixed(2)} GMD`,
    });
  }
  if (change.before.sekPerEur !== change.after.sekPerEur) {
    rows.push({ what: "Swedish krona", before: `1 EUR = ${change.before.sekPerEur} SEK`, after: `1 EUR = ${change.after.sekPerEur} SEK` });
  }
  if (change.before.walletTransferFeeBps !== change.after.walletTransferFeeBps) {
    rows.push({ what: "Wallet transfer fee", before: feeText(change.before.walletTransferFeeBps), after: feeText(change.after.walletTransferFeeBps) });
  }
  if ((change.before.agentBillCommissionBps ?? 0) !== (change.after.agentBillCommissionBps ?? 0)) {
    rows.push({ what: "Agent bill commission", before: feeText(change.before.agentBillCommissionBps ?? 0), after: feeText(change.after.agentBillCommissionBps ?? 0) });
  }
  return (
    <table className="diff">
      <thead>
        <tr>
          <th>{t("What")}</th>
          <th>{t("Now")}</th>
          <th>{t("Proposed")}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.what}>
            <td>{t(r.what)}</td>
            <td>{r.before}</td>
            <td className="changed">{r.after}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ExchangeRatesSection() {
  const t = useT();
  const { staff } = useAuth();
  const [view, setView] = useState<"now" | "history">("now");
  const [open, setOpen] = useState<"propose" | "approve" | "cancel" | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const { data, error, loading, reload } = useLoad(() => rateSettings(), []);
  const settings = data?.settings;
  const pending = data?.pendingChange ?? null;
  const people = data?.people ?? {};
  const mine = pending?.requestedBy === staff?._id;
  const senior = can(staff, "manage_rates");

  const finish = (message: string) => {
    setOpen(null);
    setDone(message);
    reload();
  };

  return (
    <section>
      <PageHeader title="Exchange rates and transfer fee" intro="What customers get when money changes currency, and the fee on wallet transfers. No live feed: these are the rates." />
      <Tabs
        value={view}
        options={[
          ["now", "In force now"],
          ["history", "History"],
        ] as const}
        onChange={setView}
      />
      {done && <p className="notice">{t(done)}</p>}
      {view === "now" && (
        <>
          <LoadState loading={loading && !data} error={error} empty={false} />
          {settings && pending && (
            <div className="card panel">
              <div className="panel-head">
                <h2>{t("A change is waiting for approval")}</h2>
                <Badge tone="warn">{t("Expires {when}", { when: when(pending.expiresAt) })}</Badge>
              </div>
              <RateDiff change={pending} />
              <p className="small">
                <strong>{t("Why:")}</strong> {pending.reason}
              </p>
              <p className="muted small">
                {t("Proposed by {name} on {when}", { name: mine ? t("you") : personLabel(people[pending.requestedBy ?? ""]), when: when(pending.createdAt) })}
              </p>
              <div className="row-end">
                {senior && <button onClick={() => setOpen("cancel")}>{t("Cancel change")}</button>}
                {senior && !mine && (
                  <button className="primary" onClick={() => setOpen("approve")}>
                    {t("Approve change")}
                  </button>
                )}
                {mine && <Badge tone="plain">{t("A different person must approve")}</Badge>}
              </div>
            </div>
          )}
          {settings && (
            <div className="card panel">
              <div className="panel-head">
                <h2>{t("In force (version {n})", { n: settings.version })}</h2>
                {senior && !pending && (
                  <button className="primary" onClick={() => setOpen("propose")}>
                    {t("Propose a change")}
                  </button>
                )}
              </div>
              <dl className="facts wide">
                {RATE_CURRENCIES.map((code) => (
                  <Row key={code} label={NAMES[code]} value={sentence(code, settings.ratesFromGmd[code])} />
                ))}
                <Row label="Euro" value={`1 EUR = ${gmdPerEur(settings.ratesFromGmd.XOF).toFixed(2)} GMD (follows the CFA franc, which is fixed at 655.957 per euro)`} />
                <Row label="Swedish krona" value={`1 EUR = ${settings.sekPerEur} SEK`} />
                <Row label="Wallet transfer fee" value={feeText(settings.walletTransferFeeBps)} />
                <Row label="Agent bill commission" value={`${feeText(settings.agentBillCommissionBps ?? 0)} ${t("of each bill an agent pays for a customer, paid with the weekly commission")}`} />
              </dl>
            </div>
          )}
        </>
      )}
      {view === "history" && <History />}

      {open === "propose" && settings && <Propose settings={settings} onClose={() => setOpen(null)} onDone={() => finish("Change proposed. A different senior staff member must approve it within 24 hours.")} />}
      {open === "approve" && pending && <Approve change={pending} people={people} onClose={() => setOpen(null)} onDone={() => finish("Approved. The new rates are in force now.")} />}
      {open === "cancel" && pending && <Cancel change={pending} onClose={() => setOpen(null)} onDone={() => finish("Change cancelled. Nothing changed.")} />}
    </section>
  );
}

function Row({ label: text, value }: { label: string; value: string }) {
  return (
    <>
      <dt>{text}</dt>
      <dd>{value}</dd>
    </>
  );
}

function Propose({ settings, onDone, onClose }: { settings: RateSettings; onDone: () => void; onClose: () => void }) {
  const t = useT();
  const original = useMemo(() => toRatesForm(settings), [settings]);
  const [form, setForm] = useState<RatesForm>(original);
  const [reason, setReason] = useState("");
  const key = useMemo(newIdempotencyKey, []);
  const built = buildRateChange(original, form, settings);
  const changed = Object.keys(built.change).length > 0;
  const lines = examples(built.change, settings);
  const setRate = (code: RateCurrency, value: string) => setForm((f) => ({ ...f, rates: { ...f.rates, [code]: value } }));

  return (
    <ConfirmWithPin
      title="Propose new rates"
      confirmLabel="Propose"
      canConfirm={changed && !built.errors.length && okLength(reason, REASON_MIN, REASON_MAX)}
      onClose={onClose}
      onConfirm={async (pin) => {
        await proposeRates({ version: settings.version, change: built.change, reason: reason.trim(), pin }, key);
        onDone();
      }}
    >
      <p className="hint">{t("Change only what moved. A different senior staff member must approve within 24 hours.")}</p>
      <div className="form-grid">
        {RATE_CURRENCIES.map((code) => (
          <label key={code}>
            {t(NAMES[code])}: {label(code)}
            <input inputMode="decimal" value={form.rates[code]} onChange={(e) => setRate(code, e.target.value)} />
          </label>
        ))}
        <label>
          {t("Swedish krona: 1 EUR = … SEK")}
          <input inputMode="decimal" value={form.sekPerEur} onChange={(e) => setForm((f) => ({ ...f, sekPerEur: e.target.value }))} />
        </label>
        <label>
          {t("Wallet transfer fee (%)")}
          <input inputMode="decimal" value={form.feePercent} onChange={(e) => setForm((f) => ({ ...f, feePercent: e.target.value }))} />
        </label>
        <label>
          {t("Agent bill commission (%)")}
          <input inputMode="decimal" value={form.billCommissionPercent} onChange={(e) => setForm((f) => ({ ...f, billCommissionPercent: e.target.value }))} />
        </label>
      </div>
      <p className="hint">{t("The euro is not set here: it follows the CFA franc, which is fixed at 655.957 per euro.")}</p>
      {built.errors.length > 0 && <p className="error">{built.errors.map((e) => tp(t, e)).join(". ")}.</p>}
      {lines.length > 0 && (
        <div className="notice">
          <strong>{t("Check:")}</strong>
          <ul className="flat">
            {lines.map((line) => (
              <li key={line}>{tp(t, line)}</li>
            ))}
          </ul>
          {built.warnings.length > 0 && <p className="small warn-text">{built.warnings.map((w) => tp(t, w)).join(". ")}. {t("Make sure that is right.")}</p>}
        </div>
      )}
      <TextArea label="Why" value={reason} onChange={setReason} min={REASON_MIN} max={REASON_MAX} />
    </ConfirmWithPin>
  );
}

function Approve({ change, people, onDone, onClose }: { change: RateChange; people: Record<string, Person>; onDone: () => void; onClose: () => void }) {
  const t = useT();
  const key = useMemo(newIdempotencyKey, []);
  return (
    <ConfirmWithPin
      title="Approve new rates"
      confirmLabel="Approve"
      onClose={onClose}
      onConfirm={async (pin) => {
        await approveRates(change.id, pin, key);
        onDone();
      }}
    >
      <RateDiff change={change} />
      <p className="small">
        <strong>{t("Why:")}</strong> {change.reason} — {personLabel(people[change.requestedBy ?? ""])}
      </p>
      <p className="hint">{t("Every transfer uses the new rates the moment you approve. Check each one.")}</p>
    </ConfirmWithPin>
  );
}

function Cancel({ change, onDone, onClose }: { change: RateChange; onDone: () => void; onClose: () => void }) {
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
        await cancelRates(change.id, reason.trim());
        onDone();
      }}
    >
      <p>{t("Nothing will change.")}</p>
      <TextArea label="Why" value={reason} onChange={setReason} min={5} max={500} />
    </ConfirmWithPin>
  );
}

const STATUS_LABEL: Record<RateChange["status"], string> = {
  approved: "Approved",
  pending: "Waiting",
  cancelled: "Cancelled",
  expired: "Expired",
  stale: "Out of date",
};

function History() {
  const t = useT();
  const [page, setPage] = useState(1);
  const { data, error, loading } = useLoad(() => rateHistory(page), [page]);
  const rows = data?.changes ?? [];
  const people = data?.people ?? {};
  const pages = data ? Math.ceil(data.total / data.limit) : 1;
  return (
    <>
      <LoadState loading={loading && !data} error={error} empty={!rows.length} />
      {rows.map((change) => (
        <div key={change.id} className="card panel">
          <div className="panel-head">
            <h2 className="small-title">{when(change.createdAt)}</h2>
            <Badge tone={change.status === "approved" ? "ok" : change.status === "pending" ? "warn" : "plain"}>{t(STATUS_LABEL[change.status])}</Badge>
          </div>
          <RateDiff change={change} />
          <p className="small">
            <strong>{t("Why:")}</strong> {change.reason}
          </p>
          <p className="muted small">
            {t("Proposed by {name}", { name: personLabel(people[change.requestedBy ?? ""]) })}
            {change.approvedBy && ` · ${t("approved by {name} on {when}", { name: personLabel(people[change.approvedBy]), when: when(change.approvedAt) })}`}
            {change.cancelledBy && ` · ${t("cancelled by {name}", { name: personLabel(people[change.cancelledBy]) })}${change.cancelReason ? `: ${change.cancelReason}` : ""}`}
          </p>
        </div>
      ))}
      {pages > 1 && (
        <div className="pager">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
            {t("Previous")}
          </button>
          <span className="muted">
            {t("Page {page} of {pages}", { page, pages })}
          </span>
          <button disabled={page >= pages} onClick={() => setPage(page + 1)}>
            {t("Next")}
          </button>
        </div>
      )}
    </>
  );
}

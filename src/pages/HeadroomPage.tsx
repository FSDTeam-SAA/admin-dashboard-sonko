import { useMemo, useState } from "react";
import { cancelHeadroomCountriesChange, changeHeadroomCountries, headroom, type HeadroomLevel } from "../api/admin";
import { can } from "../api/staff";
import { useAuth } from "../auth/AuthContext";
import { Badge, LoadState, PageHeader, TextArea, okLength } from "../components/common";
import { ConfirmWithPin } from "../components/ConfirmWithPin";
import { money, when } from "../lib/format";
import { newIdempotencyKey } from "../lib/idempotency";
import { useLoad } from "../lib/useLoad";
import { getLanguage, useT } from "../i18n/language";

const LEVEL_LABEL: Record<HeadroomLevel, string> = { ok: "Plenty of room", warning: "Getting close", alert: "Very close to the limit" };
const LEVEL_TONE: Record<HeadroomLevel, "ok" | "warn" | "danger"> = { ok: "ok", warning: "warn", alert: "danger" };
// The kinds of payment the server counts, in words a person reads.
const KIND_LABEL: Record<string, string> = {
  "send-money": "money sent to people",
  bank: "bank transfers",
  "top-up": "phone top-ups",
  airtime: "phone top-ups",
  bill: "bills",
  "cash-out": "cash out at an agent",
};

/** "12.3%", or "less than 0.1%" for a tiny share, so a small number never looks like zero. */
export function percent(ratio: number, t: (text: string) => string): string {
  if (!Number.isFinite(ratio) || ratio <= 0) return "0%";
  if (ratio < 0.001) return t("less than 0.1%");
  return `${(ratio * 100).toFixed(1)}%`;
}

/** A country's name in the staff member's language; the code if the browser doesn't know it. */
export function countryName(code: string, t: (text: string) => string): string {
  if (code === "??") return t("Not known");
  try {
    return new Intl.DisplayNames([getLanguage() === "fr" ? "fr" : "en"], { type: "region" }).of(code) || code;
  } catch {
    return code;
  }
}

/** What the person typed ("sn, gm") as a list of two-letter codes, or null if any is not one. */
export function parseCountries(text: string): string[] | null {
  const parts = text
    .split(/[\s,;]+/)
    .map((p) => p.trim().toUpperCase())
    .filter(Boolean);
  if (parts.some((p) => !/^[A-Z]{2}$/.test(p) || p === "??")) return null;
  return [...new Set(parts)].sort();
}

function Gauge({ ratio, level, limit }: { ratio: number; level: HeadroomLevel; limit: number }) {
  const t = useT();
  const width = Math.min(Math.max(ratio, 0), 1) * 100;
  return (
    <>
      <div className="gauge-track" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(width)} aria-label={t("Share of the limit used")}>
        <span className={`gauge-fill ${level}`} style={{ width: `${width}%` }} />
      </div>
      <div className="gauge-scale">
        <span>{percent(ratio, t)} {t("of the limit")}</span>
        <span>{t("Limit")} {money(limit, "EUR")}</span>
      </div>
    </>
  );
}

/** How close Sunu Pay is to the two limits of a UK small e-money institution. Read only, except the two-person country list. */
export function HeadroomPage() {
  const { staff } = useAuth();
  const t = useT();
  const { data, error, loading, reload } = useLoad(() => headroom(), []);
  const [changing, setChanging] = useState<"new" | "approve" | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const manages = can(staff, "manage_headroom");
  const finish = (message: string) => {
    setDone(message);
    reload();
  };

  return (
    <section>
      <PageHeader
        title="Regulatory headroom"
        intro="How close Sunu Pay is to the two limits of a UK small e-money institution. This is a gauge, not legal advice: ask your compliance adviser which payments count."
      />
      {done && <p className="notice">{t(done)}</p>}
      <LoadState loading={loading && !data} error={error} empty={false} />
      {data && (
        <>
          <article className="card" style={{ padding: 16, marginBottom: 12 }}>
            <p>
              <Badge tone={LEVEL_TONE[data.level]}>{LEVEL_LABEL[data.level]}</Badge> <span className="muted small">{t("Worked out {when}", { when: when(data.asAt) })}</span>
            </p>
            <p className="hint">{t("Amounts are shown in euro at Sunu Pay's own exchange rates, the ones set in the panel. The figures are kept for one minute.")}</p>
            <button onClick={reload}>{t("Check again")}</button>
          </article>

          <article className="card" style={{ padding: 16, marginBottom: 12 }}>
            <h3>{t("Money held for customers")}</h3>
            <p>
              <Badge tone={LEVEL_TONE[data.emoney.level]}>{LEVEL_LABEL[data.emoney.level]}</Badge>
            </p>
            <Gauge ratio={data.emoney.ratio} level={data.emoney.level} limit={data.emoney.limitEurMinor} />
            <dl className="facts">
              <dt>{t("Average over the last six months")}</dt>
              <dd>{money(data.emoney.averageEurMinor, "EUR")}</dd>
              <dt>{t("Held today")}</dt>
              <dd>{money(data.emoney.currentEurMinor, "EUR")}</dd>
              <dt>{t("Highest day")}</dt>
              <dd>{data.emoney.highestDay.day ? `${money(data.emoney.highestDay.eurMinor, "EUR")} · ${data.emoney.highestDay.day}` : "—"}</dd>
            </dl>
            <p className="hint">{t("The rule looks at the amount owed to customers at the end of each day, averaged over the last six calendar months. The limit is 5,000,000 euro.")}</p>
            {data.emoney.currencies.length > 0 && (
              <table>
                <thead>
                  <tr>
                    <th>{t("Currency")}</th>
                    <th>{t("Held today")}</th>
                    <th>{t("In euro")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.emoney.currencies.map((c) => (
                    <tr key={c.currency}>
                      <td>{c.currency}</td>
                      <td>{money(c.minor, c.currency)}</td>
                      <td>{money(c.eurMinor, "EUR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {data.emoney.unpricedCurrencies.length > 0 && (
              <p className="error">{t("These currencies have no exchange rate, so they are not in the figures above: {list}. Ask the developer.", { list: data.emoney.unpricedCurrencies.join(", ") })}</p>
            )}
          </article>

          <article className="card" style={{ padding: 16, marginBottom: 12 }}>
            <h3>{t("Payments each month")}</h3>
            <p>
              <Badge tone={LEVEL_TONE[data.payments.level]}>{LEVEL_LABEL[data.payments.level]}</Badge>
            </p>
            <Gauge ratio={data.payments.ratio} level={data.payments.level} limit={data.payments.limitEurMinor} />
            <dl className="facts">
              <dt>{t("Average a month, over {n} months", { n: data.payments.activeMonths })}</dt>
              <dd>{money(data.payments.averageEurMinor, "EUR")}</dd>
              {(data.payments.leftOut.length > 0 || (data.payments.noUkEnd?.count ?? 0) > 0) && (
                <>
                  <dt>{t("The same with nothing left out")}</dt>
                  <dd>{money(data.payments.averageIfNothingLeftOutEurMinor, "EUR")}</dd>
                </>
              )}
              <dt>{t("Highest month")}</dt>
              <dd>{data.payments.highestMonth.month ? `${money(data.payments.highestMonth.eurMinor, "EUR")} · ${data.payments.highestMonth.month}` : "—"}</dd>
            </dl>
            {(data.payments.noUkEnd?.count ?? 0) > 0 && (
              <p className="notice">
                {t("Left out because neither end is in the UK: {n} payments, {amount} over 12 months.", { n: data.payments.noUkEnd?.count ?? 0, amount: money(data.payments.noUkEnd?.eurMinor ?? 0, "EUR") })}
              </p>
            )}
            <p className="hint">
              {t("Payments where the sender's country and the country the money went to are both outside the UK are not counted. This is the owner's decision and has not yet been confirmed by the compliance adviser: the FCA covers payment services provided from the UK, including payments with one end abroad. If either country is not known, the payment is counted.")}
            </p>
            <p className="hint">
              {t("The rule looks at the monthly average of payments over 12 months. The limit is 3,000,000 euro a month. The average runs from the first month with payments, so a new business is not flattered by empty months. A month still in progress is counted as it stands.")}
            </p>
            <p className="hint">{t("What counts here: successful payments of these kinds: {kinds}. Money put into a wallet is not counted.", { kinds: [...new Set(data.countedTypes.map((k) => t(KIND_LABEL[k] ?? k)))].join(", ") })}</p>
            <table>
              <thead>
                <tr>
                  <th>{t("Month")}</th>
                  <th>{t("Payments")}</th>
                  <th>{t("Counted")}</th>
                  {(data.payments.leftOut.length > 0 || (data.payments.noUkEnd?.count ?? 0) > 0) && <th>{t("With nothing left out")}</th>}
                </tr>
              </thead>
              <tbody>
                {data.payments.months.map((m) => (
                  <tr key={m.month}>
                    <td>{m.month}</td>
                    <td>{m.count}</td>
                    <td>{money(m.eurMinor, "EUR")}</td>
                    {(data.payments.leftOut.length > 0 || (data.payments.noUkEnd?.count ?? 0) > 0) && <td>{money(m.allEurMinor, "EUR")}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
            {data.payments.unpricedPayments > 0 && (
              <p className="error">{t("{n} payments are in a currency with no exchange rate, so they are not in these figures. Ask the developer.", { n: data.payments.unpricedPayments })}</p>
            )}
          </article>

          <article className="card" style={{ padding: 16, marginBottom: 12 }}>
            <h3>{t("By country, last 12 months")}</h3>
            <p className="hint">{t("The country the money went to. Payments with no country saved show as Not known.")}</p>
            {data.payments.countries.length === 0 ? (
              <p className="muted">{t("No payments yet.")}</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>{t("Country")}</th>
                    <th>{t("Payments")}</th>
                    <th>{t("Total in euro")}</th>
                    <th>{t("Counted?")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.payments.countries.map((c) => (
                    <tr key={c.country}>
                      <td>{countryName(c.country, t)}</td>
                      <td>{c.count}</td>
                      <td>{money(c.eurMinor, "EUR")}</td>
                      <td>
                        {c.excluded ? <Badge tone="warn">Left out</Badge> : <Badge tone="plain">Counted</Badge>}
                        {!c.excluded && (c.noUkEndCount ?? 0) > 0 && (
                          <span className="muted small"> {t("{amount} left out (no UK end)", { amount: money(c.noUkEndEurMinor ?? 0, "EUR") })}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </article>

          <article className="card" style={{ padding: 16, marginBottom: 12 }}>
            <h3>{t("Countries left out of the count")}</h3>
            <p>
              {data.settings.excludedCountries.length === 0
                ? t("None. Every country is counted. This is the safe setting.")
                : data.settings.excludedCountries.map((c) => `${countryName(c, t)} (${c})`).join(", ")}
            </p>
            <p className="hint">
              {t("Only leave a country out if your compliance adviser or lawyer has told you its payments do not count towards the UK limits, for example because the payments are made by a separate licensed company there. If in doubt, count everything.")}
            </p>
            {data.settings.pending && (
              <div className="notice">
                <p>
                  {t("Waiting for a second person: change the list to {list}, asked {when} by {name}. Reason: {reason}", {
                    list: data.settings.pending.countries.length ? data.settings.pending.countries.join(", ") : t("none"),
                    when: when(data.settings.pending.at),
                    name: data.settings.pending.by,
                    reason: data.settings.pending.reason,
                  })}
                </p>
                {manages && (
                  <p>
                    {data.settings.pending.byId !== staff?._id && <button onClick={() => setChanging("approve")}>{t("Approve")}</button>}{" "}
                    <button onClick={() => setWithdrawing(true)}>{t("Withdraw")}</button>
                  </p>
                )}
                {manages && data.settings.pending.byId === staff?._id && <p className="muted small">{t("You asked for this, so a different staff member must approve it.")}</p>}
              </div>
            )}
            {manages && <button onClick={() => setChanging("new")}>{t("Change the list")}</button>}
            {data.settings.changes.length > 0 && (
              <>
                <h4>{t("Changes")}</h4>
                <ul className="plain-list">
                  {data.settings.changes.map((c) => (
                    <li key={c.at} className="small">
                      {t("{when}: {from} → {to}. Asked by {by}: {reason}. Approved by {approver}.", {
                        when: when(c.at),
                        from: c.from.length ? c.from.join(", ") : t("none"),
                        to: c.to.length ? c.to.join(", ") : t("none"),
                        by: c.by,
                        reason: c.reason,
                        approver: c.approvedBy,
                      })}
                      {c.approveReason ? ` ${t("Their reason")}: ${c.approveReason}` : ""}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </article>
        </>
      )}
      {changing && data && (
        <CountriesDialog
          current={data.settings.excludedCountries}
          approve={changing === "approve" && data.settings.pending ? data.settings.pending.countries : undefined}
          onClose={() => setChanging(null)}
          onDone={(message) => {
            setChanging(null);
            finish(message);
          }}
        />
      )}
      {withdrawing && (
        <ConfirmWithPin
          title="Withdraw the waiting change"
          confirmLabel="Withdraw"
          needsPin={false}
          onClose={() => setWithdrawing(false)}
          onConfirm={async () => {
            await cancelHeadroomCountriesChange();
            setWithdrawing(false);
            finish("Request withdrawn. The list stays as it is.");
          }}
        >
          <p>{t("The list stays as it is.")}</p>
        </ConfirmWithPin>
      )}
    </section>
  );
}

function CountriesDialog({ current, approve, onClose, onDone }: { current: string[]; approve?: string[]; onClose: () => void; onDone: (message: string) => void }) {
  const t = useT();
  const approving = approve !== undefined;
  const [text, setText] = useState((approve ?? current).join(", "));
  const [reason, setReason] = useState("");
  const key = useMemo(newIdempotencyKey, []);
  const countries = parseCountries(text);
  const same = countries !== null && JSON.stringify(countries) === JSON.stringify([...current].sort());
  return (
    <ConfirmWithPin
      title={approving ? "Approve the new list" : "Change the list of countries left out"}
      confirmLabel={approving ? "Approve" : "Ask for the change"}
      canConfirm={countries !== null && !same && okLength(reason, 10, 300)}
      onClose={onClose}
      onConfirm={async (pin) => {
        const result = await changeHeadroomCountries(countries ?? [], reason.trim(), pin, key);
        onDone(result.asked ? "Asked. A different staff member must approve the same list within 24 hours." : "List changed.");
      }}
    >
      <p>{t("This only changes what this page counts. It does not change what the regulator counts, and it does not stop or allow any payment.")}</p>
      {!approving && <p>{t("Two people: you ask, then a different staff member approves the same list within 24 hours. Until then nothing changes.")}</p>}
      <label>
        {t("Countries to leave out, as two-letter codes (for example SN). Leave empty to count every country.")}
        <input type="text" value={text} readOnly={approving} maxLength={200} onChange={(e) => setText(e.target.value)} />
      </label>
      <p className="hint">{t("The United Kingdom, The Gambia and Senegal cannot be added: payments to or from the UK must count. Payments with no UK end are left out automatically.")}</p>
      {countries === null && <p className="error">{t("Each country must be a two-letter code, such as SN.")}</p>}
      {same && <p className="muted small">{t("That is already the list.")}</p>}
      <TextArea label="Why, and who advised it" value={reason} onChange={setReason} min={10} max={300} />
    </ConfirmWithPin>
  );
}

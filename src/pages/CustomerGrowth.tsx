import { customerGrowth, type CustomerGrowth as Growth } from "../api/admin";
import { LoadState } from "../components/common";
import { when } from "../lib/format";
import { useLoad } from "../lib/useLoad";
import { useT } from "../i18n/language";
import { Bars, monthLabel } from "./AnalyticsPage";

/** "42.5%", or a dash when there is nobody to count from. */
export function rate(n: number | null): string {
  return n === null ? "—" : `${n.toLocaleString("en-GB")}%`;
}

/** Background strength for a retention cell, 0 to 1. Empty cells stay clear. */
export function shade(n: number | null): number {
  if (n === null || n <= 0) return 0;
  return Math.min(1, Math.max(0.08, n / 100));
}

/** Share of `whole`, one decimal, or null when `whole` is 0. Same as the server. */
export function share(part: number, whole: number): number | null {
  return whole ? Math.round((part / whole) * 1000) / 10 : null;
}

export function funnelRows(g: Growth) {
  const f = g.funnel;
  return [
    { label: "Signed up", value: f.signedUp, note: `${f.signedUp}` },
    { label: "Confirmed their phone", value: f.phoneVerified, note: `${f.phoneVerified} · ${rate(f.rates.phoneVerified)}` },
    { label: "Passed the ID check", value: f.idChecked, note: `${f.idChecked} · ${rate(f.rates.idChecked)}` },
    { label: "Made a first payment", value: f.paid, note: `${f.paid} · ${rate(f.rates.paid)}` },
    { label: "Paid again (2 or more payments)", value: f.repeat, note: `${f.repeat} · ${rate(share(f.repeat, f.signedUp))}` },
  ];
}

/** Sign-up to payment, and who keeps paying. Counts only, no personal details. */
export function CustomerGrowthSection() {
  const t = useT();
  const { data, error, loading } = useLoad(customerGrowth, []);
  if (!data) return <LoadState loading={loading} error={error} empty={false} />;
  const r = data.retention;
  const f = data.funnel;
  const cols = Array.from({ length: data.retentionMonths + 1 }, (_, k) => k);
  return (
    <>
      <h2>{t("Customers: from sign-up to paying, and who comes back")}</h2>
      <div className="grid stats">
        <div className="card tile">
          <span className="muted">{t("Sign-ups who made a payment")}</span>
          <strong className="big">{rate(f.rates.paid)}</strong>
          <span className="muted small">{t("Last 12 months")}</span>
        </div>
        <div className="card tile">
          <span className="muted">{t("Usual time to first payment")}</span>
          <strong className="big">{f.medianDaysToFirstPayment === null ? "—" : t("{n} days", { n: f.medianDaysToFirstPayment })}</strong>
          <span className="muted small">{t("Half are quicker, half slower")}</span>
        </div>
        <div className="card tile">
          <span className="muted">{t("Kept from last month")}</span>
          <strong className="big">{rate(r.keptRate)}</strong>
          <span className="muted small">{t("{kept} of {last} who paid in {month}", { kept: r.kept, last: r.activeLastMonth, month: monthLabel(r.lastMonth) })}</span>
        </div>
        <div className="card tile">
          <span className="muted">{t("Paid more than once")}</span>
          <strong className="big">{rate(r.repeatRate)}</strong>
          <span className="muted small">{t("{n} of {all} who ever paid", { n: r.repeatCustomers, all: r.everPaid })}</span>
        </div>
        <div className="card tile">
          <span className="muted">{t("Gone quiet")}</span>
          <strong className="big">{r.dormant.toLocaleString("en-GB")}</strong>
          <span className="muted small">{t("Paid before, nothing in {n} days", { n: r.dormantDays })}</span>
        </div>
      </div>

      <div className="card panel">
        <h2>{t("Sign-up to payment, last 12 months")}</h2>
        <Bars rows={funnelRows(data)} />
        <p className="hint">{t("Each step shows how many of the people who signed up got that far. Where most people stop is where to look first.")}</p>
      </div>

      <div className="card panel">
        <h2>{t("By sign-up month")}</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("Signed up in")}</th>
                <th>{t("Signed up")}</th>
                <th>{t("Phone confirmed")}</th>
                <th>{t("ID checked")}</th>
                <th>{t("Paid")}</th>
                <th>{t("Paid within 7 days")}</th>
                <th>{t("Paid again")}</th>
              </tr>
            </thead>
            <tbody>
              {[...data.cohorts].reverse().map((c) => (
                <tr key={c.month}>
                  <td>{monthLabel(c.month)}</td>
                  <td className="num">{c.signedUp}</td>
                  <td className="num">{rate(c.rates.phoneVerified)}</td>
                  <td className="num">{rate(c.rates.idChecked)}</td>
                  <td className="num">{rate(c.rates.paid)}</td>
                  <td className="num">{rate(c.rates.paidWithin7Days)}</td>
                  <td className="num">{rate(c.rates.repeat)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="hint">{t("“Paid again” is out of those who paid, not out of everyone who signed up.")}</p>
      </div>

      <div className="card panel">
        <h2>{t("Who keeps paying, by sign-up month")}</h2>
        <div className="table-wrap">
          <table className="mini">
            <thead>
              <tr>
                <th>{t("Signed up in")}</th>
                {cols.map((k) => (
                  <th key={k}>{k === 0 ? t("Same month") : t("Month {n}", { n: k })}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...data.cohorts].reverse().map((c) => (
                <tr key={c.month}>
                  <td>
                    {monthLabel(c.month)} <span className="muted small">({c.signedUp})</span>
                  </td>
                  {cols.map((k) => {
                    const v = c.retention[k] ?? null;
                    return (
                      <td key={k} className="num" style={{ background: `color-mix(in srgb, var(--primary) ${Math.round(shade(v) * 45)}%, transparent)` }}>
                        {rate(v)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="hint">
          {t("Each cell is the share of that month’s sign-ups who made a payment in that month after signing up. A dash means the month has not come yet. This month is still running, so its figures will rise.")}
        </p>
        <p className="muted small">{t("Worked out {when}. Updated at most every 10 minutes.", { when: when(data.workedOutAt) })}</p>
      </div>
    </>
  );
}

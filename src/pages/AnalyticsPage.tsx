import { analytics } from "../api/admin";
import { LoadState, PageHeader } from "../components/common";
import { money } from "../lib/format";
import { useLoad } from "../lib/useLoad";
import { TYPE_LABEL } from "./CustomersPage";

/** "2026-11" as "Nov 2026". */
export function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  if (!year || !month) return key;
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
}

/** A horizontal bar for each row, drawn as wide as its share of the biggest. */
export function Bars({ rows }: { rows: { label: string; value: number; note?: string }[] }) {
  const biggest = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="bars">
      {rows.map((r) => (
        <li key={r.label}>
          <span className="bar-label">{r.label}</span>
          <span className="bar-track" aria-hidden>
            <span className="bar-fill" style={{ width: r.value > 0 ? `${Math.max(1, Math.round((r.value / biggest) * 100))}%` : 0 }} />
          </span>
          <span className="bar-value">{r.note ?? r.value}</span>
        </li>
      ))}
    </ul>
  );
}

export function AnalyticsPage() {
  const { data, error, loading } = useLoad(analytics, []);
  if (!data) return <LoadState loading={loading} error={error} empty={false} />;

  const currencies = [...new Set(data.months.flatMap((m) => m.volume.map((v) => v.currency)))].sort();
  const latest = data.months[data.months.length - 1];
  const previous = data.months[data.months.length - 2];

  return (
    <section>
      <PageHeader title="Analytics" intro="How the business is doing. Counts only, with no personal details. Ticket figures are on the Tickets page." />
      <div className="grid stats">
        <div className="card tile">
          <span className="muted">Customers</span>
          <strong className="big">{data.totals.customers.toLocaleString("en-GB")}</strong>
        </div>
        <div className="card tile">
          <span className="muted">Agents</span>
          <strong className="big">{data.totals.agents.toLocaleString("en-GB")}</strong>
        </div>
        <div className="card tile">
          <span className="muted">Active in the last 30 days</span>
          <strong className="big">{data.activeCustomersLast30Days.toLocaleString("en-GB")}</strong>
          <span className="muted small">People who spent money</span>
        </div>
        <div className="card tile">
          <span className="muted">New sign-ups this month</span>
          <strong className="big">{latest?.signups ?? 0}</strong>
          {previous && <span className="muted small">{previous.signups} last month</span>}
        </div>
      </div>

      <div className="card panel">
        <h2>Sign-ups by month</h2>
        <Bars rows={data.months.map((m) => ({ label: monthLabel(m.month), value: m.signups }))} />
      </div>

      {currencies.map((currency) => (
        <div className="card panel" key={currency}>
          <h2>Money spent by customers, {currency}</h2>
          <Bars
            rows={data.months.map((m) => {
              const row = m.volume.find((v) => v.currency === currency);
              return { label: monthLabel(m.month), value: row?.amountMinor ?? 0, note: row ? `${money(row.amountMinor, currency)} · ${row.count}` : "—" };
            })}
          />
        </div>
      ))}
      {!currencies.length && <p className="muted">No spending to show yet.</p>}

      <div className="card panel">
        <h2>Most and least used, last 90 days</h2>
        {data.usageLast90Days.length ? (
          <>
            <Bars rows={data.usageLast90Days.map((u) => ({ label: TYPE_LABEL[u.type] ?? u.type, value: u.count }))} />
            <p className="hint">Most used at the top, least used at the bottom.</p>
          </>
        ) : (
          <p className="muted">Nothing yet.</p>
        )}
      </div>
      <p className="hint">Revenue (the fees Sunu Pay keeps) is not here yet. It needs its own report from the ledger.</p>
    </section>
  );
}

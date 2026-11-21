import { getLanguage, useT } from "../i18n/language";
import { analytics, type Revenue } from "../api/admin";
import { LoadState, PageHeader } from "../components/common";
import { money } from "../lib/format";
import { useLoad } from "../lib/useLoad";
import { TYPE_LABEL } from "./CustomersPage";
import { CustomerGrowthSection } from "./CustomerGrowth";
import { PlacesSection } from "./PlacesSection";

/** "2026-11" as "Nov 2026". */
export function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  if (!year || !month) return key;
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString(getLanguage() === "fr" ? "fr-FR" : "en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
}

/** A horizontal bar for each row, drawn as wide as its share of the biggest. */
export function Bars({ rows }: { rows: { label: string; value: number; note?: string }[] }) {
  const t = useT();
  const biggest = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="bars">
      {rows.map((r) => (
        <li key={r.label}>
          <span className="bar-label">{t(r.label)}</span>
          <span className="bar-track" aria-hidden>
            <span className="bar-fill" style={{ width: r.value > 0 ? `${Math.max(1, Math.round((r.value / biggest) * 100))}%` : 0 }} />
          </span>
          <span className="bar-value">{r.note ?? r.value}</span>
        </li>
      ))}
    </ul>
  );
}

/** Where a fee came from, as the server names it. */
export const FEE_SOURCE_LABEL: Record<string, string> = {
  transfers: "Transfers",
  services: "Airtime, bills and other services",
  "cash-out": "Agent cash out",
  refunds: "Refunds (given back)",
  reversals: "Staff reversals (given back)",
  other: "Other",
};

/** One table per currency, newest month first, months with nothing left out. */
export function revenueByCurrency(revenue: Revenue) {
  const currencies = [...new Set(revenue.months.flatMap((m) => m.currencies.map((c) => c.currency)))].sort();
  return currencies.map((currency) => {
    const rows = revenue.months
      .map((m) => ({ month: m.month, cell: m.currencies.find((c) => c.currency === currency) }))
      .filter((r) => r.cell)
      .reverse()
      .map((r) => ({ month: r.month, ...r.cell! }));
    const total = rows.reduce(
      (sum, r) => ({ feesMinor: sum.feesMinor + r.feesMinor, commissionMinor: sum.commissionMinor + r.commissionMinor, netMinor: sum.netMinor + r.netMinor }),
      { feesMinor: 0, commissionMinor: 0, netMinor: 0 },
    );
    const sources = revenue.sourcesLast12Months.filter((s) => s.currency === currency);
    return { currency, rows, total, sources };
  });
}

function RevenueSection({ revenue }: { revenue?: Revenue }) {
  const t = useT();
  if (!revenue) return <p className="hint">{t("Revenue needs the newer server. It shows here once the server is updated.")}</p>;
  const tables = revenueByCurrency(revenue);
  return (
    <>
      <h2>{t("Revenue")}</h2>
      <p className="hint">
        {t("From the books (the ledger). Fees kept are after refunds and reversals. Agent commission is what Sunu Pay owes agents. Any exchange-rate margin is not counted. Currencies are never added together.")}
      </p>
      {tables.length === 0 && <p className="muted">{t("No fees taken yet.")}</p>}
      {tables.map(({ currency, rows, total, sources }) => (
        <div className="card panel" key={currency}>
          <h2>{t("Revenue, {currency}", { currency })}</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("Month")}</th>
                  <th>{t("Fees kept")}</th>
                  <th>{t("Agent commission")}</th>
                  <th>{t("Net")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.month}>
                    <td>{monthLabel(r.month)}</td>
                    <td className="num">{money(r.feesMinor, currency)}</td>
                    <td className="num">{money(r.commissionMinor, currency)}</td>
                    <td className="num">
                      <strong>{money(r.netMinor, currency)}</strong>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td>
                    <strong>{t("Last 12 months")}</strong>
                  </td>
                  <td className="num">{money(total.feesMinor, currency)}</td>
                  <td className="num">{money(total.commissionMinor, currency)}</td>
                  <td className="num">
                    <strong>{money(total.netMinor, currency)}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          {sources.length > 0 && (
            <>
              <h3>{t("Where the fees came from, last 12 months")}</h3>
              <table className="mini">
                <tbody>
                  {sources.map((s) => (
                    <tr key={s.source}>
                      <td>{t(FEE_SOURCE_LABEL[s.source] ?? s.source)}</td>
                      <td className="num">{money(s.amountMinor, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      ))}
    </>
  );
}

export function AnalyticsPage() {
  const t = useT();
  const { data, error, loading } = useLoad(analytics, []);
  if (!data) return <LoadState loading={loading} error={error} empty={false} />;

  const currencies = [...new Set(data.months.flatMap((m) => m.volume.map((v) => v.currency)))].sort();
  const latest = data.months[data.months.length - 1];
  const previous = data.months[data.months.length - 2];

  return (
    <section>
      <PageHeader title="Analytics" intro="How the business is doing: revenue, sign-ups, who pays and who comes back, where the business is, and use. No personal details. Ticket figures are on the Tickets page." />
      <div className="grid stats">
        <div className="card tile">
          <span className="muted">{t("Customers")}</span>
          <strong className="big">{data.totals.customers.toLocaleString("en-GB")}</strong>
        </div>
        <div className="card tile">
          <span className="muted">{t("Agents")}</span>
          <strong className="big">{data.totals.agents.toLocaleString("en-GB")}</strong>
        </div>
        <div className="card tile">
          <span className="muted">{t("Active in the last 30 days")}</span>
          <strong className="big">{data.activeCustomersLast30Days.toLocaleString("en-GB")}</strong>
          <span className="muted small">{t("People who spent money")}</span>
        </div>
        <div className="card tile">
          <span className="muted">{t("New sign-ups this month")}</span>
          <strong className="big">{latest?.signups ?? 0}</strong>
          {previous && <span className="muted small">{t("{n} last month", { n: previous.signups })}</span>}
        </div>
      </div>

      <RevenueSection revenue={data.revenue} />

      <CustomerGrowthSection />

      <PlacesSection />

      <div className="card panel">
        <h2>{t("Sign-ups by month")}</h2>
        <Bars rows={data.months.map((m) => ({ label: monthLabel(m.month), value: m.signups }))} />
      </div>

      {currencies.map((currency) => (
        <div className="card panel" key={currency}>
          <h2>{t("Money spent by customers, {currency}", { currency })}</h2>
          <Bars
            rows={data.months.map((m) => {
              const row = m.volume.find((v) => v.currency === currency);
              return { label: monthLabel(m.month), value: row?.amountMinor ?? 0, note: row ? `${money(row.amountMinor, currency)} · ${row.count}` : "—" };
            })}
          />
        </div>
      ))}
      {!currencies.length && <p className="muted">{t("No spending to show yet.")}</p>}

      <div className="card panel">
        <h2>{t("Most and least used, last 90 days")}</h2>
        {data.usageLast90Days.length ? (
          <>
            <Bars rows={data.usageLast90Days.map((u) => ({ label: TYPE_LABEL[u.type] ?? u.type, value: u.count }))} />
            <p className="hint">{t("Most used at the top, least used at the bottom.")}</p>
          </>
        ) : (
          <p className="muted">{t("Nothing yet.")}</p>
        )}
      </div>
    </section>
  );
}

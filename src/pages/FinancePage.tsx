import { useState } from "react";
import { Link } from "react-router";
import { finance, type Finance } from "../api/admin";
import { Badge, LoadState, PageHeader, Tabs } from "../components/common";
import { money, when } from "../lib/format";
import { useLoad } from "../lib/useLoad";
import { useT } from "../i18n/language";
import { percent } from "./HeadroomPage";

const WAITING: { key: keyof Finance["waiting"]; label: string; path: string }[] = [
  { key: "stuckPayments", label: "Payments pending for over 24 hours", path: "/transactions" },
  { key: "purchasesToCheck", label: "Airtime and bills to check", path: "/bills" },
  { key: "reversalsWaiting", label: "Reversals waiting", path: "/reversals" },
  { key: "payoutsInReview", label: "Agent payouts to review", path: "/payouts" },
  { key: "openCases", label: "Open cases (debts, fraud, safeguarding)", path: "/cases" },
  { key: "lateComplaints", label: "Complaints past a deadline", path: "/complaints" },
];

/** The money picture day by day. Read only. Figures come from the ledger (the books), never from edited records. */
export function FinancePage() {
  const t = useT();
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [fresh, setFresh] = useState(0);
  const { data, error, loading } = useLoad(() => finance(days, fresh > 0), [days, fresh]);
  return (
    <section>
      <PageHeader title="Finance overview" intro="Money in and out of wallets, fees kept, failed payments and whether the books add up. Currencies are never added together." />
      <Tabs
        value={String(days) as "7" | "30" | "90"}
        options={[
          ["7", "Last 7 days"],
          ["30", "Last 30 days"],
          ["90", "Last 90 days"],
        ] as const}
        onChange={(v) => setDays(Number(v) as 7 | 30 | 90)}
      />
      <LoadState loading={loading && !data} error={error} empty={false} />
      {data && (
        <>
          <article className="card panel">
            <h2>{t("Waiting for someone")}</h2>
            <ul className="plain-list">
              {WAITING.filter((w) => data.waiting[w.key] !== undefined).map((w) => (
                <li key={w.key}>
                  <Badge tone={data.waiting[w.key] ? "warn" : "ok"}>{String(data.waiting[w.key])}</Badge> <Link to={w.path}>{t(w.label)}</Link>
                </li>
              ))}
            </ul>
          </article>

          <article className="card panel">
            <h2>{t("Do the books add up?")}</h2>
            <p>
              <Badge tone={data.books.ok ? "ok" : "danger"}>{data.books.ok ? t("Yes") : t("No: look into this today")}</Badge>{" "}
              <span className="muted small">{t("Checked {when}, {n} wallets", { when: when(data.books.checkedAt), n: data.books.walletsChecked })}</span>
            </p>
            {!data.books.ok && (
              <ul>
                <li>{t("Wallets that don't match the ledger: {n}", { n: data.books.mismatches })}</li>
                <li>{t("Postings that don't add up to zero: {n}", { n: data.books.unbalancedPostings })}</li>
                <li>{t("Wallets below zero: {n}", { n: data.books.negativeWallets })}</li>
              </ul>
            )}
            <p className="hint">{t("Every wallet balance is compared with its ledger lines, and every posting must add up to zero. The result is kept for two minutes.")}</p>
            <button onClick={() => setFresh((n) => n + 1)}>{t("Check the books now")}</button>
          </article>

          <article className="card panel">
            <h2>{t("Owed to customers and agents now")}</h2>
            <table>
              <tbody>
                {data.owed.map((o) => (
                  <tr key={o.currency}>
                    <td>{o.currency}</td>
                    <td>{money(o.owedMinor, o.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.safeguarding && (
              <>
                <h3>{t("Last confirmed safeguarding check")}</h3>
                {data.safeguarding.length ? (
                  <table>
                    <thead>
                      <tr>
                        <th>{t("Currency")}</th>
                        <th>{t("As at")}</th>
                        <th>{t("In the bank")}</th>
                        <th>{t("Owed then")}</th>
                        <th>{t("Difference")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.safeguarding.map((g) => (
                        <tr key={g.currency}>
                          <td>{g.currency}</td>
                          <td>{when(g.asAt)}</td>
                          <td>{money(g.bankMinor, g.currency)}</td>
                          <td>{money(g.owedMinor, g.currency)}</td>
                          <td>
                            <Badge tone={g.differenceMinor < 0 ? "danger" : "ok"}>{money(g.differenceMinor, g.currency)}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="muted">{t("No confirmed check yet.")}</p>
                )}
                <Link to="/safeguarding">{t("Open Safeguarding")}</Link>
              </>
            )}
          </article>

          <article className="card panel">
            <h2>{t("Payments")}</h2>
            <dl className="facts">
              <dt>{t("Successful")}</dt>
              <dd>{data.payments.totals.successful}</dd>
              <dt>{t("Failed")}</dt>
              <dd>
                {data.payments.totals.failed} <span className="muted small">({percent(data.payments.failureRate, t)} {t("of finished payments")})</span>
              </dd>
              <dt>{t("Still pending")}</dt>
              <dd>{data.payments.totals.pending}</dd>
            </dl>
          </article>

          {data.money.length === 0 && <p className="muted">{t("No money moved in this period.")}</p>}
          {data.money.map((c) => (
            <article key={c.currency} className="card panel">
              <h2>{c.currency}</h2>
              <dl className="facts">
                <dt>{t("Money in (cards and mobile money)")}</dt>
                <dd>{money(c.totals.inMinor, c.currency)}</dd>
                <dt>{t("Money out (bank, bills, airtime, mobile money)")}</dt>
                <dd>{money(c.totals.outMinor, c.currency)}</dd>
                <dt>{t("Refunded to wallets")}</dt>
                <dd>{money(c.totals.refundsMinor, c.currency)}</dd>
                <dt>{t("Fees kept")}</dt>
                <dd>{money(c.totals.feesMinor, c.currency)}</dd>
                <dt>{t("Agent commission")}</dt>
                <dd>{money(c.totals.commissionMinor, c.currency)}</dd>
                <dt>{t("Invite bonuses")}</dt>
                <dd>{money(c.totals.bonusesMinor ?? 0, c.currency)}</dd>
              </dl>
              <details>
                <summary>{t("Day by day")}</summary>
                <table>
                  <thead>
                    <tr>
                      <th>{t("Day")}</th>
                      <th>{t("In")}</th>
                      <th>{t("Out")}</th>
                      <th>{t("Refunds")}</th>
                      <th>{t("Fees")}</th>
                      <th>{t("Commission")}</th>
                      <th>{t("Bonuses")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...c.days].reverse().map((d) => (
                      <tr key={d.day}>
                        <td>{d.day}</td>
                        <td>{money(d.inMinor, c.currency)}</td>
                        <td>{money(d.outMinor, c.currency)}</td>
                        <td>{money(d.refundsMinor, c.currency)}</td>
                        <td>{money(d.feesMinor, c.currency)}</td>
                        <td>{money(d.commissionMinor, c.currency)}</td>
                        <td>{money(d.bonusesMinor ?? 0, c.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </article>
          ))}
          <p className="hint">{t("Days are UTC. Money sent between two Sunu Pay wallets is not money in or out. The exchange-rate margin is not shown here: it sits inside the currency exchange and needs the day's rate to read.")}</p>
        </>
      )}
    </section>
  );
}

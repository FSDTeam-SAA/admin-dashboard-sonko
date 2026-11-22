import { useMemo, useState } from "react";
import { agentAnalytics, type AgentAnalyticsBucket, type AgentRankRow, type AgentSeriesPoint } from "../api/admin";
import { LoadState, PageHeader, Tabs } from "../components/common";
import { money } from "../lib/format";
import { useLoad } from "../lib/useLoad";
import { useT } from "../i18n/language";

/** Growth against the step before, e.g. "+12%", or "—" when there is nothing to compare. */
export function growth(now: number, before: number): string {
  if (before <= 0) return "—";
  const pct = Math.round(((now - before) / before) * 100);
  return `${pct > 0 ? "+" : ""}${pct}%`;
}

/** Points of one currency, oldest first. */
export function pointsFor(series: AgentSeriesPoint[], currency: string): AgentSeriesPoint[] {
  return series.filter((p) => p.currency === currency).sort((a, b) => (a.label < b.label ? -1 : 1));
}

/** Agent analytics: cash moved over time for all agents or one, and a ranking. Read only. */
export function AgentAnalyticsPage() {
  const t = useT();
  const [bucket, setBucket] = useState<AgentAnalyticsBucket>("day");
  const [days, setDays] = useState(30);
  const [agentId, setAgentId] = useState<string>("");
  const { data, error, loading } = useLoad(() => agentAnalytics(bucket, days, agentId || undefined), [bucket, days, agentId]);
  const currencies = useMemo(() => [...new Set((data?.series ?? []).map((p) => p.currency))].sort(), [data]);
  const [picked, setPicked] = useState<string>("");
  const currency = currencies.includes(picked) ? picked : currencies[0] ?? "";
  const points = data ? pointsFor(data.series, currency) : [];
  const ranking = (data?.ranking ?? []).filter((r: AgentRankRow) => r.currency === currency);
  const max = Math.max(1, ...points.map((p) => p.volumeMinor));
  const last = points[points.length - 1];
  const before = points[points.length - 2];

  return (
    <div>
      <PageHeader title="Agent analytics" intro="How much cash agents move over time, all together or one at a time. Read only." />
      <Tabs
        value={bucket}
        options={[["day", "By day"], ["week", "By week"], ["month", "By month"]] as const}
        onChange={setBucket}
      />
      <div className="row-start search">
        <label>
          {t("Last")}{" "}
          <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
            {[7, 30, 90, 180, 365].map((d) => (
              <option key={d} value={d}>
                {t("{n} days", { n: d })}
              </option>
            ))}
          </select>
        </label>
        {currencies.length > 1 && (
          <label>
            {t("Currency")}{" "}
            <select value={currency} onChange={(e) => setPicked(e.target.value)}>
              {currencies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          {t("Agent")}{" "}
          <select value={agentId} onChange={(e) => setAgentId(e.target.value)}>
            <option value="">{t("All agents")}</option>
            {(data?.ranking ?? [])
              .filter((r) => r.currency === currency)
              .map((r) => (
                <option key={r.agentId} value={r.agentId}>
                  {r.businessName || r.name || r.agentId}
                </option>
              ))}
          </select>
        </label>
      </div>
      <LoadState loading={loading && !data} error={error} empty={!!data && !points.length} />
      {points.length > 0 && last && (
        <>
          <div className="card">
            <h2>{t("Cash moved")}</h2>
            <p className="muted">
              {t("Latest period")}: {money(last.volumeMinor, currency)} · {t("Before")}: {before ? money(before.volumeMinor, currency) : "—"} · {t("Growth")}:{" "}
              {before ? growth(last.volumeMinor, before.volumeMinor) : "—"}
            </p>
            <svg role="img" aria-label={t("Cash moved over time")} viewBox={`0 0 ${points.length * 14} 80`} preserveAspectRatio="none" style={{ width: "100%", height: 120 }}>
              {points.map((p, i) => {
                const h = Math.max(1, Math.round((p.volumeMinor / max) * 76));
                return (
                  <rect key={p.label} x={i * 14 + 2} y={78 - h} width={10} height={h} rx={2} fill="var(--primary)">
                    <title>{`${p.label}: ${money(p.volumeMinor, currency)}`}</title>
                  </rect>
                );
              })}
            </svg>
          </div>
          <div className="table-wrap card">
            <table>
              <thead>
                <tr>
                  <th>{t("Period")}</th>
                  <th>{t("Cash in")}</th>
                  <th>{t("Cash out")}</th>
                  <th>{t("Total")}</th>
                  <th>{t("Transactions")}</th>
                  <th>{t("Active agents")}</th>
                </tr>
              </thead>
              <tbody>
                {[...points].reverse().map((p) => (
                  <tr key={p.label}>
                    <td>{p.label}</td>
                    <td>{money(p.cashInMinor, currency)}</td>
                    <td>{money(p.cashOutMinor, currency)}</td>
                    <td>
                      <strong>{money(p.volumeMinor, currency)}</strong>
                    </td>
                    <td>{p.count}</td>
                    <td>{p.activeAgents}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {ranking.length > 0 && (
        <div className="table-wrap card">
          <h2>{t("Ranking by cash moved")}</h2>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>{t("Business")}</th>
                <th>{t("Agent")}</th>
                <th>{t("Total")}</th>
                <th>{t("Transactions")}</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((r, i) => (
                <tr key={r.agentId} className="clickable" onClick={() => setAgentId(r.agentId)}>
                  <td>{i + 1}</td>
                  <td>
                    <strong>{r.businessName || "—"}</strong>
                  </td>
                  <td>{r.name || "—"}</td>
                  <td>{money(r.volumeMinor, currency)}</td>
                  <td>{r.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

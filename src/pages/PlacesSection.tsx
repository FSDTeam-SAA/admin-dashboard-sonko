import { lazy, Suspense, useState } from "react";
import { places, type CountryCount, type CountryMoney, type Places } from "../api/admin";
import { Badge, LoadState, Tabs } from "../components/common";
import { money, when } from "../lib/format";
import { useLoad } from "../lib/useLoad";
import { useT } from "../i18n/language";
import { countryName } from "../lib/countryName";
import { CENTROIDS_KNOWN } from "../lib/mapCountries";
import { TYPE_LABEL } from "./CustomersPage";

// The map file is large, so it loads only when this section is shown.
const WorldMap = lazy(() => import("./WorldMap"));

type Mode = "customers" | "sentFrom" | "receivedIn";

export function moneyList(m: CountryMoney[] | undefined): string {
  return (m ?? []).map((x) => money(x.amountMinor, x.currency)).join(" · ");
}

/** Red from 10% failed, amber from 3%, green below, dash when nothing finished. */
export function failureTone(rate: number | null): "danger" | "warn" | "ok" | "plain" {
  if (rate === null) return "plain";
  if (rate >= 10) return "danger";
  if (rate >= 3) return "warn";
  return "ok";
}

export function rowsFor(data: Places, mode: Mode): CountryCount[] {
  return data[mode];
}

function CountryLabel({ code }: { code: string }) {
  const t = useT();
  const name = countryName(code);
  return <>{name ?? t("Not recorded")}</>;
}

/** Where customers and payments are, the busiest corridors, and what fails. Countries only. */
export function PlacesSection() {
  const t = useT();
  const [mode, setMode] = useState<Mode>("customers");
  const { data, error, loading } = useLoad(places, []);
  if (!data) return <LoadState loading={loading} error={error} empty={false} />;
  const rows = rowsFor(data, mode);
  const modeLabel =
    mode === "customers" ? t("Customers by country") : mode === "sentFrom" ? t("Payments sent from, last {n} days", { n: data.paymentDays }) : t("Payments received in, last {n} days", { n: data.paymentDays });
  return (
    <>
      <h2>{t("Where the business is")}</h2>
      <div className="card panel">
        <Tabs
          value={mode}
          options={[
            ["customers", "Customers"],
            ["sentFrom", "Payments sent from"],
            ["receivedIn", "Payments received in"],
          ] as const}
          onChange={setMode}
        />
        <h3>{modeLabel}</h3>
        <div className="places-grid">
          <Suspense fallback={<p className="muted">{t("Loading the map…")}</p>}>
            <WorldMap rows={rows} label={modeLabel} />
          </Suspense>
          <div className="table-wrap">
            {rows.length === 0 ? (
              <p className="muted">{t("Nothing yet.")}</p>
            ) : (
              <table className="mini">
                <thead>
                  <tr>
                    <th>{t("Country")}</th>
                    <th>{mode === "customers" ? t("Customers") : t("Payments")}</th>
                    {mode !== "customers" && <th>{t("Amount")}</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.country}>
                      <td>
                        <CountryLabel code={r.country} />
                        {r.country !== "??" && !CENTROIDS_KNOWN.has(r.country) && <span className="muted small"> {t("(too small for the map)")}</span>}
                      </td>
                      <td className="num">{r.count.toLocaleString("en-GB")}</td>
                      {mode !== "customers" && <td className="num">{moneyList(r.money)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        <p className="hint">
          {t("Countries only, never cities or addresses. A customer’s country is the one on their checked ID or address. “Not recorded” means the ID check is not done yet, or an older payment did not save its country. The map is drawn inside the panel; nothing is sent to an outside map service.")}
        </p>
      </div>

      <div className="card panel">
        <h2>{t("Busiest corridors, last {n} days", { n: data.paymentDays })}</h2>
        {data.corridors.top.length === 0 ? (
          <p className="muted">{t("Nothing yet.")}</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("Sent from")}</th>
                  <th>{t("Sent to")}</th>
                  <th>{t("Payments")}</th>
                  <th>{t("Share of all payments")}</th>
                  <th>{t("Amount")}</th>
                </tr>
              </thead>
              <tbody>
                {data.corridors.top.map((c) => (
                  <tr key={`${c.from}>${c.to}`}>
                    <td>
                      <CountryLabel code={c.from} />
                    </td>
                    <td>
                      <CountryLabel code={c.to} />
                    </td>
                    <td className="num">{c.count.toLocaleString("en-GB")}</td>
                    <td className="num">{c.share === null ? "—" : `${c.share}%`}</td>
                    <td className="num">{moneyList(c.money)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data.corridors.more > 0 && <p className="muted small">{t("{n} smaller corridors not shown.", { n: data.corridors.more })}</p>}
        <p className="hint">{t("Ranked by number of payments. Amounts stay in their own currency and are never added together.")}</p>
      </div>

      <div className="card panel">
        <h2>{t("Failed payments by type, last {n} days", { n: data.failureDays })}</h2>
        {data.failures.types.length === 0 ? (
          <p className="muted">{t("Nothing yet.")}</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("Type")}</th>
                  <th>{t("Went through")}</th>
                  <th>{t("Failed")}</th>
                  <th>{t("Still pending")}</th>
                  <th>{t("Failure rate")}</th>
                </tr>
              </thead>
              <tbody>
                {data.failures.types.map((f) => (
                  <tr key={f.type}>
                    <td>{t(TYPE_LABEL[f.type] ?? f.type)}</td>
                    <td className="num">{f.successful.toLocaleString("en-GB")}</td>
                    <td className="num">{f.failed.toLocaleString("en-GB")}</td>
                    <td className="num">{f.pending.toLocaleString("en-GB")}</td>
                    <td>
                      <Badge tone={failureTone(f.failureRate)}>{f.failureRate === null ? "—" : `${f.failureRate}%`}</Badge>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td>
                    <strong>{t("All types")}</strong>
                  </td>
                  <td className="num">{data.failures.all.successful.toLocaleString("en-GB")}</td>
                  <td className="num">{data.failures.all.failed.toLocaleString("en-GB")}</td>
                  <td className="num">{data.failures.all.pending.toLocaleString("en-GB")}</td>
                  <td>
                    <Badge tone={failureTone(data.failures.all.failureRate)}>{data.failures.all.failureRate === null ? "—" : `${data.failures.all.failureRate}%`}</Badge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
        <p className="hint">{t("Failure rate is failed out of those that finished. Pending ones are left out because they may still go through. Red from 10%, amber from 3%. Open Transactions and filter by Failed to see each one.")}</p>
        <p className="muted small">{t("Worked out {when}. Updated at most every 10 minutes.", { when: when(data.workedOutAt) })}</p>
      </div>
    </>
  );
}

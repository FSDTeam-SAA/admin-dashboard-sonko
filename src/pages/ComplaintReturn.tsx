import { useState } from "react";
import { complaintReturn, complaintReturnCsv } from "../api/admin";
import { LoadState } from "../components/common";
import { money } from "../lib/format";
import { useLoad } from "../lib/useLoad";
import { useT } from "../i18n/language";
import { percent } from "./HeadroomPage";

/** The half years to choose from: from the first period of the new FCA return up to the one we are in. */
export function halfYears(now = new Date()): string[] {
  const out: string[] = [];
  const nowKey = now.getUTCFullYear() * 2 + (now.getUTCMonth() < 6 ? 0 : 1);
  // Starts at 2026-H2 so the test period before the first real return can be checked too.
  for (let k = 2026 * 2 + 1; k <= nowKey; k += 1) out.push(`${Math.floor(k / 2)}-H${(k % 2) + 1}`);
  if (!out.includes("2027-H1")) out.push("2027-H1");
  return out.reverse();
}

const ROW: [string, string][] = [
  ["openAtStart", "Open at the start"],
  ["received", "Received"],
  ["closed", "Closed"],
  ["openAtEnd", "Open at the end"],
  ["ombudsmanInformed", "Closed with the Ombudsman rights given"],
  ["fraudReceived", "Fraud or scam complaints received"],
  ["fraudClosed", "Fraud or scam complaints closed"],
];
const OUTCOMES: [string, string][] = [
  ["upheld", "Upheld"],
  ["partly_upheld", "Partly upheld"],
  ["not_upheld", "Not upheld"],
  ["withdrawn", "Withdrawn"],
];
const WITHIN: [string, string][] = [
  ["3", "Within 3 business days"],
  ["15", "Within 15 business days"],
  ["35", "Within 35 business days"],
  ["later", "After 35 business days"],
];

/** The figures for the FCA complaints return, a half year at a time, plus a file of the rows for the adviser. */
export function ComplaintReturnView() {
  const t = useT();
  const options = halfYears();
  const [period, setPeriod] = useState<string>(options[0] ?? "2027-H1");
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const { data, error, loading } = useLoad(() => complaintReturn(period), [period]);
  const download = async () => {
    setDownloadError(null);
    try {
      const blob = await complaintReturnCsv(period);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `complaints-${period}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setDownloadError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
    }
  };
  return (
    <div className="card panel">
      <h2>{t("FCA complaints return")}</h2>
      <p className="hint">
        {t("From 1 January 2027 the FCA uses one complaints return for all firms, sent every half year. The first period is 1 January to 30 June 2027. These are the figures it is built from. The FCA form groups complaints its own way, so map our topics to it when you fill it in, and have the compliance adviser check the first one.")}
      </p>
      <label>
        {t("Half year")}{" "}
        <select value={period} onChange={(e) => setPeriod(e.target.value)}>
          {options.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>
      <LoadState loading={loading && !data} error={error} empty={false} />
      {data && (
        <>
          <p className="muted small">{t("{from} to {to}", { from: data.from, to: data.to })}</p>
          <table>
            <tbody>
              {ROW.map(([k, label]) => (
                <tr key={k}>
                  <td>{t(label)}</td>
                  <td>{String((data as unknown as Record<string, number>)[k])}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h3>{t("Closed, by outcome")}</h3>
          <table>
            <tbody>
              {OUTCOMES.map(([k, label]) => (
                <tr key={k}>
                  <td>{t(label)}</td>
                  <td>{data.closedByOutcome[k] ?? 0}</td>
                </tr>
              ))}
              <tr>
                <td>{t("Share upheld or partly upheld")}</td>
                <td>{percent(data.upheldRate, t)}</td>
              </tr>
            </tbody>
          </table>
          <h3>{t("Closed, by time taken")}</h3>
          <table>
            <tbody>
              {WITHIN.map(([k, label]) => (
                <tr key={k}>
                  <td>{t(label)}</td>
                  <td>{data.closedWithin[k as keyof typeof data.closedWithin]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h3>{t("Redress paid")}</h3>
          {Object.keys(data.redress).length ? (
            <ul>
              {Object.entries(data.redress).map(([c, v]) => (
                <li key={c}>{money(v, c)}</li>
              ))}
            </ul>
          ) : (
            <p className="muted">{t("None recorded.")}</p>
          )}
          <h3>{t("Received, by topic")}</h3>
          <p>{Object.entries(data.receivedByCategory).map(([k, v]) => `${k}: ${v}`).join(" · ")}</p>
          <h3>{t("Received, by country")}</h3>
          <p>{Object.entries(data.receivedByCountry).map(([k, v]) => `${k}: ${v}`).join(" · ")}</p>
          <button onClick={download}>{t("Download the complaints for this period (CSV)")}</button>
          {downloadError && <p className="error">{t(downloadError)}</p>}
        </>
      )}
    </div>
  );
}

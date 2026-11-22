import { useMemo, useState } from "react";
import { applyLaunchPlan, SERVICE_NAMES, type CountryRow, type ServiceName, type ServiceSwitchRow, type SwitchState } from "../api/admin";
import { ConfirmWithPin } from "../components/ConfirmWithPin";
import { TextArea, okLength } from "../components/common";
import { newIdempotencyKey } from "../lib/idempotency";
import { useT } from "../i18n/language";
import { effectiveState, SERVICE_LABEL } from "./ServicesPage";

/** Countries money can be sent from, and to, right now (both switches and the country itself on). */
export function openCorridors(rows: ServiceSwitchRow[], countries: CountryRow[]): { from: string[]; to: string[] } {
  const live = countries.filter((c) => c.enabled).map((c) => c.code);
  return {
    from: live.filter((c) => effectiveState(rows, "send_money_from", c) === "on" && effectiveState(rows, "send_money", "ALL") === "on"),
    to: live.filter((c) => effectiveState(rows, "send_money", c) === "on"),
  };
}

/** The services a launch plan can keep (sending from comes with sending to). */
export const PLAN_SERVICES = SERVICE_NAMES.filter(([s]) => s !== "send_money_from");

/** "Who can send where now", and the one-click launch plan. */
export function LaunchPlanBox({ rows, countries, mayChange, onDone }: { rows: ServiceSwitchRow[]; countries: CountryRow[]; mayChange: boolean; onDone: (m: string) => void }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState<string[]>(["GB"]);
  const [to, setTo] = useState<string[]>(["GM"]);
  const [keep, setKeep] = useState<ServiceName[]>(["send_money"]);
  const [reason, setReason] = useState("");
  const [result, setResult] = useState<{ switchedOff: number; stillOff: { country: string; service: ServiceName; state: SwitchState }[] } | null>(null);
  const key = useMemo(newIdempotencyKey, [open]);
  const corridors = openCorridors(rows, countries);
  const name = (code: string) => (code === "ALL" ? t("Every country") : countries.find((c) => c.code === code)?.name || code);
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const sending = keep.includes("send_money");
  const ready = keep.length > 0 && (!sending || (from.length > 0 && to.length > 0)) && okLength(reason, 5, 300);
  return (
    <div className="card panel">
      <h2>{t("Who can send where now")}</h2>
      <p>
        <strong>{t("Sent from:")}</strong> {corridors.from.length ? corridors.from.map(name).join(", ") : t("nowhere")}
        <br />
        <strong>{t("Sent to:")}</strong> {corridors.to.length ? corridors.to.map(name).join(", ") : t("nowhere")}
      </p>
      <p className="hint">{t("A payment goes through only if sending is on for the country it leaves (the sender's ID-check country) and for the country it goes to, and both countries are on.")}</p>
      {result && (
        <div className="notice">
          <p>{t("{n} switches turned off.", { n: result.switchedOff })}</p>
          {result.stillOff.length > 0 && (
            <p>
              {t("Still to switch on (two people, below): {list}.", { list: result.stillOff.map((s) => t("{service} in {country}", { service: t(SERVICE_LABEL[s.service] ?? s.service), country: name(s.country) })).join("; ") })}
            </p>
          )}
        </div>
      )}
      {mayChange && <button onClick={() => { setResult(null); setReason(""); setOpen(true); }}>{t("Launch plan: keep only…")}</button>}
      {open && (
        <ConfirmWithPin
          title="Launch plan"
          confirmLabel="Switch everything else off"
          danger
          canConfirm={ready}
          onClose={() => setOpen(false)}
          onConfirm={async (pin) => {
            const r = await applyLaunchPlan({ from, to, keep, reason: reason.trim(), pin }, key);
            setOpen(false);
            setResult(r);
            onDone(r.stillOff.length ? "Launch plan applied. Some switches still need turning on by two people." : "Launch plan applied. Everything else is off.");
          }}
        >
          <p>{t("Choose what stays on. Everything else is switched off at once. Nothing is switched on: anything the plan needs that is off now is listed afterwards, to switch on with a second person.")}</p>
          <fieldset className="choices">
            <legend>{t("Services to keep")}</legend>
            {PLAN_SERVICES.map(([s, label]) => (
              <label key={s} className="check small">
                <input type="checkbox" checked={keep.includes(s)} onChange={() => setKeep(toggle(keep, s))} /> {t(label === "Send money: to this country" ? "Send money" : label)}
              </label>
            ))}
          </fieldset>
          {sending && (
            <div className="row">
              <fieldset className="choices">
                <legend>{t("Sent from")}</legend>
                {countries.map((c) => (
                  <label key={c.code} className="check small">
                    <input type="checkbox" checked={from.includes(c.code)} onChange={() => setFrom(toggle(from, c.code))} /> {c.name}
                  </label>
                ))}
              </fieldset>
              <fieldset className="choices">
                <legend>{t("Sent to")}</legend>
                {countries.map((c) => (
                  <label key={c.code} className="check small">
                    <input type="checkbox" checked={to.includes(c.code)} onChange={() => setTo(toggle(to, c.code))} /> {c.name}
                  </label>
                ))}
              </fieldset>
            </div>
          )}
          <TextArea label="Reason" value={reason} onChange={setReason} min={5} max={300} />
        </ConfirmWithPin>
      )}
    </div>
  );
}

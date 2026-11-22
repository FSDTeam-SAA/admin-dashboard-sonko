import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { can } from "../api/staff";
import {
  cancelCountryOn,
  cancelServiceOn,
  countriesList,
  saveLicence,
  serviceSwitches,
  SERVICE_NAMES,
  switchCountry,
  switchService,
  type CountryRow,
  type LicenceStatus,
  type ServiceName,
  type ServiceSwitchRow,
  type SwitchState,
} from "../api/admin";
import { ConfirmWithPin } from "../components/ConfirmWithPin";
import { Badge, LoadState, PageHeader, Tabs, TextArea, okLength } from "../components/common";
import { when } from "../lib/format";
import { useLoad } from "../lib/useLoad";
import { useT } from "../i18n/language";
import { LaunchPlanBox } from "./LaunchPlan";

const STATE_LABEL: Record<SwitchState, string> = { on: "On", paused: "Paused", off: "Off" };
const STATE_TONE: Record<SwitchState, "ok" | "warn" | "danger"> = { on: "ok", paused: "warn", off: "danger" };
export const SERVICE_LABEL: Record<string, string> = Object.fromEntries(SERVICE_NAMES);
const LICENCE_LABEL: Record<LicenceStatus, string> = { none: "No licence recorded", own: "Our own licence", partner: "Licensed partner" };
const staffName = (s: { name?: string; username?: string } | null | undefined) => s?.name || s?.username || "staff";

/** The state customers get: the stricter of "every country" and this country. */
export function effectiveState(rows: ServiceSwitchRow[], service: ServiceName, country: string): SwitchState {
  const find = (c: string) => rows.find((r) => r.country === c && r.service === service)?.state ?? "on";
  const all = find("ALL");
  if (country === "ALL") return all;
  const here = find(country);
  const rank = { on: 0, paused: 1, off: 2 } as const;
  return rank[here] > rank[all] ? here : all;
}

export function ServicesPage() {
  const [tab, setTab] = useState<"services" | "countries">("services");
  return (
    <section>
      <PageHeader
        title="Services and countries"
        intro="What customers can use, and where. Pausing or switching off happens at once. Switching anything on needs a second staff member to approve."
      />
      <Tabs
        value={tab}
        options={[
          ["services", "Services"],
          ["countries", "Countries"],
        ] as const}
        onChange={setTab}
      />
      {tab === "services" ? <ServicesTab /> : <CountriesTab />}
    </section>
  );
}

type ServiceOpen = { service: ServiceName; current: SwitchState; pending: ServiceSwitchRow["pendingOn"] } | null;

function ServicesTab() {
  const t = useT();
  const { staff } = useAuth();
  const [country, setCountry] = useState("ALL");
  const [open, setOpen] = useState<ServiceOpen>(null);
  const [done, setDone] = useState<string | null>(null);
  const switches = useLoad(serviceSwitches, []);
  const countries = useLoad(countriesList, []);
  const rows = switches.data ?? [];
  const mayChange = can(staff, "manage_countries");
  const waiting = rows.filter((r) => r.pendingOn);
  const notOn = rows.filter((r) => r.state !== "on");
  const countryName = (code: string) => (code === "ALL" ? "Every country" : countries.data?.find((c) => c.code === code)?.name || code);

  return (
    <>
      {done && <p className="notice">{t(done)}</p>}
      <LoadState loading={switches.loading && !switches.data} error={switches.error} empty={false} />
      {switches.data && countries.data && (
        <LaunchPlanBox
          rows={rows}
          countries={countries.data}
          mayChange={mayChange}
          onDone={(m) => {
            setDone(m);
            switches.reload();
          }}
        />
      )}
      {waiting.length > 0 && (
        <div className="card panel">
          <h2>{t("Waiting for a second person")}</h2>
          <ul className="plain-list">
            {waiting.map((r) => (
              <li key={`${r.country}:${r.service}`}>
                {t("Switch on {service} in {country}, asked by {name} {when}: {reason}", { service: t(SERVICE_LABEL[r.service] ?? r.service), country: countryName(r.country), name: r.pendingOn!.requestedByName || t("staff"), when: when(r.pendingOn!.requestedAt), reason: r.pendingOn!.reason })}{" "}
                <button className="link" onClick={() => setCountry(r.country)}>
                  {t("Go to it")}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {notOn.length > 0 && (
        <p className="notice">
          {t("Not fully on: {list}.", { list: notOn.map((r) => t("{service} in {country} ({state})", { service: t(SERVICE_LABEL[r.service] ?? r.service), country: countryName(r.country), state: t(STATE_LABEL[r.state]).toLowerCase() })).join("; ") })}
        </p>
      )}
      <div className="row-start search">
        <label>
          {t("Country")}
          <select value={country} onChange={(e) => setCountry(e.target.value)}>
            <option value="ALL">{t("Every country")}</option>
            {(countries.data ?? []).map((c) => (
              <option key={c.code} value={c.code}>
                {c.name} ({c.code}){c.enabled ? "" : " - country off"}
              </option>
            ))}
          </select>
        </label>
      </div>
      {country !== "ALL" && countries.data?.find((c) => c.code === country && !c.enabled) && (
        <p className="error">{t("This country is switched off, so none of its services can be used whatever they show below.")}</p>
      )}
      <div className="table-wrap card">
        <table>
          <thead>
            <tr>
              <th>{t("Service")}</th>
              <th>{t("Here")}</th>
              <th>{t("What customers get")}</th>
              <th>{t("Reason")}</th>
              <th aria-label={t("Actions")} />
            </tr>
          </thead>
          <tbody>
            {SERVICE_NAMES.map(([service, label]) => {
              const row = rows.find((r) => r.country === country && r.service === service);
              const here = row?.state ?? "on";
              const effective = effectiveState(rows, service, country);
              return (
                <tr key={service}>
                  <td>
                    <strong>{t(label)}</strong>
                    {row?.pendingOn && <div className="muted small">{t("Switch on asked by {name}", { name: row.pendingOn.requestedByName || t("staff") })}</div>}
                  </td>
                  <td>
                    <Badge tone={STATE_TONE[here]}>{STATE_LABEL[here]}</Badge>
                  </td>
                  <td>
                    <Badge tone={STATE_TONE[effective]}>{STATE_LABEL[effective]}</Badge>
                    {effective !== here && <div className="muted small">{t("set for every country")}</div>}
                  </td>
                  <td className="small">{row?.reason || "—"}</td>
                  <td className="actions">{mayChange && <button onClick={() => setOpen({ service, current: here, pending: row?.pendingOn ?? null })}>{t("Change")}</button>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!mayChange && <p className="hint">{t("You can see these switches. Changing them needs the \"Change countries, services and logos\" permission.")}</p>}
      {open && (
        <ServiceDialog
          country={country}
          countryLabel={countryName(country)}
          open={open}
          myId={staff?._id ?? ""}
          onClose={() => setOpen(null)}
          onDone={(message) => {
            setOpen(null);
            setDone(message);
            switches.reload();
          }}
        />
      )}
    </>
  );
}

function ServiceDialog({ country, countryLabel, open, myId, onClose, onDone }: { country: string; countryLabel: string; open: NonNullable<ServiceOpen>; myId: string; onClose: () => void; onDone: (m: string) => void }) {
  const t = useT();
  const [state, setState] = useState<SwitchState>(open.current === "on" ? "paused" : "on");
  const [reason, setReason] = useState(open.pending?.reason ?? "");
  const [cancelling, setCancelling] = useState(false);
  const pending = open.pending;
  const myRequest = pending?.requestedBy === myId;
  const approving = state === "on" && pending && !myRequest;
  const label = t(SERVICE_LABEL[open.service] ?? open.service);

  return (
    <ConfirmWithPin
      title={`${label}: ${countryLabel}`}
      confirmLabel={approving ? "Approve switching on" : state === "on" ? "Ask to switch on" : state === "paused" ? "Pause now" : "Switch off now"}
      danger={state !== "on"}
      canConfirm={okLength(reason, 5, 300) && !(state === "on" && myRequest) && state !== open.current}
      onClose={onClose}
      onConfirm={async (pin) => {
        await switchService(country, open.service, { state, reason: reason.trim(), pin });
        onDone(
          state !== "on"
            ? t(state === "paused" ? "{label} is paused in {country}. Customers see a message and can't use it." : "{label} is off in {country}. Customers see a message and can't use it.", { label, country: countryLabel })
            : approving
              ? t("{label} is switched on in {country}.", { label, country: countryLabel })
              : "Asked. A different staff member must approve it here.",
        );
      }}
    >
      <p>
        {t("Now:")} <strong>{t(STATE_LABEL[open.current])}</strong>
        {country === "ALL" ? `. ${t("This switch covers every country.")}` : "."}
      </p>
      <fieldset className="choices">
        {(["on", "paused", "off"] as const).map((s) => (
          <label key={s} className="check">
            <input type="radio" name="state" checked={state === s} disabled={s === open.current} onChange={() => setState(s)} />
            {s === "on" ? t("On (needs a second person)") : s === "paused" ? t("Paused for a while (at once)") : t("Off (at once)")}
          </label>
        ))}
      </fieldset>
      {pending && (
        <p className="notice">
          {myRequest ? t("You asked to switch this on. A different staff member must approve it.") : t("Switch on was asked for: {reason}", { reason: pending.reason })}{" "}
          <button
            type="button"
            className="link"
            disabled={cancelling}
            onClick={async () => {
              setCancelling(true);
              await cancelServiceOn(country, open.service).catch(() => undefined);
              onDone("Request to switch on cancelled.");
            }}
          >
            {t("Cancel the request")}
          </button>
        </p>
      )}
      {!approving && <TextArea label="Reason (kept in the history)" value={reason} onChange={setReason} min={5} max={300} />}
    </ConfirmWithPin>
  );
}

type CountryOpen = { action: "on" | "off" | "licence"; country: CountryRow } | null;

function CountriesTab() {
  const t = useT();
  const { staff } = useAuth();
  const [open, setOpen] = useState<CountryOpen>(null);
  const [done, setDone] = useState<string | null>(null);
  const { data, error, loading, reload } = useLoad(countriesList, []);
  const mayChange = can(staff, "manage_countries");
  const finish = (m: string) => {
    setOpen(null);
    setDone(m);
    reload();
  };

  return (
    <>
      {done && <p className="notice">{t(done)}</p>}
      <LoadState loading={loading && !data} error={error} empty={!data?.length} />
      {data && (
        <div className="table-wrap card">
          <table>
            <thead>
              <tr>
                <th>{t("Country")}</th>
                <th>{t("Switch")}</th>
                <th>{t("Licence")}</th>
                <th aria-label={t("Actions")} />
              </tr>
            </thead>
            <tbody>
              {data.map((c) => {
                const licensed = c.licence.status !== "none";
                const mine = c.pendingOn?.requestedBy?._id === staff?._id;
                return (
                  <tr key={c.code}>
                    <td>
                      <strong>{c.name}</strong> <span className="muted small">{c.code}</span>
                    </td>
                    <td>
                      <Badge tone={c.enabled ? "ok" : "plain"}>{c.enabled ? t("On") : t("Off")}</Badge>
                      {c.enabled && !licensed && (
                        <div>
                          <Badge tone="warn">{t("On without a licence recorded")}</Badge>
                        </div>
                      )}
                      {c.pendingOn && <div className="muted small">{t("Switch on asked by {name}", { name: staffName(c.pendingOn.requestedBy) })}</div>}
                    </td>
                    <td className="small">
                      {t(LICENCE_LABEL[c.licence.status])}
                      {licensed && (
                        <div className="muted">
                          {c.licence.holder} · {c.licence.reference}
                        </div>
                      )}
                    </td>
                    <td className="actions">
                      {mayChange && (
                        <>
                          <button onClick={() => setOpen({ action: "licence", country: c })}>{t("Licence")}</button>
                          {c.enabled ? (
                            <button className="danger" onClick={() => setOpen({ action: "off", country: c })}>
                              {t("Switch off")}
                            </button>
                          ) : (
                            <button className="primary" disabled={!licensed || mine} title={!licensed ? t("Record the licence first") : mine ? t("A different staff member must approve") : ""} onClick={() => setOpen({ action: "on", country: c })}>
                              {c.pendingOn && !mine ? t("Approve on") : t("Switch on")}
                            </button>
                          )}
                          {c.pendingOn && (
                            <button
                              onClick={async () => {
                                await cancelCountryOn(c.code).catch(() => undefined);
                                finish(`Request to switch on ${c.name} cancelled.`);
                              }}
                            >
                              {t("Cancel request")}
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="hint">{t("A country can only be switched on once its licence is recorded. Countries added for later (Guinea, Guinea-Bissau, Sierra Leone, Mali) start off.")}</p>
      {open?.action === "licence" && <LicenceDialog country={open.country} onClose={() => setOpen(null)} onDone={() => finish(t("Licence saved for {name}.", { name: open.country.name }))} />}
      {(open?.action === "on" || open?.action === "off") && <CountrySwitchDialog open={{ action: open.action, country: open.country }} onClose={() => setOpen(null)} onDone={finish} />}
    </>
  );
}

function CountrySwitchDialog({ open, onClose, onDone }: { open: { action: "on" | "off"; country: CountryRow }; onClose: () => void; onDone: (m: string) => void }) {
  const t = useT();
  const c = open.country;
  const approving = open.action === "on" && Boolean(c.pendingOn);
  const [reason, setReason] = useState(approving ? c.pendingOn!.reason : "");
  return (
    <ConfirmWithPin
      title={open.action === "off" ? t("Switch off {name}", { name: c.name }) : approving ? t("Approve switching on {name}", { name: c.name }) : t("Ask to switch on {name}", { name: c.name })}
      confirmLabel={open.action === "off" ? "Switch off now" : approving ? "Approve" : "Ask"}
      danger={open.action === "off"}
      canConfirm={okLength(reason, 5, 300)}
      onClose={onClose}
      onConfirm={async (pin) => {
        await switchCountry(c.code, { enabled: open.action === "on", reason: reason.trim(), pin });
        onDone(open.action === "off" ? t("{name} is switched off. Customers can't send to it or use services there.", { name: c.name }) : approving ? t("{name} is switched on.", { name: c.name }) : t("Asked. A different staff member must approve it on this page."));
      }}
    >
      {open.action === "off" ? (
        <p>{t("Every service in {name} stops at once. Money already on its way is not affected.", { name: c.name })}</p>
      ) : (
        <>
          <p>
            {t("Licence: {status}, {holder} · {reference}", { status: t(LICENCE_LABEL[c.licence.status]), holder: c.licence.holder, reference: c.licence.reference })}
          </p>
          {approving && (
            <p className="notice">
              {t("Asked by {name} {when}. Check the licence above before approving.", { name: staffName(c.pendingOn!.requestedBy), when: when(c.pendingOn!.requestedAt) })}
            </p>
          )}
        </>
      )}
      {!approving && <TextArea label="Reason (kept in the history)" value={reason} onChange={setReason} min={5} max={300} />}
    </ConfirmWithPin>
  );
}

function LicenceDialog({ country, onClose, onDone }: { country: CountryRow; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const [status, setStatus] = useState<LicenceStatus>(country.licence.status);
  const [holder, setHolder] = useState(country.licence.holder);
  const [reference, setReference] = useState(country.licence.reference);
  const [note, setNote] = useState(country.licence.note);
  const filled = status === "none" || (holder.trim().length >= 2 && reference.trim().length >= 2);
  return (
    <ConfirmWithPin
      title={t("Licence for {name}", { name: country.name })}
      confirmLabel="Save licence"
      canConfirm={filled}
      onClose={onClose}
      onConfirm={async (pin) => {
        await saveLicence(country.code, { status, holder: holder.trim(), reference: reference.trim(), note: note.trim(), pin });
        onDone();
      }}
    >
      <label>
        {t("Licence")}
        <select value={status} onChange={(e) => setStatus(e.target.value as LicenceStatus)}>
          <option value="none">{t("No licence")}</option>
          <option value="own">{t("Our own licence")}</option>
          <option value="partner">{t("A licensed partner")}</option>
        </select>
      </label>
      {status !== "none" && (
        <>
          <label>
            {t("Licence holder")}
            <input value={holder} maxLength={120} onChange={(e) => setHolder(e.target.value)} />
          </label>
          <label>
            {t("Licence or registration number")}
            <input value={reference} maxLength={120} onChange={(e) => setReference(e.target.value)} />
          </label>
        </>
      )}
      <label>
        {t("Note")}
        <input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} />
      </label>
      {status === "none" && country.enabled && <p className="notice">{t("This country stays on. Switch it off separately if it must stop.")}</p>}
    </ConfirmWithPin>
  );
}

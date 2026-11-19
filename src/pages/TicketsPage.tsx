import { useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { can } from "../api/staff";
import {
  addTicketNote,
  changeTicket,
  openTicket,
  ticket,
  tickets,
  ticketStats,
  TICKET_CATEGORIES,
  type TicketCategory,
  type TicketFilters,
  type TicketPriority,
  type TicketRow,
  type TicketStatus,
} from "../api/admin";
import { Badge, LoadState, PageHeader, Pager, Tabs } from "../components/common";
import { Bars, monthLabel } from "./AnalyticsPage";
import { newIdempotencyKey } from "../lib/idempotency";
import { when } from "../lib/format";
import { useLoad } from "../lib/useLoad";
import { useT, type Language, translate } from "../i18n/language";

export const PRIORITY_LABEL: Record<TicketPriority, string> = { high: "High", medium: "Medium", low: "Low" };
const PRIORITY_TONE: Record<TicketPriority, "danger" | "warn" | "plain"> = { high: "danger", medium: "warn", low: "plain" };
export const STATUS_LABEL: Record<TicketStatus, string> = { open: "Open", in_progress: "In progress", resolved: "Resolved", closed: "Closed" };
export const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(TICKET_CATEGORIES);
const FIELD_LABEL: Record<string, string> = { priority: "Priority", status: "Status", category: "Topic", assignedTo: "Assigned" };

export function TicketsPage() {
  const { staff } = useAuth();
  const t = useT();
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState<TicketFilters>({ status: "active", priority: "all", mine: false, search: "" });
  const [typed, setTyped] = useState("");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(params.get("open"));
  const [showFigures, setShowFigures] = useState(false);
  const [creating, setCreating] = useState(Boolean(params.get("customer")));
  const { data, error, loading, reload } = useLoad(() => tickets(filters, page), [filters, page]);
  const rows = data?.tickets ?? [];
  const mayManage = can(staff, "manage_tickets");

  const clearParams = () => setParams({}, { replace: true });

  if (openId) {
    return (
      <TicketView
        ticketId={openId}
        onBack={() => {
          setOpenId(null);
          clearParams();
          reload();
        }}
      />
    );
  }
  if (showFigures) return <Figures onBack={() => setShowFigures(false)} />;
  if (creating) {
    return (
      <NewTicket
        customer={params.get("customer") ? { id: params.get("customer") as string, name: params.get("name") ?? "" } : null}
        onBack={() => {
          setCreating(false);
          clearParams();
        }}
        onDone={(id) => {
          setCreating(false);
          clearParams();
          setOpenId(id);
        }}
      />
    );
  }

  const set = (change: Partial<TicketFilters>) => {
    setFilters({ ...filters, ...change });
    setPage(1);
  };
  const find = (event: FormEvent) => {
    event.preventDefault();
    set({ search: typed });
  };

  return (
    <section>
      <PageHeader
        title="Tickets"
        intro="Customer problems, with notes so the next person sees what was done."
        actions={
          <>
            <button onClick={() => setShowFigures(true)}>{t("Figures")}</button>
            {mayManage && (
              <button className="primary" onClick={() => setCreating(true)}>
                {t("New ticket")}
              </button>
            )}
          </>
        }
      />
      <Tabs
        value={filters.status}
        options={[
          ["active", "Open and in progress"],
          ["resolved", "Resolved"],
          ["closed", "Closed"],
          ["all", "All"],
        ] as const}
        onChange={(status) => set({ status })}
      />
      <div className="row-start search">
        <select aria-label={t("Priority")} value={filters.priority} onChange={(e) => set({ priority: e.target.value as TicketFilters["priority"] })}>
          <option value="all">{t("Any priority")}</option>
          <option value="high">{t("High")}</option>
          <option value="medium">{t("Medium")}</option>
          <option value="low">{t("Low")}</option>
        </select>
        <label className="check">
          <input type="checkbox" checked={filters.mine} onChange={(e) => set({ mine: e.target.checked })} />
          {t("Mine")}
        </label>
      </div>
      <form className="row-start search" onSubmit={find}>
        <input placeholder={t("Search the subject")} value={typed} onChange={(e) => setTyped(e.target.value)} />
        <button type="submit">{t("Search")}</button>
      </form>
      <LoadState loading={loading && !data} error={error} empty={!rows.length} />
      {rows.length > 0 && (
        <div className="table-wrap card">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>{t("Subject")}</th>
                <th>{t("Priority")}</th>
                <th>{t("Status")}</th>
                <th>{t("Customer")}</th>
                <th>{t("Assigned")}</th>
                <th>{t("Opened")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row: TicketRow) => (
                <tr key={row.id} className="clickable" onClick={() => setOpenId(row.id)}>
                  <td>{row.number}</td>
                  <td>
                    <strong>{row.subject}</strong>
                    <div className="muted small">{t(CATEGORY_LABEL[row.category] ?? row.category)}</div>
                  </td>
                  <td>
                    <Badge tone={PRIORITY_TONE[row.priority]}>{PRIORITY_LABEL[row.priority]}</Badge>
                  </td>
                  <td>{t(STATUS_LABEL[row.status])}</td>
                  <td>{row.customer?.name || "—"}</td>
                  <td>{row.assignedTo?.name || t("Nobody")}</td>
                  <td>{when(row.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager pagination={data?.pagination} onPage={setPage} />
    </section>
  );
}

function NewTicket({ customer, onBack, onDone }: { customer: { id: string; name: string } | null; onBack: () => void; onDone: (id: string) => void }) {
  const t = useT();
  const [subject, setSubject] = useState("");
  const [detail, setDetail] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [category, setCategory] = useState<TicketCategory>("other");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // One key per form, so pressing the button twice opens one ticket.
  const key = useMemo(newIdempotencyKey, []);
  const ok = subject.trim().length >= 3 && !busy;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      const made = await openTicket({ subject: subject.trim(), detail: detail.trim(), priority, category, ...(customer ? { customer: customer.id } : {}) }, key);
      onDone(made.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("Could not open the ticket."));
      setBusy(false);
    }
  };

  return (
    <section className="subpage">
      <button className="link" onClick={onBack}>
        ← {t("All tickets")}
      </button>
      <h1>{t("New ticket")}</h1>
      <form className="card panel stack" onSubmit={submit}>
        {customer && <p className="notice">{t("For customer: {name}", { name: customer.name || customer.id })}</p>}
        <label>
          {t("Subject")}
          <input value={subject} maxLength={120} onChange={(e) => setSubject(e.target.value)} />
        </label>
        <label>
          {t("What happened")}
          <textarea rows={4} maxLength={2000} value={detail} onChange={(e) => setDetail(e.target.value)} />
        </label>
        <div className="form-grid">
          <label>
            {t("Priority")}
            <select value={priority} onChange={(e) => setPriority(e.target.value as TicketPriority)}>
              <option value="high">{t("High")}</option>
              <option value="medium">{t("Medium")}</option>
              <option value="low">{t("Low")}</option>
            </select>
          </label>
          <label>
            {t("Topic")}
            <select value={category} onChange={(e) => setCategory(e.target.value as TicketCategory)}>
              {TICKET_CATEGORIES.map(([value, label]) => (
                <option key={value} value={value}>
                  {t(label)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="hint">{t("Pick the topic that fits best. The analytics use it to show what causes the most tickets.")}</p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="row-end">
          <button type="button" onClick={onBack}>
            {t("Cancel")}
          </button>
          <button className="primary" type="submit" disabled={!ok}>
            {t("Open ticket")}
          </button>
        </div>
      </form>
    </section>
  );
}

function TicketView({ ticketId, onBack }: { ticketId: string; onBack: () => void }) {
  const { staff } = useAuth();
  const t = useT();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const { data, error, loading, reload } = useLoad(() => ticket(ticketId), [ticketId]);
  const noteKey = useMemo(newIdempotencyKey, [data?.notes.length]);
  const mayManage = can(staff, "manage_tickets");

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setFailed(null);
    try {
      await action();
      reload();
      return true;
    } catch (caught) {
      setFailed(caught instanceof Error ? caught.message : t("That did not work. Please try again."));
      return false;
    } finally {
      setBusy(false);
    }
  };

  if (!data) {
    return (
      <section>
        <button className="link" onClick={onBack}>
          ← {t("All tickets")}
        </button>
        <LoadState loading={loading} error={error} empty={false} />
      </section>
    );
  }
  const mine = data.assignedTo?.id === staff?._id;
  const finished = data.status === "resolved" || data.status === "closed";

  return (
    <section>
      <button className="link" onClick={onBack}>
        ← {t("All tickets")}
      </button>
      <PageHeader title={`#${data.number} ${data.subject}`} intro={t("Opened {time} by {name}", { time: when(data.createdAt), name: data.createdBy?.name || t("staff") })} />
      {failed && (
        <p className="error" role="alert">
          {t(failed)}
        </p>
      )}
      <div className="two-col">
        <div className="card panel">
          <h2>{t("Details")}</h2>
          {data.detail && <p>{data.detail}</p>}
          <dl className="facts">
            <dt>{t("Customer")}</dt>
            <dd>{data.customer ? `${data.customer.name} (${data.customer.phone})` : "—"}</dd>
            <dt>{t("Assigned to")}</dt>
            <dd>{data.assignedTo?.name || t("Nobody")}</dd>
            {data.resolvedAt && (
              <>
                <dt>{t("Resolved")}</dt>
                <dd>{when(data.resolvedAt)}</dd>
              </>
            )}
          </dl>
        </div>
        <div className="card panel">
          <h2>{t("Handle")}</h2>
          {mayManage ? (
            <div className="stack">
              <label>
                {t("Priority")}
                <select disabled={busy} value={data.priority} onChange={(e) => run(() => changeTicket(data.id, { priority: e.target.value as TicketPriority }))}>
                  <option value="high">{t("High")}</option>
                  <option value="medium">{t("Medium")}</option>
                  <option value="low">{t("Low")}</option>
                </select>
              </label>
              <label>
                {t("Status")}
                <select disabled={busy} value={data.status} onChange={(e) => run(() => changeTicket(data.id, { status: e.target.value as TicketStatus }))}>
                  {Object.entries(STATUS_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {t(label)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("Topic")}
                <select disabled={busy} value={data.category} onChange={(e) => run(() => changeTicket(data.id, { category: e.target.value as TicketCategory }))}>
                  {TICKET_CATEGORIES.map(([value, label]) => (
                    <option key={value} value={value}>
                      {t(label)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="row-start">
                {!mine && staff && (
                  <button disabled={busy} onClick={() => run(() => changeTicket(data.id, { assignedTo: staff._id }))}>
                    {t("Take it")}
                  </button>
                )}
                {data.assignedTo && (
                  <button disabled={busy} onClick={() => run(() => changeTicket(data.id, { assignedTo: null }))}>
                    {t("Hand back")}
                  </button>
                )}
                {!finished && (
                  <button className="primary" disabled={busy} onClick={() => run(() => changeTicket(data.id, { status: "resolved" }))}>
                    {t("Mark resolved")}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p className="muted">
              {t("{priority} priority", { priority: t(PRIORITY_LABEL[data.priority]) })} · {t(STATUS_LABEL[data.status])} · {t(CATEGORY_LABEL[data.category] ?? data.category)}
            </p>
          )}
        </div>
      </div>

      <div className="card panel">
        <h2>{t("Notes")}</h2>
        {data.notes.length ? (
          <ul className="plain-list">
            {data.notes.map((n, i) => (
              <li key={i}>
                <strong>{n.by?.name || t("Staff")}</strong> <span className="muted small">{when(n.at)}</span>
                <p>{n.text}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">{t("No notes yet.")}</p>
        )}
        {mayManage && (
          <form
            className="stack"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!note.trim() || busy) return;
              if (await run(() => addTicketNote(data.id, note.trim(), noteKey))) setNote("");
            }}
          >
            <label>
              {t("Add a note")}
              <textarea rows={3} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
            <p className="hint">{t("Notes can't be changed or removed once added. Don't write PINs, codes or full ID numbers here.")}</p>
            <div className="row-end">
              <button className="primary" type="submit" disabled={!note.trim() || busy}>
                {t("Add note")}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="card panel">
        <h2>{t("History")}</h2>
        {data.history.length ? (
          <ul className="plain-list">
            {data.history.map((h, i) => (
              <li key={i} className="small">
                {when(h.at)} · {t("{name} changed {field}", { name: h.by?.name || t("Staff"), field: t(FIELD_LABEL[h.field] ?? h.field) })}
                {h.field === "assignedTo" ? "" : `: ${nice(h.field, h.from, t.language)} → ${nice(h.field, h.to, t.language)}`}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">{t("No changes yet.")}</p>
        )}
      </div>
    </section>
  );
}

function nice(field: string, value: string, language: Language = "en"): string {
  const t = (text: string) => translate(text, language);
  if (!value) return t("none");
  if (field === "status") return t(STATUS_LABEL[value as TicketStatus] ?? value);
  if (field === "priority") return t(PRIORITY_LABEL[value as TicketPriority] ?? value);
  if (field === "category") return t(CATEGORY_LABEL[value] ?? value);
  return value;
}

/** "5.5 hours" or "2.1 days", whichever reads better. */
export function duration(hours: number, language: Language = "en"): string {
  return hours < 48
    ? translate("{n} hours", language, { n: hours })
    : translate("{n} days", language, { n: Math.round((hours / 24) * 10) / 10 });
}

function Figures({ onBack }: { onBack: () => void }) {
  const t = useT();
  const { data, error, loading } = useLoad(ticketStats, []);
  if (!data) {
    return (
      <section>
        <button className="link" onClick={onBack}>
          ← {t("All tickets")}
        </button>
        <LoadState loading={loading} error={error} empty={false} />
      </section>
    );
  }
  const now = data.thisMonth;
  const before = data.lastMonth;
  // Lower is better: a faster average than last month is good news.
  const verdict =
    now && before
      ? now.averageHours < before.averageHours
        ? t("Quicker than last month.")
        : now.averageHours > before.averageHours
          ? t("Slower than last month.")
          : t("The same as last month.")
      : t("Not enough tickets yet to compare with last month.");
  return (
    <section>
      <button className="link" onClick={onBack}>
        ← {t("All tickets")}
      </button>
      <PageHeader title="Ticket figures" intro="How quickly tickets are handled, and what causes them." />
      <div className="grid stats">
        <div className="card tile">
          <span className="muted">{t("Average time to resolve, this month")}</span>
          <strong className="big">{now ? duration(now.averageHours, t.language) : "—"}</strong>
          <span className="muted small">{now ? t("{n} handled", { n: now.handled }) : t("None resolved yet")}</span>
        </div>
        <div className="card tile">
          <span className="muted">{t("Last month")}</span>
          <strong className="big">{before ? duration(before.averageHours, t.language) : "—"}</strong>
          <span className="muted small">{before ? t("{n} handled", { n: before.handled }) : t("None resolved")}</span>
        </div>
      </div>
      <p className="notice">{verdict}</p>
      <div className="card panel">
        <h2>{t("Average time to resolve, by month")}</h2>
        {data.months.length ? (
          <Bars rows={data.months.map((m) => ({ label: monthLabel(m.month), value: m.averageHours, note: `${duration(m.averageHours, t.language)} · ${m.handled}` }))} />
        ) : (
          <p className="muted">{t("Nothing resolved yet.")}</p>
        )}
      </div>
      <div className="two-col">
        <div className="card panel">
          <h2>{t("What causes tickets (last 90 days)")}</h2>
          {data.byCategory.length ? <Bars rows={data.byCategory.map((c) => ({ label: t(CATEGORY_LABEL[c.key] ?? c.key), value: c.count }))} /> : <p className="muted">{t("None yet.")}</p>}
          <p className="hint">{t("The biggest bar is the best place to put effort to cut tickets.")}</p>
        </div>
        <div className="card panel">
          <h2>{t("Waiting now, by priority")}</h2>
          {data.openByPriority.length ? <Bars rows={data.openByPriority.map((c) => ({ label: t(PRIORITY_LABEL[c.key]), value: c.count }))} /> : <p className="muted">{t("Nothing waiting.")}</p>}
        </div>
      </div>
    </section>
  );
}

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

export const PRIORITY_LABEL: Record<TicketPriority, string> = { high: "High", medium: "Medium", low: "Low" };
const PRIORITY_TONE: Record<TicketPriority, "danger" | "warn" | "plain"> = { high: "danger", medium: "warn", low: "plain" };
export const STATUS_LABEL: Record<TicketStatus, string> = { open: "Open", in_progress: "In progress", resolved: "Resolved", closed: "Closed" };
export const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(TICKET_CATEGORIES);
const FIELD_LABEL: Record<string, string> = { priority: "Priority", status: "Status", category: "Topic", assignedTo: "Assigned" };

export function TicketsPage() {
  const { staff } = useAuth();
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
            <button onClick={() => setShowFigures(true)}>Figures</button>
            {mayManage && (
              <button className="primary" onClick={() => setCreating(true)}>
                New ticket
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
        <select aria-label="Priority" value={filters.priority} onChange={(e) => set({ priority: e.target.value as TicketFilters["priority"] })}>
          <option value="all">Any priority</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <label className="check">
          <input type="checkbox" checked={filters.mine} onChange={(e) => set({ mine: e.target.checked })} />
          Mine
        </label>
      </div>
      <form className="row-start search" onSubmit={find}>
        <input placeholder="Search the subject" value={typed} onChange={(e) => setTyped(e.target.value)} />
        <button type="submit">Search</button>
      </form>
      <LoadState loading={loading && !data} error={error} empty={!rows.length} />
      {rows.length > 0 && (
        <div className="table-wrap card">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Subject</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Customer</th>
                <th>Assigned</th>
                <th>Opened</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row: TicketRow) => (
                <tr key={row.id} className="clickable" onClick={() => setOpenId(row.id)}>
                  <td>{row.number}</td>
                  <td>
                    <strong>{row.subject}</strong>
                    <div className="muted small">{CATEGORY_LABEL[row.category]}</div>
                  </td>
                  <td>
                    <Badge tone={PRIORITY_TONE[row.priority]}>{PRIORITY_LABEL[row.priority]}</Badge>
                  </td>
                  <td>{STATUS_LABEL[row.status]}</td>
                  <td>{row.customer?.name || "—"}</td>
                  <td>{row.assignedTo?.name || "Nobody"}</td>
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
      setError(caught instanceof Error ? caught.message : "Could not open the ticket.");
      setBusy(false);
    }
  };

  return (
    <section className="subpage">
      <button className="link" onClick={onBack}>
        ← All tickets
      </button>
      <h1>New ticket</h1>
      <form className="card panel stack" onSubmit={submit}>
        {customer && <p className="notice">For customer: {customer.name || customer.id}</p>}
        <label>
          Subject
          <input value={subject} maxLength={120} onChange={(e) => setSubject(e.target.value)} />
        </label>
        <label>
          What happened
          <textarea rows={4} maxLength={2000} value={detail} onChange={(e) => setDetail(e.target.value)} />
        </label>
        <div className="form-grid">
          <label>
            Priority
            <select value={priority} onChange={(e) => setPriority(e.target.value as TicketPriority)}>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </label>
          <label>
            Topic
            <select value={category} onChange={(e) => setCategory(e.target.value as TicketCategory)}>
              {TICKET_CATEGORIES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="hint">Pick the topic that fits best. The analytics use it to show what causes the most tickets.</p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="row-end">
          <button type="button" onClick={onBack}>
            Cancel
          </button>
          <button className="primary" type="submit" disabled={!ok}>
            Open ticket
          </button>
        </div>
      </form>
    </section>
  );
}

function TicketView({ ticketId, onBack }: { ticketId: string; onBack: () => void }) {
  const { staff } = useAuth();
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
      setFailed(caught instanceof Error ? caught.message : "That did not work. Please try again.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  if (!data) {
    return (
      <section>
        <button className="link" onClick={onBack}>
          ← All tickets
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
        ← All tickets
      </button>
      <PageHeader title={`#${data.number} ${data.subject}`} intro={`Opened ${when(data.createdAt)} by ${data.createdBy?.name || "staff"}`} />
      {failed && (
        <p className="error" role="alert">
          {failed}
        </p>
      )}
      <div className="two-col">
        <div className="card panel">
          <h2>Details</h2>
          {data.detail && <p>{data.detail}</p>}
          <dl className="facts">
            <dt>Customer</dt>
            <dd>{data.customer ? `${data.customer.name} (${data.customer.phone})` : "—"}</dd>
            <dt>Assigned to</dt>
            <dd>{data.assignedTo?.name || "Nobody"}</dd>
            {data.resolvedAt && (
              <>
                <dt>Resolved</dt>
                <dd>{when(data.resolvedAt)}</dd>
              </>
            )}
          </dl>
        </div>
        <div className="card panel">
          <h2>Handle</h2>
          {mayManage ? (
            <div className="stack">
              <label>
                Priority
                <select disabled={busy} value={data.priority} onChange={(e) => run(() => changeTicket(data.id, { priority: e.target.value as TicketPriority }))}>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </label>
              <label>
                Status
                <select disabled={busy} value={data.status} onChange={(e) => run(() => changeTicket(data.id, { status: e.target.value as TicketStatus }))}>
                  {Object.entries(STATUS_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Topic
                <select disabled={busy} value={data.category} onChange={(e) => run(() => changeTicket(data.id, { category: e.target.value as TicketCategory }))}>
                  {TICKET_CATEGORIES.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="row-start">
                {!mine && staff && (
                  <button disabled={busy} onClick={() => run(() => changeTicket(data.id, { assignedTo: staff._id }))}>
                    Take it
                  </button>
                )}
                {data.assignedTo && (
                  <button disabled={busy} onClick={() => run(() => changeTicket(data.id, { assignedTo: null }))}>
                    Hand back
                  </button>
                )}
                {!finished && (
                  <button className="primary" disabled={busy} onClick={() => run(() => changeTicket(data.id, { status: "resolved" }))}>
                    Mark resolved
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p className="muted">
              {PRIORITY_LABEL[data.priority]} priority · {STATUS_LABEL[data.status]} · {CATEGORY_LABEL[data.category]}
            </p>
          )}
        </div>
      </div>

      <div className="card panel">
        <h2>Notes</h2>
        {data.notes.length ? (
          <ul className="plain-list">
            {data.notes.map((n, i) => (
              <li key={i}>
                <strong>{n.by?.name || "Staff"}</strong> <span className="muted small">{when(n.at)}</span>
                <p>{n.text}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No notes yet.</p>
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
              Add a note
              <textarea rows={3} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
            <p className="hint">Notes can't be changed or removed once added. Don't write PINs, codes or full ID numbers here.</p>
            <div className="row-end">
              <button className="primary" type="submit" disabled={!note.trim() || busy}>
                Add note
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="card panel">
        <h2>History</h2>
        {data.history.length ? (
          <ul className="plain-list">
            {data.history.map((h, i) => (
              <li key={i} className="small">
                {when(h.at)} · {h.by?.name || "Staff"} changed {FIELD_LABEL[h.field] ?? h.field}
                {h.field === "assignedTo" ? "" : `: ${nice(h.field, h.from)} → ${nice(h.field, h.to)}`}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No changes yet.</p>
        )}
      </div>
    </section>
  );
}

function nice(field: string, value: string): string {
  if (!value) return "none";
  if (field === "status") return STATUS_LABEL[value as TicketStatus] ?? value;
  if (field === "priority") return PRIORITY_LABEL[value as TicketPriority] ?? value;
  if (field === "category") return CATEGORY_LABEL[value] ?? value;
  return value;
}

/** "5.5 hours" or "2.1 days", whichever reads better. */
export function duration(hours: number): string {
  return hours < 48 ? `${hours} hours` : `${Math.round((hours / 24) * 10) / 10} days`;
}

function Figures({ onBack }: { onBack: () => void }) {
  const { data, error, loading } = useLoad(ticketStats, []);
  if (!data) {
    return (
      <section>
        <button className="link" onClick={onBack}>
          ← All tickets
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
        ? "Quicker than last month."
        : now.averageHours > before.averageHours
          ? "Slower than last month."
          : "The same as last month."
      : "Not enough tickets yet to compare with last month.";
  return (
    <section>
      <button className="link" onClick={onBack}>
        ← All tickets
      </button>
      <PageHeader title="Ticket figures" intro="How quickly tickets are handled, and what causes them." />
      <div className="grid stats">
        <div className="card tile">
          <span className="muted">Average time to resolve, this month</span>
          <strong className="big">{now ? duration(now.averageHours) : "—"}</strong>
          <span className="muted small">{now ? `${now.handled} handled` : "None resolved yet"}</span>
        </div>
        <div className="card tile">
          <span className="muted">Last month</span>
          <strong className="big">{before ? duration(before.averageHours) : "—"}</strong>
          <span className="muted small">{before ? `${before.handled} handled` : "None resolved"}</span>
        </div>
      </div>
      <p className="notice">{verdict}</p>
      <div className="card panel">
        <h2>Average time to resolve, by month</h2>
        {data.months.length ? (
          <Bars rows={data.months.map((m) => ({ label: monthLabel(m.month), value: m.averageHours, note: `${duration(m.averageHours)} · ${m.handled}` }))} />
        ) : (
          <p className="muted">Nothing resolved yet.</p>
        )}
      </div>
      <div className="two-col">
        <div className="card panel">
          <h2>What causes tickets (last 90 days)</h2>
          {data.byCategory.length ? <Bars rows={data.byCategory.map((c) => ({ label: CATEGORY_LABEL[c.key] ?? c.key, value: c.count }))} /> : <p className="muted">None yet.</p>}
          <p className="hint">The biggest bar is the best place to put effort to cut tickets.</p>
        </div>
        <div className="card panel">
          <h2>Waiting now, by priority</h2>
          {data.openByPriority.length ? <Bars rows={data.openByPriority.map((c) => ({ label: PRIORITY_LABEL[c.key], value: c.count }))} /> : <p className="muted">Nothing waiting.</p>}
        </div>
      </div>
    </section>
  );
}

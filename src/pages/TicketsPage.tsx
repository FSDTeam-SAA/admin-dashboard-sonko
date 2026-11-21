import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { can } from "../api/staff";
import {
  addTicketNote,
  cancelKeepAsk,
  changeKeepTicketFiles,
  keepTicketFiles,
  attachTicketFile,
  removeTicketFile,
  ticketFile,
  type TicketDetail,
  type TicketFile,
  translateTicketNote,
  type NoteTranslation,
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
import { ConfirmWithPin } from "../components/ConfirmWithPin";
import { Bars, monthLabel } from "./AnalyticsPage";
import { newIdempotencyKey } from "../lib/idempotency";
import { when } from "../lib/format";
import { useLoad } from "../lib/useLoad";
import { useT, type Language, translate } from "../i18n/language";

export const PRIORITY_LABEL: Record<TicketPriority, string> = { high: "High", medium: "Medium", low: "Low" };
export const PRIORITY_TONE: Record<TicketPriority, "danger" | "warn" | "ok"> = { high: "danger", medium: "warn", low: "ok" };
export const STATUS_LABEL: Record<TicketStatus, string> = { open: "Open", in_progress: "In progress", resolved: "Resolved", closed: "Closed" };
export const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(TICKET_CATEGORIES);
const FIELD_LABEL: Record<string, string> = { priority: "Priority", status: "Status", category: "Topic", assignedTo: "Assigned" };

export function TicketsPage() {
  const { staff } = useAuth();
  const t = useT();
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState<TicketFilters>({ status: "active", priority: "all", mine: false, search: "", sort: "urgent" });
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
        <select aria-label={t("Order")} value={filters.sort} onChange={(e) => set({ sort: e.target.value as TicketFilters["sort"] })}>
          <option value="urgent">{t("Most urgent first")}</option>
          <option value="newest">{t("Newest first")}</option>
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
                    {row.overdue && (
                      <div>
                        <Badge tone="danger">Overdue</Badge>
                        <div className="muted small">{t("No update since {time}").replace("{time}", when(row.updatedAt ?? row.createdAt))}</div>
                      </div>
                    )}
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
  // Hidden until the server has its Google key and this person is allowed.
  const canTranslate = Boolean(staff?.translationOn) && can(staff, "translate_notes") && can(staff, "view_tickets");

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
          {data.erased ? (
            <p className="muted">{t("This ticket was wiped after six years. Its words are gone; only the figures stay. It can't be changed.")}</p>
          ) : mayManage ? (
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
                {canTranslate && <NoteTranslate ticketId={data.id} index={i} />}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">{t("No notes yet.")}</p>
        )}
        {mayManage && !data.erased && (
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
            {Boolean(staff?.translationOn) && <p className="hint">{t("Keep names to what you need. Notes can be translated by Google, which cannot hide names.")}</p>}
            <div className="row-end">
              <button className="primary" type="submit" disabled={!note.trim() || busy}>
                {t("Add note")}
              </button>
            </div>
          </form>
        )}
      </div>

      <TicketFiles ticket={data} mayManage={mayManage} onChanged={reload} />
      <TicketKeepBox ticket={data} onChanged={reload} />

      <div className="card panel">
        <h2>{t("History")}</h2>
        {data.history.length ? (
          <ul className="plain-list">
            {data.history.map((h, i) => (
              <li key={i} className="small">
                {when(h.at)} ·{" "}
                {h.field === "ticket_erased"
                  ? t("The ticket's words were wiped automatically after six years.")
                  : h.field === "file_expired"
                  ? t("A file was deleted automatically after six years.")
                  : h.field === "keep"
                    ? h.to && !h.from
                      ? t("{name} kept the files until {date}", { name: h.by?.name || t("Staff"), date: h.to })
                      : h.to
                        ? t("{name} changed the keep date: {from} → {to}", { name: h.by?.name || t("Staff"), from: h.from, to: h.to })
                        : t("{name} ended keeping the files longer", { name: h.by?.name || t("Staff") })
                    : h.field === "file"
                  ? t("{name} attached a file: {file}", { name: h.by?.name || t("Staff"), file: h.to || t("deleted") })
                  : h.field === "file_removed"
                    ? t("{name} took off a file: {file}", { name: h.by?.name || t("Staff"), file: h.from || t("deleted") })
                    : `${t("{name} changed {field}", { name: h.by?.name || t("Staff"), field: t(FIELD_LABEL[h.field] ?? h.field) })}${h.field === "assignedTo" ? "" : `: ${nice(h.field, h.from, t.language)} → ${nice(h.field, h.to, t.language)}`}`}
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

/**
 * "Translate" under a note: shows a translation to this reader only. The
 * note is not changed and the translation is not saved anywhere.
 */
function NoteTranslate({ ticketId, index }: { ticketId: string; index: number }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<NoteTranslation | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  return (
    <div>
      {!result && (
        <button
          type="button"
          className="link"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setProblem(null);
            try {
              setResult(await translateTicketNote(ticketId, index, t.language));
            } catch (caught) {
              setProblem(caught instanceof Error ? caught.message : "Translation did not work. Please try again.");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? t("Translating…") : t("Translate")}
        </button>
      )}
      {problem && (
        <p className="error" role="alert">
          {t(problem)}
        </p>
      )}
      {result &&
        (result.sameLanguage ? (
          <p className="muted small">{t("This note is already in your language.")}</p>
        ) : (
          <div className="notice">
            <p>{result.text}</p>
            <p className="muted small">
              {t("Translated by Google. The note itself is unchanged.")}
              {result.partlyHidden ? ` ${t("Some numbers could not be placed back.")}` : ""}
            </p>
            <button type="button" className="link" onClick={() => setResult(null)}>
              {t("Hide translation")}
            </button>
          </div>
        ))}
    </div>
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

const FILE_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const MAX_FILE = 5 * 1024 * 1024;
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "application/pdf": "pdf" };

export function fileSize(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** What is wrong with a chosen file before sending it, or null. The server checks again. */
export function pickProblem(file: { type: string; size: number } | null): string | null {
  if (!file) return "Choose a file to attach.";
  if (!FILE_TYPES.includes(file.type)) return "Only JPG, PNG or PDF files can be attached.";
  if (file.size > MAX_FILE) return "The file is bigger than 5 MB.";
  return null;
}

/**
 * Evidence files on a ticket. Seeing and adding them needs ticket_files.
 * Files always download; pictures can also be looked at here.
 */
function TicketFiles({ ticket: data, mayManage, onChanged }: { ticket: TicketDetail; mayManage: boolean; onChanged: () => void }) {
  const { staff } = useAuth();
  const t = useT();
  const [picked, setPicked] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [viewing, setViewing] = useState<{ url: string; name: string } | null>(null);
  const [removing, setRemoving] = useState<TicketFile | null>(null);
  const [inputKey, setInputKey] = useState(0);
  const key = useMemo(newIdempotencyKey, [data.files?.length]);
  useEffect(() => () => (viewing ? URL.revokeObjectURL(viewing.url) : undefined), [viewing]);

  if (!data.files) {
    if (!data.fileCount) return null;
    return (
      <div className="card panel">
        <h2>{t("Files")}</h2>
        <p className="muted">{t("This ticket has {n} files. Seeing them needs the ticket files permission.", { n: data.fileCount })}</p>
      </div>
    );
  }
  const live = data.files.filter((f) => !f.removed);
  const mayAdd = mayManage && can(staff, "ticket_files") && Boolean(staff?.filesOn) && data.status !== "closed" && live.length < 10;
  const fileName = (f: TicketFile) => `ticket-${data.number}-file-${f.index + 1}.${EXT[f.type] ?? "bin"}`;

  const fetchFile = async (f: TicketFile) => {
    setFailed(null);
    try {
      return await ticketFile(data.id, f.id);
    } catch (caught) {
      setFailed(caught instanceof Error ? caught.message : "That did not work. Please try again.");
      return null;
    }
  };
  const download = async (f: TicketFile) => {
    const blob = await fetchFile(f);
    if (!blob) return;
    const url = URL.createObjectURL(new Blob([blob], { type: "application/octet-stream" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName(f);
    a.rel = "noopener";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };
  const view = async (f: TicketFile) => {
    const blob = await fetchFile(f);
    if (blob) setViewing({ url: URL.createObjectURL(new Blob([blob], { type: f.type })), name: f.name });
  };
  const problem = pickProblem(picked);
  const noteOk = note.trim().length >= 3 && note.trim().length <= 200;

  return (
    <div className="card panel">
      <h2>{t("Files")}</h2>
      {failed && (
        <p className="error" role="alert">
          {t(failed)}
        </p>
      )}
      {data.files.length ? (
        <ul className="plain-list">
          {data.files.map((f) =>
            f.removed ? (
              <li key={f.id} className="muted small">
                {f.expired ? t("A file was deleted after six years, {when}.", { when: when(f.removedAt) }) : t("A file was taken off by {name}, {when}.", { name: f.by?.name || t("Staff"), when: when(f.removedAt) })}
              </li>
            ) : (
              <li key={f.id}>
                <strong>{f.name}</strong> <span className="muted small">{f.type === "application/pdf" ? "PDF" : t("Picture")} · {fileSize(f.size)}</span>
                <p>{f.note}</p>
                <p className="muted small">{t("Attached by {name}, {when}", { name: f.by?.name || t("Staff"), when: when(f.at) })}</p>
                <div className="row-start">
                  <button onClick={() => download(f)}>{t("Download")}</button>
                  {f.type !== "application/pdf" && <button onClick={() => view(f)}>{t("View")}</button>}
                  {f.canRemove && (
                    <button className="danger" onClick={() => setRemoving(f)}>
                      {t("Take off")}
                    </button>
                  )}
                </div>
              </li>
            ),
          )}
        </ul>
      ) : (
        <p className="muted">{t("No files yet.")}</p>
      )}
      {mayManage && can(staff, "ticket_files") && !staff?.filesOn && <p className="hint">{t("Files can't be attached until the developer sets up file storage.")}</p>}
      {mayAdd && (
        <form
          className="stack"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!picked || problem || !noteOk || busy) return;
            setBusy(true);
            setFailed(null);
            try {
              await attachTicketFile(data.id, picked, note.trim(), key);
              setPicked(null);
              setNote("");
              setInputKey((n) => n + 1);
              onChanged();
            } catch (caught) {
              setFailed(caught instanceof Error ? caught.message : "That did not work. Please try again.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            {t("Attach a file")}
            <input key={inputKey} type="file" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" onChange={(e) => setPicked(e.target.files?.[0] ?? null)} />
          </label>
          {picked && problem && <p className="hint warn-text">{t(problem)}</p>}
          <label>
            {t("What is this file?")}
            <input value={note} maxLength={200} placeholder={t("For example: bank statement the customer emailed")} onChange={(e) => setNote(e.target.value)} />
          </label>
          <p className="hint">{t("JPG, PNG or PDF, up to 5 MB. Pictures are redrawn and lose their location details. PDFs that can run things are refused. Only you can take a file off, and only in the first 10 minutes.")}</p>
          <div className="row-end">
            <button className="primary" type="submit" disabled={!picked || Boolean(problem) || !noteOk || busy}>
              {busy ? t("Attaching…") : t("Attach")}
            </button>
          </div>
        </form>
      )}
      {viewing && (
        <div className="overlay" role="presentation" onClick={() => setViewing(null)}>
          <div className="card dialog stack" role="dialog" aria-modal="true" aria-label={viewing.name} onClick={(e) => e.stopPropagation()}>
            <h2>{viewing.name}</h2>
            <img src={viewing.url} alt={viewing.name} style={{ maxWidth: "100%", maxHeight: "70vh", objectFit: "contain" }} />
            <div className="row-end">
              <button onClick={() => setViewing(null)}>{t("Close")}</button>
            </div>
          </div>
        </div>
      )}
      {removing && (
        <ConfirmWithPin
          title="Take off this file"
          confirmLabel="Take off"
          danger
          needsPin={false}
          onClose={() => setRemoving(null)}
          onConfirm={async () => {
            await removeTicketFile(data.id, removing.id);
            setRemoving(null);
            onChanged();
          }}
        >
          <p>{t("{name} is deleted for good. Use this only for a wrong file.", { name: removing.name })}</p>
        </ConfirmWithPin>
      )}
    </div>
  );
}

const day = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : "");

/**
 * Keep a ticket's files past the six years (fraud, police, a dispute).
 * One person sets it; changing the date or ending it needs a second person.
 */
function TicketKeepBox({ ticket: data, onChanged }: { ticket: TicketDetail; onChanged: () => void }) {
  const { staff } = useAuth();
  const t = useT();
  const mayKeep = can(staff, "keep_ticket_files") && can(staff, "view_tickets");
  const [open, setOpen] = useState<null | "set" | "change" | "end" | "approve">(null);
  const [until, setUntil] = useState("");
  const [reason, setReason] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const key = useMemo(newIdempotencyKey, [open, data.keep?.until, data.keep?.ask?.at]);
  const keep = data.keep;
  if (!keep && (!mayKeep || data.erased)) return null;
  const ask = keep?.ask ?? null;
  const askMine = ask?.by?.id === staff?._id;
  const reasonOk = reason.trim().length >= 10 && reason.trim().length <= 300;
  const close = () => {
    setOpen(null);
    setUntil("");
    setReason("");
  };
  const finish = (message: string) => {
    close();
    setDone(message);
    onChanged();
  };

  return (
    <div className="card panel">
      <h2>{t("Keep longer")}</h2>
      {done && <p className="notice">{t(done)}</p>}
      {!keep ? (
        <p className="muted">{t("Files and notes are deleted six years after the ticket is finished and the customer has stopped using SunuPay. For fraud, the police or a dispute, keep them longer.")}</p>
      ) : (
        <>
          <p>
            <Badge tone="warn">{t("Kept until {date}", { date: day(keep.until) })}</Badge> {keep.reason}
          </p>
          <p className="muted small">{t("Set by {name}, {when}", { name: keep.by?.name || t("Staff"), when: when(keep.at) })}</p>
          {ask && (
            <p className="notice">
              {ask.action === "end"
                ? t("{name} asked to end this: {reason}", { name: ask.by?.name || t("Staff"), reason: ask.reason })
                : t("{name} asked to change the date to {date}: {reason}", { name: ask.by?.name || t("Staff"), date: day(ask.until), reason: ask.reason })}
            </p>
          )}
        </>
      )}
      {mayKeep && (
        <div className="row-start">
          {!keep && <button onClick={() => setOpen("set")}>{t("Keep these files longer")}</button>}
          {keep && !ask && (
            <>
              <button onClick={() => setOpen("change")}>{t("Change the date")}</button>
              <button className="danger" onClick={() => setOpen("end")}>
                {t("End it")}
              </button>
            </>
          )}
          {ask && !askMine && (
            <button className="primary" onClick={() => setOpen("approve")}>
              {t("Review and approve")}
            </button>
          )}
          {ask && askMine && (
            <button
              onClick={async () => {
                await cancelKeepAsk(data.id).catch(() => undefined);
                finish("Request cancelled.");
              }}
            >
              {t("Cancel my request")}
            </button>
          )}
        </div>
      )}
      {open === "set" && (
        <ConfirmWithPin
          title="Keep these files longer"
          confirmLabel="Keep"
          canConfirm={Boolean(until) && reasonOk}
          onClose={close}
          onConfirm={async (pin) => {
            await keepTicketFiles(data.id, { until: new Date(`${until}T23:59:59Z`).toISOString(), reason: reason.trim(), pin }, key);
            finish("These files are now kept until the date you chose.");
          }}
        >
          <KeepFields until={until} setUntil={setUntil} reason={reason} setReason={setReason} />
        </ConfirmWithPin>
      )}
      {(open === "change" || open === "end") && keep && (
        <ConfirmWithPin
          title={open === "end" ? "End keeping these files longer" : "Change the keep date"}
          confirmLabel="Ask a second person"
          danger={open === "end"}
          canConfirm={(open === "end" || Boolean(until)) && reasonOk}
          onClose={close}
          onConfirm={async (pin) => {
            await changeKeepTicketFiles(data.id, { action: open === "end" ? "end" : "change", until: open === "change" ? new Date(`${until}T23:59:59Z`).toISOString() : undefined, reason: reason.trim(), pin }, key);
            finish("Asked. A different staff member must approve it within 24 hours.");
          }}
        >
          {open === "end" && <p>{t("Once ended, files and notes older than six years are deleted at the next nightly clean-up.")}</p>}
          <KeepFields until={until} setUntil={setUntil} reason={reason} setReason={setReason} withDate={open === "change"} />
        </ConfirmWithPin>
      )}
      {open === "approve" && ask && (
        <ConfirmWithPin
          title={ask.action === "end" ? "Approve ending this" : "Approve the new date"}
          confirmLabel="Approve"
          danger={ask.action === "end"}
          onClose={close}
          onConfirm={async (pin) => {
            await changeKeepTicketFiles(data.id, { action: ask.action, until: ask.until ?? undefined, pin }, key);
            finish("Approved. The change is made.");
          }}
        >
          <p>
            {ask.action === "end"
              ? t("{name} asked to end this: {reason}", { name: ask.by?.name || t("Staff"), reason: ask.reason })
              : t("{name} asked to change the date to {date}: {reason}", { name: ask.by?.name || t("Staff"), date: day(ask.until), reason: ask.reason })}
          </p>
          {ask.action === "end" && <p className="hint warn-text">{t("Once ended, files and notes older than six years are deleted at the next nightly clean-up.")}</p>}
        </ConfirmWithPin>
      )}
    </div>
  );
}

function KeepFields({ until, setUntil, reason, setReason, withDate = true }: { until: string; setUntil: (v: string) => void; reason: string; setReason: (v: string) => void; withDate?: boolean }) {
  const t = useT();
  const today = new Date();
  const min = new Date(today.getTime() + 2 * 864e5).toISOString().slice(0, 10);
  const max = new Date(today.getTime() + 3650 * 864e5).toISOString().slice(0, 10);
  return (
    <>
      {withDate && (
        <label>
          {t("Keep until")}
          <input type="date" min={min} max={max} value={until} onChange={(e) => setUntil(e.target.value)} />
          <span className="hint">{t("Ten years from today at most.")}</span>
        </label>
      )}
      <label>
        {t("Why")}
        <textarea rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
        <span className="hint">{t("10 to 300 characters, for example the police reference.")}</span>
      </label>
    </>
  );
}

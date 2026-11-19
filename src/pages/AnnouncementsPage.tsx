import { useMemo, useState } from "react";
import {
  announcements,
  approveAnnouncement,
  withdrawAnnouncement,
  writeAnnouncement,
  type Announcement,
  type AnnouncementDraft,
  type AnnouncementState,
} from "../api/admin";
import { useAuth } from "../auth/AuthContext";
import { Badge, LoadState, PageHeader } from "../components/common";
import { ConfirmWithPin } from "../components/ConfirmWithPin";
import { when } from "../lib/format";
import { newIdempotencyKey } from "../lib/idempotency";
import { useLoad } from "../lib/useLoad";
import { useT } from "../i18n/language";

export const STATE_LABEL: Record<
  AnnouncementState,
  { label: string; tone: "ok" | "warn" | "danger" | "plain" }
> = {
  waiting: { label: "Waiting for approval", tone: "warn" },
  scheduled: { label: "Approved, starts later", tone: "plain" },
  live: { label: "Showing now", tone: "ok" },
  ended: { label: "Ended", tone: "plain" },
  withdrawn: { label: "Taken down", tone: "danger" },
};
export const AUDIENCE_LABEL = {
  all: "Everyone",
  user: "Customers",
  agent: "Agents",
} as const;

// Same check as the server (utils/announcement.rules.js), so staff see the
// problem before sending. The server checks again.
const LINK =
  /(https?:|www\.|\b[a-z0-9-]+\.(com|app|net|org|io|me|ly|gm|sn|co|uk|info|link|xyz)\b|@[a-z0-9-]+\.)/i;
const PHONE = /\+?\d[\d\s.\-()]{5,}\d/;
export function textProblem(value: string, max: number): string | null {
  const text = value.trim();
  if (text.length < 3 || text.length > max) return `3 to ${max} characters.`;
  if (LINK.test(text)) return "No links, web or email addresses.";
  if ((text.match(PHONE)?.[0] ?? "").replace(/\D/g, "").length >= 7)
    return "No phone numbers.";
  return null;
}

const inDays = (days: number) => {
  const d = new Date(Date.now() + days * 86_400_000);
  d.setSeconds(0, 0);
  return d.toISOString().slice(0, 16);
};

/**
 * Announcements to customers in the app. One staff member writes, a
 * different one approves, and only then do customers see it. Anyone with the
 * permission can take one down at once.
 */
export function AnnouncementsPage() {
  const t = useT();
  const { staff } = useAuth();
  const [reload, setReload] = useState(0);
  const [writing, setWriting] = useState(false);
  const [approving, setApproving] = useState<Announcement | null>(null);
  const [removing, setRemoving] = useState<Announcement | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const { data, error, loading } = useLoad(() => announcements(), [reload]);
  const rows = data ?? [];
  const finish = (message: string) => {
    setWriting(false);
    setApproving(null);
    setRemoving(null);
    setDone(message);
    setReload((n) => n + 1);
  };

  return (
    <section>
      <PageHeader
        title="Announcements"
        intro="Short notices customers see on the app's Home screen, in English or French. A different staff member must approve each one. Links and phone numbers are not allowed, so customers know a real SunuPay announcement never asks them to call or click."
        actions={
          <button className="primary" onClick={() => setWriting(true)}>
            {t("Write an announcement")}
          </button>
        }
      />
      {done && <p className="notice">{t(done)}</p>}
      <LoadState
        loading={loading && !data}
        error={error}
        empty={!rows.length}
      />
      {rows.map((a) => (
        <article
          key={a.id}
          className="card"
          style={{ padding: 16, marginBottom: 12 }}
        >
          <p>
            <Badge tone={STATE_LABEL[a.state].tone}>
              {t(STATE_LABEL[a.state].label)}
            </Badge>{" "}
            <span className="muted small">
              {t(AUDIENCE_LABEL[a.audience])} ·{" "}
              {a.country === "ALL" ? t("All countries") : a.country} ·{" "}
              {t("{from} to {to}", { from: when(a.startsAt), to: when(a.endsAt) })}
            </span>
          </p>
          <h3>{a.titleEn}</h3>
          <p>{a.bodyEn}</p>
          <p className="muted">
            <strong>{a.titleFr}</strong> — {a.bodyFr}
          </p>
          <p className="muted small">
            {t("Written by {name}, {when}", { name: a.createdByName || "—", when: when(a.createdAt) })}
            {a.approvedAt
              ? ` · ${t("Approved by {name}, {when}", { name: a.approvedByName || "—", when: when(a.approvedAt) })}`
              : ""}
            {a.withdrawnAt
              ? ` · ${t("Taken down by {name}, {when}", { name: a.withdrawnByName || "—", when: when(a.withdrawnAt) })}${a.withdrawReason ? `: ${a.withdrawReason}` : ""}`
              : ""}
          </p>
          {a.state === "waiting" && a.createdBy !== staff?._id && (
            <button onClick={() => setApproving(a)}>{t("Review and approve")}</button>
          )}
          {a.state === "waiting" && a.createdBy === staff?._id && (
            <p className="hint">
              {t("You wrote this. A different staff member must approve it.")}
            </p>
          )}
          {(a.state === "waiting" ||
            a.state === "scheduled" ||
            a.state === "live") && (
            <button className="danger" onClick={() => setRemoving(a)}>
              {t("Take down")}
            </button>
          )}
        </article>
      ))}
      {writing && (
        <WriteDialog onClose={() => setWriting(false)} onDone={finish} />
      )}
      {removing && (
        <TakeDownDialog
          a={removing}
          onClose={() => setRemoving(null)}
          onDone={finish}
        />
      )}
      {approving && (
        <ApproveDialog
          a={approving}
          onClose={() => setApproving(null)}
          onDone={finish}
        />
      )}
    </section>
  );
}

function WriteDialog({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: (m: string) => void;
}) {
  const t = useT();
  const [draft, setDraft] = useState<AnnouncementDraft>({
    titleEn: "",
    titleFr: "",
    bodyEn: "",
    bodyFr: "",
    country: "ALL",
    audience: "all",
    startsAt: inDays(0),
    endsAt: inDays(7),
  });
  const key = useMemo(newIdempotencyKey, []);
  const set = (field: keyof AnnouncementDraft) => (value: string) =>
    setDraft({ ...draft, [field]: value });
  const problems = {
    titleEn: textProblem(draft.titleEn, 80),
    titleFr: textProblem(draft.titleFr, 80),
    bodyEn: textProblem(draft.bodyEn, 400),
    bodyFr: textProblem(draft.bodyFr, 400),
  };
  const ok =
    Object.values(problems).every((p) => p === null) &&
    /^(ALL|[A-Z]{2})$/.test(draft.country) &&
    draft.endsAt > draft.startsAt;
  const field = (
    name: "titleEn" | "titleFr" | "bodyEn" | "bodyFr",
    label: string,
    max: number,
  ) => (
    <label>
      {t(label)}
      {name.startsWith("title") ? (
        <input
          value={draft[name]}
          maxLength={max}
          onChange={(e) => set(name)(e.target.value)}
        />
      ) : (
        <textarea
          rows={3}
          value={draft[name]}
          maxLength={max}
          onChange={(e) => set(name)(e.target.value)}
        />
      )}
      {draft[name] && problems[name] && (
        <span className="hint warn-text">{problems[name]!.startsWith("3 to ") ? t("3 to {max} characters.", { max }) : t(problems[name]!)}</span>
      )}
    </label>
  );
  return (
    <ConfirmWithPin
      title="Write an announcement"
      confirmLabel="Send for approval"
      canConfirm={ok}
      onClose={onClose}
      onConfirm={async (pin) => {
        await writeAnnouncement(
          {
            ...draft,
            startsAt: new Date(draft.startsAt).toISOString(),
            endsAt: new Date(draft.endsAt).toISOString(),
          },
          pin,
          key,
        );
        onDone(
          "Written. A different staff member must approve it before customers see it.",
        );
      }}
    >
      {field("titleEn", "Title (English)", 80)}
      {field("bodyEn", "Message (English)", 400)}
      {field("titleFr", "Title (French)", 80)}
      {field("bodyFr", "Message (French)", 400)}
      <label>
        {t("Who sees it")}
        <select
          value={draft.audience}
          onChange={(e) => set("audience")(e.target.value)}
        >
          <option value="all">{t("Everyone")}</option>
          <option value="user">{t("Customers only")}</option>
          <option value="agent">{t("Agents only")}</option>
        </select>
      </label>
      <label>
        {t("Country (two letters, or ALL)")}
        <input
          value={draft.country}
          maxLength={3}
          onChange={(e) => set("country")(e.target.value.toUpperCase())}
        />
      </label>
      <label>
        {t("Starts")}
        <input
          type="datetime-local"
          value={draft.startsAt}
          onChange={(e) => set("startsAt")(e.target.value)}
        />
      </label>
      <label>
        {t("Ends (30 days at most)")}
        <input
          type="datetime-local"
          value={draft.endsAt}
          onChange={(e) => set("endsAt")(e.target.value)}
        />
      </label>
    </ConfirmWithPin>
  );
}

function ApproveDialog({
  a,
  onClose,
  onDone,
}: {
  a: Announcement;
  onClose: () => void;
  onDone: (m: string) => void;
}) {
  const t = useT();
  const key = useMemo(newIdempotencyKey, []);
  return (
    <ConfirmWithPin
      title="Approve this announcement"
      confirmLabel="Approve"
      onClose={onClose}
      onConfirm={async (pin) => {
        await approveAnnouncement(a.id, pin, key);
        onDone("Approved. Customers will see it from its start time.");
      }}
    >
      <p>
        {t("{who} in {country} will see this from {from} to {to}. Read both languages: you are the second check.", { who: t(AUDIENCE_LABEL[a.audience]), country: a.country === "ALL" ? t("all countries") : a.country, from: when(a.startsAt), to: when(a.endsAt) })}
      </p>
      <p>
        <strong>{a.titleEn}</strong>
        <br />
        {a.bodyEn}
      </p>
      <p>
        <strong>{a.titleFr}</strong>
        <br />
        {a.bodyFr}
      </p>
    </ConfirmWithPin>
  );
}

function TakeDownDialog({
  a,
  onClose,
  onDone,
}: {
  a: Announcement;
  onClose: () => void;
  onDone: (m: string) => void;
}) {
  const t = useT();
  const [reason, setReason] = useState("");
  return (
    <ConfirmWithPin
      title="Take down this announcement"
      confirmLabel="Take down now"
      danger
      needsPin={false}
      onClose={onClose}
      onConfirm={async () => {
        await withdrawAnnouncement(a.id, reason.trim());
        onDone("Taken down. Customers no longer see it.");
      }}
    >
      <p>
        {t("\"{title}\" stops showing straight away. This can't be undone: to show it again, write it again.", { title: a.titleEn })}
      </p>
      <label>
        {t("Why (optional)")}
        <input
          value={reason}
          maxLength={300}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
    </ConfirmWithPin>
  );
}

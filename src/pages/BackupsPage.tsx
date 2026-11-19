import { useMemo, useState } from "react";
import { backupStatus, recordRestoreTest, type BackupCopy, type BackupLevel } from "../api/admin";
import { can } from "../api/staff";
import { useAuth } from "../auth/AuthContext";
import { Badge, LoadState, PageHeader, TextArea, okLength } from "../components/common";
import { ConfirmWithPin } from "../components/ConfirmWithPin";
import { personLabel, when } from "../lib/format";
import { newIdempotencyKey } from "../lib/idempotency";
import { useLoad } from "../lib/useLoad";
import { useT } from "../i18n/language";
import { tp } from "../i18n/patterns";

const LEVEL_LABEL: Record<BackupLevel, string> = { ok: "All good", warning: "Needs a look", alert: "Act today" };
const LEVEL_TONE: Record<BackupLevel, "ok" | "warn" | "danger"> = { ok: "ok", warning: "warn", alert: "danger" };
const STATUS_LABEL: Record<BackupCopy["status"], string> = {
  completed: "Finished",
  failed: "Failed",
  inProgress: "Running",
  queued: "Waiting",
  unknown: "Unknown",
};

const size = (bytes: number | null, t: (text: string) => string) => {
  if (bytes === null) return "—";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} ${t("KB")}`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} ${t("MB")}`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} ${t("GB")}`;
};

/** Whether the database is being backed up. Read only; a restore test is only a record. */
export function BackupsPage() {
  const { staff } = useAuth();
  const t = useT();
  const { data, error, loading, reload } = useLoad(() => backupStatus(), []);
  const [recording, setRecording] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const mayRecord = can(staff, "record_restore_tests");

  return (
    <section>
      <PageHeader title="Backups" intro="Shows whether the database is being backed up, and when someone last proved a backup can be restored. You can look but not change anything here." />
      {done && <p className="notice">{t(done)}</p>}
      <LoadState loading={loading && !data} error={error} empty={false} />
      {data && (
        <>
          <article className="card" style={{ padding: 16, marginBottom: 12 }}>
            <p>
              <Badge tone={LEVEL_TONE[data.level]}>{LEVEL_LABEL[data.level]}</Badge> <span className="muted small">{t("Checked {when}", { when: when(data.checkedAt) })}</span>
            </p>
            <p>{tp(t, data.message)}</p>
            <button onClick={reload}>{t("Check again")}</button>
          </article>

          {data.backups && (
            <article className="card" style={{ padding: 16, marginBottom: 12 }}>
              <h3>{t("Backup copies")}</h3>
              <dl className="facts">
                <dt>{t("Newest finished copy")}</dt>
                <dd>{when(data.backups.newestAt)}</dd>
                <dt>{t("Oldest copy kept")}</dt>
                <dd>{when(data.backups.oldestAt)}</dd>
                <dt>{t("Finished copies")}</dt>
                <dd>{data.backups.finishedCount}</dd>
              </dl>
              <table>
                <thead>
                  <tr>
                    <th>{t("Taken")}</th>
                    <th>{t("Result")}</th>
                    <th>{t("Kind")}</th>
                    <th>{t("Size")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.backups.recent.map((c) => (
                    <tr key={c.at}>
                      <td>{when(c.at)}</td>
                      <td>
                        <Badge tone={c.status === "completed" ? "ok" : c.status === "failed" ? "danger" : "plain"}>{STATUS_LABEL[c.status]}</Badge>
                      </td>
                      <td>{t(c.kind === "scheduled" ? "Scheduled" : "On demand")}</td>
                      <td>{size(c.sizeBytes, t)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          )}

          <article className="card" style={{ padding: 16, marginBottom: 12 }}>
            <h3>{t("Restore tests")}</h3>
            <p>
              <Badge tone={LEVEL_TONE[data.restoreTests.level]}>{LEVEL_LABEL[data.restoreTests.level]}</Badge>
            </p>
            <p>{tp(t, data.restoreTests.message)}</p>
            <p className="hint">{t("A backup only counts once someone has restored a copy to a spare database and checked the data is there. Do this at least every 3 months.")}</p>
            {data.restoreTests.recent.map((r) => (
              <p key={r.id} className="muted small">
                {t("{when}, {name}: {result}. {note}", { when: when(r.at), name: personLabel(r.by), result: t(r.outcome === "worked" ? "It worked" : "It failed"), note: r.note })}
              </p>
            ))}
            {mayRecord && <button style={{ marginTop: 12 }} onClick={() => setRecording(true)}>{t("Record a restore test")}</button>}
          </article>
        </>
      )}
      {recording && (
        <RecordRestore
          onClose={() => setRecording(false)}
          onDone={() => {
            setRecording(false);
            setDone("Restore test recorded.");
            reload();
          }}
        />
      )}
    </section>
  );
}

function RecordRestore({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const t = useT();
  const key = useMemo(newIdempotencyKey, []);
  const [outcome, setOutcome] = useState<"worked" | "failed">("worked");
  const [note, setNote] = useState("");
  return (
    <ConfirmWithPin
      title="Record a restore test"
      confirmLabel="Save record"
      needsPin={false}
      canConfirm={okLength(note, 10, 300)}
      onClose={onClose}
      onConfirm={async () => {
        await recordRestoreTest({ outcome, note: note.trim() }, key);
        onDone();
      }}
    >
      <p>{t("This only records what happened. It does not restore or change anything.")}</p>
      <label>
        {t("Did the restore work?")}
        <select value={outcome} onChange={(e) => setOutcome(e.target.value as "worked" | "failed")}>
          <option value="worked">{t("It worked")}</option>
          <option value="failed">{t("It failed")}</option>
        </select>
      </label>
      <TextArea label="What was restored and checked" value={note} onChange={setNote} min={10} max={300} />
    </ConfirmWithPin>
  );
}

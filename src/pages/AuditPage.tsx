import { useState } from "react";
import { auditTrail, type AuditEvent, type AuditKind } from "../api/admin";
import { Badge, LoadState, PageHeader, Pager, Tabs } from "../components/common";
import { when } from "../lib/format";
import { useLoad } from "../lib/useLoad";

/** What a line means, in plain words. */
export function describeEvent(e: Pick<AuditEvent, "kind" | "method" | "route">): string {
  switch (e.kind) {
    case "login_pin":
      return "Entered their PIN correctly";
    case "login_failed":
      return "Wrong PIN";
    case "login_complete":
      return "Logged in";
    case "login_code_failed":
      return "Wrong or locked authenticator code";
    default: {
      const route = e.route.replace(/^\/api\/v\d+/, "");
      return `${e.method} ${route}`;
    }
  }
}

export function resultOf(e: Pick<AuditEvent, "kind" | "status">): { label: string; tone: "ok" | "danger" | "warn" | "plain" } {
  if (e.kind === "login_failed" || e.kind === "login_code_failed") return { label: "Refused", tone: "danger" };
  if (e.kind !== "action" || e.status === null) return { label: "OK", tone: "ok" };
  if (e.status < 300) return { label: "Done", tone: "ok" };
  if (e.status === 401 || e.status === 403) return { label: "Not allowed", tone: "danger" };
  if (e.status < 500) return { label: "Refused", tone: "warn" };
  return { label: "Error", tone: "danger" };
}

export function AuditPage() {
  const [kind, setKind] = useState<AuditKind | "all">("all");
  const [who, setWho] = useState<{ id: string; name: string } | null>(null);
  const [page, setPage] = useState(1);
  const { data, error, loading } = useLoad(() => auditTrail(kind, who?.id ?? null, page), [kind, who?.id, page]);
  const rows = data?.events ?? [];

  return (
    <section>
      <PageHeader title="Audit trail" intro="Every staff login step and action, newest first. Nothing here can be changed or removed. PINs, codes and what was typed are never saved." />
      <Tabs
        value={kind}
        options={[
          ["all", "Everything"],
          ["action", "Actions"],
          ["login_complete", "Logins"],
          ["login_failed", "Wrong PINs"],
          ["login_code_failed", "Wrong codes"],
        ] as const}
        onChange={(v) => {
          setKind(v);
          setPage(1);
        }}
      />
      {who && (
        <p className="notice">
          Showing {who.name || "one person"} only.{" "}
          <button
            className="link"
            onClick={() => {
              setWho(null);
              setPage(1);
            }}
          >
            Show everyone
          </button>
        </p>
      )}
      <LoadState loading={loading && !data} error={error} empty={!rows.length} />
      {rows.length > 0 && (
        <div className="table-wrap card">
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Who</th>
                <th>What</th>
                <th>Result</th>
                <th>Address</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => {
                const r = resultOf(e);
                return (
                  <tr key={e.id}>
                    <td>{when(e.at)}</td>
                    <td>
                      <button
                        className="link"
                        onClick={() => {
                          setWho(e.staff);
                          setPage(1);
                        }}
                      >
                        {e.staff.name || "Staff"}
                      </button>
                    </td>
                    <td>
                      {describeEvent(e)}
                      {e.targets.length > 0 && <div className="muted small">about {e.targets.join(", ")}</div>}
                    </td>
                    <td>
                      <Badge tone={r.tone}>{r.label}</Badge>
                    </td>
                    <td className="small">{e.ip || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Pager pagination={data?.pagination} onPage={setPage} />
    </section>
  );
}

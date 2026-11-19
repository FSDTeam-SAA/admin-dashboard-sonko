import type { ReactNode } from "react";
import type { Pagination } from "../api/admin";

export function PageHeader({ title, intro, actions }: { title: string; intro?: string; actions?: ReactNode }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {intro && <p className="muted">{intro}</p>}
      </div>
      {actions && <div className="row-end">{actions}</div>}
    </div>
  );
}

export function Pager({ pagination, onPage }: { pagination?: Pagination; onPage: (page: number) => void }) {
  if (!pagination || pagination.pages <= 1) return null;
  return (
    <div className="pager">
      <button disabled={pagination.page <= 1} onClick={() => onPage(pagination.page - 1)}>
        Previous
      </button>
      <span className="muted">
        Page {pagination.page} of {pagination.pages}
      </span>
      <button disabled={pagination.page >= pagination.pages} onClick={() => onPage(pagination.page + 1)}>
        Next
      </button>
    </div>
  );
}

export function Tabs<T extends string>({ value, options, onChange }: { value: T; options: readonly (readonly [T, string])[]; onChange: (v: T) => void }) {
  return (
    <div className="tabs" role="tablist">
      {options.map(([key, label]) => (
        <button key={key} role="tab" aria-selected={value === key} className={value === key ? "tab active" : "tab"} onClick={() => onChange(key)}>
          {label}
        </button>
      ))}
    </div>
  );
}

export function Badge({ tone, children }: { tone: "danger" | "warn" | "ok" | "plain"; children: ReactNode }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function LoadState({ loading, error, empty }: { loading: boolean; error: string | null; empty: boolean }) {
  if (error)
    return (
      <p className="error" role="alert">
        {error}
      </p>
    );
  if (loading) return <p className="muted">Loading…</p>;
  if (empty) return <p className="muted empty">Nothing here.</p>;
  return null;
}

/** A text box with a live character count, for reasons and notes. */
export function TextArea({ label, value, onChange, min, max, hint }: { label: string; value: string; onChange: (v: string) => void; min: number; max: number; hint?: string }) {
  const length = value.trim().length;
  return (
    <label>
      {label}
      <textarea rows={3} maxLength={max} value={value} onChange={(e) => onChange(e.target.value)} />
      <span className={length > 0 && length < min ? "hint warn-text" : "hint"}>
        {hint ? `${hint} ` : ""}
        {length < min ? `At least ${min} characters (${length} so far).` : `${length} of ${max}.`}
      </span>
    </label>
  );
}

export const okLength = (value: string, min: number, max: number) => {
  const length = value.trim().length;
  return length >= min && length <= max;
};

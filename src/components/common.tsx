import { useT } from "../i18n/language";
import type { ReactNode } from "react";
import type { Pagination } from "../api/admin";

export function PageHeader({ title, intro, actions }: { title: string; intro?: string; actions?: ReactNode }) {
  const t = useT();
  return (
    <div className="page-header">
      <div>
        <h1>{t(title)}</h1>
        {intro && <p className="muted">{t(intro)}</p>}
      </div>
      {actions && <div className="row-end">{actions}</div>}
    </div>
  );
}

export function Pager({ pagination, onPage }: { pagination?: Pagination; onPage: (page: number) => void }) {
  const t = useT();
  if (!pagination || pagination.pages <= 1) return null;
  return (
    <div className="pager">
      <button disabled={pagination.page <= 1} onClick={() => onPage(pagination.page - 1)}>
        {t("Previous")}
      </button>
      <span className="muted">
        {t("Page {page} of {pages}", { page: pagination.page, pages: pagination.pages })}
      </span>
      <button disabled={pagination.page >= pagination.pages} onClick={() => onPage(pagination.page + 1)}>
        {t("Next")}
      </button>
    </div>
  );
}

export function Tabs<T extends string>({ value, options, onChange }: { value: T; options: readonly (readonly [T, string])[]; onChange: (v: T) => void }) {
  const t = useT();
  return (
    <div className="tabs" role="tablist">
      {options.map(([key, label]) => (
        <button key={key} role="tab" aria-selected={value === key} className={value === key ? "tab active" : "tab"} onClick={() => onChange(key)}>
          {t(label)}
        </button>
      ))}
    </div>
  );
}

export function Badge({ tone, children }: { tone: "danger" | "warn" | "ok" | "plain"; children: ReactNode }) {
  const t = useT();
  return <span className={`badge ${tone}`}>{typeof children === "string" ? t(children) : children}</span>;
}

export function LoadState({ loading, error, empty }: { loading: boolean; error: string | null; empty: boolean }) {
  const t = useT();
  if (error)
    return (
      <p className="error" role="alert">
        {t(error)}
      </p>
    );
  if (loading) return <p className="muted">{t("Loading…")}</p>;
  if (empty) return <p className="muted empty">{t("Nothing here.")}</p>;
  return null;
}

/** A text box with a live character count, for reasons and notes. */
export function TextArea({ label, value, onChange, min, max, hint }: { label: string; value: string; onChange: (v: string) => void; min: number; max: number; hint?: string }) {
  const length = value.trim().length;
  const t = useT();
  return (
    <label>
      {t(label)}
      <textarea rows={3} maxLength={max} value={value} onChange={(e) => onChange(e.target.value)} />
      <span className={length > 0 && length < min ? "hint warn-text" : "hint"}>
        {hint ? `${t(hint)} ` : ""}
        {length < min ? t("At least {min} characters ({length} so far).", { min, length }) : t("{length} of {max}.", { length, max })}
      </span>
    </label>
  );
}

export const okLength = (value: string, min: number, max: number) => {
  const length = value.trim().length;
  return length >= min && length <= max;
};

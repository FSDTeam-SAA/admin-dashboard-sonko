import { Link } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { PageHeader } from "../components/common";
import { HANDBOOK, HANDBOOK_GENERAL } from "../lib/handbook";
import { visibleNav } from "../lib/nav";
import { useT } from "../i18n/language";

/** What each screen is for. Shows only the screens this staff member can open. */
export function HandbookPage() {
  const t = useT();
  const { staff } = useAuth();
  const shown = new Set(visibleNav(staff?.permissions ?? []).map((n) => n.path));
  const labels = new Map(visibleNav(staff?.permissions ?? []).map((n) => [n.path, n.label]));
  return (
    <section>
      <PageHeader title="Staff handbook" intro="What each screen is for, and what to be careful about." />
      <article className="card panel">
        <h2>{t("The rules for everyone")}</h2>
        {HANDBOOK_GENERAL.map((g) => (
          <p key={g.title.en}>
            <strong>{t(g.title.en)}.</strong> {t(g.body.en)}
          </p>
        ))}
      </article>
      {HANDBOOK.filter((e) => e.path !== "/handbook" && shown.has(e.path)).map((e) => (
        <article className="card panel" key={e.path}>
          <h2>
            <Link to={e.path}>{t(labels.get(e.path) ?? e.path)}</Link>
          </h2>
          <p>{t(e.what.en)}</p>
          {e.careful && (
            <p className="muted">
              <strong>{t("Be careful:")}</strong> {t(e.careful.en)}
            </p>
          )}
        </article>
      ))}
    </section>
  );
}

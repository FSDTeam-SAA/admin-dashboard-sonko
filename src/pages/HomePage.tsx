import { useT } from "../i18n/language";
import { Link } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { visibleNav } from "../lib/nav";

export function HomePage() {
  const { staff, notice } = useAuth();
  const t = useT();
  const pages = visibleNav(staff?.permissions ?? []).filter((item) => item.path !== "/");
  return (
    <section>
      <h1>{staff?.name ? t("Welcome, {name}", { name: staff.name }) : t("Welcome")}</h1>
      <p className="muted">
        {staff?.fullAdmin
          ? t("You have full admin access.")
          : t("You have {n} permissions.", { n: staff?.permissions.length ?? 0 })}
      </p>
      {notice && <p className="notice home-notice">{t(notice)}</p>}
      <div className="grid">
        {pages.map((item) => (
          <Link key={item.path} to={item.path} className="card tile">
            <strong>{t(item.label)}</strong>
            <span className="muted">{item.ready ? t("Ready") : t("Being built")}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

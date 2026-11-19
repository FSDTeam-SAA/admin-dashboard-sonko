import { useT } from "../i18n/language";
import { Link } from "react-router";

export function NotFoundPage() {
  const t = useT();
  return (
    <section>
      <h1>{t("Page not found")}</h1>
      <p className="muted">
        {t("This page does not exist, or you do not have permission to see it.")} <Link to="/">{t("Go to Home")}</Link>
      </p>
    </section>
  );
}

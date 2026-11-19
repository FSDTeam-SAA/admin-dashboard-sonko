import { useT } from "../i18n/language";
import type { NavItem } from "../lib/nav";

export function ComingSoonPage({ item }: { item: NavItem }) {
  const t = useT();
  return (
    <section>
      <h1>{t(item.label)}</h1>
      <p className="muted">{t("This page is being built. The server side is ready.")}</p>
    </section>
  );
}

import type { NavItem } from "../lib/nav";

export function ComingSoonPage({ item }: { item: NavItem }) {
  return (
    <section>
      <h1>{item.label}</h1>
      <p className="muted">This page is being built. The server side is ready.</p>
    </section>
  );
}

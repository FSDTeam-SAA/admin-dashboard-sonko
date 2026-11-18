import { Link } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { visibleNav } from "../lib/nav";

export function HomePage() {
  const { staff, notice } = useAuth();
  const pages = visibleNav(staff?.permissions ?? []).filter((item) => item.path !== "/");
  return (
    <section>
      <h1>Welcome{staff?.name ? `, ${staff.name}` : ""}</h1>
      <p className="muted">
        {staff?.fullAdmin
          ? "You have full admin access."
          : `You have ${staff?.permissions.length ?? 0} permissions.`}
      </p>
      {notice && <p className="notice home-notice">{notice}</p>}
      <div className="grid">
        {pages.map((item) => (
          <Link key={item.path} to={item.path} className="card tile">
            <strong>{item.label}</strong>
            <span className="muted">{item.ready ? "Ready" : "Being built"}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

import { Link } from "react-router";

export function NotFoundPage() {
  return (
    <section>
      <h1>Page not found</h1>
      <p className="muted">
        This page does not exist, or you do not have permission to see it. <Link to="/">Go to Home</Link>
      </p>
    </section>
  );
}

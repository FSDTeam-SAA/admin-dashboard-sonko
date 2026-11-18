import { BrowserRouter, Route, Routes } from "react-router";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { LoginPage } from "./auth/LoginPage";
import { Shell } from "./layout/Shell";
import { HomePage } from "./pages/HomePage";
import { ComingSoonPage } from "./pages/ComingSoonPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { visibleNav } from "./lib/nav";

function Panel() {
  const { staff } = useAuth();
  if (!staff) return <LoginPage />;
  // Only pages this staff member may use get a route at all.
  const pages = visibleNav(staff.permissions).filter((item) => item.path !== "/");
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<HomePage />} />
        {pages.map((item) => (
          <Route key={item.path} path={item.path.slice(1)} element={<ComingSoonPage item={item} />} />
        ))}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Panel />
      </AuthProvider>
    </BrowserRouter>
  );
}

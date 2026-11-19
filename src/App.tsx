import { BrowserRouter, Route, Routes } from "react-router";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { LoginPage } from "./auth/LoginPage";
import { Shell } from "./layout/Shell";
import { HomePage } from "./pages/HomePage";
import { ComingSoonPage } from "./pages/ComingSoonPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { visibleNav } from "./lib/nav";
import { ReportsPage } from "./pages/ReportsPage";
import { HoldsPage } from "./pages/HoldsPage";
import { ReversalsPage } from "./pages/ReversalsPage";
import { PayoutsPage } from "./pages/PayoutsPage";
import { RatesAndFeesPage } from "./pages/RatesAndFeesPage";
import { StaffPage } from "./pages/StaffPage";
import { AgentsPage } from "./pages/AgentsPage";
import { CustomersPage } from "./pages/CustomersPage";
import { TicketsPage } from "./pages/TicketsPage";
import { ServicesPage } from "./pages/ServicesPage";
import { AuditPage } from "./pages/AuditPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { BillsPage } from "./pages/BillsPage";
import { AnnouncementsPage } from "./pages/AnnouncementsPage";
import { BlocklistPage } from "./pages/BlocklistPage";
import { CasesPage } from "./pages/CasesPage";
import { BackupsPage } from "./pages/BackupsPage";
import type { ComponentType } from "react";

// Pages that are built. The rest show "being built" until they are.
const PAGES: Record<string, ComponentType> = {
  "/reports": ReportsPage,
  "/holds": HoldsPage,
  "/reversals": ReversalsPage,
  "/payouts": PayoutsPage,
  "/settings": RatesAndFeesPage,
  "/staff": StaffPage,
  "/agents": AgentsPage,
  "/customers": CustomersPage,
  "/tickets": TicketsPage,
  "/analytics": AnalyticsPage,
  "/audit": AuditPage,
  "/services": ServicesPage,
  "/bills": BillsPage,
  "/announcements": AnnouncementsPage,
  "/blocklist": BlocklistPage,
  "/cases": CasesPage,
  "/backups": BackupsPage,
};

function Panel() {
  const { staff } = useAuth();
  if (!staff) return <LoginPage />;
  // Only pages this staff member may use get a route at all.
  const pages = visibleNav(staff.permissions).filter((item) => item.path !== "/");
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<HomePage />} />
        {pages.map((item) => {
          const Page = PAGES[item.path];
          return <Route key={item.path} path={item.path.slice(1)} element={Page ? <Page /> : <ComingSoonPage item={item} />} />;
        })}
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

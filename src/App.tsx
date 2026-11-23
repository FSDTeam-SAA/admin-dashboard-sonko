import { BrowserRouter, Route, Routes } from "react-router";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { LoginPage } from "./auth/LoginPage";
import { SetupPage } from "./auth/SetupPage";
import { Shell } from "./layout/Shell";
import { HomePage } from "./pages/HomePage";
import { ComingSoonPage } from "./pages/ComingSoonPage";
import { SalesPage } from "./pages/SalesPage";
import { InvitesPage } from "./pages/InvitesPage";
import { FraudPage } from "./pages/FraudPage";
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
import { OfferCardsPage } from "./pages/OfferCardsPage";
import { TicketEventsPage } from "./pages/TicketEventsPage";
import { BlocklistPage } from "./pages/BlocklistPage";
import { CasesPage } from "./pages/CasesPage";
import { BackupsPage } from "./pages/BackupsPage";
import { HeadroomPage } from "./pages/HeadroomPage";
import { FinancePage } from "./pages/FinancePage";
import { TransactionsPage } from "./pages/TransactionsPage";
import { ComplaintsPage } from "./pages/ComplaintsPage";
import { SafeguardingPage } from "./pages/SafeguardingPage";
import { HandbookPage } from "./pages/HandbookPage";
import { AgentAnalyticsPage } from "./pages/AgentAnalyticsPage";
import { SendingLimitsPage } from "./pages/SendingLimitsPage";
import type { ComponentType, ReactNode } from "react";

// Pages that are built. The rest show "being built" until they are.
const PAGES: Record<string, ComponentType> = {
  "/reports": ReportsPage,
  "/holds": HoldsPage,
  "/reversals": ReversalsPage,
  "/payouts": PayoutsPage,
  "/settings": RatesAndFeesPage,
  "/staff": StaffPage,
  "/agents": AgentsPage,
  "/agent-analytics": AgentAnalyticsPage,
  "/customers": CustomersPage,
  "/tickets": TicketsPage,
  "/analytics": AnalyticsPage,
  "/sales": SalesPage,
  "/invites": InvitesPage,
  "/fraud": FraudPage,
  "/audit": AuditPage,
  "/services": ServicesPage,
  "/bills": BillsPage,
  "/announcements": AnnouncementsPage,
  "/offer-cards": OfferCardsPage,
  "/events": TicketEventsPage,
  "/blocklist": BlocklistPage,
  "/cases": CasesPage,
  "/backups": BackupsPage,
  "/safeguarding": SafeguardingPage,
  "/headroom": HeadroomPage,
  "/finance": FinancePage,
  "/transactions": TransactionsPage,
  "/complaints": ComplaintsPage,
  "/handbook": HandbookPage,
  "/limits": SendingLimitsPage,
};

function Panel() {
  const { staff } = useAuth();
  // A new employee's one-time link works without logging in.
  if (window.location.pathname === "/setup") return <SetupPage />;
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

type AppProps = {
  /** The demo build uses hash addresses (#/customers); the real panel uses normal ones. */
  Router?: ComponentType<{ children?: ReactNode }>;
  /** Shown inside the login context (the demo's bar). The real panel passes nothing. */
  extra?: ReactNode;
};

export function App({ Router = BrowserRouter, extra }: AppProps = {}) {
  return (
    <Router>
      <AuthProvider>
        <Panel />
        {extra}
      </AuthProvider>
    </Router>
  );
}

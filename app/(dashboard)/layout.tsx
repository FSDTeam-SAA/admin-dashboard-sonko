import type React from "react"
import DashboardLayout from "../../components/dashboard-layout"

export default function DashboardGroupLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <DashboardLayout>{children}</DashboardLayout>
}

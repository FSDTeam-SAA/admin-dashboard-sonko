"use client";

import type React from "react";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ChangePasswordModal } from "@/components/modals/change-password-modal";
import { LogoutModal } from "@/components/modals/logout-modal";
import Image from "next/image";
import { useSession } from "next-auth/react";

const menuItems = [
  { name: "Dashboard", href: "/dashboard", icon: "📊" },
  { name: "Services", href: "/services", icon: "🔧" },
  { name: "Revenue", href: "/revenue", icon: "💰" },
  { name: "Transactions", href: "/transactions", icon: "💳" },
  { name: "Exchange Rate", href: "/exchange-rate", icon: "📈" },
  { name: "Agents", href: "/agents", icon: "👥" },
  { name: "Tickets", href: "/tickets", icon: "🎫" },
  { name: "Fraud Detection", href: "/fraud-detection", icon: "🚨" },
  { name: "Reports", href: "/reports", icon: "📋" },
  { name: "Customers", href: "/customers", icon: "👤" },
  { name: "Audit Log", href: "/audit-log", icon: "📝" },
  { name: "Country", href: "/country", icon: "🌍" },
  { name: "Setting", href: "/settings", icon: "⚙️" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  const activePath = pathname === "/" ? "/dashboard" : pathname;

  const avatarUrl =
    (session?.user as { avatar?: { url?: string } } | undefined)?.avatar?.url ??
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Admin";
  const displayName = session?.user?.name ?? session?.user?.email ?? "Admin";
  const displayRole = session?.role ?? (session?.user as { role?: string } | undefined)?.role ?? "Admin";

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } bg-white border-r border-border transition-all duration-300 flex flex-col`}
      >
        {/* Logo */}
        <div className="h-20 flex items-center justify-center border-b border-border">
          <Image
            src="/logo.png"
            alt="Logo"
            width={500}
            height={500}
            className="object-contain w-[42px] h-[55px]"
          />
        </div>

        {/* Menu Items */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          {menuItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
                  activePath === item.href || activePath.startsWith(item.href + "/")
                    ? "bg-blue-500 text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {sidebarOpen && (
                  <span className="text-sm font-medium">{item.name}</span>
                )}
              </div>
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div className="border-t border-border p-4">
          <button
            onClick={() => setLogoutModalOpen(true)}
            className="flex items-center gap-2 text-orange-500 hover:text-orange-600 font-medium text-sm w-full px-4 py-2"
          >
            <LogOut size={16} />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-20 bg-white border-b border-border flex items-center justify-between px-8">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-600 hover:text-gray-900"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Header Right */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => setPasswordModalOpen(true)}
              className="flex items-center gap-3 cursor-pointer"
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback>AD</AvatarFallback>
              </Avatar>
              <div className="text-sm">
                <div className="font-semibold text-gray-900">{displayName}</div>
                <div className="text-xs text-gray-500">{displayRole}</div>
              </div>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>

      {/* Modals */}
      <ChangePasswordModal
        open={passwordModalOpen}
        onOpenChange={setPasswordModalOpen}
      />
      <LogoutModal open={logoutModalOpen} onOpenChange={setLogoutModalOpen} />
    </div>
  );
}

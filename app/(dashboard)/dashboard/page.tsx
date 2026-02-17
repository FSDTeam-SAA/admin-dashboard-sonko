"use client"

import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts"
import {
  DollarSign,
  ArrowRightLeft,
  Users,
  UserCheck,
  CalendarDays,
} from "lucide-react"

const stats = [
  { title: "Total Revenue", value: "$51,250", icon: DollarSign },
  { title: "Total Transactions", value: "51,250", icon: ArrowRightLeft },
  { title: "Total Agents", value: "51,250", icon: UserCheck },
  { title: "Total Users", value: "51,250", icon: Users },
]

const statisticData = [
  { month: "Jan", thisMonth: 5200, lastMonth: 5100 },
  { month: "Feb", thisMonth: 5400, lastMonth: 5300 },
  { month: "Mar", thisMonth: 5350, lastMonth: 5250 },
  { month: "Apr", thisMonth: 5550, lastMonth: 5400 },
  { month: "May", thisMonth: 5480, lastMonth: 5350 },
  { month: "Jun", thisMonth: 5600, lastMonth: 5450 },
  { month: "Jul", thisMonth: 5520, lastMonth: 5380 },
  { month: "Aug", thisMonth: 5650, lastMonth: 5480 },
  { month: "Sep", thisMonth: 5500, lastMonth: 5400 },
  { month: "Oct", thisMonth: 5580, lastMonth: 5460 },
  { month: "Nov", thisMonth: 5700, lastMonth: 5520 },
  { month: "Dec", thisMonth: 5850, lastMonth: 5600 },
]

const verificationData = [
  { name: "Fully Verified", value: 70, color: "#2ea44f" },
  { name: "Partially Verified", value: 20, color: "#f39c12" },
  { name: "Not Verified", value: 10, color: "#3b82f6" },
]

const transactions = [
  {
    id: "FGS656565",
    date: "06/24/2025",
    customer: "Alex rock",
    agent: "Alex rock",
    amount: "GMD15000",
    status: "Success",
  },
  {
    id: "FGS656565",
    date: "06/24/2025",
    customer: "Alex rock",
    agent: "Alex rock",
    amount: "GMD15000",
    status: "Pending",
  },
  {
    id: "FGS656565",
    date: "06/24/2025",
    customer: "Alex rock",
    agent: "Alex rock",
    amount: "GMD15000",
    status: "Reject",
  },
  {
    id: "FGS656565",
    date: "06/24/2025",
    customer: "Alex rock",
    agent: "Alex rock",
    amount: "GMD15000",
    status: "Success",
  },
]

const transactionVolumeData = [
  { month: "Jan", value: 20 },
  { month: "Feb", value: 18 },
  { month: "Mar", value: 16 },
  { month: "Apr", value: 30 },
  { month: "May", value: 75 },
  { month: "Jun", value: 45 },
  { month: "Jul", value: 35 },
  { month: "Aug", value: 40 },
  { month: "Sep", value: 38 },
  { month: "Oct", value: 42 },
  { month: "Nov", value: 39 },
  { month: "Dec", value: 40 },
]

const featureUsage = [
  { name: "Send", value: 60, color: "#2e7d32" },
  { name: "Credit", value: 35, color: "#ec4899" },
  { name: "Bills", value: 28, color: "#a3e635" },
  { name: "Cash Out", value: 26, color: "#2563eb" },
  { name: "Bank Withdraw", value: 25, color: "#f59e0b" },
  { name: "Cash In", value: 24, color: "#8b5a2b" },
  { name: "Paybill Payments", value: 22, color: "#0f766e" },
]

const issuesSummaryData = [
  { month: "Jan", thisYear: 120, lastYear: 90 },
  { month: "Feb", thisYear: 180, lastYear: 110 },
  { month: "Mar", thisYear: 140, lastYear: 105 },
  { month: "Apr", thisYear: 220, lastYear: 130 },
  { month: "May", thisYear: 160, lastYear: 115 },
  { month: "Jun", thisYear: 240, lastYear: 150 },
  { month: "Jul", thisYear: 190, lastYear: 125 },
  { month: "Aug", thisYear: 260, lastYear: 155 },
  { month: "Sep", thisYear: 210, lastYear: 135 },
  { month: "Oct", thisYear: 240, lastYear: 150 },
  { month: "Nov", thisYear: 200, lastYear: 130 },
  { month: "Dec", thisYear: 230, lastYear: 145 },
]

const supportTickets = [
  { name: "Cash Out", value: 25, color: "#2bb673" },
  { name: "Fraud Report", value: 25, color: "#f04f4f" },
  { name: "KYC Verification", value: 25, color: "#f59e0b" },
  { name: "Delay 25%", value: 25, color: "#8b5cf6" },
  { name: "Log in", value: 25, color: "#fbbf24" },
  { name: "Transaction Error", value: 25, color: "#14b8a6" },
  { name: "Failed Transaction", value: 25, color: "#f97316" },
  { name: "Verification Issues", value: 25, color: "#e11d48" },
  { name: "Account Suspended", value: 25, color: "#0ea5e9" },
  { name: "App Performance / Bug Report", value: 25, color: "#fb7185" },
  { name: "Other", value: 25, color: "#94a3b8" },
]

const conversionRate = [
  { label: "Started", value: 80, count: "8,000", color: "#b7791f" },
  { label: "Finished", value: 70, count: "5,000", color: "#22c55e" },
  { label: "Abandoned", value: 35, count: "1500", color: "#a3e635" },
]

const averageProcessData = [
  { month: "Jan", value: 10 },
  { month: "Feb", value: 18 },
  { month: "Mar", value: 14 },
  { month: "Apr", value: 25 },
  { month: "May", value: 20 },
  { month: "Jun", value: 28 },
  { month: "Jul", value: 35 },
]

const activeUsersData = [
  { month: "Jan", value: 20 },
  { month: "Feb", value: 24 },
  { month: "Mar", value: 22 },
  { month: "Apr", value: 26 },
  { month: "May", value: 40 },
  { month: "Jun", value: 36 },
  { month: "Jul", value: 42 },
]

const avgResolutionData = [
  { month: "Jan", value: 8 },
  { month: "Feb", value: 12 },
  { month: "Mar", value: 10 },
  { month: "Apr", value: 18 },
  { month: "May", value: 14 },
  { month: "Jun", value: 22 },
  { month: "Jul", value: 30 },
]

const systemUptimeData = [
  { month: "Jan", value: 99 },
  { month: "Feb", value: 99.2 },
  { month: "Mar", value: 98.6 },
  { month: "Apr", value: 99.4 },
  { month: "May", value: 99.8 },
  { month: "Jun", value: 99.1 },
  { month: "Jul", value: 99.7 },
]

const activeUsersLarge = [
  { month: "Jan", value: 20 },
  { month: "Feb", value: 30 },
  { month: "Mar", value: 40 },
  { month: "Apr", value: 35 },
  { month: "May", value: 45 },
  { month: "Jun", value: 50 },
  { month: "Jul", value: 60 },
]

const newUsersDownloads = [
  { month: "Jan", desktop: 30, android: 20 },
  { month: "Feb", desktop: 40, android: 30 },
  { month: "Mar", desktop: 25, android: 20 },
  { month: "Apr", desktop: 45, android: 35 },
  { month: "May", desktop: 30, android: 25 },
  { month: "Jun", desktop: 50, android: 35 },
]

const retentionData = [
  { label: "7 Days", value: 80 },
  { label: "30 Days", value: 65 },
  { label: "90 Days", value: 45 },
]

export default function Dashboard() {
  return (
    <div className="p-8 bg-[#f5f6f8] min-h-screen text-[#2c2c2c]">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-[#7a7a7a]">Welcome back to your admin portal</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.title} className="bg-white rounded-lg border border-[#d7d7d7] p-4">
              <div className="flex items-center justify-between">
                <div className="text-xs text-[#7a7a7a]">{stat.title}</div>
                <div className="h-7 w-7 rounded-md bg-[#e9f1ff] flex items-center justify-center text-[#4d9bff]">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 text-lg font-semibold">{stat.value}</div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-[2fr_1fr] gap-4 mb-6">
        <div className="bg-white rounded-lg border border-[#d7d7d7] p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-semibold">Statistic</div>
              <div className="text-xs text-[#7a7a7a]">Revenue</div>
            </div>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={statisticData} margin={{ left: 10, right: 10 }}>
                <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="thisMonth" stroke="#2563eb" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="lastMonth" stroke="#22c55e" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex gap-6 text-xs text-[#7a7a7a]">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#22c55e]" />
              This Month
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#2563eb]" />
              Last Month
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-[#d7d7d7] p-4">
          <div className="text-sm font-semibold mb-2">Fully Verified</div>
          <div className="text-xs text-[#7a7a7a] mb-2">Verified Customers</div>
          <div className="h-44 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={verificationData}
                  innerRadius={50}
                  outerRadius={70}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                >
                  {verificationData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute text-center">
              <div className="text-lg font-semibold">70.00%</div>
            </div>
          </div>
          <div className="mt-2 space-y-2 text-xs text-[#2c2c2c]">
            {verificationData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                {entry.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-[#d7d7d7] p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Transaction</div>
            <div className="text-xs text-[#7a7a7a]">Search by:</div>
          </div>
        </div>
        <div className="mt-3 flex gap-3">
          <input className="h-9 w-40 rounded-md border border-[#bdbdbd] px-3 text-xs" placeholder="Transaction ID" />
          <input className="h-9 w-40 rounded-md border border-[#bdbdbd] px-3 text-xs" placeholder="Name" />
          <div className="relative w-40">
            <input className="h-9 w-full rounded-md border border-[#bdbdbd] px-3 text-xs" placeholder="Date" />
            <CalendarDays className="h-4 w-4 text-[#7a7a7a] absolute right-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>
        <div className="mt-4 border border-[#bdbdbd] rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-white border-b border-[#bdbdbd]">
              <tr className="text-left text-[#2c2c2c]">
                <th className="px-4 py-3 font-semibold">Transaction ID</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Agents</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((row, index) => (
                <tr key={`${row.id}-${index}`} className="border-b border-[#bdbdbd] last:border-b-0">
                  <td className="px-4 py-3">{row.id}</td>
                  <td className="px-4 py-3">{row.date}</td>
                  <td className="px-4 py-3">{row.customer}</td>
                  <td className="px-4 py-3">{row.agent}</td>
                  <td className="px-4 py-3">{row.amount}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-semibold ${
                        row.status === "Success"
                          ? "bg-[#33a852] text-white"
                          : row.status === "Pending"
                          ? "bg-[#f59e0b] text-white"
                          : "bg-[#e11d48] text-white"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-[2fr_1fr] gap-4 mb-6">
        <div className="bg-white rounded-lg border border-[#d7d7d7] p-4">
          <div className="text-sm font-semibold mb-3">Transaction Volume & Value</div>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <div className="text-xs text-[#7a7a7a]">Transactions</div>
              <div className="text-lg font-semibold">5842</div>
              <div className="text-xs text-[#2ea44f]">+12.3% growth</div>
            </div>
            <div>
              <div className="text-xs text-[#7a7a7a]">Value</div>
              <div className="text-lg font-semibold">1,245,678</div>
              <div className="text-xs text-[#2ea44f]">+8.4% growth</div>
            </div>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={transactionVolumeData} margin={{ left: 0, right: 0 }}>
                <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-[#d7d7d7] p-4">
          <div className="text-sm font-semibold mb-3">Feature Usage</div>
          <div className="space-y-3">
            {featureUsage.map((feature) => (
              <div key={feature.name}>
                <div className="flex items-center justify-between text-xs">
                  <span>{feature.name}</span>
                  <span>{feature.value}%</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-[#eef2f7]">
                  <div
                    className="h-2 rounded-full"
                    style={{ width: `${feature.value}%`, backgroundColor: feature.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-[#d7d7d7] p-4 mb-6">
        <div className="text-sm font-semibold mb-2">Solving Issues Summery</div>
        <div className="text-xs text-[#7a7a7a] mb-4">This year vs last year</div>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={issuesSummaryData} margin={{ left: 0, right: 0 }}>
              <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Area type="monotone" dataKey="lastYear" stroke="#a855f7" fill="rgba(168,85,247,0.15)" />
              <Area type="monotone" dataKey="thisYear" stroke="#2563eb" fill="rgba(37,99,235,0.2)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-[#d7d7d7] p-4 mb-6">
        <div className="text-sm font-semibold mb-4">Support Tickets</div>
        <div className="grid grid-cols-[1fr_1fr] gap-6 items-center">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={supportTickets} innerRadius={60} outerRadius={90} dataKey="value">
                  {supportTickets.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {supportTickets.map((ticket) => (
              <div key={ticket.name} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ticket.color }} />
                  <span>{ticket.name.replace(" 25%", "")}</span>
                </div>
                <span>25%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-[#d7d7d7] p-4">
          <div className="text-sm font-semibold mb-4">Conversion Rate</div>
          <div className="space-y-4">
            {conversionRate.map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span>{item.label}</span>
                  <span>{item.value}%</span>
                </div>
                <div className="h-2 rounded-full bg-[#eef2f7]">
                  <div className="h-2 rounded-full" style={{ width: `${item.value}%`, backgroundColor: item.color }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-xs text-[#2c2c2c]">
            <div className="flex justify-between"><span>Started</span><span>8,000</span></div>
            <div className="flex justify-between"><span>Finished</span><span>5000</span></div>
            <div className="flex justify-between"><span>Abandoned</span><span>1500</span></div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-[#d7d7d7] p-4">
          <div className="text-sm font-semibold">Average Transaction Process Time</div>
          <div className="text-2xl font-semibold mt-2">1.5 min</div>
          <div className="h-36 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={averageProcessData} margin={{ left: 0, right: 0 }}>
                <Area type="monotone" dataKey="value" stroke="#22c55e" fill="rgba(34,197,94,0.25)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-[#d7d7d7] p-4">
          <div className="text-sm font-semibold text-center mb-4">Active Users</div>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activeUsersData} margin={{ left: 0, right: 0 }}>
                <Area type="monotone" dataKey="value" stroke="#22c55e" fill="rgba(34,197,94,0.25)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-3 text-center text-sm">
            <div>
              <div className="font-semibold">560</div>
              <div className="text-xs text-[#7a7a7a]">Daily</div>
            </div>
            <div>
              <div className="font-semibold">560</div>
              <div className="text-xs text-[#7a7a7a]">Weekly</div>
            </div>
            <div>
              <div className="font-semibold">560</div>
              <div className="text-xs text-[#7a7a7a]">Monthly</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-[#d7d7d7] p-4">
          <div className="text-sm font-semibold">Avg. Resolution Time</div>
          <div className="text-2xl font-semibold mt-2">1.5 min</div>
          <div className="h-36 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={avgResolutionData} margin={{ left: 0, right: 0 }}>
                <Area type="monotone" dataKey="value" stroke="#22c55e" fill="rgba(34,197,94,0.25)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-[#d7d7d7] p-4">
          <div className="text-sm font-semibold">System Uptime</div>
          <div className="text-xs text-[#7a7a7a]">99.8%</div>
          <div className="h-28 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={systemUptimeData} margin={{ left: 0, right: 0 }}>
                <Line type="monotone" dataKey="value" stroke="#22c55e" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-[#d7d7d7] p-4">
          <div className="text-sm font-semibold">Active Users</div>
          <div className="flex gap-2 mt-2 text-xs">
            <span className="px-2 py-1 rounded bg-[#f0f4ff]">2,000</span>
            <span className="px-2 py-1 rounded bg-[#f0f4ff]">5,000</span>
            <span className="px-2 py-1 rounded bg-[#dbe9ff]">17,500</span>
          </div>
          <div className="h-28 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activeUsersLarge} margin={{ left: 0, right: 0 }}>
                <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="rgba(59,130,246,0.3)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-[#d7d7d7] p-4 mb-6">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-[#7a7a7a]">New Users / Downloads</div>
            <div className="text-lg font-semibold">4,200</div>
            <div className="text-xs text-[#2ea44f]">+3.5% new users</div>
          </div>
          <div>
            <div className="text-xs text-[#7a7a7a]">Sign-ups / Conversion</div>
            <div className="text-lg font-semibold">3,100</div>
            <div className="text-xs text-[#2ea44f]">+2.1% new users</div>
          </div>
          <div>
            <div className="text-xs text-[#7a7a7a]">Conversion Rate</div>
            <div className="text-lg font-semibold">73.8%</div>
            <div className="text-xs text-[#2ea44f]">+1.6% new users</div>
          </div>
        </div>
        <div className="h-44 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={newUsersDownloads} margin={{ left: 0, right: 0 }}>
              <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Bar dataKey="desktop" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="android" fill="#4ade80" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex justify-end gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#6366f1]" />
            Desktop
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#4ade80]" />
            Android
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-[#d7d7d7] p-4">
          <div className="text-sm font-semibold mb-2">Net Promote Score</div>
          <div className="flex items-center gap-6">
            <div className="h-28 w-28 rounded-full border-4 border-[#d7d7d7] flex items-center justify-center">
              <div className="text-2xl font-semibold">8.2</div>
            </div>
            <div className="text-xs space-y-2">
              <div className="flex items-center justify-between gap-6">
                <span>Detractors</span>
                <span>1,243</span>
              </div>
              <div className="flex items-center justify-between gap-6">
                <span>Passives</span>
                <span>7.0%</span>
              </div>
              <div className="flex items-center justify-between gap-6">
                <span>Promoters</span>
                <span>70%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-[#d7d7d7] p-4">
          <div className="text-sm font-semibold mb-2">User Retention</div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={retentionData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="label" width={60} tick={{ fontSize: 10 }} />
                <Bar dataKey="value" fill="#22c55e" radius={[4, 4, 4, 4]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-xs space-y-2">
            {retentionData.map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span>{item.label}</span>
                <span>{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

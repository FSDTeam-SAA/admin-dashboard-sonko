"use client";

import type React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, Users, CreditCard } from "lucide-react";

const transactionData = [
  { date: "06/20", transactions: 400, revenue: 2400 },
  { date: "06/21", transactions: 300, revenue: 1398 },
  { date: "06/22", transactions: 200, revenue: 9800 },
  { date: "06/23", transactions: 278, revenue: 3908 },
  { date: "06/24", transactions: 190, revenue: 4800 },
  { date: "06/25", transactions: 229, revenue: 3800 },
  { date: "06/26", transactions: 200, revenue: 4300 },
];

const featureData = [
  { name: "Send Money", value: 45 },
  { name: "Pay Bills", value: 30 },
  { name: "Cash Out", value: 15 },
  { name: "Credit", value: 10 },
];

const agentData = [
  { name: "Agent A", commissions: 2400, transactions: 2210 },
  { name: "Agent B", commissions: 1398, transactions: 2290 },
  { name: "Agent C", commissions: 9800, transactions: 2000 },
  { name: "Agent D", commissions: 3908, transactions: 2108 },
  { name: "Agent E", commissions: 4800, transactions: 2105 },
];

const userGrowthData = [
  { month: "Jan", users: 4000, activeUsers: 2400 },
  { month: "Feb", users: 5200, activeUsers: 2810 },
  { month: "Mar", users: 6800, activeUsers: 3200 },
  { month: "Apr", users: 8200, activeUsers: 3800 },
  { month: "May", users: 9400, activeUsers: 4200 },
  { month: "Jun", users: 11200, activeUsers: 5100 },
];

const colors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444"];

function StatCard({
  title,
  value,
  change,
  icon: Icon,
  isPositive,
}: {
  title: string;
  value: string | number;
  change: string;
  icon: React.ReactNode;
  isPositive: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-gray-600">
          {title}
        </CardTitle>
        <div className="text-primary">{Icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div
          className={`text-xs font-medium flex items-center gap-1 ${isPositive ? "text-green-600" : "text-red-600"}`}
        >
          {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {change} from last month
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm">Dashboard - Overview</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Users"
          value="11,200"
          change="+12.5%"
          isPositive={true}
          icon={<Users size={20} />}
        />
        <StatCard
          title="Active Users"
          value="5,100"
          change="+8.2%"
          isPositive={true}
          icon={<Users size={20} />}
        />
        <StatCard
          title="Total Revenue"
          value="$285,432"
          change="+15.3%"
          isPositive={true}
          icon={<CreditCard size={20} />}
        />
        <StatCard
          title="Total Transactions"
          value="8,942"
          change="-2.1%"
          isPositive={false}
          icon={<CreditCard size={20} />}
        />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {/* Revenue & Transactions Trend */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">
              Revenue & Transactions Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={transactionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  name="Revenue ($)"
                />
                <Line
                  type="monotone"
                  dataKey="transactions"
                  stroke="#10B981"
                  strokeWidth={2}
                  name="Transactions"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Feature Usage Pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Feature Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={featureData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name} ${value}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {featureData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={colors[index % colors.length]}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Agent Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Agent Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={agentData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="commissions"
                  fill="#3B82F6"
                  name="Commissions ($)"
                />
                <Bar
                  dataKey="transactions"
                  fill="#10B981"
                  name="Transactions"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* User Growth */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">User Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={userGrowthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="users"
                  fill="#3B82F6"
                  stroke="#3B82F6"
                  name="Total Users"
                />
                <Area
                  type="monotone"
                  dataKey="activeUsers"
                  fill="#10B981"
                  stroke="#10B981"
                  name="Active Users"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

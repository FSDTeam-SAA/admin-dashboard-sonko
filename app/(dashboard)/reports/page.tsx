"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { CustomPagination } from "@/components/custom-pagination"
import { Badge } from "@/components/ui/badge"

const reportsData = [
  {
    id: "RPT001",
    name: "Savannah Nguyen",
    sent: { amount: "$2,500", count: "8 transactions" },
    payouts: { amount: "$1,800", count: "5 payouts" },
    refunds: { amount: "$350", count: "3 refunds" },
    failedTransfers: { amount: "$200", count: "2 failed" },
    totalVolume: "$4,850",
  },
  {
    id: "RPT002",
    name: "Annette Black",
    sent: { amount: "$3,200", count: "12 transactions" },
    payouts: { amount: "$2,400", count: "7 payouts" },
    refunds: { amount: "$450", count: "4 refunds" },
    failedTransfers: { amount: "$150", count: "1 failed" },
    totalVolume: "$6,200",
  },
  {
    id: "RPT003",
    name: "Devon Lane",
    sent: { amount: "$1,800", count: "5 transactions" },
    payouts: { amount: "$1,200", count: "3 payouts" },
    refunds: { amount: "$200", count: "2 refunds" },
    failedTransfers: { amount: "$100", count: "1 failed" },
    totalVolume: "$3,300",
  },
  {
    id: "RPT004",
    name: "Floyd Miles",
    sent: { amount: "$4,100", count: "15 transactions" },
    payouts: { amount: "$3,100", count: "9 payouts" },
    refunds: { amount: "$600", count: "5 refunds" },
    failedTransfers: { amount: "$250", count: "2 failed" },
    totalVolume: "$8,050",
  },
  {
    id: "RPT005",
    name: "Darrell Steward",
    sent: { amount: "$2,100", count: "7 transactions" },
    payouts: { amount: "$1,500", count: "4 payouts" },
    refunds: { amount: "$300", count: "3 refunds" },
    failedTransfers: { amount: "$120", count: "1 failed" },
    totalVolume: "$4,020",
  },
  {
    id: "RPT006",
    name: "Kristin Watson",
    sent: { amount: "$3,500", count: "13 transactions" },
    payouts: { amount: "$2,600", count: "8 payouts" },
    refunds: { amount: "$500", count: "4 refunds" },
    failedTransfers: { amount: "$300", count: "3 failed" },
    totalVolume: "$6,900",
  },
  {
    id: "RPT007",
    name: "Courtney Henry",
    sent: { amount: "$2,800", count: "10 transactions" },
    payouts: { amount: "$2,000", count: "6 payouts" },
    refunds: { amount: "$400", count: "3 refunds" },
    failedTransfers: { amount: "$180", count: "2 failed" },
    totalVolume: "$5,380",
  },
  {
    id: "RPT008",
    name: "Brooklyn Simmons",
    sent: { amount: "$1,500", count: "4 transactions" },
    payouts: { amount: "$1,000", count: "3 payouts" },
    refunds: { amount: "$250", count: "2 refunds" },
    failedTransfers: { amount: "$100", count: "1 failed" },
    totalVolume: "$2,850",
  },
]

export default function Reports() {
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8
  const totalPages = Math.ceil(reportsData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedData = reportsData.slice(startIndex, startIndex + itemsPerPage)

  const totalSent = reportsData.reduce((sum, item) => {
    const amount = Number.parseFloat(item.sent.amount.replace("$", ""))
    return sum + amount
  }, 0)

  const totalPayouts = reportsData.reduce((sum, item) => {
    const amount = Number.parseFloat(item.payouts.amount.replace("$", ""))
    return sum + amount
  }, 0)

  const totalRefunds = reportsData.reduce((sum, item) => {
    const amount = Number.parseFloat(item.refunds.amount.replace("$", ""))
    return sum + amount
  }, 0)

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-500 text-sm">Dashboard › Reports</p>
        </div>
        <Button className="bg-blue-500 text-white hover:bg-blue-600 flex gap-2">
          <Download className="h-4 w-4" />
          Export All
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">${(totalSent / 1000).toFixed(1)}K</div>
            <p className="text-xs text-gray-500 mt-1">All users</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Payouts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${(totalPayouts / 1000).toFixed(1)}K</div>
            <p className="text-xs text-gray-500 mt-1">Distributed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Refunds</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">${(totalRefunds / 1000).toFixed(1)}K</div>
            <p className="text-xs text-gray-500 mt-1">Processed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Report Period</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">June 2025</div>
            <p className="text-xs text-gray-500 mt-1">Current month</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Name</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Total Sent</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Payouts</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Refunds</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Failed Transfers</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Total Volume</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Export</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((item, idx) => (
                <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 font-semibold text-gray-900">{item.name}</td>
                  <td className="px-6 py-3">
                    <div className="text-gray-900">{item.sent.amount}</div>
                    <div className="text-xs text-gray-500">{item.sent.count}</div>
                  </td>
                  <td className="px-6 py-3">
                    <div className="text-gray-900">{item.payouts.amount}</div>
                    <div className="text-xs text-gray-500">{item.payouts.count}</div>
                  </td>
                  <td className="px-6 py-3">
                    <div className="text-gray-900">{item.refunds.amount}</div>
                    <div className="text-xs text-gray-500">{item.refunds.count}</div>
                  </td>
                  <td className="px-6 py-3">
                    <div className="text-gray-900">{item.failedTransfers.amount}</div>
                    <div className="text-xs text-gray-500">{item.failedTransfers.count}</div>
                  </td>
                  <td className="px-6 py-3">
                    <Badge className="bg-blue-100 text-blue-800">{item.totalVolume}</Badge>
                  </td>
                  <td className="px-6 py-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-green-100 text-green-700 hover:bg-green-200 flex gap-1"
                    >
                      <Download className="h-3 w-3" />
                      Excel
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <CustomPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
    </div>
  )
}

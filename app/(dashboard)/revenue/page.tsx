"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Download, Eye } from "lucide-react"
import { CustomPagination } from "@/components/custom-pagination"

const revenueData = [
  {
    id: "REV001245",
    date: "06/24/2025",
    send: "$250.00",
    receive: "GMD 15,000",
    rate: "1,650.50",
    commissions: "$2.50",
    revenue: "$25.50",
  },
  {
    id: "REV001244",
    date: "06/24/2025",
    send: "$400.00",
    receive: "GMD 25,000",
    rate: "1,650.50",
    commissions: "$4.00",
    revenue: "$40.50",
  },
  {
    id: "REV001243",
    date: "06/24/2025",
    send: "$150.00",
    receive: "GMD 10,000",
    rate: "1,650.50",
    commissions: "$1.50",
    revenue: "$15.50",
  },
  {
    id: "REV001242",
    date: "06/24/2025",
    send: "$350.00",
    receive: "GMD 20,000",
    rate: "1,650.50",
    commissions: "$3.00",
    revenue: "$35.50",
  },
  {
    id: "REV001241",
    date: "06/23/2025",
    send: "$320.00",
    receive: "GMD 18,000",
    rate: "1,648.00",
    commissions: "$2.70",
    revenue: "$32.70",
  },
  {
    id: "REV001240",
    date: "06/23/2025",
    send: "$220.00",
    receive: "GMD 12,000",
    rate: "1,648.00",
    commissions: "$1.80",
    revenue: "$22.00",
  },
]

export default function Revenue() {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchId, setSearchId] = useState("")
  const [dateFilter, setDateFilter] = useState("")

  const itemsPerPage = 6
  const totalPages = Math.ceil(revenueData.length / itemsPerPage)

  const filteredData = revenueData.filter((item) => {
    return item.id.toLowerCase().includes(searchId.toLowerCase()) && item.date.includes(dateFilter)
  })

  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage)

  const totalRevenue = revenueData.reduce((sum, item) => {
    const amount = Number.parseFloat(item.revenue.replace("$", ""))
    return sum + amount
  }, 0)

  const totalCommissions = revenueData.reduce((sum, item) => {
    const amount = Number.parseFloat(item.commissions.replace("$", ""))
    return sum + amount
  }, 0)

  const totalVolume = revenueData.reduce((sum, item) => {
    const amount = Number.parseFloat(item.send.replace("$", ""))
    return sum + amount
  }, 0)

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Revenue</h1>
          <p className="text-gray-500 text-sm">Dashboard › Revenue</p>
        </div>
        <Button className="bg-blue-500 text-white hover:bg-blue-600 flex gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-gray-500 mt-1">All transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">${totalVolume.toFixed(2)}</div>
            <p className="text-xs text-gray-500 mt-1">Sent funds</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Commissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">${totalCommissions.toFixed(2)}</div>
            <p className="text-xs text-gray-500 mt-1">Transaction fees</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2">
            <Input placeholder="Transaction ID" value={searchId} onChange={(e) => setSearchId(e.target.value)} />
            <Input placeholder="Date" type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
            <Button variant="outline">Reset</Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Transaction ID</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Date</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Send</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Receive</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Rate</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Commission</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Revenue</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((item, idx) => (
                <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 font-semibold text-gray-900">{item.id}</td>
                  <td className="px-6 py-3 text-gray-900">{item.date}</td>
                  <td className="px-6 py-3 text-gray-900">{item.send}</td>
                  <td className="px-6 py-3 text-gray-900">{item.receive}</td>
                  <td className="px-6 py-3 text-gray-900">{item.rate}</td>
                  <td className="px-6 py-3 text-gray-900">{item.commissions}</td>
                  <td className="px-6 py-3 font-semibold text-green-600">{item.revenue}</td>
                  <td className="px-6 py-3">
                    <Eye className="h-4 w-4 text-blue-500 cursor-pointer hover:text-blue-700" />
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

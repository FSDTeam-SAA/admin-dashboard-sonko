"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { CustomPagination } from "@/components/custom-pagination"

const auditData = [
  {
    userName: "Alex rock",
    userId: "12542",
    action: "Added Manual Payment",
    date: "06/24/2025",
    ip: "192.168.4.4",
  },
  {
    userName: "Alex rock",
    userId: "22542",
    action: "Added Manual Payment",
    date: "06/24/2025",
    ip: "192.168.4.4",
  },
  {
    userName: "Alex rock",
    userId: "52542",
    action: "Issued Refund",
    date: "06/24/2025",
    ip: "192.168.4.4",
  },
  {
    userName: "Alex rock",
    userId: "82542",
    action: "Reset Password",
    date: "06/24/2025",
    ip: "192.168.4.4",
  },
  {
    userName: "Alex rock",
    userId: "62542",
    action: "Suspended User",
    date: "06/24/2025",
    ip: "192.168.4.4",
  },
]

export default function AuditLog() {
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5
  const totalPages = Math.ceil(auditData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedData = auditData.slice(startIndex, startIndex + itemsPerPage)

  return (
    <div className="p-8 bg-gray-50">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-gray-500 text-sm">Dashboard › Agents</p>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Search by:</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input placeholder="Date" className="w-40" />
            <Input placeholder="Action" />
            <Button variant="outline" size="icon">
              📅
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">User Name</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">User ID</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Action</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Date</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Ip Address</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((item, idx) => (
                <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-6 py-3 text-gray-900">{item.userName}</td>
                  <td className="px-6 py-3 text-gray-900">{item.userId}</td>
                  <td className="px-6 py-3 text-gray-900">{item.action}</td>
                  <td className="px-6 py-3 text-gray-900">{item.date}</td>
                  <td className="px-6 py-3 text-gray-900">{item.ip}</td>
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

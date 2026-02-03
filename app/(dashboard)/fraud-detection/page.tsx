"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { CustomPagination } from "@/components/custom-pagination"

const fraudData = [
  { id: "OF4203JD", entity: "customer", type: "Duplicate attempts", time: "12:23 PM" },
  { id: "OF4203JD", entity: "agent", type: "failed pay-outs", time: "12:23 PM" },
  { id: "OF4203JD", entity: "customer", type: "Duplicate attempts", time: "12:23 PM" },
  { id: "OF4203JD", entity: "customer", type: "Duplicate attempts", time: "12:23 PM" },
  { id: "OF4203JD", entity: "customer", type: "Duplicate attempts", time: "12:23 PM" },
  { id: "OF4203JD", entity: "customer", type: "Duplicate attempts", time: "12:23 PM" },
  { id: "OF4203JD", entity: "customer", type: "Duplicate attempts", time: "12:23 PM" },
  { id: "OF4203JD", entity: "customer", type: "Duplicate attempts", time: "12:23 PM" },
]

export default function FraudDetection() {
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8
  const totalPages = Math.ceil(fraudData.length / itemsPerPage)

  return (
    <div className="p-8 bg-gray-50">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Fraud Detection</h1>
        <p className="text-gray-500 text-sm">Dashboard › Fraud Detection</p>
      </div>

      {/* Alerts Summary */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⚠️</span>
              <div>
                <div className="text-xs text-gray-500">Triggered Alert</div>
                <div className="text-2xl font-bold text-orange-500">10</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📊</span>
              <div>
                <div className="text-xs text-gray-500">Rate Limit Warning</div>
                <div className="text-2xl font-bold text-blue-500">8</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🚫</span>
              <div>
                <div className="text-xs text-gray-500">Blocked Account</div>
                <div className="text-2xl font-bold text-red-500">5</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Search by:</CardTitle>
        </CardHeader>
        <CardContent>
          <Input placeholder="Date" className="w-32" />
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Alert ID</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Entity</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Alert Type</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Time</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Action</th>
              </tr>
            </thead>
            <tbody>
              {fraudData.map((item, idx) => (
                <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-6 py-3 text-gray-900">{item.id}</td>
                  <td className="px-6 py-3 text-gray-900">{item.entity}</td>
                  <td className="px-6 py-3 text-gray-900">{item.type}</td>
                  <td className="px-6 py-3 text-gray-900">{item.time}</td>
                  <td className="px-6 py-3">
                    <button className="px-3 py-1 bg-blue-500 text-white rounded text-xs font-medium hover:bg-blue-600">
                      View
                    </button>
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

"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Eye, X } from "lucide-react"
import { CustomPagination } from "@/components/custom-pagination"
import { Badge } from "@/components/ui/badge"

const ticketsData = [
  {
    id: "TK001245",
    priority: "Low",
    type: "Error Cash In",
    customer: "Alex Rock",
    date: "06/24/2025",
    time: "14:32",
    status: "Open",
    description: "Cash in failed for transaction",
  },
  {
    id: "TK001244",
    priority: "Medium",
    type: "Transfer Failed",
    customer: "Sarah Johnson",
    date: "06/24/2025",
    time: "13:15",
    status: "Open",
    description: "Money transfer not completed",
  },
  {
    id: "TK001243",
    priority: "High",
    type: "Account Locked",
    customer: "John Smith",
    date: "06/24/2025",
    time: "12:45",
    status: "Closed",
    description: "User account temporarily locked",
  },
  {
    id: "TK001242",
    priority: "Low",
    type: "Verification Issue",
    customer: "Emma Davis",
    date: "06/23/2025",
    time: "11:20",
    status: "Open",
    description: "KYC verification failed",
  },
  {
    id: "TK001241",
    priority: "Medium",
    type: "Payment Rejected",
    customer: "Michael Brown",
    date: "06/23/2025",
    time: "10:50",
    status: "In Progress",
    description: "Card payment declined",
  },
  {
    id: "TK001240",
    priority: "High",
    type: "Suspicious Activity",
    customer: "Lisa Wilson",
    date: "06/23/2025",
    time: "09:30",
    status: "Closed",
    description: "Unusual account activity detected",
  },
]

export default function Tickets() {
  const [currentPage, setCurrentPage] = useState(1)
  const [priorityFilter, setPriorityFilter] = useState("All Priorities")
  const [statusFilter, setStatusFilter] = useState("All Status")
  const [typeFilter, setTypeFilter] = useState("All Types")

  const itemsPerPage = 6
  const totalPages = Math.ceil(ticketsData.length / itemsPerPage)

  const filteredData = ticketsData.filter((item) => {
    return (
      (priorityFilter === "All Priorities" || item.priority === priorityFilter) &&
      (statusFilter === "All Status" || item.status === statusFilter) &&
      (typeFilter === "All Types" || item.type === typeFilter)
    )
  })

  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage)

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Low":
        return "bg-green-100 text-green-800"
      case "Medium":
        return "bg-yellow-100 text-yellow-800"
      case "High":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Open":
        return "bg-blue-100 text-blue-800"
      case "In Progress":
        return "bg-purple-100 text-purple-800"
      case "Closed":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const openCount = ticketsData.filter((t) => t.status === "Open").length
  const highPriorityCount = ticketsData.filter((t) => t.priority === "High").length

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Support Tickets</h1>
        <p className="text-gray-500 text-sm">Dashboard › Tickets</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Open Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{openCount}</div>
            <p className="text-xs text-gray-500 mt-1">Awaiting response</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">High Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{highPriorityCount}</div>
            <p className="text-xs text-gray-500 mt-1">Urgent attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{ticketsData.length}</div>
            <p className="text-xs text-gray-500 mt-1">All time</p>
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
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Priorities">All Priorities</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="High">High</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Status">All Status</SelectItem>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Issue Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Types">All Types</SelectItem>
                <SelectItem value="Error Cash In">Error Cash In</SelectItem>
                <SelectItem value="Transfer Failed">Transfer Failed</SelectItem>
                <SelectItem value="Account Locked">Account Locked</SelectItem>
                <SelectItem value="Verification Issue">Verification Issue</SelectItem>
                <SelectItem value="Payment Rejected">Payment Rejected</SelectItem>
                <SelectItem value="Suspicious Activity">Suspicious Activity</SelectItem>
              </SelectContent>
            </Select>
            <button
              onClick={() => {
                setPriorityFilter("All Priorities")
                setStatusFilter("All Status")
                setTypeFilter("All Types")
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Reset
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Ticket ID</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Priority</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Issue Type</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Customer</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Date</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Status</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((item, idx) => (
                <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 font-semibold text-gray-900">{item.id}</td>
                  <td className="px-6 py-3">
                    <Badge className={getPriorityColor(item.priority)}>{item.priority}</Badge>
                  </td>
                  <td className="px-6 py-3 text-gray-900">{item.type}</td>
                  <td className="px-6 py-3 text-gray-900">{item.customer}</td>
                  <td className="px-6 py-3 text-gray-900">
                    {item.date} {item.time}
                  </td>
                  <td className="px-6 py-3">
                    <Badge className={getStatusColor(item.status)}>{item.status}</Badge>
                  </td>
                  <td className="px-6 py-3 flex gap-2">
                    <Eye className="h-4 w-4 text-blue-500 cursor-pointer hover:text-blue-700" />
                    <X className="h-4 w-4 text-red-500 cursor-pointer hover:text-red-700" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <CustomPagination
        currentPage={currentPage}
        totalPages={Math.ceil(filteredData.length / itemsPerPage)}
        onPageChange={setCurrentPage}
      />
    </div>
  )
}

"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Eye, ThumbsUp, Trash2, Plus } from "lucide-react"
import { CustomPagination } from "@/components/custom-pagination"
import { DeleteModal } from "@/components/delete-modal"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

const agentsData = [
  {
    id: "AG001245",
    name: "Alex Rock",
    email: "alex@example.com",
    payouts: "$2,500",
    transactions: 324,
    location: "Lagos, Nigeria",
    status: "Approved",
    joinDate: "2023-01-15",
  },
  {
    id: "AG001244",
    name: "Sarah Johnson",
    email: "sarah@example.com",
    payouts: "$1,890",
    transactions: 267,
    location: "Accra, Ghana",
    status: "Approved",
    joinDate: "2023-02-20",
  },
  {
    id: "AG001243",
    name: "John Smith",
    email: "john@example.com",
    payouts: "$3,120",
    transactions: 445,
    location: "Nairobi, Kenya",
    status: "Approved",
    joinDate: "2022-11-10",
  },
  {
    id: "AG001242",
    name: "Emma Davis",
    email: "emma@example.com",
    payouts: "$2,200",
    transactions: 298,
    location: "Johannesburg, South Africa",
    status: "Pending",
    joinDate: "2023-05-05",
  },
  {
    id: "AG001241",
    name: "Michael Brown",
    email: "michael@example.com",
    payouts: "$1,560",
    transactions: 189,
    location: "Kampala, Uganda",
    status: "Approved",
    joinDate: "2023-03-12",
  },
  {
    id: "AG001240",
    name: "Lisa Wilson",
    email: "lisa@example.com",
    payouts: "$2,880",
    transactions: 356,
    location: "Addis Ababa, Ethiopia",
    status: "Approved",
    joinDate: "2023-01-28",
  },
]

export default function Agents() {
  const [currentPage, setCurrentPage] = useState(1)
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null as string | null })
  const [searchStatus, setSearchStatus] = useState("")
  const [searchLocation, setSearchLocation] = useState("")

  const itemsPerPage = 6
  const totalPages = Math.ceil(agentsData.length / itemsPerPage)

  const filteredData = agentsData.filter((item) => {
    return (
      (searchStatus === "" || item.status.toLowerCase().includes(searchStatus.toLowerCase())) &&
      (searchLocation === "" || item.location.toLowerCase().includes(searchLocation.toLowerCase()))
    )
  })

  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage)

  const handleDelete = (id: string) => {
    setDeleteModal({ open: true, id })
  }

  const confirmDelete = () => {
    toast.success("Agent deleted successfully")
    setDeleteModal({ open: false, id: null })
  }

  const approvedCount = agentsData.filter((a) => a.status === "Approved").length
  const totalPayouts = agentsData.reduce((sum, item) => {
    const amount = Number.parseFloat(item.payouts.replace(/[$,]/g, ""))
    return sum + amount
  }, 0)
  const totalTransactions = agentsData.reduce((sum, item) => sum + item.transactions, 0)

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Agents</h1>
          <p className="text-gray-500 text-sm">Dashboard › Agents Management</p>
        </div>
        <Button className="bg-blue-500 text-white hover:bg-blue-600 flex gap-2">
          <Plus className="h-4 w-4" />
          Add Agent
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{agentsData.length}</div>
            <p className="text-xs text-gray-500 mt-1">Active agents</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
            <p className="text-xs text-gray-500 mt-1">
              {((approvedCount / agentsData.length) * 100).toFixed(0)}% approved
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Payouts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">${totalPayouts.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{totalTransactions.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">Processed</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Status"
              value={searchStatus}
              onChange={(e) => setSearchStatus(e.target.value)}
              className="w-40"
            />
            <Input
              placeholder="Location"
              value={searchLocation}
              onChange={(e) => setSearchLocation(e.target.value)}
              className="w-40"
            />
            <Button
              variant="outline"
              onClick={() => {
                setSearchStatus("")
                setSearchLocation("")
              }}
            >
              Reset
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
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Agent ID</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Name</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Transactions</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Total Payouts</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Location</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Status</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((item, idx) => (
                <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 font-semibold text-gray-900">{item.id}</td>
                  <td className="px-6 py-3">
                    <div>
                      <div className="text-gray-900 font-medium">{item.name}</div>
                      <div className="text-xs text-gray-500">{item.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-gray-900">{item.transactions.toLocaleString()}</td>
                  <td className="px-6 py-3 font-semibold text-gray-900">{item.payouts}</td>
                  <td className="px-6 py-3 text-gray-900">{item.location}</td>
                  <td className="px-6 py-3">
                    <Badge
                      className={
                        item.status === "Approved" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                      }
                    >
                      {item.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-3 flex gap-2">
                    <Eye className="h-4 w-4 text-blue-500 cursor-pointer hover:text-blue-700" />
                    <ThumbsUp className="h-4 w-4 text-green-500 cursor-pointer hover:text-green-700" />
                    <Trash2
                      className="h-4 w-4 text-red-500 cursor-pointer hover:text-red-700"
                      onClick={() => handleDelete(item.id)}
                    />
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

      <DeleteModal
        open={deleteModal.open}
        title="Delete Agent"
        description="Are you sure you want to delete this agent? This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal({ open: false, id: null })}
      />
    </div>
  )
}

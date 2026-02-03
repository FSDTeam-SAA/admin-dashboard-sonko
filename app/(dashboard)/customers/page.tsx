"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Eye, Mail } from "lucide-react"
import { CustomPagination } from "@/components/custom-pagination"
import { Badge } from "@/components/ui/badge"

const customersData = [
  {
    id: "CUST001",
    name: "Leslie Alexander",
    email: "leslie@example.com",
    verification: "Fully Verified",
    phone: "+2200245562",
    lastLogin: "2025-06-24 10:00am",
    transfers: "$200,000",
    joinDate: "2023-01-15",
    status: "Active",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Leslie",
  },
  {
    id: "CUST002",
    name: "Floyd Miles",
    email: "floyd@example.com",
    verification: "Partially Verified",
    phone: "+2200245562",
    lastLogin: "2025-06-24 09:30am",
    transfers: "$125,000",
    joinDate: "2023-02-20",
    status: "Active",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Floyd",
  },
  {
    id: "CUST003",
    name: "Darlene Robertson",
    email: "darlene@example.com",
    verification: "Fully Verified",
    phone: "+2200245562",
    lastLogin: "2025-06-23 05:45pm",
    transfers: "$350,000",
    joinDate: "2022-11-10",
    status: "Active",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Darlene",
  },
  {
    id: "CUST004",
    name: "Ralph Edwards",
    email: "ralph@example.com",
    verification: "Fully Verified",
    phone: "+2200245562",
    lastLogin: "2025-06-22 02:15pm",
    transfers: "$180,000",
    joinDate: "2023-03-05",
    status: "Inactive",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ralph",
  },
  {
    id: "CUST005",
    name: "Cody Fisher",
    email: "cody@example.com",
    verification: "Not Verified",
    phone: "+2200245562",
    lastLogin: "2025-06-15 03:00pm",
    transfers: "$45,000",
    joinDate: "2023-05-12",
    status: "Inactive",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Cody",
  },
  {
    id: "CUST006",
    name: "Evelyn Harper",
    email: "evelyn@example.com",
    verification: "Fully Verified",
    phone: "+2200245562",
    lastLogin: "2025-06-24 11:20am",
    transfers: "$280,000",
    joinDate: "2023-02-28",
    status: "Active",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Evelyn",
  },
]

export default function Customers() {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchName, setSearchName] = useState("")
  const [searchPhone, setSearchPhone] = useState("")

  const itemsPerPage = 6
  const totalPages = Math.ceil(customersData.length / itemsPerPage)

  const filteredData = customersData.filter((item) => {
    return item.name.toLowerCase().includes(searchName.toLowerCase()) && item.phone.includes(searchPhone)
  })

  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage)

  const getVerificationColor = (status: string) => {
    if (status.includes("Fully")) return "bg-green-100 text-green-800"
    if (status.includes("Partially")) return "bg-yellow-100 text-yellow-800"
    return "bg-red-100 text-red-800"
  }

  const getStatusColor = (status: string) => {
    return status === "Active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
  }

  const activeCount = customersData.filter((c) => c.status === "Active").length
  const verifiedCount = customersData.filter((c) => c.verification === "Fully Verified").length
  const totalTransfers = customersData.reduce((sum, item) => {
    const amount = Number.parseFloat(item.transfers.replace(/[$,]/g, ""))
    return sum + amount
  }, 0)

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
        <p className="text-gray-500 text-sm">Dashboard › Customers</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{customersData.length}</div>
            <p className="text-xs text-gray-500 mt-1">Registered users</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeCount}</div>
            <p className="text-xs text-gray-500 mt-1">
              {((activeCount / customersData.length) * 100).toFixed(0)}% active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">${(totalTransfers / 1000).toFixed(0)}K</div>
            <p className="text-xs text-gray-500 mt-1">Total transfers</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Search by:</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            <Input placeholder="Customer Name" value={searchName} onChange={(e) => setSearchName(e.target.value)} />
            <Input placeholder="Phone Number" value={searchPhone} onChange={(e) => setSearchPhone(e.target.value)} />
            <button
              onClick={() => {
                setSearchName("")
                setSearchPhone("")
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
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Customer Name</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Verification</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Contact</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Last Login</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Total Transfers</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Status</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((item, idx) => (
                <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={item.avatar || "/placeholder.svg"} />
                        <AvatarFallback>{item.name.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-gray-900 font-medium">{item.name}</div>
                        <div className="text-xs text-gray-500">{item.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <Badge className={getVerificationColor(item.verification)}>{item.verification}</Badge>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Mail className="h-3 w-3" />
                      <span className="truncate max-w-[120px]">{item.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-gray-900">{item.lastLogin}</td>
                  <td className="px-6 py-3 font-semibold text-gray-900">{item.transfers}</td>
                  <td className="px-6 py-3">
                    <Badge className={getStatusColor(item.status)}>{item.status}</Badge>
                  </td>
                  <td className="px-6 py-3">
                    <Eye className="h-4 w-4 text-blue-500 cursor-pointer hover:text-blue-700" />
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

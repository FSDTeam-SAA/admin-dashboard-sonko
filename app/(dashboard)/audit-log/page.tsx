"use client"

import { useState } from "react"
import { CalendarDays } from "lucide-react"
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
  const totalPages = 2

  return (
    <div className="p-8 bg-[#f5f6f8] min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-[#2c2c2c]">Audit Log</h1>
        <p className="text-sm text-[#7a7a7a]">Dashboard &gt; Agents</p>
      </div>

      <div className="mb-5">
        <div className="text-sm font-semibold text-[#2c2c2c] mb-3">Search by:</div>
        <div className="flex gap-4">
          <div className="relative w-52">
            <input
              className="h-10 w-full rounded-md border border-[#bdbdbd] bg-white px-3 pr-10 text-sm"
              placeholder="Date"
            />
            <CalendarDays className="h-4 w-4 text-[#6b6b6b] absolute right-3 top-1/2 -translate-y-1/2" />
          </div>
          <input
            className="h-10 w-56 rounded-md border border-[#bdbdbd] bg-white px-3 text-sm"
            placeholder="Action"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#bdbdbd] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white border-b border-[#bdbdbd]">
            <tr className="text-[#2c2c2c]">
              <th className="px-6 py-4 text-left font-semibold">User Name</th>
              <th className="px-6 py-4 text-left font-semibold">User ID</th>
              <th className="px-6 py-4 text-left font-semibold">Action</th>
              <th className="px-6 py-4 text-left font-semibold">Date</th>
              <th className="px-6 py-4 text-left font-semibold">Ip Address</th>
            </tr>
          </thead>
          <tbody>
            {auditData.map((row, index) => (
              <tr key={`${row.userId}-${index}`} className="border-b border-[#bdbdbd] last:border-b-0">
                <td className="px-6 py-5 text-[#2c2c2c]">{row.userName}</td>
                <td className="px-6 py-5 text-[#2c2c2c]">{row.userId}</td>
                <td className="px-6 py-5 text-[#2c2c2c]">{row.action}</td>
                <td className="px-6 py-5 text-[#2c2c2c]">{row.date}</td>
                <td className="px-6 py-5 text-[#2c2c2c]">{row.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CustomPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
    </div>
  )
}

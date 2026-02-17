"use client"

import { useState } from "react"
import { CalendarDays } from "lucide-react"
import { CustomPagination } from "@/components/custom-pagination"

const notificationsData = [
  {
    id: "FG565465",
    date: "06/24/2025",
    name: "Alex rock",
    subject: "transactions",
    amount: "GMD15000",
    status: "Failed",
  },
  {
    id: "FG565465",
    date: "06/24/2025",
    name: "Alex rock",
    subject: "Transaction",
    amount: "GMD15000",
    status: "New fraud",
  },
  {
    id: "FG565465",
    date: "06/24/2025",
    name: "Alex rock",
    subject: "Customer",
    amount: "GMD15000",
    status: "disputes",
  },
  {
    id: "FG565465",
    date: "06/24/2025",
    name: "Alex rock",
    subject: "KYC",
    amount: "GMD15000",
    status: "failure",
  },
]

export default function Notifications() {
  const [currentPage, setCurrentPage] = useState(1)
  const totalPages = 2

  return (
    <div className="p-8 bg-[#f5f6f8] min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-[#2c2c2c]">Notifications</h1>
        <p className="text-sm text-[#7a7a7a]">Dashboard &gt; Notifications</p>
      </div>

      <div className="mb-5">
        <div className="text-sm font-semibold text-[#2c2c2c] mb-3">Search by:</div>
        <div className="flex gap-4">
          <input
            className="h-10 w-52 rounded-md border border-[#bdbdbd] bg-white px-3 text-sm"
            placeholder="Transaction ID"
          />
          <input className="h-10 w-52 rounded-md border border-[#bdbdbd] bg-white px-3 text-sm" placeholder="Name" />
          <div className="relative w-52">
            <input
              className="h-10 w-full rounded-md border border-[#bdbdbd] bg-white px-3 pr-10 text-sm"
              placeholder="Date"
            />
            <CalendarDays className="h-4 w-4 text-[#4d9bff] absolute right-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#bdbdbd] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white border-b border-[#bdbdbd]">
            <tr className="text-[#2c2c2c]">
              <th className="px-6 py-4 text-left font-semibold">Transaction Id</th>
              <th className="px-6 py-4 text-left font-semibold">Date</th>
              <th className="px-6 py-4 text-left font-semibold">Name</th>
              <th className="px-6 py-4 text-left font-semibold">Subject</th>
              <th className="px-6 py-4 text-left font-semibold">Amount</th>
              <th className="px-6 py-4 text-left font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {notificationsData.map((row, index) => (
              <tr key={`${row.id}-${index}`} className="border-b border-[#bdbdbd] last:border-b-0">
                <td className="px-6 py-4 text-[#2c2c2c]">{row.id}</td>
                <td className="px-6 py-4 text-[#2c2c2c]">{row.date}</td>
                <td className="px-6 py-4 text-[#2c2c2c]">{row.name}</td>
                <td className="px-6 py-4 text-[#2c2c2c]">{row.subject}</td>
                <td className="px-6 py-4 text-[#2c2c2c]">{row.amount}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex h-7 min-w-[80px] items-center justify-center rounded-full bg-[#ff0000] px-4 text-[11px] font-semibold text-white">
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CustomPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
    </div>
  )
}

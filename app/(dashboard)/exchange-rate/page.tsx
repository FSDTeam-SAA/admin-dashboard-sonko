"use client"

import { useState } from "react"
import { Plus, Calendar } from "lucide-react"
import { CustomPagination } from "@/components/custom-pagination"

const exchangeRateData = [
  { id: 1, date: "06/24/2025", rate: "$2.0", commissions: "2%", revenue: "$20" },
  { id: 2, date: "06/24/2025", rate: "$2.0", commissions: "2%", revenue: "$20" },
  { id: 3, date: "06/24/2025", rate: "$2.0", commissions: "2%", revenue: "$20" },
  { id: 4, date: "06/24/2025", rate: "$2.0", commissions: "2%", revenue: "$20" },
  { id: 5, date: "06/24/2025", rate: "$2.0", commissions: "2%", revenue: "$20" },
  { id: 6, date: "06/24/2025", rate: "$2.0", commissions: "2%", revenue: "$20" },
]

export default function ExchangeRate() {
  const [currentPage, setCurrentPage] = useState(1)
  const [showModal, setShowModal] = useState(false)

  const totalPages = 2

  return (
    <div className="p-8 bg-[#f5f6f8] min-h-screen">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-[#2c2c2c]">Exchange Rate</h1>
          <p className="text-sm text-[#8a8a8a]">Dashboard &gt; Exchange Rate</p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="h-10 px-4 rounded-md bg-[#4d9bff] text-white text-sm font-medium flex items-center gap-2"
        >
          Add Rate
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-6">
        <div className="text-sm font-semibold text-[#2c2c2c] mb-3">Search by:</div>
        <div className="relative w-56">
          <input
            className="h-10 w-full rounded-md border border-[#bdbdbd] bg-white px-3 pr-10 text-sm"
            placeholder="Date"
          />
          <Calendar className="h-4 w-4 text-[#6b6b6b] absolute right-3 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#bdbdbd] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white border-b border-[#bdbdbd]">
            <tr className="text-[#2c2c2c]">
              <th className="px-6 py-4 text-left font-semibold">Date</th>
              <th className="px-6 py-4 text-left font-semibold">Exchange rate</th>
              <th className="px-6 py-4 text-left font-semibold">Commissions</th>
              <th className="px-6 py-4 text-right font-semibold">Exchange Revenue</th>
            </tr>
          </thead>
          <tbody>
            {exchangeRateData.map((row) => (
              <tr key={row.id} className="border-b border-[#bdbdbd] last:border-b-0">
                <td className="px-6 py-4">{row.date}</td>
                <td className="px-6 py-4">{row.rate}</td>
                <td className="px-6 py-4">{row.commissions}</td>
                <td className="px-6 py-4 text-right">{row.revenue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CustomPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />

      {showModal ? (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white w-[520px] rounded-xl border border-[#bdbdbd] shadow-xl p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="text-xl font-semibold text-center text-[#2c2c2c] mb-6">
              Exchange Rate
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-sm font-semibold text-[#2c2c2c] mb-2">Date</div>
                <input
                  className="h-10 w-full rounded-md border border-[#bdbdbd] px-3 text-sm"
                  placeholder="258/06/24"
                />
              </div>
              <div>
                <div className="text-sm font-semibold text-[#2c2c2c] mb-2">Exchange Rate</div>
                <input
                  className="h-10 w-full rounded-md border border-[#bdbdbd] px-3 text-sm"
                  placeholder="$2.00"
                />
              </div>
              <div>
                <div className="text-sm font-semibold text-[#2c2c2c] mb-2">Commisions</div>
                <input
                  className="h-10 w-full rounded-md border border-[#bdbdbd] px-3 text-sm"
                  placeholder=".50%@gmail.com"
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

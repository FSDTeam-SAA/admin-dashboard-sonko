"use client"

import { useState } from "react"
import { Download } from "lucide-react"
import { CustomPagination } from "@/components/custom-pagination"

const reportsData = [
  {
    name: "Savannah Nguyen",
    sent: "$1000",
    sentMeta: "(3 transactions)",
    payouts: "$1000",
    payoutsMeta: "(2 payouts)",
    refunds: "$1000",
    refundsMeta: "(5 refunds)",
    failed: "$1000",
    failedMeta: "(10 failed transfers)",
  },
  {
    name: "Annette Black",
    sent: "$1000",
    sentMeta: "(3 transactions)",
    payouts: "$1000",
    payoutsMeta: "(2 payouts)",
    refunds: "$1000",
    refundsMeta: "(5 refunds)",
    failed: "$1000",
    failedMeta: "(10 failed transfers)",
  },
  {
    name: "Devon Lane",
    sent: "$1000",
    sentMeta: "(3 transactions)",
    payouts: "$1000",
    payoutsMeta: "(2 payouts)",
    refunds: "$1000",
    refundsMeta: "(5 refunds)",
    failed: "$1000",
    failedMeta: "(10 failed transfers)",
  },
  {
    name: "Floyd Miles",
    sent: "$1000",
    sentMeta: "(3 transactions)",
    payouts: "$1000",
    payoutsMeta: "(2 payouts)",
    refunds: "$1000",
    refundsMeta: "(5 refunds)",
    failed: "$1000",
    failedMeta: "(10 failed transfers)",
  },
  {
    name: "Darrell Steward",
    sent: "$1000",
    sentMeta: "(3 transactions)",
    payouts: "$1000",
    payoutsMeta: "(2 payouts)",
    refunds: "$1000",
    refundsMeta: "(5 refunds)",
    failed: "$1000",
    failedMeta: "(10 failed transfers)",
  },
  {
    name: "Kristin Watson",
    sent: "$1000",
    sentMeta: "(3 transactions)",
    payouts: "$1000",
    payoutsMeta: "(2 payouts)",
    refunds: "$1000",
    refundsMeta: "(5 refunds)",
    failed: "$1000",
    failedMeta: "(10 failed transfers)",
  },
  {
    name: "Courtney Henry",
    sent: "$1000",
    sentMeta: "(3 transactions)",
    payouts: "$1000",
    payoutsMeta: "(2 payouts)",
    refunds: "$1000",
    refundsMeta: "(5 refunds)",
    failed: "$1000",
    failedMeta: "(10 failed transfers)",
  },
  {
    name: "Brooklyn Simmons",
    sent: "$1000",
    sentMeta: "(3 transactions)",
    payouts: "$1000",
    payoutsMeta: "(2 payouts)",
    refunds: "$1000",
    refundsMeta: "(5 refunds)",
    failed: "$1000",
    failedMeta: "(10 failed transfers)",
  },
]

export default function Reports() {
  const [currentPage, setCurrentPage] = useState(1)
  const totalPages = 2

  return (
    <div className="p-8 bg-[#f5f6f8] min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-[#2c2c2c]">Reports</h1>
        <p className="text-sm text-[#7a7a7a]">Dashboard &gt; Reports</p>
      </div>

      <div className="bg-white rounded-xl border border-[#bdbdbd] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white border-b border-[#bdbdbd]">
            <tr className="text-[#2c2c2c]">
              <th className="px-6 py-4 text-left font-semibold">Name</th>
              <th className="px-6 py-4 text-left font-semibold">Total Sent</th>
              <th className="px-6 py-4 text-left font-semibold">Pay-outs</th>
              <th className="px-6 py-4 text-left font-semibold">Refunds</th>
              <th className="px-6 py-4 text-left font-semibold">Failed Transfers</th>
              <th className="px-6 py-4 text-left font-semibold">Export data</th>
            </tr>
          </thead>
          <tbody>
            {reportsData.map((row, index) => (
              <tr key={`${row.name}-${index}`} className="border-b border-[#bdbdbd] last:border-b-0">
                <td className="px-6 py-6 font-medium text-[#2c2c2c]">{row.name}</td>
                <td className="px-6 py-6">
                  <div className="text-[#2c2c2c] font-medium">{row.sent}</div>
                  <div className="text-[#2c2c2c]">{row.sentMeta}</div>
                </td>
                <td className="px-6 py-6">
                  <div className="text-[#2c2c2c] font-medium">{row.payouts}</div>
                  <div className="text-[#2c2c2c]">{row.payoutsMeta}</div>
                </td>
                <td className="px-6 py-6">
                  <div className="text-[#2c2c2c] font-medium">{row.refunds}</div>
                  <div className="text-[#2c2c2c]">{row.refundsMeta}</div>
                </td>
                <td className="px-6 py-6">
                  <div className="text-[#2c2c2c] font-medium">{row.failed}</div>
                  <div className="text-[#2c2c2c]">{row.failedMeta}</div>
                </td>
                <td className="px-6 py-6">
                  <button
                    type="button"
                    className="h-9 px-4 rounded-md bg-[#47a447] text-white text-xs font-semibold inline-flex items-center gap-2"
                  >
                    Download Now
                    <Download className="h-4 w-4" />
                  </button>
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

"use client"

import { useState } from "react"
import { CalendarDays } from "lucide-react"
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
  const [showModal, setShowModal] = useState(false)
  const totalPages = 2

  return (
    <div className="p-8 bg-[#f5f6f8] min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-[#2c2c2c]">Fraud Detection</h1>
        <p className="text-sm text-[#7a7a7a]">Dashboard &gt; Fraud Detection</p>
      </div>

      <div className="mb-5">
        <div className="text-sm font-semibold text-[#2c2c2c] mb-3">Search by:</div>
        <div className="flex items-center justify-between gap-6">
          <div className="flex gap-4">
            <input
              className="h-10 w-48 rounded-md border border-[#bdbdbd] bg-white px-3 text-sm"
              placeholder="Alert type"
            />
            <div className="relative w-48">
              <input
                className="h-10 w-full rounded-md border border-[#bdbdbd] bg-white px-3 pr-10 text-sm"
                placeholder="Date"
              />
              <CalendarDays className="h-4 w-4 text-[#4d9bff] absolute right-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>
          <div className="flex gap-3">
            <div className="h-10 px-4 rounded-md border border-[#f07f2d] text-[#f07f2d] flex items-center gap-2 text-sm">
              Tigred Alert <span className="text-[#2ea44f] text-lg font-semibold">10</span>
            </div>
            <div className="h-10 px-4 rounded-md border border-[#f07f2d] text-[#f07f2d] flex items-center gap-2 text-sm">
              Rate Limit Warning <span className="text-[#2ea44f] text-lg font-semibold">8</span>
            </div>
            <div className="h-10 px-4 rounded-md border border-[#f07f2d] text-[#f07f2d] flex items-center gap-2 text-sm">
              Blocked Account <span className="text-[#2ea44f] text-lg font-semibold">5</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#bdbdbd] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white border-b border-[#bdbdbd]">
            <tr className="text-[#2c2c2c]">
              <th className="px-6 py-4 text-left font-semibold">Alert ID</th>
              <th className="px-6 py-4 text-left font-semibold">Entity</th>
              <th className="px-6 py-4 text-left font-semibold">Alert Type</th>
              <th className="px-6 py-4 text-left font-semibold">Time</th>
              <th className="px-6 py-4 text-left font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {fraudData.map((row, index) => (
              <tr key={`${row.id}-${index}`} className="border-b border-[#bdbdbd] last:border-b-0">
                <td className="px-6 py-4 text-[#2c2c2c]">{row.id}</td>
                <td className="px-6 py-4 text-[#2c2c2c]">{row.entity}</td>
                <td className="px-6 py-4 text-[#2c2c2c]">{row.type}</td>
                <td className="px-6 py-4 text-[#2c2c2c]">{row.time}</td>
                <td className="px-6 py-4">
                  <button
                    type="button"
                    className="h-8 w-20 rounded-full bg-[#4da3ff] text-white text-xs"
                    onClick={() => setShowModal(true)}
                  >
                    View
                  </button>
                </td>
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
            className="bg-white w-[420px] rounded-xl border border-[#bdbdbd] shadow-xl p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-semibold text-[#2c2c2c] mb-1">Description</div>
                <div className="text-[#2c2c2c]">Unusual payout amount</div>
              </div>
              <div>
                <div className="font-semibold text-[#2c2c2c] mb-1">Rule</div>
                <div className="text-[#4da3ff]">Maximum payout is GMD 10 000</div>
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button type="button" className="h-8 px-5 rounded-full bg-[#f07f2d] text-white text-xs">
                dismiss
              </button>
              <button type="button" className="h-8 px-5 rounded-full bg-[#3aa84f] text-white text-xs">
                Escalate
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

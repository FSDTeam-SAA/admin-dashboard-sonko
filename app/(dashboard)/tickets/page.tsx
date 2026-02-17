"use client"

import { useState } from "react"
import { Eye, Check, X, Upload, MessageSquare } from "lucide-react"
import { CustomPagination } from "@/components/custom-pagination"
import Image from "next/image"

const ticketsData = [
  { id: "OF4203JD", priority: "Low", issue: "Error Cash In", date: "06/24/2025" },
  { id: "OF4203JD", priority: "Medium", issue: "Error Cash In", date: "06/24/2025" },
  { id: "OF4203JD", priority: "High", issue: "Error Cash In", date: "06/24/2025" },
  { id: "OF4203JD", priority: "Alex rock", issue: "Error Cash In", date: "06/24/2025" },
  { id: "OF4203JD", priority: "Alex rock", issue: "Error Cash In", date: "06/24/2025" },
  { id: "OF4203JD", priority: "Alex rock", issue: "Error Cash In", date: "06/24/2025" },
  { id: "OF4203JD", priority: "Alex rock", issue: "Error Cash In", date: "06/24/2025" },
]

const loginHistory = [
  { ip: "198-158-54", country: "Gambia", date: "06/24/2025", device: "Samsung 52", status: "Successful" },
  { ip: "198-158-54", country: "Senegal", date: "06/24/2025", device: "Samsung 52", status: "Successful" },
  { ip: "198-158-54", country: "UK", date: "06/24/2025", device: "Samsung 52", status: "Failure" },
]

export default function Tickets() {
  const [currentPage, setCurrentPage] = useState(1)
  const [showProfile, setShowProfile] = useState(false)
  const [showMessage, setShowMessage] = useState(false)
  const totalPages = 2

  return (
    <div className="p-8 bg-[#f5f6f8] min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-[#2c2c2c]">Tickets</h1>
        <p className="text-sm text-[#8a8a8a]">Dashboard &gt; Tickets</p>
      </div>

      <div className="mb-6">
        <div className="text-sm font-semibold text-[#2c2c2c] mb-3">Search by:</div>
        <div className="flex gap-4">
          <select className="h-10 w-48 rounded-md border border-[#bdbdbd] bg-white px-3 text-sm text-[#6b6b6b]">
            <option>Status</option>
          </select>
          <select className="h-10 w-56 rounded-md border border-[#bdbdbd] bg-white px-3 text-sm text-[#6b6b6b]">
            <option>issue Type</option>
          </select>
          <select className="h-10 w-48 rounded-md border border-[#bdbdbd] bg-white px-3 text-sm text-[#6b6b6b]">
            <option>priority</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#bdbdbd] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white border-b border-[#bdbdbd]">
            <tr className="text-[#2c2c2c]">
              <th className="px-6 py-4 text-left font-semibold">Ticket ID</th>
              <th className="px-6 py-4 text-left font-semibold">Priority label</th>
              <th className="px-6 py-4 text-left font-semibold">Issue Type</th>
              <th className="px-6 py-4 text-left font-semibold">Date</th>
              <th className="px-6 py-4 text-right font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {ticketsData.map((row, index) => (
              <tr key={`${row.id}-${index}`} className="border-b border-[#bdbdbd] last:border-b-0">
                <td className="px-6 py-4 text-[#2c2c2c] font-medium">{row.id}</td>
                <td className="px-6 py-4 text-[#2c2c2c]">{row.priority}</td>
                <td className="px-6 py-4 text-[#2c2c2c]">{row.issue}</td>
                <td className="px-6 py-4 text-[#2c2c2c]">{row.date}</td>
                <td className="px-6 py-4">
                  <div className="flex justify-end gap-4 text-[#2c2c2c]">
                    <button type="button" onClick={() => setShowProfile(true)}>
                      <Eye className="h-4 w-4" />
                    </button>
                    <button type="button">
                      <Check className="h-4 w-4" />
                    </button>
                    <button type="button">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CustomPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />

      {showProfile ? (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowProfile(false)}
        >
          <div
            className="bg-white w-[920px] rounded-2xl border border-[#bdbdbd] shadow-xl p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="grid grid-cols-[1.2fr_1fr_1fr_auto] gap-6 items-start">
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-[#2c2c2c] font-semibold">Customer Profile</div>
                  <div className="text-xl font-semibold text-[#2c2c2c]">Jonson</div>
                </div>
                <div>
                  <div className="text-sm text-[#2c2c2c] font-semibold">Country $ Address</div>
                  <div className="text-base text-[#2c2c2c]">UK</div>
                </div>
                <div className="text-sm font-semibold text-[#d83b2d]">Error Cash In</div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-sm text-[#2c2c2c] font-semibold">Phone Number</div>
                  <div className="text-base text-[#2c2c2c]">+2196412365</div>
                </div>
                <div>
                  <div className="text-sm text-[#2c2c2c] font-semibold">Registration Date</div>
                  <div className="text-base text-[#2c2c2c]">25/05/2024</div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-[#2ea44f]">Assign Agent</div>
                  <input
                    className="mt-2 h-10 w-full rounded-md border border-[#bdbdbd] px-3 text-sm"
                    placeholder="Assign Agent"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-sm text-[#2c2c2c] font-semibold">Date of birth</div>
                  <div className="text-base text-[#2c2c2c]">8/16/13</div>
                </div>
                <div>
                  <div className="text-sm text-[#2c2c2c] font-semibold">Account Length</div>
                  <div className="text-base text-[#2c2c2c]">2 Years</div>
                </div>
              </div>

              <div className="flex flex-col items-center gap-3">
                <Image
                  src="/placeholder-user.jpg"
                  alt="Profile"
                  width={120}
                  height={120}
                  className="rounded-lg object-cover"
                />
                <button
                  type="button"
                  className="h-10 px-6 rounded-md bg-[#4da3ff] text-white text-sm font-semibold flex items-center gap-2"
                  onClick={() => {
                    setShowProfile(false)
                    setShowMessage(true)
                  }}
                >
                  <MessageSquare className="h-4 w-4" />
                  Message
                </button>
              </div>
            </div>

            <div className="mt-6 border border-[#bdbdbd] rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-white border-b border-[#bdbdbd]">
                  <tr className="text-[#2c2c2c]">
                    <th className="px-6 py-4 text-left font-semibold">Last Login IP</th>
                    <th className="px-6 py-4 text-left font-semibold">Country</th>
                    <th className="px-6 py-4 text-left font-semibold">Date</th>
                    <th className="px-6 py-4 text-left font-semibold">Device</th>
                    <th className="px-6 py-4 text-left font-semibold">Login Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loginHistory.map((entry, index) => (
                    <tr key={`${entry.country}-${index}`} className="border-b border-[#bdbdbd] last:border-b-0">
                      <td className="px-6 py-4">{entry.ip}</td>
                      <td className="px-6 py-4">{entry.country}</td>
                      <td className="px-6 py-4">{entry.date}</td>
                      <td className="px-6 py-4">{entry.device}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                            entry.status === "Successful" ? "bg-[#3aa84f] text-white" : "bg-[#d62828] text-white"
                          }`}
                        >
                          {entry.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {showMessage ? (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowMessage(false)}
        >
          <div
            className="bg-white w-[820px] rounded-xl border border-[#bdbdbd] shadow-xl overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="h-12 bg-[#4da3ff] text-white flex items-center justify-center text-sm font-semibold">
              Message & Upload your image file
            </div>
            <div className="p-6">
              <textarea
                className="w-full h-40 rounded-md border border-[#e0e0e0] p-4 text-sm text-[#2c2c2c]"
                placeholder="Write Here..."
              />
              <div className="mt-6 flex flex-col items-center gap-2 text-[#2c2c2c]">
                <Upload className="h-6 w-6" />
                <div className="text-sm">Upload</div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

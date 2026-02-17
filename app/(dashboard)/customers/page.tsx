"use client"

import { useState } from "react"
import Image from "next/image"
import { CalendarDays, Upload, MessageSquare } from "lucide-react"
import { CustomPagination } from "@/components/custom-pagination"

const customersData = [
  { name: "Leslie Alexander", verification: "Fully Verified" },
  { name: "Floyd Miles", verification: "Partially Verified" },
  { name: "Darlene Robertson", verification: "Fully Verified" },
  { name: "Ralph Edwards", verification: "Fully Verified" },
  { name: "Cody Fisher", verification: "Not Verified" },
  { name: "Devon Lane", verification: "Partially Verified" },
  { name: "Jenny Wilson", verification: "Partially Verified" },
  { name: "Dianne Russell", verification: "Not Verified" },
  { name: "Ronald Richards", verification: "Fully Verified" },
]

const loginHistory = [
  {
    ip: "198-158-54",
    funding: "Bank",
    withdrawal: "Bank",
    date: "06/24/2025",
    device: "Samsung 52",
    status: "Successful",
  },
  {
    ip: "198-158-54",
    funding: "Agent",
    withdrawal: "Agent",
    date: "06/24/2025",
    device: "Samsung 52",
    status: "Successful",
  },
  {
    ip: "198-158-54",
    funding: "Bank",
    withdrawal: "Bank",
    date: "06/24/2025",
    device: "Samsung 52",
    status: "Failure",
  },
]

export default function Customers() {
  const [currentPage, setCurrentPage] = useState(1)
  const [showProfile, setShowProfile] = useState(false)
  const [showMessage, setShowMessage] = useState(false)
  const totalPages = 2

  const getVerificationColor = (status: string) => {
    if (status === "Fully Verified") return "text-[#2ea44f]"
    if (status === "Partially Verified") return "text-[#f97316]"
    return "text-[#ff2d2d]"
  }

  return (
    <div className="p-8 bg-[#f5f6f8] min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-[#2c2c2c]">Customers</h1>
        <p className="text-sm text-[#7a7a7a]">Dashboard &gt; Customers</p>
      </div>

      <div className="mb-5">
        <div className="text-sm font-semibold text-[#2c2c2c] mb-3">Search by:</div>
        <div className="flex gap-4">
          <input
            className="h-10 w-52 rounded-md border border-[#bdbdbd] bg-white px-3 text-sm"
            placeholder="Name"
          />
          <input
            className="h-10 w-52 rounded-md border border-[#bdbdbd] bg-white px-3 text-sm"
            placeholder="Phone number"
          />
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
              <th className="px-6 py-4 text-left font-semibold">Customers Name</th>
              <th className="px-6 py-4 text-left font-semibold">verification status</th>
              <th className="px-6 py-4 text-left font-semibold">Phone Number</th>
              <th className="px-6 py-4 text-left font-semibold">Last Login,</th>
              <th className="px-6 py-4 text-left font-semibold">Total Transfers</th>
              <th className="px-6 py-4 text-left font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {customersData.map((row, index) => (
              <tr key={`${row.name}-${index}`} className="border-b border-[#bdbdbd] last:border-b-0">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Image
                      src="/placeholder-user.jpg"
                      alt={row.name}
                      width={36}
                      height={36}
                      className="rounded-full"
                    />
                    <div className="text-[#2c2c2c] font-medium">{row.name}</div>
                  </div>
                </td>
                <td className={`px-6 py-4 font-medium ${getVerificationColor(row.verification)}`}>
                  {row.verification}
                </td>
                <td className="px-6 py-4 text-[#2c2c2c]">+2200245562</td>
                <td className="px-6 py-4 text-[#2c2c2c]">
                  <div>2023-01-15</div>
                  <div>10.00Am</div>
                </td>
                <td className="px-6 py-4 text-[#2c2c2c]">$200000</td>
                <td className="px-6 py-4">
                  <button
                    type="button"
                    className="h-9 w-28 rounded-full bg-[#4da3ff] text-white text-sm"
                    onClick={() => setShowProfile(true)}
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

      {showProfile ? (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowProfile(false)}
        >
          <div
            className="bg-white w-[980px] rounded-2xl border border-[#bdbdbd] shadow-xl p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-6 items-start">
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-semibold text-[#2c2c2c]">Customer Profile</div>
                  <div className="text-xl font-semibold text-[#2c2c2c]">Jonson</div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-[#2c2c2c]">Country $ Address</div>
                  <div className="text-base text-[#2c2c2c]">UK</div>
                </div>
                <div className="text-sm font-semibold text-[#2ea44f]">KYC: Fully Verified</div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="text-sm font-semibold text-[#2c2c2c]">Phone Number</div>
                  <div className="text-base text-[#2c2c2c]">+2196412365</div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-[#2c2c2c]">Registration Date</div>
                  <div className="text-base text-[#2c2c2c]">25/05/2024</div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="text-sm font-semibold text-[#2c2c2c]">Date of birth</div>
                  <div className="text-base text-[#2c2c2c]">8/16/13</div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-[#2c2c2c]">Account Length</div>
                  <div className="text-base text-[#2c2c2c]">2 Years</div>
                </div>
                <div className="text-sm font-semibold text-[#2ea44f]">Account Active</div>
              </div>

              <div className="flex flex-col items-center gap-3">
                <Image
                  src="/placeholder-user.jpg"
                  alt="Profile"
                  width={110}
                  height={110}
                  className="rounded-lg object-cover"
                />
                <button type="button" className="h-9 px-4 rounded-md bg-[#f47b20] text-white text-sm font-semibold">
                  Block Account
                </button>
                <button type="button" className="h-9 px-4 rounded-md bg-[#46a74a] text-white text-sm font-semibold">
                  Edit Profile
                </button>
                <button
                  type="button"
                  className="h-9 px-4 rounded-md bg-[#4da3ff] text-white text-sm font-semibold flex items-center gap-2"
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
                    <th className="px-6 py-4 text-left font-semibold">Funding Method</th>
                    <th className="px-6 py-4 text-left font-semibold">withdrawal method</th>
                    <th className="px-6 py-4 text-left font-semibold">Date</th>
                    <th className="px-6 py-4 text-left font-semibold">Device</th>
                    <th className="px-6 py-4 text-left font-semibold">Login Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loginHistory.map((entry, index) => (
                    <tr key={`${entry.device}-${index}`} className="border-b border-[#bdbdbd] last:border-b-0">
                      <td className="px-6 py-4">{entry.ip}</td>
                      <td className="px-6 py-4">{entry.funding}</td>
                      <td className="px-6 py-4">{entry.withdrawal}</td>
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

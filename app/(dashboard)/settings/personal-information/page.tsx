"use client"

import Image from "next/image"
import { Pencil } from "lucide-react"

const roleOptions = [
  "Support",
  "Finance",
  "Compliance",
  "Customer Service Manager",
]

export default function PersonalInformation() {
  return (
    <div className="p-8 bg-[#f5f6f8] min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-[#2c2c2c]">Settings</h1>
        <p className="text-sm text-[#7a7a7a]">
          Dashboard &gt; Settings &gt; Personal Information
        </p>
      </div>

      <div className="grid grid-cols-[2fr_1fr] gap-6">
        <div className="bg-white rounded-2xl border border-[#eef0f2] p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-[#2c2c2c]">
              Personal Information
            </h2>
            <button className="h-9 px-4 rounded-md bg-[#4da3ff] text-white text-sm font-semibold flex items-center gap-2">
              <Pencil className="h-4 w-4" />
              Edit
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-[#2c2c2c] mb-2">First Name</div>
              <input
                className="h-10 w-full rounded-md border border-[#bdbdbd] px-3 text-sm"
                defaultValue="Bessie"
              />
            </div>
            <div>
              <div className="text-sm text-[#2c2c2c] mb-2">Last Name</div>
              <input
                className="h-10 w-full rounded-md border border-[#bdbdbd] px-3 text-sm"
                defaultValue="Edwards"
              />
            </div>
            <div>
              <div className="text-sm text-[#2c2c2c] mb-2">Email Address</div>
              <input
                className="h-10 w-full rounded-md border border-[#bdbdbd] px-3 text-sm"
                defaultValue="darrellsteward@gmail.com"
              />
            </div>
            <div>
              <div className="text-sm text-[#2c2c2c] mb-2">Phone</div>
              <input
                className="h-10 w-full rounded-md border border-[#bdbdbd] px-3 text-sm"
                defaultValue="(307) 555-0133"
              />
            </div>
            <div className="relative">
              <div className="text-sm text-[#2c2c2c] mb-2">Role</div>
              <select className="h-10 w-full rounded-md border border-[#bdbdbd] px-3 text-sm">
                <option>Admin</option>
              </select>
              <div className="absolute left-0 top-[72px] z-10 w-full rounded-xl border border-[#e5e7eb] bg-white p-4 shadow-xl">
                <ul className="space-y-2 text-base font-semibold text-[#2c2c2c]">
                  {roleOptions.map((option) => (
                    <li key={option}>{option}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div>
              <div className="text-sm text-[#2c2c2c] mb-2">Country</div>
              <input
                className="h-10 w-full rounded-md border border-[#bdbdbd] px-3 text-sm"
                defaultValue="Uk"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#eef0f2] p-6 flex flex-col items-center text-center">
          <Image
            src="/placeholder-user.jpg"
            alt="Bessie Edwards"
            width={140}
            height={140}
            className="rounded-full"
          />
          <div className="mt-4 text-lg font-semibold text-[#2c2c2c]">
            Bessie Edwards
          </div>
          <div className="text-sm text-[#7a7a7a]">Admin</div>
          <button className="mt-4 h-10 px-5 rounded-md bg-[#4da3ff] text-white text-sm font-semibold flex items-center gap-2">
            <Pencil className="h-4 w-4" />
            Edit Image
          </button>
        </div>
      </div>
    </div>
  )
}

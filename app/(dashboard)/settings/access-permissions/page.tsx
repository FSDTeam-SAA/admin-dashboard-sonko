"use client"

const columns = [
  { label: "Admin", count: 2 },
  { label: "Compliance", count: 2 },
  { label: "Finance", count: 2 },
  { label: "Support", count: 2 },
  { label: "CSM", count: 2 },
]

const rows = [
  { name: "Dashboard", toggles: [1, 1, 1, 0, 1, 0, 1, 0, 1, 0] },
  { name: "Transactions", toggles: [1, 1, 1, 0, 1, 1, 1, 0, 1, 0] },
  { name: "Customers", toggles: [1, 1, 1, 0, 1, 0, 1, 0, 1, 1] },
  { name: "Agents", toggles: [1, 1, 1, 0, 1, 0, 1, 0, 1, 1] },
  { name: "Fraud Detection", toggles: [1, 1, 1, 1, 1, 0, 1, 0, 1, 0] },
  { name: "KYC/Verification", toggles: [1, 1, 1, 1, 0, 0, 0, 0, 1, 0] },
  { name: "Revenue", toggles: [1, 1, 0, 0, 1, 1, 0, 0, 0, 0] },
  { name: "Exchange Rates", toggles: [1, 1, 0, 0, 1, 0, 0, 0, 0, 0] },
  { name: "Audit Logs", toggles: [1, 1, 1, 1, 0, 0, 0, 0, 0, 0] },
  { name: "Role Management", toggles: [1, 1, 0, 0, 0, 0, 0, 0, 0, 0] },
  { name: "Manual Actions", toggles: [1, 1, 0, 0, 1, 0, 0, 0, 0, 0] },
  { name: "Tickets", toggles: [1, 1, 1, 0, 1, 0, 1, 1, 1, 1] },
  { name: "Settings", toggles: [1, 1, 1, 0, 0, 0, 0, 0, 0, 0] },
]

function Toggle({ active }: { active: boolean }) {
  return (
    <div
      className={`h-5 w-10 rounded-full flex items-center px-1 transition-colors ${
        active ? "bg-[#93c5fd]" : "bg-[#c9c9c9]"
      }`}
    >
      <div
        className={`h-4 w-4 rounded-full bg-white transition-transform ${
          active ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </div>
  )
}

export default function AccessPermissions() {
  return (
    <div className="p-8 bg-[#f5f6f8] min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-[#2c2c2c]">Access Permissions</h1>
        <p className="text-sm text-[#7a7a7a]">Dashboard &gt; Settings &gt; Access Permissions</p>
      </div>

      <div className="bg-white rounded-2xl border border-[#e5e7eb] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#eff6ff] text-[#2c2c2c]">
              <th className="px-6 py-4 text-left font-semibold border-r border-[#d1d5db]">Module</th>
              {columns.map((col) => (
                <th
                  key={col.label}
                  className="px-6 py-4 text-center font-semibold border-r border-[#d1d5db] last:border-r-0"
                  colSpan={col.count}
                >
                  {col.label}
                </th>
              ))}
            </tr>
            <tr className="text-[#2c2c2c]">
              <th className="px-6 py-3 text-left font-semibold border-r border-[#e5e7eb] text-[#4da3ff]">Access</th>
              {columns.flatMap((col) => [
                <th
                  key={`${col.label}-read`}
                  className="px-4 py-3 text-center font-semibold border-r border-[#e5e7eb]"
                >
                  Read
                </th>,
                <th
                  key={`${col.label}-write`}
                  className="px-4 py-3 text-center font-semibold border-r border-[#e5e7eb]"
                >
                  Write
                </th>,
              ])}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name} className="border-t border-[#e5e7eb]">
                <td className="px-6 py-4 text-[#2c2c2c] border-r border-[#e5e7eb]">{row.name}</td>
                {row.toggles.map((value, index) => (
                  <td key={`${row.name}-${index}`} className="px-4 py-4 text-center border-r border-[#e5e7eb]">
                    <div className="flex items-center justify-center">
                      <Toggle active={value === 1} />
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

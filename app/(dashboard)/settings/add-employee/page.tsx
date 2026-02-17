"use client"

const permissions = [
  "Dashboard",
  "Transactions",
  "Customers",
  "Agents",
  "Fraud Detection",
  "KYC/Verification",
  "Revenue",
  "Exchange Rates",
  "Audit Logs",
  "Role Management",
  "Manual Actions",
  "Tickets",
  "Settings",
]

export default function AddEmployee() {
  return (
    <div className="p-8 bg-[#f5f6f8] min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-[#2c2c2c]">Add Employee</h1>
        <p className="text-sm text-[#7a7a7a]">
          Dashboard &gt; Settings &gt; Add Employee
        </p>
      </div>

      <div className="grid grid-cols-[2fr_1fr] gap-6">
        <div className="bg-white rounded-2xl border border-[#eef0f2] p-6">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
              <div className="text-sm text-[#2c2c2c] mb-2">Employee ID</div>
              <input
                className="h-10 w-full rounded-md border border-[#bdbdbd] px-3 text-sm"
                defaultValue="17176"
              />
            </div>
            <div>
              <div className="text-sm text-[#2c2c2c] mb-2">Role</div>
              <select className="h-10 w-full rounded-md border border-[#bdbdbd] px-3 text-sm">
                <option>Admin</option>
              </select>
            </div>
            <div>
              <div className="text-sm text-[#2c2c2c] mb-2">Country</div>
              <select className="h-10 w-full rounded-md border border-[#bdbdbd] px-3 text-sm">
                <option>UK</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <div className="text-sm text-[#2c2c2c] mb-2">Employee Name</div>
              <input
                className="h-10 w-full rounded-md border border-[#bdbdbd] px-3 text-sm"
                defaultValue="Edwards"
              />
            </div>
            <div>
              <div className="text-sm text-[#2c2c2c] mb-2">Password</div>
              <input
                className="h-10 w-full rounded-md border border-[#bdbdbd] px-3 text-sm"
                defaultValue="XXXXXX"
              />
            </div>
          </div>

          <div>
            <div className="text-sm text-[#2c2c2c] mb-2">Email Address</div>
            <input
              className="h-10 w-full rounded-md border border-[#bdbdbd] px-3 text-sm"
              defaultValue="darrellsteward@gmail.com"
            />
          </div>

          <div className="mt-6 flex justify-center">
            <button className="h-10 w-40 rounded-md bg-[#4da3ff] text-white text-sm font-semibold">
              Save
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#eef0f2] overflow-hidden">
          <div className="bg-[#eff6ff] text-[#2c2c2c] font-semibold px-6 py-3 grid grid-cols-2">
            <span>Module</span>
            <span className="text-center">Admin</span>
          </div>
          <div className="divide-y divide-[#e5e7eb]">
            {permissions.map((item) => (
              <div key={item} className="grid grid-cols-2 px-6 py-3 text-sm text-[#2c2c2c]">
                <span>{item}</span>
                <span className="text-center">R/W</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

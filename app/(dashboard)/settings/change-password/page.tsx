"use client"

export default function ChangePassword() {
  return (
    <div className="p-8 bg-[#f5f6f8] min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-[#2c2c2c]">Settings</h1>
        <p className="text-sm text-[#7a7a7a]">
          Dashboard &gt; Settings &gt; Change Password
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-[#eef0f2] p-6">
        <h2 className="text-lg font-semibold text-[#2c2c2c] mb-6">
          Change Password
        </h2>
        <div className="space-y-4">
          <div>
            <div className="text-sm text-[#2c2c2c] mb-2">Current Password</div>
            <input
              className="h-10 w-full rounded-md border border-[#bdbdbd] px-3 text-sm"
              type="password"
            />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-sm text-[#2c2c2c] mb-2">New Password</div>
              <input
                className="h-10 w-full rounded-md border border-[#bdbdbd] px-3 text-sm"
                type="password"
              />
            </div>
            <div>
              <div className="text-sm text-[#2c2c2c] mb-2">Confirm New Password</div>
              <input
                className="h-10 w-full rounded-md border border-[#bdbdbd] px-3 text-sm"
                type="password"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, Eye } from "lucide-react"
import { CustomPagination } from "@/components/custom-pagination"
import { DeleteModal } from "@/components/delete-modal"
import { ViewModal } from "@/components/view-modal"
import { toast } from "sonner"

const exchangeRateData = [
  {
    id: 1,
    date: "06/24/2025",
    pair: "USD/NGN",
    rate: 1650.5,
    previousRate: 1645.25,
    commissions: "2.5%",
    revenue: "$2,450",
    status: "active",
  },
  {
    id: 2,
    date: "06/23/2025",
    pair: "USD/GHS",
    rate: 15.25,
    previousRate: 15.1,
    commissions: "2.0%",
    revenue: "$1,890",
    status: "active",
  },
  {
    id: 3,
    date: "06/22/2025",
    pair: "USD/KES",
    rate: 132.5,
    previousRate: 131.75,
    commissions: "3.0%",
    revenue: "$3,120",
    status: "active",
  },
  {
    id: 4,
    date: "06/21/2025",
    pair: "USD/ZAR",
    rate: 18.9,
    previousRate: 18.75,
    commissions: "2.2%",
    revenue: "$2,780",
    status: "inactive",
  },
  {
    id: 5,
    date: "06/20/2025",
    pair: "USD/UGX",
    rate: 3850.0,
    previousRate: 3840.25,
    commissions: "2.8%",
    revenue: "$3,450",
    status: "active",
  },
  {
    id: 6,
    date: "06/19/2025",
    pair: "USD/ETB",
    rate: 60.25,
    previousRate: 60.1,
    commissions: "2.3%",
    revenue: "$2,640",
    status: "active",
  },
]

export default function ExchangeRate() {
  const [currentPage, setCurrentPage] = useState(1)
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null as number | null })
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ date: "", pair: "", rate: "", commissions: "" })
  const [viewRate, setViewRate] = useState<(typeof exchangeRateData)[number] | null>(null)

  const itemsPerPage = 6
  const totalPages = Math.ceil(exchangeRateData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedData = exchangeRateData.slice(startIndex, startIndex + itemsPerPage)

  const handleDelete = (id: number) => {
    setDeleteModal({ open: true, id })
  }

  const confirmDelete = () => {
    toast.success("Exchange rate deleted successfully")
    setDeleteModal({ open: false, id: null })
  }

  const handleAddRate = () => {
    if (!formData.date || !formData.pair || !formData.rate || !formData.commissions) {
      toast.error("All fields are required")
      return
    }
    toast.success("Exchange rate added successfully")
    setShowForm(false)
    setFormData({ date: "", pair: "", rate: "", commissions: "" })
  }

  const getChangeColor = (current: number, previous: number) => {
    return current > previous ? "text-green-600" : "text-red-600"
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Exchange Rates</h1>
          <p className="text-gray-500 text-sm">Dashboard › Exchange Rates</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-blue-500 text-white hover:bg-blue-600">
          <Plus className="h-4 w-4 mr-2" />
          Add Rate
        </Button>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Search by:</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input placeholder="Date" className="w-32" />
            <Button variant="outline" size="icon">
              ✕
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Currency Pair</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Rate</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Change</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Commission</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Revenue</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((item) => (
                <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 text-sm font-medium text-gray-900">{item.pair}</td>
                  <td className="px-6 py-3 text-sm text-gray-900">{item.rate}</td>
                  <td className={`px-6 py-3 text-sm font-semibold ${getChangeColor(item.rate, item.previousRate)}`}>
                    {(item.rate - item.previousRate).toFixed(2)}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-900">{item.commissions}</td>
                  <td className="px-6 py-3 text-sm text-gray-900 font-medium">{item.revenue}</td>
                  <td className="px-6 py-3 text-sm">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${item.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-800"}`}
                    >
                      {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm">
                    <div className="flex gap-3">
                      <Eye
                        className="h-4 w-4 text-blue-500 cursor-pointer hover:text-blue-700"
                        onClick={() => setViewRate(item)}
                      />
                      <Trash2
                        className="h-4 w-4 text-red-500 cursor-pointer hover:text-red-700"
                        onClick={() => handleDelete(item.id)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <CustomPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Add Exchange Rate</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Date</label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Currency Pair</label>
                <Input
                  value={formData.pair}
                  onChange={(e) => setFormData({ ...formData, pair: e.target.value })}
                  placeholder="USD/NGN"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Exchange Rate</label>
                <Input
                  value={formData.rate}
                  onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                  placeholder="1650.50"
                  type="number"
                  step="0.01"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Commission (%)</label>
                <Input
                  value={formData.commissions}
                  onChange={(e) => setFormData({ ...formData, commissions: e.target.value })}
                  placeholder="2.5"
                  type="number"
                  step="0.1"
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddRate} className="bg-blue-500 text-white hover:bg-blue-600">
                  Add Rate
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <DeleteModal
        open={deleteModal.open}
        title="Delete Exchange Rate"
        description="Are you sure you want to delete this exchange rate? This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal({ open: false, id: null })}
      />

      <ViewModal
        open={!!viewRate}
        title="Exchange Rate Details"
        description={viewRate ? `Rate ${viewRate.pair}` : undefined}
        onClose={() => setViewRate(null)}
        fields={[
          { label: "Date", value: viewRate?.date ?? "-" },
          { label: "Currency Pair", value: viewRate?.pair ?? "-" },
          { label: "Rate", value: viewRate?.rate?.toLocaleString?.() ?? "-" },
          { label: "Previous Rate", value: viewRate?.previousRate?.toLocaleString?.() ?? "-" },
          {
            label: "Change",
            value:
              viewRate && typeof viewRate.rate === "number" && typeof viewRate.previousRate === "number"
                ? (viewRate.rate - viewRate.previousRate).toFixed(2)
                : "-",
          },
          { label: "Commission", value: viewRate?.commissions ?? "-" },
          { label: "Revenue", value: viewRate?.revenue ?? "-" },
          {
            label: "Status",
            value: viewRate?.status ? viewRate.status.charAt(0).toUpperCase() + viewRate.status.slice(1) : "-",
          },
        ]}
      />
    </div>
  )
}
